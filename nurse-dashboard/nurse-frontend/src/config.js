/**
 * Centralized application configuration.
 * All values are read from Vite environment variables (VITE_ prefix).
 * Fallbacks are provided for development convenience.
 */
const config = {
  // API & Socket
  apiBaseUrl:       import.meta.env.VITE_API_BASE_URL       || '/api',
  socketUrl:        import.meta.env.VITE_SOCKET_URL         || window.location.origin,

  // Hospital branding
  hospitalName:     import.meta.env.VITE_HOSPITAL_NAME      || 'CarePlus',
  hospitalSubtitle: import.meta.env.VITE_HOSPITAL_SUBTITLE  || 'Hospital',
  appTitle:         import.meta.env.VITE_APP_TITLE           || 'CareSync',

  // Defaults
  defaultAvatar:    import.meta.env.VITE_DEFAULT_AVATAR      || '',
  opdTiming:        import.meta.env.VITE_OPD_TIMING          || '09:00 AM - 06:00 PM',
};

export default config;
