import React, { useEffect, useState } from 'react';
import './logs.styles.css';
import { AICallLog, LogTotals, TaskLog } from "../interfaces";
import { logStore, taskLogStore } from '../background/logStore';

export const LogsPage: React.FC = () => {
    const [logType, setLogType] = useState<'api' | 'task'>('api');
    const [logs, setLogs] = useState<(AICallLog | TaskLog)[]>([]);
    const [totals, setTotals] = useState<LogTotals>({
        inputTokens: 0,
        outputTokens: 0,
        calls: 0
    });
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, [logType]);

    const loadLogs = async () => {
        try {
            const fetchedLogs = await chrome.runtime.sendMessage({ 
                action: "getLogs", 
                logType: logType,
                limit: 1000 
            });
            console.log("fetchedLogs", fetchedLogs);
            
            setLogs(fetchedLogs || []);
            
            // Only calculate totals for API logs
            if (logType === 'api' && fetchedLogs?.length) {
                const calculatedTotals = fetchedLogs.reduce((acc: LogTotals, log: AICallLog): LogTotals => ({
                    inputTokens: acc.inputTokens + (log.inputTokens || 0),
                    outputTokens: acc.outputTokens + (log.outputTokens || 0),
                    calls: acc.calls + 1
                }), { inputTokens: 0, outputTokens: 0, calls: 0 });
                
                setTotals(calculatedTotals);
            }
        } catch (error) {
            console.error('Failed to load logs:', error);
            setError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteLogs = async () => {
        if (confirm('Are you sure you want to delete all logs? This cannot be undone.')) {
            try {
                await chrome.runtime.sendMessage({ 
                    action: "deleteLogs",
                    logType: logType 
                });
                console.log(`${logType} logs deleted successfully`);
                window.location.reload();
            } catch (error) {
                console.error('Error deleting logs:', error);
                alert('Failed to delete logs: ' + error);
            }
        }
    };

    const escapeHtml = (unsafe: string): string => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Helper function to get column headers based on log type
    const getColumns = () => {
        if (logType === 'api') {
            return [
                { key: 'timestamp', label: 'Timestamp' },
                { key: 'model', label: 'Model' },
                { key: 'type', label: 'Type' },
                { key: 'inputTokens', label: 'Input Tokens' },
                { key: 'outputTokens', label: 'Output Tokens' },
                { key: 'durationSeconds', label: 'Duration (s)' },
                { key: 'prompt', label: 'Prompt' },
                { key: 'response', label: 'Response' }
            ];
        } else {
            return [
                { key: 'timestamp', label: 'Timestamp' },
                { key: 'task', label: 'Task' }
            ];
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div style={{ color: 'red', padding: '20px' }}>Error loading logs: {error}</div>;
    }

    return (
        <div className="logs-container">
            <div className="log-type-selector">
                <button 
                    className={`tab ${logType === 'api' ? 'active' : ''}`}
                    onClick={() => setLogType('api')}
                >
                    API Call Logs
                </button>
                <button 
                    className={`tab ${logType === 'task' ? 'active' : ''}`}
                    onClick={() => setLogType('task')}
                >
                    Task Logs
                </button>
            </div>
            
            <div className="stats">
                {logType === 'api' ? (
                    <>
                        <h3>Usage Statistics</h3>
                        <p>Total Input Tokens: <span>{totals.inputTokens.toLocaleString()}</span></p>
                        <p>Total Output Tokens: <span>{totals.outputTokens.toLocaleString()}</span></p>
                        <p>Total API Calls: <span>{totals.calls.toLocaleString()}</span></p>
                    </>
                ) : (
                    <h3>Task Logs</h3>
                )}
                <button className="delete-logs" onClick={handleDeleteLogs}>
                    Delete {logType === 'api' ? 'API' : 'Task'} Logs
                </button>
            </div>

            <table>
                <thead>
                    <tr>
                        {getColumns().map(col => (
                            <th key={col.key} className={col.key}>{col.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {logs.length === 0 ? (
                        <tr>
                            <td colSpan={getColumns().length} style={{ textAlign: 'center', padding: '20px' }}>
                                No logs found
                            </td>
                        </tr>
                    ) : (
                        logs.map((log, index) => (
                            <tr key={log.timestamp + index}>
                                {getColumns().map(col => (
                                    <td key={col.key} className={col.key}>
                                        {col.key === 'timestamp' ? (
                                            new Date(log.timestamp).toISOString().replace('T', ' ').split('.')[0]
                                        ) : col.key === 'prompt' || col.key === 'response' ? (
                                            <pre>{escapeHtml(log[col.key as keyof typeof log] as string)}</pre>
                                        ) : (
                                            (log[col.key as keyof typeof log] as any)?.toLocaleString() || 'N/A'
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};
