import React, { useState } from 'react';
import styled from 'styled-components';
import { optionsManager } from '../../options/optionsManager';

const PauseContainer = styled.div`
    position: relative;
`;

const PauseDropdown = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    background-color: white;
    padding: 8px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    
    button {
        width: 100%;
        text-align: left;
        padding: 4px 8px;
    }
`;

export const PauseButton: React.FC = () => {
    const [showDropdown, setShowDropdown] = useState(false);

    const handlePause = async (minutes: number) => {
        if (minutes === -1) {
            // 1 year from now
            const pauseUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            await optionsManager.set('pauseState', pauseUntil.toISOString());
        } else {
            const pauseUntil = new Date(Date.now() + minutes * 60000);
            await optionsManager.set('pauseState', pauseUntil.toISOString());
        }
        setShowDropdown(false);
    };

    const handleResume = async () => {
        await optionsManager.set('pauseState', false);
        setShowDropdown(false);
    };

    return (
        <PauseContainer>
            <button onClick={() => setShowDropdown(!showDropdown)}>
                Pause
            </button>
            {showDropdown && (
                <PauseDropdown>
                    <button onClick={() => handlePause(5)}>5 minutes</button>
                    <button onClick={() => handlePause(15)}>15 minutes</button>
                    <button onClick={() => handlePause(30)}>30 minutes</button>
                    <button onClick={() => handlePause(60)}>1 hour</button>
                    <button onClick={() => handlePause(-1)}>Indefinitely</button>
                    <button onClick={handleResume}>Resume</button>
                </PauseDropdown>
            )}
        </PauseContainer>
    );
}; 