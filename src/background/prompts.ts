import { DebateMessage, PageContent } from '../interfaces';

export function formatPageContent(content: PageContent): string {
    // Helper to truncate content arrays
    function truncateContent(arr: string[], prefix: string): string {
        const joined = arr.join('\n');
        if (joined.length <= 1500) {
            return joined;
        }
        return joined.substring(0, 1497) + '...';
    }

    return `
# URL:
${content.url}

# Title:
${content.title}

# Headers:
${truncateContent(content.headers, 'Headers')}

# Navigation:
${truncateContent(content.navigation, 'Navigation')}

# Main Content:
${truncateContent(content.mainContent, 'Main Content')}

# Timestamp:
${content.timestamp}
    `.trim();
}

export async function createJudgementPrompt(formattedContent: string): Promise<string> {
    const result = await chrome.storage.local.get(['deviceConstitution', 'currentTask']);
    const constitution = result.deviceConstitution || '';
    const currentTask = result.currentTask || '';

    let prompt = `Your goal is to figure out whether a website the user is looking at is in-line with the principles they've laid out for themselves and their current objective.`;

    if (constitution) {
        prompt += `\n\nHere are the fixed principles for web browsing that the user has set:\n${constitution}`;
    } else {
        prompt += `\n\nThe user has not set any fixed principles. Please see below for what their current task is.`;
    }

    if (currentTask !== '') {
        prompt += `\n\nHere is the current task the user is working on:\n${currentTask}`;
    } else {
        prompt += '\n\nThe user has not set any specific task or objective, so only the general principles above apply.';
    }
    
    prompt += `\n\nHere is information about what they are currently looking at:\n${formattedContent}`;
    prompt += "\n\nIf the web content is in-line with the principles and objective, respond with just the one word 'Yes', followed by one sentence abotu why the page seems relevant. If it's not, respond with the word 'No', followed by a short reminder to the user of how it doesn't align with their principles and objective.";
    
    return prompt.trim();
}

async function debatePromptBase(formattedContent: string): Promise<string> {
    const result = await chrome.storage.local.get(['deviceConstitution', 'currentTask']);
    const constitution = result.deviceConstitution || '';
    const currentTask = result.currentTask || '';
    
    return `
You are evaluating whether a user's explanation for their web browsing aligns with their principles and current objective.

Their principles are:
${constitution}

Their current objective is:
${currentTask ? currentTask : 'They have not set themselves a specific current objective'}

Here is information about what they are currently looking at:
${formattedContent}`.trim();
}

export async function createFirstDebatePrompt(userExplanation: string, formattedContent: string): Promise<string> {
    const basePrompt = await debatePromptBase(formattedContent);
    
    return `${basePrompt}

The user has provided this explanation for their current activity:
${userExplanation}

Evaluate whether this explanation is reasonable and aligns with their principles.
Respond with either:
"ACCEPTED: [brief explanation]" if you find their reasoning valid
"REJECTED: [brief explanation]" if you find their reasoning inadequate. Your explanation should be concise, address the user directly, and mention specifically the self-set rules that the user is violating.`.trim();
}

export async function continueDebate(messageHistory: DebateMessage[], formattedContent: string): Promise<string> {
    const basePrompt = await debatePromptBase(formattedContent);
    
    const formattedHistory = messageHistory
        .map(msg => `${msg.role === 'AI' ? 'AI' : 'User'}: ${msg.content}`)
        .join('\n\n');
    
    return `${basePrompt}

Previous conversation:
${formattedHistory}

Evaluate the user's latest response and continue the debate about whether their browsing aligns with their principles.
Respond with either:
"ACCEPTED: [brief explanation]" if you find their reasoning valid
"REJECTED: [brief explanation]" if you find their reasoning inadequate. Your explanation should be concise, address the user directly, and mention specifically the self-set rules that the user is violating`.trim();
} 