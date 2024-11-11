import { MessageResponse } from "../interfaces";
import { handleError } from "../utils/errors";
import { auth } from '../firebase/config';
import { AuthService } from '../services/auth';

document.addEventListener('DOMContentLoaded', () => {
    setupAuth();
    setupTestButton();
    setupSettingsLink();
    setupLogsLink();
});

function setupAuth() {
    const signInForm = document.getElementById('signInForm');
    const signInButton = document.getElementById('signIn') as HTMLButtonElement;
    const signUpButton = document.getElementById('signUp') as HTMLButtonElement;
    const signOutButton = document.getElementById('signOut') as HTMLButtonElement;
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;

    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            signInForm!.style.display = 'none';
            userInfo!.style.display = 'block';
            userEmail!.textContent = user.email || '';
        } else {
            signInForm!.style.display = 'block';
            userInfo!.style.display = 'none';
        }
    });

    signInButton.addEventListener('click', async () => {
        try {
            await AuthService.signIn(emailInput.value, passwordInput.value);
            emailInput.value = '';
            passwordInput.value = '';
        } catch (error) {
            console.error('Sign in failed:', error);
            // You might want to show this error to the user
        }
    });

    signUpButton.addEventListener('click', async () => {
        try {
            await AuthService.signUp(emailInput.value, passwordInput.value);
            emailInput.value = '';
            passwordInput.value = '';
        } catch (error) {
            console.error('Sign up failed:', error);
            // You might want to show this error to the user
        }
    });

    signOutButton.addEventListener('click', async () => {
        try {
            await AuthService.signOut();
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    });
}

function setupTestButton() {
    const button = document.getElementById('testRun');
    const resultDiv = document.createElement('div');
    document.body.appendChild(resultDiv);
    
    if (!button) {
        throw new Error('Test button not found in DOM');
    }
    
    button.addEventListener('click', async () => {
        resultDiv.textContent = 'Processing...';
        
        try {
            const response = await sendMessageToActiveTab('getAIJudgement');
            updateResult(resultDiv, response);
        } catch (error) {
            const appError = handleError(error, 'Test run failed');
            console.error(appError);
            showError(resultDiv, appError.message);
        }
    });
}

function setupSettingsLink() {
    const link = createLink('Settings');
    link.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage(() => {
            if (chrome.runtime.lastError) {
                console.error('Failed to open options:', chrome.runtime.lastError);
            }
        });
    });
    document.body.appendChild(link);
}

function setupLogsLink() {
    const link = createLink('View Logs');
    link.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: '/logs/logs.html' });
    });
    document.body.appendChild(link);
}

async function sendMessageToActiveTab(action: string): Promise<MessageResponse> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
        throw new Error('No active tab found');
    }

    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
            tab.id!,
            { action },
            (response: MessageResponse) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (!response) {
                    reject(new Error('Empty response from content script'));
                    return;
                }
                resolve(response);
            }
        );
    });
}

function updateResult(resultDiv: HTMLElement, response: MessageResponse) {
    if (response.success) {
        resultDiv.textContent = response.analysis || 'No analysis provided';
        resultDiv.style.color = '';
    } else {
        showError(resultDiv, response.error || 'Unknown error');
    }
}

function showError(resultDiv: HTMLElement, message: string) {
    resultDiv.textContent = `Error: ${message}`;
    resultDiv.style.color = 'red';
}

function createLink(text: string): HTMLAnchorElement {
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = text;
    link.style.display = 'block';
    link.style.marginTop = '10px';
    return link;
}