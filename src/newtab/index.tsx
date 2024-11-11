import React from 'react';
import { createRoot } from 'react-dom/client';
import NewTab from './NewTab';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<NewTab />); 