import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register standalone offline PWA service worker for Android, iOS & Desktop
registerSW({immediate: true});

createRoot(document.getElementById('root')!).render(<App />);
