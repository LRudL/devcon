import { AICallLog } from "../interfaces";

export class LogStore {
    private readonly MAX_LOGS = 1000;
    private readonly STORAGE_KEY = 'aiCallLogs';

    async addLog(log: AICallLog): Promise<void> {
        const result = await chrome.storage.local.get([this.STORAGE_KEY]);
        const logs: AICallLog[] = result[this.STORAGE_KEY] || [];
        
        logs.unshift(log);  // Add new log to the beginning
        
        // Trim logs if they exceed MAX_LOGS
        if (logs.length > this.MAX_LOGS) {
            logs.length = this.MAX_LOGS;
        }
        
        await chrome.storage.local.set({ [this.STORAGE_KEY]: logs });
    }

    async getLogs(limit: number = this.MAX_LOGS): Promise<AICallLog[]> {
        const result = await chrome.storage.local.get([this.STORAGE_KEY]);
        const logs: AICallLog[] = result[this.STORAGE_KEY] || [];
        return logs.slice(0, limit);
    }

    async clearLogs(): Promise<void> {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: [] });
    }
}

// Create a singleton instance of LogStore
export const logStore = new LogStore();