/**
 * Image handling utilities for Story Mode Library system
 * Provides local storage and retrieval of uploaded images
 */

export interface ImageUploadResult {
  url: string;
  originalName: string;
  size: number;
  type: string;
}

/**
 * Convert uploaded file to base64 data URL for local storage
 */
export async function processImageFile(file: File): Promise<ImageUploadResult> {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Allowed: JPG, PNG, WebP`);
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size too large. Maximum size is 5MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve({
          url: result,
          originalName: file.name,
          size: file.size,
          type: file.type
        });
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generate default placeholder image URLs for books and shelves
 */
export function getDefaultImage(type: 'book' | 'shelf', name: string): string {
  // Create simple SVG placeholders with initials/icon
  const initial = name.charAt(0).toUpperCase() || '?';
  
  if (type === 'book') {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="120" height="160" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="120" height="160" fill="url(#bookGrad)" rx="8"/>
        <text x="60" y="90" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle">${initial}</text>
      </svg>
    `)}`;
  } else {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="shelfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#059669;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0891B2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="200" fill="url(#shelfGrad)" rx="12"/>
        <text x="200" y="110" font-family="Arial, sans-serif" font-size="64" fill="white" text-anchor="middle">${initial}</text>
      </svg>
    `)}`;
  }
}

/**
 * Validate image URL (for both data URLs and regular URLs)
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Check if it's a data URL
  if (url.startsWith('data:image/')) return true;
  
  // Check if it's a valid HTTP(S) URL with common image extensions
  try {
    const parsedUrl = new URL(url);
    const validProtocols = ['http:', 'https:'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    
    return validProtocols.includes(parsedUrl.protocol) &&
           validExtensions.some(ext => parsedUrl.pathname.toLowerCase().endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Preload image to check if it loads successfully
 */
export function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}