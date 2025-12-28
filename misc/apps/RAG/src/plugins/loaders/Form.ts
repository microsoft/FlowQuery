/**
 * Form plugin - transforms configuration into Adaptive Card form format.
 *
 * Adaptive Cards are platform-agnostic UI snippets that can be rendered in
 * Microsoft Teams, Outlook, Windows, and other applications.
 *
 * This plugin creates customizable forms with various input types including:
 * - Text inputs (single and multi-line)
 * - Number inputs
 * - Date and time pickers
 * - Dropdown/choice sets
 * - Toggle switches
 * - Choice sets (radio buttons, checkboxes)
 *
 * Usage in FlowQuery:
 *   // Create a simple contact form:
 *   CALL form('Contact Us', [
 *     { id: 'name', type: 'text', label: 'Your Name', required: true },
 *     { id: 'email', type: 'text', label: 'Email', placeholder: 'you@example.com' },
 *     { id: 'message', type: 'textarea', label: 'Message' }
 *   ]) YIELD type, body, actions
 */
import { AsyncFunction, FunctionDef } from "flowquery/extensibility";

/**
 * Interface for Adaptive Card structure
 */
interface AdaptiveCard {
    type: "AdaptiveCard";
    $schema: string;
    version: string;
    body: AdaptiveCardElement[];
    actions?: AdaptiveCardAction[];
}

interface AdaptiveCardElement {
    type: string;
    [key: string]: any;
}

interface AdaptiveCardAction {
    type: string;
    title: string;
    [key: string]: any;
}

/**
 * Input field configuration
 */
interface FormFieldConfig {
    /** Unique identifier for the field */
    id: string;
    /** Input type: text, textarea, number, date, time, datetime, toggle, dropdown, radio, checkbox */
    type:
        | "text"
        | "textarea"
        | "number"
        | "date"
        | "time"
        | "datetime"
        | "toggle"
        | "dropdown"
        | "radio"
        | "checkbox";
    /** Display label for the field */
    label: string;
    /** Placeholder text for input fields */
    placeholder?: string;
    /** Default value */
    defaultValue?: any;
    /** Whether the field is required */
    required?: boolean;
    /** Choices for dropdown/radio/checkbox types */
    choices?: Array<{ title: string; value: string }> | string[];
    /** Minimum value for number inputs */
    min?: number;
    /** Maximum value for number inputs */
    max?: number;
    /** Regex pattern for validation (displayed in error message) */
    pattern?: string;
    /** Error message for validation */
    errorMessage?: string;
    /** Toggle title (for toggle type) */
    toggleTitle?: string;
    /** Whether the field is read-only */
    readOnly?: boolean;
    /** Separator before this field */
    separator?: boolean;
    /** Field width: auto, stretch, or weighted value */
    width?: "auto" | "stretch" | number;
    /** Custom style for the label */
    labelStyle?: "default" | "heading";
}

/**
 * Form configuration options
 */
interface FormConfig {
    /** Form title */
    title?: string;
    /** Form description/subtitle */
    description?: string;
    /** Submit button configuration */
    submitButton?: {
        title?: string;
        style?: "default" | "positive" | "destructive";
        /** Action URL for form submission */
        url?: string;
        /** Action type: submit, openUrl, or custom */
        actionType?: "submit" | "openUrl" | "showCard";
    };
    /** Additional action buttons */
    additionalActions?: Array<{
        title: string;
        type: "submit" | "openUrl" | "showCard";
        url?: string;
        style?: "default" | "positive" | "destructive";
        data?: any;
    }>;
    /** Card background style */
    style?: "default" | "emphasis" | "good" | "attention" | "warning" | "accent";
    /** Whether to show a reset/clear button */
    showResetButton?: boolean;
    /** Card schema version */
    version?: string;
}

/**
 * Form class - creates customizable Adaptive Card forms.
 */
@FunctionDef({
    description: "Creates a customizable Adaptive Card form with various input types",
    category: "async",
    parameters: [
        {
            name: "title",
            description: "Form title displayed at the top",
            type: "string",
            required: true,
        },
        {
            name: "fields",
            description: "Array of field configurations defining the form inputs",
            type: "array",
            required: true,
        },
        {
            name: "config",
            description: "Optional form configuration (submit button, additional actions, styling)",
            type: "object",
            required: false,
        },
    ],
    output: {
        description: "Adaptive Card JSON object with form elements",
        type: "object",
        properties: {
            type: { description: 'Always "AdaptiveCard"', type: "string" },
            $schema: { description: "Adaptive Card schema URL", type: "string" },
            version: { description: "Adaptive Card version", type: "string" },
            body: { description: "Card body elements including form inputs", type: "array" },
            actions: { description: "Card actions (submit, cancel, etc.)", type: "array" },
        },
    },
    examples: [
        "CALL form('Contact Form', [{ id: 'name', type: 'text', label: 'Name', required: true }, { id: 'email', type: 'text', label: 'Email' }]) YIELD type, body, actions",
        "CALL form('Survey', [{ id: 'rating', type: 'dropdown', label: 'Rating', choices: ['1', '2', '3', '4', '5'] }, { id: 'subscribe', type: 'toggle', label: 'Subscribe', toggleTitle: 'Yes, send me updates' }], { submitButton: { title: 'Submit Survey', style: 'positive' } }) YIELD type, body, actions",
    ],
})
export class Form extends AsyncFunction {
    /**
     * Creates an Adaptive Card form with the specified fields and configuration.
     *
     * @param title - Form title
     * @param fields - Array of field configurations
     * @param config - Optional form configuration
     */
    async *generate(
        title: string,
        fields: FormFieldConfig[],
        config?: FormConfig
    ): AsyncGenerator<AdaptiveCard, void, unknown> {
        const card = this.createFormCard(title, fields, config || {});
        yield card;
    }

    /**
     * Creates the Adaptive Card with form elements.
     */
    private createFormCard(
        title: string,
        fields: FormFieldConfig[],
        config: FormConfig
    ): AdaptiveCard {
        const card: AdaptiveCard = {
            type: "AdaptiveCard",
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: config.version || "1.5",
            body: [],
            actions: [],
        };

        // Add container with optional background style
        const container: AdaptiveCardElement = {
            type: "Container",
            style: config.style || "default",
            items: [],
        };

        // Add title
        container.items.push({
            type: "TextBlock",
            text: title,
            weight: "Bolder",
            size: "Large",
            wrap: true,
        });

        // Add description if provided
        if (config.description) {
            container.items.push({
                type: "TextBlock",
                text: config.description,
                isSubtle: true,
                wrap: true,
                spacing: "Small",
            });
        }

        // Add separator after header
        container.items.push({
            type: "TextBlock",
            text: " ",
            separator: true,
            spacing: "Medium",
        });

        // Add form fields
        for (const field of fields) {
            const fieldElements = this.createFieldElements(field);
            container.items.push(...fieldElements);
        }

        card.body.push(container);

        // Add actions
        card.actions = this.createActions(config);

        return card;
    }

    /**
     * Creates the elements for a single form field (label + input).
     */
    private createFieldElements(field: FormFieldConfig): AdaptiveCardElement[] {
        const elements: AdaptiveCardElement[] = [];

        // Add label
        const labelText = field.required ? `${field.label} *` : field.label;
        elements.push({
            type: "TextBlock",
            text: labelText,
            weight: field.labelStyle === "heading" ? "Bolder" : "Default",
            wrap: true,
            separator: field.separator || false,
            spacing: field.separator ? "Large" : "Default",
        });

        // Add input based on type
        const inputElement = this.createInputElement(field);
        elements.push(inputElement);

        return elements;
    }

    /**
     * Creates the appropriate input element based on field type.
     */
    private createInputElement(field: FormFieldConfig): AdaptiveCardElement {
        switch (field.type) {
            case "text":
                return this.createTextInput(field, false);

            case "textarea":
                return this.createTextInput(field, true);

            case "number":
                return this.createNumberInput(field);

            case "date":
                return this.createDateInput(field);

            case "time":
                return this.createTimeInput(field);

            case "datetime":
                return this.createDateTimeInputs(field);

            case "toggle":
                return this.createToggleInput(field);

            case "dropdown":
                return this.createChoiceSet(field, "compact");

            case "radio":
                return this.createChoiceSet(field, "expanded");

            case "checkbox":
                return this.createChoiceSet(field, "expanded", true);

            default:
                return this.createTextInput(field, false);
        }
    }

    /**
     * Creates a text input element.
     */
    private createTextInput(field: FormFieldConfig, isMultiLine: boolean): AdaptiveCardElement {
        const input: AdaptiveCardElement = {
            type: "Input.Text",
            id: field.id,
            placeholder: field.placeholder || "",
            isMultiline: isMultiLine,
            isRequired: field.required || false,
        };

        if (field.defaultValue !== undefined) {
            input.value = String(field.defaultValue);
        }

        if (field.pattern) {
            input.regex = field.pattern;
        }

        if (field.errorMessage) {
            input.errorMessage = field.errorMessage;
        }

        if (isMultiLine) {
            input.style = "text";
        }

        return input;
    }

    /**
     * Creates a number input element.
     */
    private createNumberInput(field: FormFieldConfig): AdaptiveCardElement {
        const input: AdaptiveCardElement = {
            type: "Input.Number",
            id: field.id,
            placeholder: field.placeholder || "",
            isRequired: field.required || false,
        };

        if (field.defaultValue !== undefined) {
            input.value = Number(field.defaultValue);
        }

        if (field.min !== undefined) {
            input.min = field.min;
        }

        if (field.max !== undefined) {
            input.max = field.max;
        }

        if (field.errorMessage) {
            input.errorMessage = field.errorMessage;
        }

        return input;
    }

    /**
     * Creates a date input element.
     */
    private createDateInput(field: FormFieldConfig): AdaptiveCardElement {
        const input: AdaptiveCardElement = {
            type: "Input.Date",
            id: field.id,
            isRequired: field.required || false,
        };

        if (field.defaultValue !== undefined) {
            input.value = String(field.defaultValue);
        }

        if (field.placeholder) {
            input.placeholder = field.placeholder;
        }

        return input;
    }

    /**
     * Creates a time input element.
     */
    private createTimeInput(field: FormFieldConfig): AdaptiveCardElement {
        const input: AdaptiveCardElement = {
            type: "Input.Time",
            id: field.id,
            isRequired: field.required || false,
        };

        if (field.defaultValue !== undefined) {
            input.value = String(field.defaultValue);
        }

        if (field.placeholder) {
            input.placeholder = field.placeholder;
        }

        return input;
    }

    /**
     * Creates date and time inputs in a column set for datetime fields.
     */
    private createDateTimeInputs(field: FormFieldConfig): AdaptiveCardElement {
        const dateValue = field.defaultValue ? String(field.defaultValue).split("T")[0] : undefined;
        const timeValue = field.defaultValue
            ? String(field.defaultValue).split("T")[1]?.substring(0, 5)
            : undefined;

        return {
            type: "ColumnSet",
            columns: [
                {
                    type: "Column",
                    width: "stretch",
                    items: [
                        {
                            type: "Input.Date",
                            id: `${field.id}_date`,
                            isRequired: field.required || false,
                            value: dateValue,
                        },
                    ],
                },
                {
                    type: "Column",
                    width: "stretch",
                    items: [
                        {
                            type: "Input.Time",
                            id: `${field.id}_time`,
                            isRequired: field.required || false,
                            value: timeValue,
                        },
                    ],
                },
            ],
        };
    }

    /**
     * Creates a toggle input element.
     */
    private createToggleInput(field: FormFieldConfig): AdaptiveCardElement {
        const input: AdaptiveCardElement = {
            type: "Input.Toggle",
            id: field.id,
            title: field.toggleTitle || field.label,
            valueOn: "true",
            valueOff: "false",
            isRequired: field.required || false,
        };

        if (field.defaultValue !== undefined) {
            input.value = field.defaultValue ? "true" : "false";
        }

        return input;
    }

    /**
     * Creates a choice set (dropdown, radio, or checkbox).
     */
    private createChoiceSet(
        field: FormFieldConfig,
        style: "compact" | "expanded",
        isMultiSelect: boolean = false
    ): AdaptiveCardElement {
        const choices = this.normalizeChoices(field.choices || []);

        const input: AdaptiveCardElement = {
            type: "Input.ChoiceSet",
            id: field.id,
            style: style,
            isMultiSelect: isMultiSelect,
            isRequired: field.required || false,
            choices: choices,
        };

        if (field.defaultValue !== undefined) {
            input.value = String(field.defaultValue);
        }

        if (field.placeholder && style === "compact") {
            input.placeholder = field.placeholder;
        }

        return input;
    }

    /**
     * Normalizes choices to the expected format.
     */
    private normalizeChoices(
        choices: Array<{ title: string; value: string }> | string[]
    ): Array<{ title: string; value: string }> {
        return choices.map((choice) => {
            if (typeof choice === "string") {
                return { title: choice, value: choice };
            }
            return choice;
        });
    }

    /**
     * Creates the action buttons for the form.
     */
    private createActions(config: FormConfig): AdaptiveCardAction[] {
        const actions: AdaptiveCardAction[] = [];

        // Add submit button
        const submitConfig = config.submitButton || {};
        const submitAction: AdaptiveCardAction = {
            type: this.getActionType(submitConfig.actionType || "submit"),
            title: submitConfig.title || "Submit",
            style: submitConfig.style || "positive",
        };

        if (submitConfig.actionType === "openUrl" && submitConfig.url) {
            submitAction.url = submitConfig.url;
        }

        actions.push(submitAction);

        // Add reset button if requested
        if (config.showResetButton) {
            actions.push({
                type: "Action.Submit",
                title: "Reset",
                style: "default",
                data: { action: "reset" },
            });
        }

        // Add additional actions
        if (config.additionalActions) {
            for (const actionConfig of config.additionalActions) {
                const action: AdaptiveCardAction = {
                    type: this.getActionType(actionConfig.type),
                    title: actionConfig.title,
                    style: actionConfig.style || "default",
                };

                if (actionConfig.type === "openUrl" && actionConfig.url) {
                    action.url = actionConfig.url;
                }

                if (actionConfig.data) {
                    action.data = actionConfig.data;
                }

                actions.push(action);
            }
        }

        return actions;
    }

    /**
     * Gets the Adaptive Card action type string.
     */
    private getActionType(type: string): string {
        switch (type) {
            case "submit":
                return "Action.Submit";
            case "openUrl":
                return "Action.OpenUrl";
            case "showCard":
                return "Action.ShowCard";
            default:
                return "Action.Submit";
        }
    }
}

export { Form as default };
