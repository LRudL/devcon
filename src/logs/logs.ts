import { AICallLog, LogTotals } from "../interfaces";

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const totalInputTokensElement = document.getElementById('totalInputTokens')!;
        const totalOutputTokensElement = document.getElementById('totalOutputTokens')!;
        const totalCallsElement = document.getElementById('totalCalls')!;
        const logsTableBody = document.getElementById('logsTable')!;

        // Add delete button to stats section
        const statsDiv = document.querySelector('.stats')!;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete All Logs';
        deleteButton.className = 'delete-logs';
        deleteButton.onclick = async () => {
            if (confirm('Are you sure you want to delete all logs? This cannot be undone.')) {
                console.log('Sending deleteLogs message...');
                try {
                    await chrome.runtime.sendMessage({ action: "deleteLogs" });
                    console.log('Logs deleted successfully');
                    window.location.reload(); // Refresh the page to show empty state
                } catch (error) {
                    console.error('Error deleting logs:', error);
                    alert('Failed to delete logs: ' + error);
                }
            }
        };
        statsDiv.appendChild(deleteButton);

        console.log('Requesting logs...');
        const logs = await chrome.runtime.sendMessage({ action: "getLogs", limit: 1000 });
        console.log('Received logs:', logs);

        if (!logs || logs.length === 0) {
            logsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px;">
                        No logs found. Make some API calls first!
                    </td>
                </tr>
            `;
            return;
        }

        // Calculate totals
        const totals = logs.reduce((acc: LogTotals, log: AICallLog): LogTotals => ({
            inputTokens: acc.inputTokens + (log.inputTokens || 0),
            outputTokens: acc.outputTokens + (log.outputTokens || 0),
            calls: acc.calls + 1
        }), { inputTokens: 0, outputTokens: 0, calls: 0 });

        // Update stats
        totalInputTokensElement.textContent = totals.inputTokens.toLocaleString();
        totalOutputTokensElement.textContent = totals.outputTokens.toLocaleString();
        totalCallsElement.textContent = totals.calls.toLocaleString();

        // Populate table
        logs.forEach((log: AICallLog) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="timestamp">${new Date(log.timestamp).toISOString().replace('T', ' ').split('.')[0]}</td>
                <td class="model">${escapeHtml(log.model || 'N/A')}</td>
                <td class="type">${escapeHtml(log.type || 'other')}</td>
                <td class="tokens">${log.inputTokens?.toLocaleString() || 'N/A'}</td>
                <td class="tokens">${log.outputTokens?.toLocaleString() || 'N/A'}</td>
                <td class="duration">${log.durationSeconds?.toFixed(2) || 'N/A'}</td>
                <td class="prompt"><pre>${escapeHtml(log.prompt)}</pre></td>
                <td class="response"><pre>${escapeHtml(log.response)}</pre></td>
            `;
            logsTableBody.appendChild(row);
        });
    } catch (error: unknown) {
        console.error('Failed to load logs:', error);
        document.body.innerHTML += `<div style="color: red; padding: 20px;">Error loading logs: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
    }
});

function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function determinePromptType(prompt: string): string {
    if (prompt.includes('DEBATE PROMPT:')) return 'Debate';
    if (prompt.includes('JUDGEMENT PROMPT:')) return 'Judgement';
    return 'Other';
} 