/**
 * Mobile navigation utilities for webview panels
 * Simplified for VSCode extension context
 */

export interface MobileNavigationConfig {
  collapsibleSections: boolean;
  hamburgerMenu: boolean;
  stackOnMobile: boolean;
}

export const DEFAULT_MOBILE_CONFIG: MobileNavigationConfig = {
  collapsibleSections: true,
  hamburgerMenu: true,
  stackOnMobile: true
};

/**
 * Mobile navigation patterns for VSCode webviews
 */
export class MobileNavigation {
  /**
   * Generate CSS for collapsible sections
   */
  static getCollapsibleCSS(): string {
    return `
      .mobile-collapsible {
        transition: max-height 0.3s ease;
        overflow: hidden;
      }
      
      .mobile-collapsible.collapsed {
        max-height: 0;
      }
      
      .mobile-toggle {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        width: 100%;
        text-align: left;
        font-size: 14px;
        color: var(--vscode-foreground);
        min-height: 44px;
      }
      
      .mobile-toggle:hover {
        background-color: var(--vscode-list-hoverBackground);
      }
      
      .mobile-toggle:focus {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: -2px;
      }
      
      .mobile-toggle::before {
        content: '▶';
        transition: transform 0.3s ease;
        font-size: 12px;
      }
      
      .mobile-toggle.expanded::before {
        transform: rotate(90deg);
      }
      
      @media (max-width: 480px) {
        .mobile-toggle {
          min-height: 48px;
          padding: 16px 12px;
          font-size: 16px;
        }
      }
    `;
  }

  /**
   * Generate JavaScript for collapsible functionality
   */
  static getCollapsibleScript(): string {
    return `
      function initializeCollapsible() {
        const toggles = document.querySelectorAll('.mobile-toggle');
        
        toggles.forEach(toggle => {
          toggle.addEventListener('click', function() {
            const target = document.querySelector(this.getAttribute('data-target'));
            const expanded = this.classList.contains('expanded');
            
            if (expanded) {
              this.classList.remove('expanded');
              target.classList.add('collapsed');
              this.setAttribute('aria-expanded', 'false');
            } else {
              this.classList.add('expanded');
              target.classList.remove('collapsed');
              this.setAttribute('aria-expanded', 'true');
            }
          });
        });
      }
      
      // Initialize when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCollapsible);
      } else {
        initializeCollapsible();
      }
    `;
  }

  /**
   * Generate hamburger menu CSS
   */
  static getHamburgerCSS(): string {
    return `
      .hamburger-menu {
        display: none;
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        margin-right: 8px;
        color: var(--vscode-foreground);
        min-width: 44px;
        min-height: 44px;
        justify-content: center;
        align-items: center;
      }
      
      .hamburger-menu:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
      }
      
      .hamburger-menu:focus {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: -2px;
      }
      
      .hamburger-icon {
        display: flex;
        flex-direction: column;
        width: 18px;
        height: 14px;
        justify-content: space-between;
      }
      
      .hamburger-line {
        height: 2px;
        width: 100%;
        background-color: currentColor;
        transition: all 0.3s ease;
      }
      
      .hamburger-menu.active .hamburger-line:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
      }
      
      .hamburger-menu.active .hamburger-line:nth-child(2) {
        opacity: 0;
      }
      
      .hamburger-menu.active .hamburger-line:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
      }
      
      @media (max-width: 768px) {
        .hamburger-menu {
          display: flex;
        }
        
        .desktop-nav {
          display: none;
        }
        
        .mobile-nav {
          display: block;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
          border-top: none;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
          z-index: 1000;
        }
        
        .mobile-nav.active {
          max-height: 400px;
        }
      }
    `;
  }

  /**
   * Generate JavaScript for hamburger menu
   */
  static getHamburgerScript(): string {
    return `
      function initializeHamburgerMenu() {
        const hamburger = document.querySelector('.hamburger-menu');
        const mobileNav = document.querySelector('.mobile-nav');
        
        if (hamburger && mobileNav) {
          hamburger.addEventListener('click', function() {
            const isActive = this.classList.contains('active');
            
            if (isActive) {
              this.classList.remove('active');
              mobileNav.classList.remove('active');
              this.setAttribute('aria-expanded', 'false');
            } else {
              this.classList.add('active');
              mobileNav.classList.add('active');
              this.setAttribute('aria-expanded', 'true');
            }
          });
          
          // Close menu when clicking outside
          document.addEventListener('click', function(event) {
            if (!hamburger.contains(event.target) && !mobileNav.contains(event.target)) {
              hamburger.classList.remove('active');
              mobileNav.classList.remove('active');
              hamburger.setAttribute('aria-expanded', 'false');
            }
          });
        }
      }
      
      // Initialize when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeHamburgerMenu);
      } else {
        initializeHamburgerMenu();
      }
    `;
  }

  /**
   * Get all mobile navigation styles and scripts
   */
  static getFullMobileNavigation(): { css: string; script: string } {
    const css = [
      this.getCollapsibleCSS(),
      this.getHamburgerCSS()
    ].join('\n');

    const script = [
      this.getCollapsibleScript(),
      this.getHamburgerScript()
    ].join('\n');

    return { css, script };
  }
}