// this is the chrome extension background script

import { AIDebateResponse, MessageResponse, AICallLog, PageContent, DebateMessage } from '../interfaces';
import { AIService } from './ai';
import { logStore } from './logStore';
import { formatPageContent, createJudgementPrompt, continueDebate, createFirstDebatePrompt } from './prompts';
import { handleError, AppError } from '../utils/errors';

console.log('Background script loaded');

// Message handler registry
type MessageHandler = (request: any, sender: chrome.runtime.MessageSender) => Promise<any>;
const messageHandlers: Record<string, MessageHandler> = {
    debateWithAI: async (request) => {
        const response = await handleDebateWithAI(
            request.message, 
            request.content, 
            request.messageHistory
        );
        return response;
    },
    
    getAIJudgement: async (request, sender) => {
        const response = await handleAIJudgement(request.content, sender);
        return response;
    },
    
    getLogs: async (request) => {
        return await handleGetLogs(request.limit);
    },
    
    closeTab: async (_, sender) => {
        if (sender.tab?.id) {
            await chrome.tabs.remove(sender.tab.id);
        }
    },
    
    deleteLogs: async () => {
        await handleDeleteLogs();
    }
};

// Simplified message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    const handler = messageHandlers[request.action];
    if (!handler) {
        sendResponse({ 
            success: false, 
            error: `Unknown action: ${request.action}` 
        });
        return true;
    }

    handler(request, sender)
        .then(sendResponse)
        .catch(error => {
            const appError = handleError(error, `Handler failed: ${request.action}`);
            console.error(appError);
            sendResponse({ 
                success: false, 
                error: appError.message,
                stack: appError.stack
            });
        });

    return true; // Keep message channel open
});

// Simplified handler functions
async function handleDebateWithAI(message: string, content: PageContent, messageHistory?: DebateMessage[]): Promise<MessageResponse> {
    try {
        // Validate inputs with detailed metadata
        if (!message || !content) {
            throw new AppError('Missing required parameters for debate', undefined, {
                receivedMessage: message || 'undefined',
                receivedContent: content || 'undefined',
                messageType: typeof message,
                contentType: typeof content
            });
        }

        // Validate content structure with detailed metadata
        if (!content.url || !content.title) {
            throw new AppError('Invalid page content structure', undefined, {
                url: content.url || 'missing',
                title: content.title || 'missing',
                contentKeys: Object.keys(content),
                contentStructure: JSON.stringify(content, null, 2)
            });
        }

        const aiService = AIService.getInstance();
        const formattedContent = formatPageContent(content);
        
        const prompt = messageHistory 
            ? await continueDebate(messageHistory, formattedContent)
            : await createFirstDebatePrompt(message, formattedContent);
            
        const response = await aiService.callAI(prompt, 'debate');
        return aiService.processDebateResponse(response);
    } catch (error) {
        throw handleError(error, 'Debate failed', {
            message,
            contentSummary: content ? {
                hasUrl: !!content.url,
                hasTitle: !!content.title,
                headerCount: content.headers?.length,
                navigationCount: content.navigation?.length,
                mainContentLength: content.mainContent?.length
            } : 'no content provided'
        });
    }
}

async function handleAIJudgement(
    content: PageContent, 
    sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
    try {
        const aiService = AIService.getInstance();
        const formattedContent = formatPageContent(content);
        const prompt = await createJudgementPrompt(formattedContent);
        const response = await aiService.callAI(prompt, 'judgement');
        
        // Send to content script if tab exists
        if (sender.tab?.id) {
            await chrome.tabs.sendMessage(sender.tab.id, {
                action: 'aiJudgementReceived',
                success: true,
                analysis: response
            });
        }
        
        return { success: true, analysis: response };
    } catch (error) {
        throw handleError(error, 'Page content processing failed', {
            url: content?.url,
            title: content?.title,
            contentLength: content?.mainContent?.length,
            tabId: sender.tab?.id,
            tabUrl: sender.tab?.url
        });
    }
}

async function handleGetLogs(limit: number): Promise<AICallLog[]> {
    try {
        return await logStore.getLogs(limit);
    } catch (error) {
        throw handleError(error, 'Failed to get logs');
    }
}

async function handleDeleteLogs(): Promise<void> {
    try {
        await logStore.clearLogs();
    } catch (error) {
        throw handleError(error, 'Failed to delete logs');
    }
}