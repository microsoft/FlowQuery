import React from 'react';
import * as AdaptiveCards from 'adaptivecards';
import * as ACData from 'adaptivecards-templating';
import './AdaptiveCardRenderer.css';

/**
 * Data passed when an Action.Submit is triggered
 */
export interface SubmitActionData {
    /**
     * The data property from the Action.Submit (if any)
     */
    actionData: unknown;
    
    /**
     * All input values collected from the card
     */
    inputValues: Record<string, string>;
    
    /**
     * The original action object
     */
    action: AdaptiveCards.SubmitAction;
}

export interface AdaptiveCardRendererProps {
    /**
     * The Adaptive Card payload (JSON object conforming to Adaptive Cards schema).
     * Can be a template with ${expression} bindings if `data` prop is provided.
     */
    card: Record<string, unknown>;
    
    /**
     * Optional data context for template binding.
     * When provided, the card is treated as a template and expressions like
     * ${property} or ${$root.property} will be evaluated against this data.
     */
    data?: Record<string, unknown>;
    
    /**
     * Optional host config for styling the card
     */
    hostConfig?: Record<string, unknown>;
    
    /**
     * Callback when an Action.Submit is executed.
     * Receives the action data and all input values from the card.
     */
    onSubmit?: (submitData: SubmitActionData) => void;
    
    /**
     * Callback when any action is executed (e.g., Action.Submit, Action.OpenUrl).
     * For Action.Submit, prefer using onSubmit which provides collected input values.
     */
    onExecuteAction?: (action: AdaptiveCards.Action) => void;
    
    /**
     * Optional CSS class name for the container
     */
    className?: string;
}

/**
 * Default host config styled to match Fluent UI aesthetics
 */
const defaultHostConfig: AdaptiveCards.HostConfig = new AdaptiveCards.HostConfig({
    fontFamily: "'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif",
    containerStyles: {
        default: {
            backgroundColor: "#ffffff",
            foregroundColors: {
                default: {
                    default: "#242424",
                    subtle: "#616161"
                },
                accent: {
                    default: "#0078D4",
                    subtle: "#0063B1"
                },
                good: {
                    default: "#107C10",
                    subtle: "#0B5C0B"
                },
                warning: {
                    default: "#D83B01",
                    subtle: "#C43501"
                },
                attention: {
                    default: "#A80000",
                    subtle: "#8B0000"
                }
            }
        },
        emphasis: {
            backgroundColor: "#F5F5F5",
            foregroundColors: {
                default: {
                    default: "#242424",
                    subtle: "#616161"
                }
            }
        },
        accent: {
            backgroundColor: "#E6F2FB",
            foregroundColors: {
                default: {
                    default: "#242424",
                    subtle: "#616161"
                }
            }
        }
    },
    spacing: {
        small: 4,
        default: 8,
        medium: 12,
        large: 16,
        extraLarge: 24,
        padding: 12
    },
    separator: {
        lineThickness: 1,
        lineColor: "#E0E0E0"
    },
    actions: {
        maxActions: 5,
        spacing: AdaptiveCards.Spacing.Default,
        buttonSpacing: 8,
        showCard: {
            actionMode: AdaptiveCards.ShowCardActionMode.Inline,
            inlineTopMargin: 8
        },
        actionsOrientation: AdaptiveCards.Orientation.Horizontal,
        actionAlignment: AdaptiveCards.ActionAlignment.Left
    },
    adaptiveCard: {
        allowCustomStyle: true
    },
    textBlock: {
        headingLevel: 2
    },
    factSet: {
        title: {
            color: AdaptiveCards.TextColor.Default,
            size: AdaptiveCards.TextSize.Default,
            isSubtle: false,
            weight: AdaptiveCards.TextWeight.Bolder,
            wrap: true
        },
        value: {
            color: AdaptiveCards.TextColor.Default,
            size: AdaptiveCards.TextSize.Default,
            isSubtle: false,
            weight: AdaptiveCards.TextWeight.Default,
            wrap: true
        },
        spacing: 8
    }
});

/**
 * Renders an Adaptive Card using the adaptivecards library.
 * Adaptive Cards are platform-agnostic UI snippets authored in JSON.
 */
export class AdaptiveCardRenderer extends React.Component<AdaptiveCardRendererProps> {
    private containerRef = React.createRef<HTMLDivElement>();
    private adaptiveCard: AdaptiveCards.AdaptiveCard | null = null;

    componentDidMount(): void {
        this.createAdaptiveCard();
        this.renderCard();
    }

    componentDidUpdate(prevProps: AdaptiveCardRendererProps): void {
        // Recreate adaptive card instance if host config changes
        if (prevProps.hostConfig !== this.props.hostConfig) {
            this.createAdaptiveCard();
        }
        
        // Re-render if card, data, hostConfig, or action handler changes
        if (
            prevProps.card !== this.props.card ||
            prevProps.data !== this.props.data ||
            prevProps.hostConfig !== this.props.hostConfig ||
            prevProps.onExecuteAction !== this.props.onExecuteAction ||
            prevProps.onSubmit !== this.props.onSubmit
        ) {
            this.renderCard();
        }
    }

    /**
     * Collects all input values from the rendered card
     */
    private collectInputValues(): Record<string, string> {
        const inputs: Record<string, string> = {};
        
        if (!this.adaptiveCard) {
            return inputs;
        }
        
        // Get all input elements from the card
        const allInputs = this.adaptiveCard.getAllInputs();
        
        for (const input of allInputs) {
            if (input.id) {
                inputs[input.id] = input.value ?? '';
            }
        }
        
        return inputs;
    }

    private createAdaptiveCard(): void {
        const { hostConfig } = this.props;
        
        this.adaptiveCard = new AdaptiveCards.AdaptiveCard();
        
        // Apply host config
        if (hostConfig) {
            this.adaptiveCard.hostConfig = new AdaptiveCards.HostConfig(hostConfig);
        } else {
            this.adaptiveCard.hostConfig = defaultHostConfig;
        }
    }

    private renderCard(): void {
        const { card, data, onExecuteAction, onSubmit } = this.props;
        
        if (!this.containerRef.current || !card || !this.adaptiveCard) {
            return;
        }
        
        // Clear previous content
        this.containerRef.current.innerHTML = '';
        
        try {
            // Normalize the card to standard Adaptive Card format
            let cardPayload = normalizeAdaptiveCard(card);
            
            if (!cardPayload) {
                throw new Error('Invalid Adaptive Card format');
            }
            
            // Apply data binding if data is provided
            if (data) {
                const template = new ACData.Template(cardPayload);
                cardPayload = template.expand({
                    $root: data
                });
            }
            
            // Set up action handler
            this.adaptiveCard.onExecuteAction = (action: AdaptiveCards.Action) => {
                // Handle Action.Submit specially to collect input values
                if (action instanceof AdaptiveCards.SubmitAction) {
                    const inputValues = this.collectInputValues();
                    
                    if (onSubmit) {
                        onSubmit({
                            actionData: action.data,
                            inputValues,
                            action
                        });
                    }
                }
                
                // Call general action handler if provided
                if (onExecuteAction) {
                    onExecuteAction(action);
                } else if (action instanceof AdaptiveCards.OpenUrlAction && action.url) {
                    // Default: open URLs in new tab
                    window.open(action.url, '_blank', 'noopener,noreferrer');
                }
            };
            
            // Parse and render the card
            this.adaptiveCard.parse(cardPayload);
            const renderedCard = this.adaptiveCard.render();
            
            if (renderedCard) {
                this.containerRef.current.appendChild(renderedCard);
            }
        } catch (error) {
            console.error('Failed to render Adaptive Card:', error);
            
            // Show error message in the container
            const errorDiv = document.createElement('div');
            errorDiv.className = 'adaptive-card-error';
            errorDiv.textContent = `Failed to render card: ${error instanceof Error ? error.message : 'Unknown error'}`;
            this.containerRef.current.appendChild(errorDiv);
        }
    }

    render(): React.ReactNode {
        const { className } = this.props;
        
        return (
            <div 
                ref={this.containerRef} 
                className={`adaptive-card-container ${className || ''}`}
            />
        );
    }
}

/**
 * Helper function to check if an object looks like an Adaptive Card.
 * Supports both standard format (type: 'AdaptiveCard') and alternative format (cardType: 'AdaptiveCard').
 */
export function isAdaptiveCard(obj: unknown): obj is Record<string, unknown> {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    
    const card = obj as Record<string, unknown>;
    
    // Standard Adaptive Card format
    if (card.type === 'AdaptiveCard') {
        return true;
    }
    
    // Alternative format with cardType/cardBody
    if (card.cardType === 'AdaptiveCard') {
        return true;
    }
    
    // Check if it's an array containing Adaptive Cards
    if (Array.isArray(obj) && obj.length > 0) {
        return obj.some(item => isAdaptiveCard(item));
    }
    
    return false;
}

/**
 * Normalizes a card payload to the standard Adaptive Card format.
 * Handles:
 * - Arrays of cards (returns the first card)
 * - Alternative format with cardType/cardBody properties
 * - Standard format (passed through unchanged)
 */
export function normalizeAdaptiveCard(obj: unknown): Record<string, unknown> | null {
    if (typeof obj !== 'object' || obj === null) {
        return null;
    }
    
    // Handle arrays - extract the first valid card
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const normalized = normalizeAdaptiveCard(item);
            if (normalized) {
                return normalized;
            }
        }
        return null;
    }
    
    const card = obj as Record<string, unknown>;
    
    // Standard format - return as-is
    if (card.type === 'AdaptiveCard') {
        return card;
    }
    
    // Alternative format - convert to standard format
    if (card.cardType === 'AdaptiveCard') {
        return {
            type: 'AdaptiveCard',
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: (card.version as string) || '1.5',
            body: card.cardBody || card.body || [],
            actions: card.actions || []
        };
    }
    
    return null;
}

export default AdaptiveCardRenderer;
