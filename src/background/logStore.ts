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


// a function that, given a task string, returns all API call log entries that were logged while that task was active
export async function getTaskLogs(task: string): Promise<AICallLog[]> {
    if (task === '') {
        return Promise.resolve([]);
    }
    let apiLogs = await logStore.getLogs();
    let taskLogs = await taskLogStore.getLogs(); // each task log has a task string, and a timestamp string for when it started
    let periods = [];
    let i = 0;
    while (i < taskLogs.length) {
        let taskLog = taskLogs[i];
        if (taskLog.task === task) {
            if (i+1 < taskLogs.length) {
                periods.push([taskLog.timestamp, taskLogs[i+1].timestamp]);
            } else {
                periods.push([taskLog.timestamp, new Date().toISOString()]);
            }
        }
        i++;
    }
    return apiLogs.filter((log) => {
        return periods.some((period) => {
            return log.timestamp >= period[0] && log.timestamp <= period[1];
        });
    });
}