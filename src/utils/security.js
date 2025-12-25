/**
 * Security utilities for CSRF protection, rate limiting, and session management
 */

// CSRF Token Management
let csrfToken = null;

export const generateCSRFToken = () => {
  // Generate a secure random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  csrfToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('csrf_token', csrfToken);
  return csrfToken;
};

export const getCSRFToken = () => {
  if (!csrfToken) {
    csrfToken = localStorage.getItem('csrf_token') || generateCSRFToken();
  }
  return csrfToken;
};

export const validateCSRFToken = (token) => {
  const storedToken = localStorage.getItem('csrf_token');
  return storedToken && storedToken === token;
};

// Rate Limiting
const rateLimitStore = new Map();

export const checkRateLimit = (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const key = `rate_limit_${identifier}`;
  const attempts = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };

  // Reset if window has passed
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + windowMs;
  }

  // Check if limit exceeded
  if (attempts.count >= maxAttempts) {
    const remainingTime = Math.ceil((attempts.resetTime - now) / 1000);
    return {
      allowed: false,
      remainingTime,
      message: `Too many attempts. Please try again in ${remainingTime} seconds.`
    };
  }

  // Increment attempt count
  attempts.count++;
  rateLimitStore.set(key, attempts);

  return {
    allowed: true,
    remainingAttempts: maxAttempts - attempts.count
  };
};

export const resetRateLimit = (identifier) => {
  const key = `rate_limit_${identifier}`;
  rateLimitStore.delete(key);
  localStorage.removeItem(key);
};

// Session Security
export const validateSessionIntegrity = (sessionToken, expectedType) => {
  if (!sessionToken) return false;
  
  // Check token format
  const parts = sessionToken.split('_');
  if (parts.length < 2) return false;
  
  // Validate token type matches expected
  if (parts[0] !== expectedType) return false;
  
  // Check token hasn't expired (24 hours)
  const timestamp = parseInt(parts[2]);
  if (isNaN(timestamp)) return false;
  
  const tokenAge = Date.now() - timestamp;
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  return tokenAge < maxAge;
};

// Security Headers Helper
export const setSecurityHeaders = () => {
  // Note: In a real application, these would be set server-side
  // This is a client-side helper for reference
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
};

// Permission Validation
export const checkPermission = (user, requiredRole, requiredAdmin = false) => {
  if (!user) return false;
  
  if (requiredAdmin && !user.isAdminUser) return false;
  
  if (requiredRole && user.role !== requiredRole) return false;
  
  return true;
};

// Secure Redirect (prevents open redirects)
export const secureRedirect = (url, allowedDomains = []) => {
  try {
    const urlObj = new URL(url, window.location.origin);
    
    // Only allow same-origin redirects or explicitly allowed domains
    if (urlObj.origin === window.location.origin || allowedDomains.includes(urlObj.origin)) {
      return url;
    }
    
    // Default to safe redirect
    return '/dashboard';
  } catch (e) {
    return '/dashboard';
  }
};

// Audit Logging for Security Events
export const logSecurityEvent = (eventType, details) => {
  const logEntry = {
    type: eventType,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...details
  };
  
  // Store in localStorage (in production, send to secure logging service)
  const existingLogs = JSON.parse(localStorage.getItem('security_logs') || '[]');
  existingLogs.push(logEntry);
  const recentLogs = existingLogs.slice(-100); // Keep last 100 logs
  localStorage.setItem('security_logs', JSON.stringify(recentLogs));
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.warn('Security Event:', logEntry);
  }
};

