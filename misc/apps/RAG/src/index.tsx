import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initializePlugins } from './plugins';
import { initializeGraph } from './graph';

// Initialize FlowQuery plugins before rendering
initializePlugins();

// Initialize the FlowQuery graph and then render the app
initializeGraph().then(() => {
    const container = document.getElementById('root');
    if (container) {
        const root = createRoot(container);
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    }
}).catch((error) => {
    console.error('Failed to initialize FlowQuery graph:', error);
    // Still render the app even if graph initialization fails
    const container = document.getElementById('root');
    if (container) {
        const root = createRoot(container);
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    }
});
