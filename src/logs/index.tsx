import React from 'react';
import { createRoot } from 'react-dom/client';
import { LogsPage } from './logs';

const container = document.getElementById('root');
if (!container) {
    throw new Error('Failed to find root element');
}
const root = createRoot(container);
root.render(<LogsPage />); 