// ==========================================================================
// ENTERPRISE SECURITY MODULE (Firebase-Ready Architecture)
// ==========================================================================
// Provides advanced XSS protection, safer storage, and robust file/input validation.

export const sanitizeHTML = (str) => {
  if (typeof str !== 'string') return '';
  
  // Expanded map for comprehensive XSS protection
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return str.replace(/[&<>"'`=\/]/g, (m) => map[m]);
};

export const safeParseJSON = (jsonStr, fallback) => {
  if (!jsonStr) return fallback;
  try {
    const parsed = JSON.parse(jsonStr);
    return parsed !== null ? parsed : fallback;
  } catch (e) {
    console.warn("JSON Parsing error handled by security module.");
    return fallback;
  }
};

export const validateUploadedFile = (file) => {
  if (!file) return false;
  
  // Added WebP support for modern performance alongside standard formats
  const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
  const maxSize = 2 * 1024 * 1024; // 2MB Limit
  
  if (!allowedTypes.includes(file.type)) {
    alert("Security Alert: Invalid file format. Please upload JPG, PNG, WEBP, or SVG.");
    return false;
  }
  
  if (file.size > maxSize) {
    alert("Size Limit Exceeded: Maximum allowed file size is 2MB.");
    return false;
  }
  
  // Firebase readiness: Validation logic is encapsulated cleanly 
  // for easy addition of Firebase Storage rules later.
  return true;
};

// NEW: Enterprise Input Validation (Strings, Numbers, Email)
export const validateInput = (value, type = 'text') => {
  if (value === null || value === undefined) return false;
  const sanitized = sanitizeHTML(String(value).trim());
  
  switch(type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(sanitized) ? sanitized : null;
    case 'number':
      const num = parseFloat(sanitized);
      return !isNaN(num) && num >= 0 ? num : null;
    case 'text':
    default:
      return sanitized;
  }
};

// NEW: Secure Local Storage Wrapper (Firebase-Ready Data Structure)
// This prevents LocalStorage corruption and read/write crashes.
export const secureStorage = {
  setItem: (key, value) => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.error(`Storage Security: Error saving ${key}`, e);
    }
  },
  getItem: (key, fallback) => {
    try {
      const item = localStorage.getItem(key);
      return safeParseJSON(item, fallback);
    } catch (e) {
      console.error(`Storage Security: Error reading ${key}`, e);
      return fallback;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Storage Security: Error removing ${key}`, e);
    }
  }
};
