import { MessageResponse, DeviceSettings, SettingsChangeEvent } from '../interfaces';
import { getAllVisibleText, blurPageContent, unblurPageContent } from './pageView';
import { BannerContainer, ChatBanner } from './components/ChatBanner';
import { handleError } from '../utils/errors';
import { TweetProcessor } from './x';
import { optionsManager } from '../options/optionsManager';
import { createRoot } from 'react-dom/client';
import React, { useCallback } from 'react';

console.log('Objective is running');

// Add this type definition near the top of the file
type MessageAction = keyof typeof messageHandlers;

// Add URL pattern matching
// const X_DOMAINS = ['x.com', 'twitter.com'];
// const currentDomain = window.location.hostname;
const settings = await optionsManager.getAll();


// Add this helper function
function isPaused(pauseState: string | false): boolean {
    // pause state is a time stamp string at which the pause expires
    if (!pauseState) return false;
    return new Date() < new Date(pauseState);
}

// Add this type definition
type AIJudgementPolicy = 'pageLoad' | 'manual' | 'interval';

// Add the AI judgment manager
class AIJudgementManager {
    private intervalId: number | null = null;
    private settings: DeviceSettings | null = null;

    constructor() {
        this.initialize();
        // Listen for settings changes
        optionsManager.subscribe(this.handleSettingsChange.bind(this));
    }

    private async initialize() {
        this.settings = await optionsManager.getAll();
        this.setupJudgementPolicy(this.settings.aiJudgementPolicy);
    }

    private handleSettingsChange(event: SettingsChangeEvent) {
        if (event.key === 'aiJudgementPolicy') {
            this.setupJudgementPolicy(event.newValue as AIJudgementPolicy);
        }
    }

    private setupJudgementPolicy(policy: AIJudgementPolicy) {
        if (this.intervalId) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }

        switch (policy) {
            case 'pageLoad':
                this.setupPageLoadTrigger();
                break;
            case 'interval':
                this.setupIntervalTrigger();
                break;
            case 'manual':
                break;
        }
    }

    private setupPageLoadTrigger() {
        window.addEventListener('load', () => {
            this.handlePageLoad();
        });
        
        if ('navigation' in window) {
            ((window as any).navigation).addEventListener('navigate', (event: any) => {
                if (event.navigationType === 'reload' || event.navigationType === 'push') {
                    this.handlePageLoad();
                }
            });
        }
    }

    private setupIntervalTrigger() {
        if (this.settings) {
            this.intervalId = window.setInterval(
                () => handleGetAIJudgement(),
                this.settings.aiJudgementInterval
            );
        }
    }

    private async handlePageLoad() {
        const currentSettings = await optionsManager.getAll();
        if (!isPaused(currentSettings.pauseState)) {
            // handleGetAIJudgement();
            setTimeout(() => handleGetAIJudgement(), 1000);
        }
    }

    public async triggerManualJudgement() {
        const currentSettings = await optionsManager.getAll();
        if (!isPaused(currentSettings.pauseState)) {
            return handleGetAIJudgement();
        }
        return { success: false, error: 'Extension is paused' };
    }
}

// Separate handler functions
async function handleGetAIJudgement() {
    console.log("getting AI judgement ...")
    try {
        const pageText = getAllVisibleText();
        const response = await sendToBackground('getAIJudgement', { content: pageText });
        console.log("handleGetAIJudgement - response", response);
        return response;
    } catch (error) {
        throw handleError(error, 'Failed to get page text');
    }
}

// Update the handleAIJudgementReceived function
async function handleAIJudgementReceived(message: MessageResponse) {
    try {
        if (message.success && message.analysis) {
            if (message.analysis.toLowerCase().trim().startsWith('no')) {
                console.log('Creating chat banner...');
                const cleanAnalysis = message.analysis.replace(/^no\.\s*/i, '');
                
                // Remove any existing banner and root
                const existingBanner = document.getElementById('chat-banner-container');
                if (existingBanner) {
                    existingBanner.remove();
                }
                
                // Create a fresh container
                const container = document.createElement('div');
                container.id = 'chat-banner-container';
                document.body.insertBefore(container, document.body.firstChild);
                
                // Create root and render
                const root = createRoot(container);
                root.render(<BannerContainer message={cleanAnalysis} />);
                
                blurPageContent();
            }
        }
    } catch (error) {
        console.error('Error in handleAIJudgementReceived:', error);
        throw handleError(error, 'Failed to handle AI judgement');
    }
}

// Add pause check before running anything
if (!isPaused(settings.pauseState)) {
    /*
    if (X_DOMAINS.some(domain => currentDomain.includes(domain))) {
        console.log('X domain detected, checking settings...');
        try {
            if (settings.disableOnPageLoad) {
                console.log('Extension functionality disabled on page load');
            }
            if (settings.enableXProcessor) {
                console.log('X processor enabled, starting...');
                const tweetProcessor = new TweetProcessor();
                tweetProcessor.start();
            } else {
                console.log('X processor disabled in settings');
            }
        } catch (error) {
            handleError(error, 'Failed to load X processor');
        }
    }
    */

    if (!settings.disableOnPageLoad) {
        // Initialize the AI judgment manager, which will handle the pause state
        console.log("Initializing AI judgement manager");
        const aiJudgementManager = new AIJudgementManager();
    } else {
        console.log("Objective is disabled on page load");
    }
} else {
    console.log('Extension paused until:', settings.pauseState);
}


// Updated message handlers registry
const messageHandlers = {
    getAIJudgement: handleGetAIJudgement,
    aiJudgementReceived: handleAIJudgementReceived,
    alertUser: async (message: { message: string }) => {
        alert(message.message);
    }
};

// Add this type near the top with other types
type MessagePayload = MessageResponse | { message: string };

// Update the message listener
chrome.runtime.onMessage.addListener((message: { action: MessageAction } & MessagePayload, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    const handler = messageHandlers[message.action];
    if (!handler) {
        sendResponse({ success: false, error: `Unknown action: ${message.action}` });
        return true;
    }

    handler(message as any)  // Use type assertion since handlers know their expected types
        .then(sendResponse)
        .catch(error => {
            const appError = handleError(error, `Handler failed: ${message.action}`);
            console.error(appError);
            sendResponse({ success: false, error: appError.message });
        });

    return true;
});

// Helper function for sending messages to background
async function sendToBackground(action: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action, ...data }, response => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(response);
        });
    });
}

