import { AIDebateResponse, ChatMessage, PageContent, DebateMessage } from '../../interfaces';
import { AppError, handleError } from '../../utils/errors';
import { getAllVisibleText } from '../pageView';

export class DebateManager {
    private messages: DebateMessage[] = [];
    private debateBehaviour: 'oneRound' | 'multiRound' = 'multiRound';
    private onStateChange?: (messages: ChatMessage[]) => void;
    
    constructor(initialMessage: string) {
        this.addMessage('You seem to be off task: ' + initialMessage, 'AI');
        this.initialize();
    }

    private async initialize() {
        await this.loadSettings();
    }

    private async loadSettings() {
        try {
            const settings = await chrome.storage.local.get({ debateBehaviour: 'multiRound' });
            this.debateBehaviour = settings.debateBehaviour;
        } catch (error) {
            throw handleError(error, 'Failed to load debate settings');
        }
    }

    private async sendMessageToBackground(message: string): Promise<AIDebateResponse> {
        try {
            const pageContent = getAllVisibleText();

            return await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { 
                        action: "debateWithAI", 
                        message,
                        content: pageContent,
                        messageHistory: this.messages.length > 1 ? this.messages : undefined
                    },
                    (response: AIDebateResponse) => {
                        if (chrome.runtime.lastError) {
                            reject(new AppError('Failed to send message to background', 
                                              chrome.runtime.lastError as Error,
                                              { message, pageContent }));
                            return;
                        }
                        resolve(response);
                    }
                );
            });
        } catch (error) {
            throw handleError(error, 'Failed to communicate with AI', { message });
        }
    }

    public setStateChangeHandler(handler: (messages: ChatMessage[]) => void) {
        this.onStateChange = handler;
        handler(this.messages.map(msg => ({
            role: msg.role === 'AI' ? 'assistant' : 'user',
            content: msg.content
        })));
    }

    private addMessage(content: string, role: 'AI' | 'user') {
        this.messages.push({ content, role });
        this.onStateChange?.(this.messages.map(msg => ({
            role: msg.role === 'AI' ? 'assistant' : 'user',
            content: msg.content
        })));
    }

    public async submitUserResponse(message: string): Promise<{ shouldClose: boolean, accepted: boolean }> {
        this.addMessage(message, 'user');

        try {
            const response = await this.sendMessageToBackground(message);
            if (!response.success) {
                throw new AppError('AI response indicated failure', undefined, { response });
            }

            if (response.analysis) {
                this.addMessage(response.analysis, 'AI');
                
                if (response.accepted) {
                    return { shouldClose: false, accepted: true };
                } else if (this.debateBehaviour === 'oneRound') {
                    return { shouldClose: true, accepted: false };
                }
            }
        } catch (error) {
            const appError = handleError(error, 'Failed to process user response', { message });
            console.error(appError);
            this.addMessage('Failed to get response', 'AI');
        }

        return { shouldClose: false, accepted: false };
    }
} 