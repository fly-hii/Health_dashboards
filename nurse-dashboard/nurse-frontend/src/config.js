const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  if (typeof window !== 'undefined' && window.location.origin.includes('vercel.app')) {
    return window.location.origin.replace('-frontend', '-backend').replace(/\/$/, '') + '/api';
  }
  return 'http://localhost:5002/api';
};

const getSocketUrl = () => {
  const envSocket = import.meta.env.VITE_SOCKET_URL;
  if (envSocket && envSocket.startsWith('http') && !envSocket.includes('vercel.app')) {
    return envSocket;
  }
  // Vercel serverless cannot support persistent WebSocket connections.
  // Return null to signal that real-time features should be disabled.
  const derived = getApiBaseUrl().replace(/\/api$/, '');
  if (derived.includes('vercel.app') || derived.includes('vercel.com')) return null;
  return derived;
};

const config = {
  // API & Socket
  apiBaseUrl:       getApiBaseUrl(),
  socketUrl:        getSocketUrl(),

  // Hospital branding
  hospitalName:     import.meta.env.VITE_HOSPITAL_NAME      || 'CarePlus',
  hospitalSubtitle: import.meta.env.VITE_HOSPITAL_SUBTITLE  || 'Hospital',
  appTitle:         import.meta.env.VITE_APP_TITLE           || 'CareSync',

  // Defaults
  defaultAvatar:    import.meta.env.VITE_DEFAULT_AVATAR      || '',
  opdTiming:        import.meta.env.VITE_OPD_TIMING          || '09:00 AM - 06:00 PM',
};

export default config;
