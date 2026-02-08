/**
 * API Key Settings Component
 * 
 * Allows users to input and store their OpenAI API key in localStorage.
 * The key is never sent to any server - it's only used client-side.
 */

import React, { Component } from 'react';
import {
    Dialog,
    DialogTrigger,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogActions,
    DialogContent,
    Button,
    Input,
    Label,
    Field,
    MessageBar,
    MessageBarBody,
    tokens,
} from '@fluentui/react-components';
import { Settings24Regular, Key24Regular, Checkmark24Regular } from '@fluentui/react-icons';

const STORAGE_KEY = 'flowquery_openai_api_key';
const ORG_STORAGE_KEY = 'flowquery_openai_org_id';
const MODEL_STORAGE_KEY = 'flowquery_openai_model';
const MAX_RETRIES_STORAGE_KEY = 'flowquery_max_retries';

const DEFAULT_MAX_RETRIES = 2;

export interface ApiKeyConfig {
    apiKey: string;
    organizationId?: string;
    model?: string;
    maxRetries?: number;
}

/**
 * Get the stored API configuration from localStorage.
 */
export function getStoredApiConfig(): ApiKeyConfig | null {
    const apiKey = localStorage.getItem(STORAGE_KEY);
    if (!apiKey) return null;
    
    const storedRetries = localStorage.getItem(MAX_RETRIES_STORAGE_KEY);
    return {
        apiKey,
        organizationId: localStorage.getItem(ORG_STORAGE_KEY) || undefined,
        model: localStorage.getItem(MODEL_STORAGE_KEY) || undefined,
        maxRetries: storedRetries ? parseInt(storedRetries, 10) : DEFAULT_MAX_RETRIES,
    };
}

/**
 * Check if an API key is configured in localStorage.
 */
export function hasApiKey(): boolean {
    return !!localStorage.getItem(STORAGE_KEY);
}

/**
 * Get just the API key from storage.
 */
export function getApiKey(): string | null {
    return localStorage.getItem(STORAGE_KEY);
}

/**
 * Get the stored max retries setting from localStorage.
 */
export function getMaxRetries(): number {
    const stored = localStorage.getItem(MAX_RETRIES_STORAGE_KEY);
    return stored ? parseInt(stored, 10) : DEFAULT_MAX_RETRIES;
}

interface ApiKeySettingsProps {
    onSave?: (config: ApiKeyConfig) => void;
}

interface ApiKeySettingsState {
    open: boolean;
    apiKey: string;
    organizationId: string;
    model: string;
    maxRetries: string;
    saved: boolean;
}

export class ApiKeySettings extends Component<ApiKeySettingsProps, ApiKeySettingsState> {
    constructor(props: ApiKeySettingsProps) {
        super(props);
        this.state = {
            open: false,
            apiKey: '',
            organizationId: '',
            model: '',
            maxRetries: String(DEFAULT_MAX_RETRIES),
            saved: false,
        };
    }

    componentDidUpdate(_prevProps: ApiKeySettingsProps, prevState: ApiKeySettingsState): void {
        // Load existing values when dialog opens
        if (this.state.open && !prevState.open) {
            const config = getStoredApiConfig();
            this.setState({
                apiKey: config?.apiKey || '',
                organizationId: config?.organizationId || '',
                model: config?.model || '',
                maxRetries: String(config?.maxRetries ?? DEFAULT_MAX_RETRIES),
                saved: false,
            });
        }
    }

    handleOpenChange = (_: unknown, data: { open: boolean }): void => {
        this.setState({ open: data.open });
    };

    handleSave = (): void => {
        const { apiKey, organizationId, model, maxRetries } = this.state;
        const { onSave } = this.props;

        // Save to localStorage
        if (apiKey) {
            localStorage.setItem(STORAGE_KEY, apiKey);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }

        if (organizationId) {
            localStorage.setItem(ORG_STORAGE_KEY, organizationId);
        } else {
            localStorage.removeItem(ORG_STORAGE_KEY);
        }

        if (model) {
            localStorage.setItem(MODEL_STORAGE_KEY, model);
        } else {
            localStorage.removeItem(MODEL_STORAGE_KEY);
        }

        const parsedRetries = parseInt(maxRetries, 10);
        const validRetries = isNaN(parsedRetries) ? DEFAULT_MAX_RETRIES : Math.max(0, Math.min(10, parsedRetries));
        localStorage.setItem(MAX_RETRIES_STORAGE_KEY, String(validRetries));

        const config: ApiKeyConfig = {
            apiKey,
            organizationId: organizationId || undefined,
            model: model || undefined,
            maxRetries: validRetries,
        };

        this.setState({ saved: true });
        onSave?.(config);

        // Close dialog after a brief delay to show success
        setTimeout(() => this.setState({ open: false }), 500);
    };

    handleClear = (): void => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ORG_STORAGE_KEY);
        localStorage.removeItem(MODEL_STORAGE_KEY);
        localStorage.removeItem(MAX_RETRIES_STORAGE_KEY);
        this.setState({
            apiKey: '',
            organizationId: '',
            model: '',
            maxRetries: String(DEFAULT_MAX_RETRIES),
            saved: false,
        });
    };

    handleCancel = (): void => {
        this.setState({ open: false });
    };

    handleApiKeyChange = (_: unknown, data: { value: string }): void => {
        this.setState({ apiKey: data.value });
    };

    handleOrganizationIdChange = (_: unknown, data: { value: string }): void => {
        this.setState({ organizationId: data.value });
    };

    handleModelChange = (_: unknown, data: { value: string }): void => {
        this.setState({ model: data.value });
    };

    handleMaxRetriesChange = (_: unknown, data: { value: string }): void => {
        this.setState({ maxRetries: data.value });
    };

    render(): React.ReactNode {
        const { open, apiKey, organizationId, model, maxRetries, saved } = this.state;
        const isConfigured = hasApiKey();

        return (
            <Dialog open={open} onOpenChange={this.handleOpenChange}>
                <DialogTrigger disableButtonEnhancement>
                    <Button
                        appearance={isConfigured ? 'subtle' : 'primary'}
                        icon={isConfigured ? <Checkmark24Regular /> : <Settings24Regular />}
                        title="API Settings"
                    >
                        {isConfigured ? 'API Configured' : 'Configure API Key'}
                    </Button>
                </DialogTrigger>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>OpenAI API Settings</DialogTitle>
                        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
                            <MessageBar intent="info">
                                <MessageBarBody>
                                    Your API key is stored locally in your browser and never sent to any server.
                                </MessageBarBody>
                            </MessageBar>

                            <Field label="API Key" required>
                                <Input
                                    type="password"
                                    value={apiKey}
                                    onChange={this.handleApiKeyChange}
                                    placeholder="sk-..."
                                    contentBefore={<Key24Regular />}
                                />
                            </Field>

                            <Field label="Organization ID" hint="Optional - only needed for organization accounts">
                                <Input
                                    value={organizationId}
                                    onChange={this.handleOrganizationIdChange}
                                    placeholder="org-..."
                                />
                            </Field>

                            <Field label="Default Model" hint="Optional - defaults to gpt-5.2">
                                <Input
                                    value={model}
                                    onChange={this.handleModelChange}
                                    placeholder="gpt-5.2"
                                />
                            </Field>

                            <Field label="Max Query Retries" hint={`Number of retry attempts when a query fails (0–10, default ${DEFAULT_MAX_RETRIES})`}>
                                <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={maxRetries}
                                    onChange={this.handleMaxRetriesChange}
                                    placeholder={String(DEFAULT_MAX_RETRIES)}
                                />
                            </Field>

                            {saved && (
                                <MessageBar intent="success">
                                    <MessageBarBody>Settings saved successfully!</MessageBarBody>
                                </MessageBar>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button appearance="secondary" onClick={this.handleClear}>
                                Clear
                            </Button>
                            <Button appearance="secondary" onClick={this.handleCancel}>
                                Cancel
                            </Button>
                            <Button appearance="primary" onClick={this.handleSave} disabled={!apiKey}>
                                Save
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        );
    }
}

export default ApiKeySettings;
