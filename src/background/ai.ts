import { AIDebateResponse } from '../interfaces';
import { logStore } from './logStore';
import { OptionsManagerBase } from '../options/optionsManagerBase';
import { AppError, handleError } from '../utils/errors';
import { sendToActiveTab } from './background';

const CLAUDE_MODEL = "claude-3-haiku-20240307"
const LOCAL_MODEL = "llama3.2"



export class AIService {
    private static instance: AIService;
    private optionsManager: OptionsManagerBase;
    
    constructor() {
        this.optionsManager = new OptionsManagerBase();
    }

    static getInstance(): AIService {
        if (!this.instance) {
            this.instance = new AIService();
        }
        return this.instance;
    }

    /**
     * Main AI call handler that routes to appropriate provider based on settings
     */
    async callAI(prompt: string, type: string = 'other'): Promise<string> {
        const settings = await this.optionsManager.getAll();
        
        if (settings.llmProvider === 'local') {
            if (!settings.localModelName) {
                throw new Error('Please configure a local model name in extension settings');
            }
            return this.callOllama(prompt, type, settings.localModelName);
        } else {
            return this.callClaude(prompt, type);
        }
    }

    /**
     * Makes an API call to Claude with proper error handling and logging
     */
    private async callClaude(prompt: string, type: string = 'other'): Promise<string> {
        const startTime = Date.now();
        try {
            const result = await chrome.storage.local.get(['anthropicApiKey']);
            if (!result.anthropicApiKey) {
                await sendToActiveTab('alertUser', { 
                    message: 'Objective: you need to set your Anthropic API key in extension settings, or configure a local model instead' 
                });
                throw new AppError('Please set your Anthropic API key in extension settings');
            }

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': result.anthropicApiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: CLAUDE_MODEL,
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new AppError(`Claude API Error (${response.status}): ${data.error?.message || 'Unknown error'}`);
            }

            if (!data.content?.[0]?.text) {
                throw new AppError('Unexpected Claude API response structure');
            }

            const aiResponse = data.content[0].text;
            await this.logResponse(type, prompt, aiResponse, startTime, data.usage);
            return aiResponse;

        } catch (error) {
            throw handleError(error, 'Claude API call failed');
        }
    }

    private async logResponse(type: string, prompt: string, response: string, startTime: number, usage?: any) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            model: CLAUDE_MODEL,
            type,
            prompt,
            response,
            inputTokens: usage?.input_tokens,
            outputTokens: usage?.output_tokens,
            durationSeconds: (Date.now() - startTime) / 1000
        };
        await logStore.addLog(logEntry);
    }

    /**
     * Makes an API call to Ollama running locally with proper error handling and logging
     */
    private async callOllama(prompt: string, type: string = 'other', model: string): Promise<string> {
        const startTime = Date.now();
        try {
            const extensionOrigin = chrome.runtime.getURL('');
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': extensionOrigin,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    stream: false
                }),
                mode: 'cors',
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new AppError(
                    `Ollama API Error (${response.status}): ${errorText}\n` +
                    'Please check if Ollama is running with correct permissions.'
                );
            }

            const data = await response.json();
            if (!data.response) {
                throw new AppError('Unexpected Ollama API response structure');
            }

            const aiResponse = data.response;
            await this.logResponse(type, prompt, aiResponse, startTime);
            return aiResponse;

        } catch (error) {
            if (error instanceof AppError) throw error;
            
            // Handle fetch errors (connection issues)
            if (error instanceof TypeError) {
                throw new AppError(
                    'Could not connect to Ollama. Please check if it is running.',
                    error
                );
            }

            // Handle any other errors
            throw handleError(error, 'Ollama API call failed');
        }
    }

    processDebateResponse(response: string): AIDebateResponse {
        const lowerResponse = response.toLowerCase();
        const accepted = lowerResponse.startsWith('accepted:');
        
        return {
            success: true,
            analysis: response.substring(response.indexOf(':') + 1).trim(),
            accepted
        };
    }
} 