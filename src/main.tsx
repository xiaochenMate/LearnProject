import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Override alert and confirm for iframe compatibility
window.alert = (msg) => {
  console.log('ALERT:', msg);
};
window.confirm = (msg) => {
  console.log('CONFIRM:', msg);
  return true; // Always accept in iframe context
};


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
