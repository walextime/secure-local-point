import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startup } from './startup';

// Make React accessible on the window for debugging, if needed.
(window as Window & { React: typeof React }).React = React;

const container = document.getElementById("root");
if (!container) {
  throw new Error('Root container not found');
}
const root = createRoot(container);

// Centralized startup function
async function main() {
  await startup();
  root.render(<App />);
}

main();
