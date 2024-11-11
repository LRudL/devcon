export const bannerStyles = {
    container: `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #fff;
        color: #333;
        padding: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `,
    chatHistory: `
        max-height: 200px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `,
    buttonContainer: `
        display: flex;
        flex-direction: column;
        gap: 10px;
    `,
    acceptButton: `
        padding: 8px 16px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
        margin-bottom: 10px;
    `,
    inputArea: `
        display: flex;
        gap: 10px;
    `,
    input: `
        flex: 1;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
    `,
    sendButton: `
        padding: 8px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `,
    message: (role: 'assistant' | 'user') => `
        padding: 8px 12px;
        border-radius: 4px;
        max-width: 80%;
        ${role === 'assistant' ? 
            'background: #f0f0f0; align-self: flex-start;' : 
            'background: #007bff; color: white; align-self: flex-start;'
        }
    `,
    closeButton: `
        background-color: #ff4444;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        margin-left: 8px;
        cursor: pointer;
        font-weight: bold;
    `
}; 