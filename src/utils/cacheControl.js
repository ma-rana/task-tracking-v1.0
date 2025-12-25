/**
 * Cache Control utilities to prevent caching of sensitive pages
 */

// List of sensitive routes that should never be cached
const SENSITIVE_ROUTES = [
  '/admin',
  '/admin/dashboard',
  '/admin/users',
  '/admin/groups',
  '/403',
  '/error',
];

// Prevent browser caching of sensitive pages
export const preventCaching = () => {
  // Set meta tags for cache control
  const metaTags = [
    { httpEquiv: 'Cache-Control', content: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
    { httpEquiv: 'Pragma', content: 'no-cache' },
    { httpEquiv: 'Expires', content: '0' },
  ];

  metaTags.forEach(tag => {
    let meta = document.querySelector(`meta[http-equiv="${tag.httpEquiv}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('http-equiv', tag.httpEquiv);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', tag.content);
  });
};

// Clear cache for sensitive routes
export const clearCacheForRoute = (pathname) => {
  if (SENSITIVE_ROUTES.some(route => pathname.startsWith(route))) {
    // Clear any cached data
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Prevent caching
    preventCaching();
  }
};

