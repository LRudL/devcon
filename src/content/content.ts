import { MessageResponse, DeviceSettings, SettingsChangeEvent } from '../interfaces';
import { getAllVisibleText, blurPageContent } from './pageView';
import { ChatBanner } from './components/ChatBanner';
import { handleError } from '../utils/errors';
import { TweetProcessor } from './x';
import { optionsManager } from '../options/optionsManager';

console.log('Content script loaded!');

// Add this type definition near the top of the file
type MessageAction = keyof typeof messageHandlers;

// Add URL pattern matching
const X_DOMAINS = ['x.com', 'twitter.com'];
const currentDomain = window.location.hostname;

if (X_DOMAINS.some(domain => currentDomain.includes(domain))) {
    console.log('X domain detected, checking settings...');
    try {
        const settings = await optionsManager.getAll();
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
        setTimeout(() => handleGetAIJudgement(), 1000);
    }

    public triggerManualJudgement() {
        return handleGetAIJudgement();
    }
}

// Initialize the AI judgment manager
const aiJudgementManager = new AIJudgementManager();

// Separate handler functions
async function handleGetAIJudgement() {
    console.log("getting AI judgement ...")
    try {
        const pageText = getAllVisibleText();
        const response = await sendToBackground('getAIJudgement', { content: pageText });
        return response;
    } catch (error) {
        throw handleError(error, 'Failed to get page text');
    }
}

async function handleAIJudgementReceived(message: MessageResponse) {
    try {
        if (message.success && message.analysis) {
            if (message.analysis.toLowerCase().trim().startsWith('no')) {
                const cleanAnalysis = message.analysis.replace(/^no\.\s*/i, '');
                new ChatBanner(cleanAnalysis);
                blurPageContent();
            }
        } else {
            console.log("AI thinks this page is fine")
        }
    } catch (error) {
        throw handleError(error, 'Failed to handle AI judgement');
    }
}

// Updated message handlers registry
const messageHandlers = {
    getAIJudgement: handleGetAIJudgement,
    aiJudgementReceived: handleAIJudgementReceived
};

// Message listener
chrome.runtime.onMessage.addListener((message: { action: MessageAction } & MessageResponse, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    const handler = messageHandlers[message.action];
    if (!handler) {
        sendResponse({ success: false, error: `Unknown action: ${message.action}` });
        return true;
    }

    handler(message)
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


