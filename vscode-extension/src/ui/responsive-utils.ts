import * as vscode from 'vscode';

/**
 * Screen size breakpoints for responsive design
 */
export enum ScreenSize {
  Mobile = 480,    // Phone in portrait
  Tablet = 768,    // Tablet or small laptop
  Desktop = 1024,  // Full desktop
  Wide = 1440      // Wide desktop displays
}

/**
 * Responsive configuration for different screen sizes
 */
export interface ResponsiveConfig {
  buttonSize: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
  fontScale: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  spacing: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
  touchTargets: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}

/**
 * Default responsive configuration
 */
export const DEFAULT_RESPONSIVE_CONFIG: ResponsiveConfig = {
  buttonSize: {
    mobile: '48px',
    tablet: '44px', 
    desktop: '40px'
  },
  fontScale: {
    mobile: 1.2,
    tablet: 1.1,
    desktop: 1.0
  },
  spacing: {
    mobile: '16px',
    tablet: '12px',
    desktop: '8px'
  },
  touchTargets: {
    mobile: '48px',
    tablet: '44px',
    desktop: '40px'
  }
};

/**
 * Responsive utility class for screen size detection and adaptation
 */
export class ResponsiveUtils {
  /**
   * Get the appropriate breakpoint for a given width
   */
  static getBreakpoint(width: number): ScreenSize {
    if (width <= ScreenSize.Mobile) return ScreenSize.Mobile;
    if (width <= ScreenSize.Tablet) return ScreenSize.Tablet;
    if (width <= ScreenSize.Desktop) return ScreenSize.Desktop;
    return ScreenSize.Wide;
  }

  /**
   * Get the appropriate touch target size for a breakpoint
   */
  static getTouchTargetSize(breakpoint: ScreenSize): string {
    switch (breakpoint) {
      case ScreenSize.Mobile: return DEFAULT_RESPONSIVE_CONFIG.touchTargets.mobile;
      case ScreenSize.Tablet: return DEFAULT_RESPONSIVE_CONFIG.touchTargets.tablet;
      default: return DEFAULT_RESPONSIVE_CONFIG.touchTargets.desktop;
    }
  }

  /**
   * Get the appropriate button size for a breakpoint
   */
  static getButtonSize(breakpoint: ScreenSize): string {
    switch (breakpoint) {
      case ScreenSize.Mobile: return DEFAULT_RESPONSIVE_CONFIG.buttonSize.mobile;
      case ScreenSize.Tablet: return DEFAULT_RESPONSIVE_CONFIG.buttonSize.tablet;
      default: return DEFAULT_RESPONSIVE_CONFIG.buttonSize.desktop;
    }
  }

  /**
   * Get the appropriate spacing for a breakpoint
   */
  static getSpacing(breakpoint: ScreenSize): string {
    switch (breakpoint) {
      case ScreenSize.Mobile: return DEFAULT_RESPONSIVE_CONFIG.spacing.mobile;
      case ScreenSize.Tablet: return DEFAULT_RESPONSIVE_CONFIG.spacing.tablet;
      default: return DEFAULT_RESPONSIVE_CONFIG.spacing.desktop;
    }
  }

  /**
   * Get the appropriate font scale for a breakpoint
   */
  static getFontScale(breakpoint: ScreenSize): number {
    switch (breakpoint) {
      case ScreenSize.Mobile: return DEFAULT_RESPONSIVE_CONFIG.fontScale.mobile;
      case ScreenSize.Tablet: return DEFAULT_RESPONSIVE_CONFIG.fontScale.tablet;
      default: return DEFAULT_RESPONSIVE_CONFIG.fontScale.desktop;
    }
  }

  /**
   * Generate CSS media queries for responsive design
   */
  static generateMediaQueries(): string {
    return `
      @media (max-width: ${ScreenSize.Mobile}px) {
        /* Mobile styles */
        .responsive-button {
          min-width: ${DEFAULT_RESPONSIVE_CONFIG.buttonSize.mobile};
          min-height: ${DEFAULT_RESPONSIVE_CONFIG.buttonSize.mobile};
          padding: 16px 20px;
          font-size: 1.1em;
        }
        
        .responsive-input {
          min-height: ${DEFAULT_RESPONSIVE_CONFIG.touchTargets.mobile};
          font-size: 18px;
          padding: 12px;
        }
        
        .responsive-spacing {
          gap: ${DEFAULT_RESPONSIVE_CONFIG.spacing.mobile};
          padding: ${DEFAULT_RESPONSIVE_CONFIG.spacing.mobile};
        }
        
        .responsive-text {
          font-size: 1.2em;
        }
      }
      
      @media (max-width: ${ScreenSize.Tablet}px) and (min-width: ${ScreenSize.Mobile + 1}px) {
        /* Tablet styles */
        .responsive-button {
          min-width: ${DEFAULT_RESPONSIVE_CONFIG.buttonSize.tablet};
          min-height: ${DEFAULT_RESPONSIVE_CONFIG.buttonSize.tablet};
          padding: 12px 16px;
          font-size: 1.05em;
        }
        
        .responsive-input {
          min-height: ${DEFAULT_RESPONSIVE_CONFIG.touchTargets.tablet};
          font-size: 16px;
          padding: 10px;
        }
        
        .responsive-spacing {
          gap: ${DEFAULT_RESPONSIVE_CONFIG.spacing.tablet};
          padding: ${DEFAULT_RESPONSIVE_CONFIG.spacing.tablet};
        }
        
        .responsive-text {
          font-size: 1.1em;
        }
      }
      
      @media (min-width: ${ScreenSize.Desktop + 1}px) {
        /* Desktop and wide styles */
        .responsive-button {
          min-width: ${DEFAULT_RESPONSIVE_CONFIG.buttonSize.desktop};
          min-height: ${DEFAULT_RESPONSIVE_CONFIG.buttonSize.desktop};
          padding: 8px 12px;
        }
        
        .responsive-input {
          min-height: ${DEFAULT_RESPONSIVE_CONFIG.touchTargets.desktop};
          font-size: 14px;
          padding: 8px;
        }
        
        .responsive-spacing {
          gap: ${DEFAULT_RESPONSIVE_CONFIG.spacing.desktop};
          padding: ${DEFAULT_RESPONSIVE_CONFIG.spacing.desktop};
        }
      }
    `;
  }

  /**
   * Check if the current screen size is mobile
   */
  static isMobile(width?: number): boolean {
    // Default to desktop when no width provided (server-side/extension context)
    const screenWidth = width || 1024;
    return screenWidth <= ScreenSize.Mobile;
  }

  /**
   * Check if the current screen size is tablet
   */
  static isTablet(width?: number): boolean {
    // Default to desktop when no width provided (server-side/extension context)
    const screenWidth = width || 1024;
    return screenWidth > ScreenSize.Mobile && screenWidth <= ScreenSize.Tablet;
  }

  /**
   * Check if the current screen size is desktop or larger
   */
  static isDesktop(width?: number): boolean {
    // Default to desktop when no width provided (server-side/extension context)
    const screenWidth = width || 1024;
    return screenWidth > ScreenSize.Tablet;
  }

  /**
   * Get responsive viewport meta tag for webviews
   */
  static getViewportMetaTag(): string {
    return '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">';
  }

  /**
   * Get CSS for ensuring minimum touch targets
   */
  static getTouchTargetCSS(): string {
    return `
      /* Ensure minimum touch target sizes */
      button, input, select, textarea, .clickable {
        min-width: 44px;
        min-height: 44px;
        touch-action: manipulation;
      }
      
      @media (max-width: ${ScreenSize.Mobile}px) {
        button, input, select, textarea, .clickable {
          min-width: 48px;
          min-height: 48px;
        }
      }
      
      /* Adequate spacing between interactive elements */
      button + button,
      .clickable + .clickable {
        margin-left: 8px;
      }
      
      @media (max-width: ${ScreenSize.Mobile}px) {
        button + button,
        .clickable + .clickable {
          margin-left: 12px;
        }
      }
    `;
  }
}