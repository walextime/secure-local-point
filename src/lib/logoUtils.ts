/**
 * Logo utilities for TechPlusPOS
 * Provides fallback to favicon.ico when no custom logo is set
 */

/**
 * Get the logo URL with fallback to favicon.ico
 * @param customLogo - The custom logo URL from settings
 * @returns The logo URL to use
 */
export const getLogoUrl = (customLogo?: string): string => {
  if (customLogo && customLogo.trim() !== '') {
    return customLogo;
  }
  return '/favicon.ico';
};

/**
 * Check if a logo URL is the default favicon
 * @param logoUrl - The logo URL to check
 * @returns True if it's the default favicon
 */
export const isDefaultLogo = (logoUrl?: string): boolean => {
  return !logoUrl || logoUrl === '/favicon.ico' || logoUrl.trim() === '';
};

/**
 * Get logo display text for UI
 * @param customLogo - The custom logo URL from settings
 * @returns Display text for the logo
 */
export const getLogoDisplayText = (customLogo?: string): string => {
  if (isDefaultLogo(customLogo)) {
    return 'Using default TechPlusPOS logo';
  }
  return 'Custom logo uploaded';
};

/**
 * Convert favicon.ico to base64 for use in receipts/PDFs
 * This is a fallback when no custom logo is available
 */
export const getFaviconAsBase64 = (): string => {
  // This would need to be implemented if we want to use favicon.ico in PDFs
  // For now, we'll return an empty string and let the PDF generator handle it
  return '';
}; 