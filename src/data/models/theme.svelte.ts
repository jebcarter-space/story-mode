import type { ThemeName } from '../types';

// Theme definitions with official color specifications
export const themeDefinitions = {
  light: {
    name: 'Light',
    description: 'Clean, bright theme (default)',
    colors: {
      background: '#f5f5f4', // stone-100
      foreground: '#44403c', // stone-700
      muted: '#d6d3d1', // stone-300
      accent: '#0c0a09', // stone-900
      border: '#0c0a09', // stone-900
      input: '#f5f5f4', // stone-100
      button: '#d6d3d1', // stone-300
      buttonHover: '#a8a29e', // stone-400
      disabled: '#f5f5f4', // stone-100
      focus: '#a8a29e', // stone-400
      success: '#22c55e', // green-500
      warning: '#eab308', // yellow-500
      danger: '#ef4444', // red-500
    }
  },
  dark: {
    name: 'Dark',
    description: 'Standard dark mode with good contrast',
    colors: {
      background: '#0c0a09', // stone-900
      foreground: '#f5f5f4', // stone-100
      muted: '#57534e', // stone-600
      accent: '#f5f5f4', // stone-100
      border: '#57534e', // stone-600
      input: '#292524', // stone-800
      button: '#57534e', // stone-600
      buttonHover: '#292524', // stone-800
      disabled: '#a8a29e', // stone-400
      focus: '#292524', // stone-800
      success: '#22c55e', // green-500
      warning: '#eab308', // yellow-500
      danger: '#ef4444', // red-500
    }
  },
  nord: {
    name: 'Nord',
    description: 'Arctic, north-bluish color palette',
    colors: {
      background: '#2E3440', // Polar Night 0
      foreground: '#ECEFF4', // Snow Storm 2
      muted: '#3B4252', // Polar Night 1
      accent: '#88C0D0', // Frost 1
      border: '#4C566A', // Polar Night 3
      input: '#3B4252', // Polar Night 1
      button: '#434C5E', // Polar Night 2
      buttonHover: '#4C566A', // Polar Night 3
      disabled: '#434C5E', // Polar Night 2
      focus: '#5E81AC', // Frost 3
      primary: '#81A1C1', // Frost 2
      secondary: '#8FBCBB', // Frost 0
      tertiary: '#BF616A', // Aurora 0
      success: '#8FBCBB', // Frost 0 (greenish)
      warning: '#EBCB8B', // Aurora 3 (yellow)
      danger: '#BF616A', // Aurora 0 (red)
    }
  },
  dracula: {
    name: 'Dracula',
    description: 'Dark theme with vibrant colors',
    colors: {
      background: '#282A36', // Background
      foreground: '#F8F8F2', // Foreground
      muted: '#44475A', // Selection
      accent: '#FF79C6', // Pink
      border: '#6272A4', // Comment
      input: '#44475A', // Selection
      button: '#44475A', // Selection
      buttonHover: '#6272A4', // Comment
      disabled: '#6272A4', // Comment
      focus: '#BD93F9', // Purple
      primary: '#8BE9FD', // Cyan
      secondary: '#50FA7B', // Green
      tertiary: '#FFB86C', // Orange
      success: '#50FA7B', // Green
      warning: '#F1FA8C', // Yellow
      danger: '#FF5555', // Red
    }
  },
  gruvbox: {
    name: 'Gruvbox',
    description: 'Retro groove colors with warm contrast',
    colors: {
      background: '#282828', // bg0_hard
      foreground: '#ebdbb2', // fg
      muted: '#3c3836', // bg1
      accent: '#fabd2f', // yellow
      border: '#665c54', // bg4
      input: '#3c3836', // bg1
      button: '#504945', // bg2
      buttonHover: '#665c54', // bg4
      disabled: '#7c6f64', // bg4
      focus: '#fe8019', // orange
      primary: '#83a598', // blue
      secondary: '#b8bb26', // green
      tertiary: '#fb4934', // red
      success: '#b8bb26', // green
      warning: '#fabd2f', // yellow
      danger: '#fb4934', // red
    }
  },
  solarized: {
    name: 'Solarized',
    description: 'Precision colors for machines and people',
    colors: {
      background: '#002b36', // base03
      foreground: '#839496', // base0
      muted: '#073642', // base02
      accent: '#268bd2', // blue
      border: '#586e75', // base01
      input: '#073642', // base02
      button: '#073642', // base02
      buttonHover: '#586e75', // base01
      disabled: '#586e75', // base01
      focus: '#2aa198', // cyan
      primary: '#859900', // green
      secondary: '#b58900', // yellow
      tertiary: '#dc322f', // red
      success: '#859900', // green
      warning: '#b58900', // yellow
      danger: '#dc322f', // red
    }
  }
} as const;

export function createTheme() {
  // Check for legacy dark mode setting and migrate
  const legacyDarkMode = localStorage.getItem('darkMode');
  let initialTheme: ThemeName = 'light';
  
  if (legacyDarkMode === 'true') {
    initialTheme = 'dark';
    localStorage.removeItem('darkMode'); // Clean up legacy setting
  }
  
  // Get theme from localStorage or use initial theme
  const savedTheme = localStorage.getItem('theme') as ThemeName;
  let currentTheme: ThemeName = $state(savedTheme || initialTheme);

  // Apply theme to document root
  function applyTheme(theme: ThemeName) {
    const root = document.documentElement;
    const colors = themeDefinitions[theme].colors;
    
    // Set CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });
    
    // Set theme class on app element
    const app = document.getElementById('app');
    if (app) {
      // Remove all theme classes
      Object.keys(themeDefinitions).forEach(themeName => {
        app.classList.remove(themeName);
      });
      // Add current theme class
      app.classList.add(theme);
      
      // Keep legacy dark class for backward compatibility
      if (theme === 'dark') {
        app.classList.add('dark');
      } else {
        app.classList.remove('dark');
      }
    }
  }

  // Apply theme on initialization
  $effect(() => {
    applyTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);
  });

  return {
    get value() {
      return currentTheme;
    },
    get isDark() {
      // For backward compatibility with existing dark mode checks
      return currentTheme !== 'light';
    },
    set(theme: ThemeName) {
      currentTheme = theme;
    },
    toggle() {
      // For backward compatibility - cycle between light and dark
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    },
    get availableThemes() {
      return Object.keys(themeDefinitions) as ThemeName[];
    },
    getThemeDefinition(theme: ThemeName) {
      return themeDefinitions[theme];
    }
  };
}