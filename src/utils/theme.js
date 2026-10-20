export const ACCENT_PALETTES = {
  blue: {
    id: 'blue',
    name: 'Royal Blue',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    glow: 'rgba(59, 130, 246, 0.45)'
  },
  amber: {
    id: 'amber',
    name: 'Saffron Gold',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glow: 'rgba(245, 158, 11, 0.45)'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Peace',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    glow: 'rgba(16, 185, 129, 0.45)'
  },
  purple: {
    id: 'purple',
    name: 'Mystic Violet',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    glow: 'rgba(139, 92, 246, 0.45)'
  },
  rose: {
    id: 'rose',
    name: 'Devotional Rose',
    color: '#f43f5e',
    gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)',
    glow: 'rgba(244, 63, 94, 0.45)'
  },
  cyan: {
    id: 'cyan',
    name: 'Cosmic Cyan',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    glow: 'rgba(6, 182, 212, 0.45)'
  }
};

export const applyThemeAndAccent = (theme = 'dark', accentId = 'blue') => {
  if (typeof document === 'undefined') return;

  const validAccent = ACCENT_PALETTES[accentId] ? accentId : 'blue';
  const palette = ACCENT_PALETTES[validAccent];

  // Set theme class on body
  document.body.className = theme === 'light' 
    ? 'light-mode' 
    : theme === 'saffron' 
      ? 'saffron-mode' 
      : '';

  // Set data attributes on both <html> and <body>
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-accent', validAccent);
  document.body.setAttribute('data-theme', theme);
  document.body.setAttribute('data-accent', validAccent);

  // Directly set CSS variables on both :root (html) and body
  // Setting directly on style overrides any CSS selector specificity issues!
  const targets = [document.documentElement, document.body];
  targets.forEach(el => {
    el.style.setProperty('--accent-color', palette.color);
    el.style.setProperty('--accent-gradient', palette.gradient);
    el.style.setProperty('--accent-glow', palette.glow);
  });
};
