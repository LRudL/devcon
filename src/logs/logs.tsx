import React, { useEffect, useState } from 'react';
import './logs.styles.css';
import { AICallLog, LogTotals } from "../interfaces";

export const LogsPage: React.FC = () => {
    const [logs, setLogs] = useState<AICallLog[]>([]);
    const [totals, setTotals] = useState<LogTotals>({
        inputTokens: 0,
        outputTokens: 0,
        calls: 0
    });
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            console.log('Requesting logs...');
            const fetchedLogs = await chrome.runtime.sendMessage({ action: "getLogs", limit: 1000 });
            console.log('Received logs:', fetchedLogs);
            
            setLogs(fetchedLogs || []);
            
            // Calculate totals
            if (fetchedLogs?.length) {
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
                await chrome.runtime.sendMessage({ action: "deleteLogs" });
                console.log('Logs deleted successfully');
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

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div style={{ color: 'red', padding: '20px' }}>Error loading logs: {error}</div>;
    }

    return (
        <div className="logs-container">
            <h1>API Call Logs</h1>
            
            <div className="stats">
                <h3>Usage Statistics</h3>
                <p>Total Input Tokens: <span>{totals.inputTokens.toLocaleString()}</span></p>
                <p>Total Output Tokens: <span>{totals.outputTokens.toLocaleString()}</span></p>
                <p>Total API Calls: <span>{totals.calls.toLocaleString()}</span></p>
                <button className="delete-logs" onClick={handleDeleteLogs}>
                    Delete All Logs
                </button>
            </div>

            <table>
                <thead>
                    <tr>
                        <th className="timestamp">Timestamp</th>
                        <th className="model">Model</th>
                        <th className="type">Type</th>
                        <th className="tokens">Input Tokens</th>
                        <th className="tokens">Output Tokens</th>
                        <th className="duration">Duration (s)</th>
                        <th className="prompt">Prompt</th>
                        <th className="response">Response</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.length === 0 ? (
                        <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>
                                No logs found. Make some API calls first!
                            </td>
                        </tr>
                    ) : (
                        logs.map((log, index) => (
                            <tr key={log.timestamp + index}>
                                <td className="timestamp">
                                    {new Date(log.timestamp).toISOString().replace('T', ' ').split('.')[0]}
                                </td>
                                <td className="model">{log.model || 'N/A'}</td>
                                <td className="type">{log.type || 'other'}</td>
                                <td className="tokens">{log.inputTokens?.toLocaleString() || 'N/A'}</td>
                                <td className="tokens">{log.outputTokens?.toLocaleString() || 'N/A'}</td>
                                <td className="duration">{log.durationSeconds?.toFixed(2) || 'N/A'}</td>
                                <td className="prompt"><pre>{escapeHtml(log.prompt)}</pre></td>
                                <td className="response"><pre>{escapeHtml(log.response)}</pre></td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};
