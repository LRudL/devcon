import { PageContent } from '../interfaces';

export function getAllVisibleText(): PageContent {
    // Helper to check if element is visible
    function isVisible(element: HTMLElement): boolean {
        if (element.id === 'ai-chat-banner' || element.closest('#ai-chat-banner')) {
            return false;
        }
        
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               element.offsetWidth > 0 && 
               element.offsetHeight > 0;
    }

    // Helper to get computed text color and background
    function getTextContext(element: HTMLElement) {
        const style = window.getComputedStyle(element);
        return {
            textColor: style.color,
            backgroundColor: style.backgroundColor
        };
    }

    // Helper to check if text color contrasts with background (rough check)
    function hasContrast(element: HTMLElement): boolean {
        const { textColor, backgroundColor } = getTextContext(element);
        return textColor !== backgroundColor; // Very basic check, could be more sophisticated
    }

    // Get structured content from the page
    const pageContent = {
        url: window.location.href,
        title: document.title,
        headers: [] as string[],
        navigation: [] as string[],
        mainContent: [] as string[],
        timestamp: new Date().toISOString()
    };

    // Get navigation items
    const navElements = document.querySelectorAll('nav, [role="navigation"]');
    navElements.forEach(nav => {
        if (nav instanceof HTMLElement && isVisible(nav)) {
            const navText = nav.innerText.trim();
            if (navText) {
                pageContent.navigation.push(navText);
            }
        }
    });

    // Get headers and important text
    const headerElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, header');
    headerElements.forEach(header => {
        if (header instanceof HTMLElement && isVisible(header)) {
            const headerText = header.innerText.trim();
            if (headerText) {
                pageContent.headers.push(headerText);
            }
        }
    });

    // Get main content including important interactive elements
    const contentElements = document.querySelectorAll(
        'main, article, section, p, div, button, a, input[type="text"], textarea'
    );
    
    contentElements.forEach(element => {
        if (element instanceof HTMLElement && isVisible(element) && hasContrast(element)) {
            // For input elements, get their values or placeholders
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                const value = element.value || element.placeholder;
                if (value) pageContent.mainContent.push(`Input: ${value}`);
            } else {
                // For other elements, get their direct text content (excluding child elements)
                const directText = Array.from(element.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent?.trim())
                    .filter(text => text && text.length > 0)
                    .join(' ');
                
                if (directText) {
                    pageContent.mainContent.push(directText);
                }
            }
        }
    });

    // Remove duplicates and empty strings
    pageContent.navigation = [...new Set(pageContent.navigation)].filter(Boolean);
    pageContent.headers = [...new Set(pageContent.headers)].filter(Boolean);
    pageContent.mainContent = [...new Set(pageContent.mainContent)].filter(Boolean);

    return pageContent;

}

export function blurPageContent() {
    const content = document.body;
    Array.from(content.children).forEach(child => {
        if (child.id !== 'chat-banner-container') {  // Skip the chat banner
            (child as HTMLElement).style.filter = 'blur(3px)';
        }
    });
}

export function unblurPageContent() {
    const allElements = document.body.children;
    for (const element of Array.from(allElements)) {
        (element as HTMLElement).style.filter = '';
    }
} 