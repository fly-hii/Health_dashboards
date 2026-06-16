import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = apiUrl.startsWith('http') ? apiUrl.replace(/\/api$/, '') : '';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
