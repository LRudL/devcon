import { DebateMessage, PageContent } from '../interfaces';
import { getTaskLogs } from './logStore';

async function getAcceptedDebateMessages(task: string): Promise<string[]> {
    let apiLogs = await getTaskLogs(task); // this is a list of AICallLogs that were logged while the task was active
    // Now we want to find the ones that have the string "ACCEPTED" in the .response field
    // because that means the AI accepted the user's explanation.
    // When this is found, we should extract the part of the .prompt field AFTER "Previous conversation:" and BEFORE "Evaluate the user"
    // and return that as the .content field of a DebateMessage object, with the .role field set to "User"
    // We should do this for each such API call log that is found, and return all such strings in an array
    let acceptedMessages: string[] = [];
    let i = 1;
    for (let log of apiLogs) {
        if (log.response.includes("ACCEPTED")) {
            let previousConversation = log.prompt.split("Evaluate the user")[0].split("Previous conversation:")[1];
            let aiConclusion = log.response.split("ACCEPTED:")[1];
            let url = log.prompt.split("# URL:\n")[1].split("\n")[0];
            acceptedMessages.push(`Transcript ${i} (the user persuaded you to change your mind about how website ${url} was relevant to task ${task}:\n\n${previousConversation}\n\nAI: ${aiConclusion}.`);
        }
    }
    console.log(acceptedMessages);
    return acceptedMessages;
}

// Helper to truncate content arrays
function truncateContent(arr: string[]): string {
    const joined = arr.join('\n');
    if (joined.length <= 1500) {
        return joined;
    }
    return joined.substring(0, 1497) + '...';
}


export function formatPageContent(content: PageContent): string {
    return `
# URL:
${truncateContent([content.url])}

# Title:
${content.title}

# Headers:
${truncateContent(content.headers)}

# Navigation:
${truncateContent(content.navigation)}

# Main Content:
${truncateContent(content.mainContent)}

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
    
    let acceptedMessages = await getAcceptedDebateMessages(currentTask);
    if (acceptedMessages.length > 0) {
        prompt += `\n\n<BEGIN PAST CASES>Here are some examples of previous cases where the user persuaded you to change your mind about how relevant a website is to the task (keep in mind any lessons you should learn from these):\n${acceptedMessages.join('\n\n---\n\n')} </END PAST CASES>`;
    }

    prompt += `\n\nHere is information about what the user is currently looking at:\n${formattedContent}`;

    prompt += "\n\nNow it is time to make a judgement about the website the user is viewing, based on the principles they have set for themselves that are mentioned above. You should consider that the website the user is viewing may relate indirectly to the user's goal. If the web content is in-line with the principles and objective, respond with just the one word 'Yes', followed by one sentence abotu why the page seems relevant. If it's not, respond with the word 'No', followed by a short reminder to the user of how it doesn't align with their principles and objective.";
    
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