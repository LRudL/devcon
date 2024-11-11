import { bannerStyles } from '../styles/banner';
import { ChatMessage } from '../../interfaces';
import { unblurPageContent } from '../pageView';
import { DebateManager } from '../debate/DebateManager';
import { AppError, handleError } from '../../utils/errors';

export class ChatBanner {
    private banner: HTMLElement;
    private chatHistory: HTMLElement;
    private debateManager: DebateManager;

    constructor(initialMessage: string) {
        this.banner = this.createBanner();
        this.chatHistory = this.createChatHistory();
        this.debateManager = new DebateManager(initialMessage);
        
        // Subscribe to debate state changes
        this.debateManager.setStateChangeHandler(this.updateChatHistory.bind(this));
        this.setupUI();
    }

    private createBanner(): HTMLElement {
        const banner = document.createElement('div');
        banner.id = 'ai-chat-banner';
        banner.style.cssText = bannerStyles.container;
        return banner;
    }

    private createChatHistory(): HTMLElement {
        const chatHistory = document.createElement('div');
        chatHistory.style.cssText = bannerStyles.chatHistory;
        return chatHistory;
    }

    private updateChatHistory(messages: ChatMessage[]): void {
        this.chatHistory.innerHTML = '';
        messages.forEach(msg => {
            this.chatHistory.appendChild(this.createMessageElement(msg.content, msg.role));
        });
    }

    private createMessageElement(content: string, role: ChatMessage['role']): HTMLElement {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = bannerStyles.message(role);
        messageDiv.textContent = content;
        return messageDiv;
    }

    private async handleSend(input: HTMLInputElement): Promise<void> {
        const userMessage = input.value.trim();
        if (!userMessage) return;

        input.value = '';
        
        try {
            const result = await this.debateManager.submitUserResponse(userMessage);
            
            if (result.accepted) {
                this.removeBanner();
                unblurPageContent();
            } else if (result.shouldClose) {
                await chrome.runtime.sendMessage({ action: "closeTab" });
            }
        } catch (error) {
            console.error(handleError(error, 'Failed to handle user message'));
        }
    }

    private setupUI(): void {
        const { buttonContainer, inputArea } = this.createUIElements();
        this.banner.appendChild(this.chatHistory);
        this.banner.appendChild(buttonContainer);
        document.body.prepend(this.banner);
    }

    private createUIElements(): { buttonContainer: HTMLElement, inputArea: HTMLInputElement } {
        const buttonContainer = document.createElement('div');
        const inputArea = document.createElement('input');
        const closeButton = document.createElement('button');
        
        buttonContainer.style.cssText = bannerStyles.buttonContainer;
        inputArea.style.cssText = bannerStyles.input;
        inputArea.placeholder = "Explain why this activity aligns with your principles...";
        
        closeButton.textContent = "Oops, I won't do this again";
        closeButton.style.cssText = bannerStyles.closeButton;
        closeButton.onclick = async () => {
            await chrome.runtime.sendMessage({ action: "closeTab" });
        };
        
        buttonContainer.appendChild(inputArea);
        buttonContainer.appendChild(closeButton);
        
        inputArea.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (!inputArea.value.trim()) {
                    chrome.runtime.sendMessage({ action: "closeTab" });
                    return;
                }
                this.handleSend(inputArea);
            }
        });
        
        return { buttonContainer, inputArea };
    }

    private removeBanner(): void {
        if (this.banner && this.banner.parentNode) {
            this.banner.parentNode.removeChild(this.banner);
        }
    }
} 