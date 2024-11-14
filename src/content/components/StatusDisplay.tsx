import React, { useState, useEffect } from 'react';
import { optionsManager } from '../../options/optionsManager';

export const StatusDisplay: React.FC = () => {
    const [status, setStatus] = useState<string>('Loading...');

    useEffect(() => {
        const updateStatus = async () => {
            const settings = await optionsManager.getAll();
            console.log('Status update - pause state:', settings.pauseState);
            if (!settings.pauseState) {
                setStatus('Running');
            } else {
                const pauseDate = new Date(settings.pauseState);
                if (pauseDate > new Date()) {
                    setStatus(`Paused until ${pauseDate.toLocaleTimeString()}`);
                } else {
                    await optionsManager.set('pauseState', false);
                    setStatus('Running');
                }
            }
        };

        updateStatus();
        const unsubscribe = optionsManager.subscribe((event) => {
            console.log('Status subscription event:', event);
            if (event.key === 'pauseState') {
                updateStatus();
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <center>
            <div className="status-display">
                Status: {status}
            </div>
            <br></br>
        </center>
    );
}; 