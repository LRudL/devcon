export interface PageContent {
    url: string;
    title: string;
    headers: string[];
    navigation: string[];
    mainContent: string[];
    timestamp: string;
}

/**
 * Interface representing a single AI API call log entry
 */
export interface AICallLog {
    timestamp: string;      // ISO timestamp of when the call was made
    model: string;          // The model used for the call
    type: string;          // Changed from union type to string
    prompt: string;         // The prompt sent to the AI
    response: string;        // The response received from the AI
    inputTokens?: number;   // Number of tokens in the prompt
    outputTokens?: number;  // Number of tokens in the response
    durationSeconds: number;  // Add this new field
}

/**
 * Interface representing totals for a set of logs
 */
export interface LogTotals {
    inputTokens: number;
    outputTokens: number;
    calls: number;
}

/**
 * Interface for messages between popup and content/background scripts
 */
export interface MessageResponse {
    success: boolean;
    analysis?: string;
    error?: string;
}

/**
 * Interface for chat message structure
 */
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Extended interface for AI responses that includes acceptance status
 */
export interface AIDebateResponse extends MessageResponse {
    accepted?: boolean;
}

/**
 * Interface defining all available settings
 */
export interface DeviceSettings {
    anthropicApiKey: string;
    deviceConstitution: string;
    currentTask: string;
    llmProvider: 'cloud' | 'local';
    localModelName: string;
    enableXProcessor: boolean;
    mementoMori: string | false;
    aiJudgementPolicy: 'pageLoad' | 'manual' | 'interval';
    aiJudgementInterval: number;
    debateBehaviour: 'oneRound' | 'multiRound';
}

/**
 * Interface for settings update events
 */
export interface SettingsChangeEvent {
    key: keyof DeviceSettings;
    newValue: any;
    oldValue: any;
}

export interface DebateMessage {
    role: 'AI' | 'user';
    content: string;
}
