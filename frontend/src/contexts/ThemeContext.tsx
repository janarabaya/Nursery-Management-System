import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || 'light';
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      let shouldBeDark = false;

      if (theme === 'auto') {
        // Check system preference
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        shouldBeDark = theme === 'dark';
      }

      setIsDark(shouldBeDark);
      
      // Apply theme to document immediately and forcefully
      const html = document.documentElement;
      const body = document.body;
      
      // Remove all theme classes first
      html.classList.remove('dark-mode', 'light-mode');
      body.classList.remove('dark-mode', 'light-mode');
      
      // Remove all theme attributes
      html.removeAttribute('data-theme');
      body.removeAttribute('data-theme');
      
      if (shouldBeDark) {
        // Add dark mode classes
        html.classList.add('dark-mode');
        body.classList.add('dark-mode');
        html.setAttribute('data-theme', 'dark');
        body.setAttribute('data-theme', 'dark');
        
        // Force background color with !important via inline styles
        html.style.setProperty('background-color', '#0f172a', 'important');
        html.style.setProperty('color', '#e2e8f0', 'important');
        body.style.setProperty('background-color', '#0f172a', 'important');
        body.style.setProperty('color', '#e2e8f0', 'important');
        
        // Force on all main containers
        setTimeout(() => {
          const containers = document.querySelectorAll('.app-shell, .app-main, [class*="-page"], [class*="page"]');
          containers.forEach((el: any) => {
            if (el) {
              el.style.setProperty('background-color', '#0f172a', 'important');
              el.style.setProperty('color', '#e2e8f0', 'important');
            }
          });
        }, 0);
      } else {
        // Light mode
        html.classList.add('light-mode');
        body.classList.add('light-mode');
        html.setAttribute('data-theme', 'light');
        body.setAttribute('data-theme', 'light');
        
        // Reset to light colors
        html.style.removeProperty('background-color');
        html.style.removeProperty('color');
        body.style.removeProperty('background-color');
        body.style.removeProperty('color');
        
        // Reset containers
        setTimeout(() => {
          const containers = document.querySelectorAll('.app-shell, .app-main, [class*="-page"], [class*="page"]');
          containers.forEach((el: any) => {
            if (el) {
              el.style.removeProperty('background-color');
              el.style.removeProperty('color');
            }
          });
        }, 0);
      }
    };

    // Apply theme immediately
    updateTheme();

    // Listen for system theme changes if auto mode is enabled
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    console.log('Setting theme to:', newTheme);
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply immediately without waiting for useEffect
    const html = document.documentElement;
    const body = document.body;
    const shouldBeDark = newTheme === 'dark' || (newTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (shouldBeDark) {
      html.classList.add('dark-mode');
      body.classList.add('dark-mode');
      html.setAttribute('data-theme', 'dark');
      body.setAttribute('data-theme', 'dark');
      html.style.setProperty('background-color', '#0f172a', 'important');
      html.style.setProperty('color', '#e2e8f0', 'important');
      html.style.setProperty('background', '#0f172a', 'important');
      body.style.setProperty('background-color', '#0f172a', 'important');
      body.style.setProperty('color', '#e2e8f0', 'important');
      body.style.setProperty('background', '#0f172a', 'important');
      
      // Force dark mode on all page containers and override gradients
      setTimeout(() => {
        const selectors = [
          '.app-shell', '.app-main', '.app-main-full',
          '[class*="-page"]', '[class*="page"]',
          '[class*="container"]', '[class*="content"]',
          '[class*="dashboard"]', '[class*="management"]',
          '.plants-page', '.home-hero', '.order-management-centered',
          '.manage-plants', '.employee-management', '.inventory-management',
          '.reports', '.customer-feedback-page'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el: any) => {
            if (el) {
              el.style.setProperty('background-color', '#0f172a', 'important');
              el.style.setProperty('background', '#0f172a', 'important');
              el.style.setProperty('background-image', 'none', 'important');
              el.style.setProperty('color', '#e2e8f0', 'important');
            }
          });
        });
        
        // Override all pseudo-elements (::before, ::after) with CSS
        const style = document.createElement('style');
        style.id = 'dark-mode-override';
        style.textContent = `
          html.dark-mode *::before,
          html.dark-mode *::after,
          body.dark-mode *::before,
          body.dark-mode *::after,
          [data-theme="dark"] *::before,
          [data-theme="dark"] *::after {
            background: transparent !important;
            background-image: none !important;
            background-color: transparent !important;
            opacity: 0 !important;
          }
          html.dark-mode .plants-page,
          html.dark-mode .home-hero,
          html.dark-mode .order-management-centered,
          html.dark-mode .manage-plants,
          html.dark-mode .employee-management,
          html.dark-mode .inventory-management,
          html.dark-mode .reports,
          html.dark-mode .customer-feedback-page,
          body.dark-mode .plants-page,
          body.dark-mode .home-hero,
          [data-theme="dark"] .plants-page,
          [data-theme="dark"] .home-hero {
            background: #0f172a !important;
            background-color: #0f172a !important;
            background-image: none !important;
            color: #e2e8f0 !important;
          }
        `;
        const existingStyle = document.getElementById('dark-mode-override');
        if (existingStyle) {
          existingStyle.remove();
        }
        document.head.appendChild(style);
      }, 100);
    } else {
      html.classList.remove('dark-mode');
      body.classList.remove('dark-mode');
      html.setAttribute('data-theme', 'light');
      body.setAttribute('data-theme', 'light');
      html.style.removeProperty('background-color');
      html.style.removeProperty('color');
      body.style.removeProperty('background-color');
      body.style.removeProperty('color');
      
      // Reset containers
      setTimeout(() => {
        const selectors = [
          '.app-shell', '.app-main', '.app-main-full',
          '[class*="-page"]', '[class*="page"]',
          '[class*="container"]', '[class*="content"]',
          '[class*="dashboard"]', '[class*="management"]'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el: any) => {
            if (el) {
              el.style.removeProperty('background-color');
              el.style.removeProperty('background');
              el.style.removeProperty('color');
            }
          });
        });
      }, 100);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

