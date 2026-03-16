import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SimpleModeProvider } from './hooks/useSimpleMode';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SimpleModeProvider>
        <App />
      </SimpleModeProvider>
    </BrowserRouter>
  </StrictMode>,
);
