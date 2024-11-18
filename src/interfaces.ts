export interface PageContent {
    url: string;
    title: string;
    headers: string[];
    navigation: string[];
    mainContent: string[];
    timestamp: string;
}

/**
 * Base interface for all log entries
 */
export interface BaseLog {
    timestamp: string;      // ISO timestamp
}

/**
 * Interface for task change log entries
 */
export interface TaskLog extends BaseLog {
    task: string;
}

/**
 * Interface for AI call log entries (maintaining existing structure)
 */
export interface AICallLog extends BaseLog {
    model: string;
    type: string;
    prompt: string;
    response: string;
    inputTokens?: number;
    outputTokens?: number;
    durationSeconds: number;
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
    disableOnPageLoad: boolean;
    pauseState: string | boolean;
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
