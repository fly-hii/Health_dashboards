/**
 * Sanitize image/avatar URLs from the database.
 * Rejects localhost URLs (returns null -> caller uses placeholder),
 * upgrades http:// -> https://, resolves relative /uploads/ paths.
 */
export const getImageUrl = (url) => {
  if (!url) return null;
  if (/localhost|127\.0\.0\.1/.test(url)) return null;
  if (url.startsWith('/')) {
    const origin = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '')
      .replace(/\/api$/, '');
    return origin ? `${origin}${url}` : url;
  }
  if (url.startsWith('http://')) return url.replace(/^http:\/\//, 'https://');
  return url;
};
