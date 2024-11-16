import React, { useState, useEffect, KeyboardEvent, CSSProperties, useCallback, useRef } from 'react';
import { ChatMessage } from '../../interfaces';
import { unblurPageContent } from '../pageView';
import { DebateManager } from '../debate/DebateManager';
import { handleError } from '../../utils/errors';
import { optionsManager } from '../../options/optionsManager';


class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
    constructor(props: {children: React.ReactNode}) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return <div>Something went wrong.</div>;
        }
        return this.props.children;
    }
}

const bannerStyles: {
    container: CSSProperties;
    chatHistory: CSSProperties;
    message: (role: string) => CSSProperties;
    buttonContainer: CSSProperties;
    input: CSSProperties;
    closeButton: CSSProperties;
    newObjectiveButton: CSSProperties;
} = {
    container: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        minHeight: '200px',
        width: '100%',
        borderBottom: '1px solid #DDD'
    },
    chatHistory: {
        maxHeight: '300px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    message: (role: string) => ({
        padding: '8px 12px',
        borderRadius: '8px',
        maxWidth: '80%',
        ...(role === 'user' ? {
            alignSelf: 'flex-end',
            backgroundColor: '#007AFF',
            color: 'white'
        } : {
            alignSelf: 'flex-start',
            backgroundColor: '#E9ECEF',
            color: 'black'
        })
    }),
    buttonContainer: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
    },
    input: {
        flex: 1,
        padding: '8px 12px',
        border: '1px solid #DDD',
        borderRadius: '4px',
        fontSize: '14px'
    },
    closeButton: {
        padding: '8px 16px',
        backgroundColor: '#DC3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    newObjectiveButton: {
        padding: '8px 16px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    }
};

interface ChatBannerProps {
  initialMessage: string;
  onClose: () => void;  // Called when banner should be removed
  onAccepted: () => void;  // Called when debate is accepted
}

export const ChatBanner: React.FC<ChatBannerProps> = ({ initialMessage, onClose, onAccepted }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [debateManager] = useState(() => new DebateManager(initialMessage));
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    debateManager.setStateChangeHandler(setMessages);
  }, [debateManager]);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const userMessage = inputValue.trim();
    if (!userMessage) return;

    setInputValue('');
    
    try {
      const result = await debateManager.submitUserResponse(userMessage);
      
      if (result.accepted) {
        onAccepted();
      } else if (result.shouldClose) {
        onClose();
      }
    } catch (error) {
      console.error(handleError(error, 'Failed to handle user message'));
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!inputValue.trim()) {
        onClose();
        return;
      }
      handleSend();
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleNewObjective = async () => {
    const newObjective = prompt('What would you like to work on instead?');
    if (newObjective?.trim()) {
        try {
            await optionsManager.set("currentTask", newObjective);
            await optionsManager.set('pauseState', false);
            onAccepted();
        } catch (error) {
            console.error('Failed to set new objective:', error);
            alert('Failed to set new objective. Please try again.');
        }
    }
  };

  return (
    <div id="ai-chat-banner" style={bannerStyles.container}>
      <div ref={chatHistoryRef} style={bannerStyles.chatHistory}>
        {messages.map((msg, index) => (
          <div 
            key={index}
            style={bannerStyles.message(msg.role)}
            className={msg.role === 'user' ? 'user-message' : 'assistant-message'}
          >
            {msg.content}
          </div>
        ))}
      </div>
      
      <div style={bannerStyles.buttonContainer}>
        <input
          style={bannerStyles.input}
          placeholder="Explain why this activity aligns with your principles..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button
          style={bannerStyles.closeButton}
          onClick={handleClose}
        >
          Oops, I won't do this again
        </button>
        <button
          style={bannerStyles.newObjectiveButton}
          onClick={handleNewObjective}
        >
          Change objective
        </button>
      </div>
    </div>
  );
};

interface BannerContainerProps {
  message: string;
}

export const BannerContainer: React.FC<BannerContainerProps> = ({ message }) => {
  const closeBanner = useCallback(() => {
    const container = document.getElementById('chat-banner-container');
    if (container) {
      container.remove();
    }
  }, []);

  const handleClose = useCallback(() => {
    closeBanner();
    chrome.runtime.sendMessage({ action: "closeTab" });
  }, []);

  const handleAccepted = useCallback(() => {
    closeBanner();
    unblurPageContent();
  }, []);

  return (
    <ErrorBoundary>
      <ChatBanner 
        initialMessage={message} 
        onClose={handleClose}
        onAccepted={handleAccepted}
      />
    </ErrorBoundary>
  );
};