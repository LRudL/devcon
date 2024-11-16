import { BaseLog, AICallLog, TaskLog } from "../interfaces";

abstract class BaseLogStore<T extends BaseLog> {
    protected readonly MAX_LOGS: number = 1000;
    protected abstract readonly STORAGE_KEY: string;

    async addLog(log: T): Promise<void> {
        const result = await chrome.storage.local.get([this.STORAGE_KEY]);
        const logs: T[] = result[this.STORAGE_KEY] || [];
        
        logs.unshift(log);
        
        if (logs.length > this.MAX_LOGS) {
            logs.length = this.MAX_LOGS;
        }
        
        await chrome.storage.local.set({ [this.STORAGE_KEY]: logs });
    }

    async getLogs(limit: number = this.MAX_LOGS): Promise<T[]> {
        const result = await chrome.storage.local.get([this.STORAGE_KEY]);
        const logs: T[] = result[this.STORAGE_KEY] || [];
        return logs.slice(0, limit);
    }

    async clearLogs(): Promise<void> {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: [] });
    }
}

// Maintain existing LogStore functionality
export class LogStore extends BaseLogStore<AICallLog> {
    protected readonly STORAGE_KEY = 'aiCallLogs';
}

// New TaskLogStore for tracking task changes
export class TaskLogStore extends BaseLogStore<TaskLog> {
    protected readonly STORAGE_KEY = 'taskLogs';
}

// Create singleton instances
export const logStore = new LogStore();
export const taskLogStore = new TaskLogStore();