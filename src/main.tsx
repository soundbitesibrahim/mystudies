import React from 'react';
import { createRoot } from 'react-dom/client';
import AdaptiveApp from './AdaptiveApp';
import './styles.css';
import './pages.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><AdaptiveApp /></React.StrictMode>);
