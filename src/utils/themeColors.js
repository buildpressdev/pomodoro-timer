// Design System - Color Variables
// Centralized color management for themes and components

// Base Color Palette
export const COLORS = {
  // Timer Colors (consistent across themes)
  TIMER_GREEN: '#4CAF50', // Progress > 50%
  TIMER_ORANGE: '#FF9800', // Progress > 25%
  TIMER_RED: '#F44336', // Progress <= 25%

  // Dark Theme Colors
  DARK: {
    PRIMARY: '#ffffff', // Main text
    SECONDARY: '#e0e0e0', // Secondary text
    ACCENT: '#4ade80', // Green accents
    BACKGROUND: '#0f0f23', // Main background
    GLASS_BG: 'rgba(0, 0, 0, 0.25)',
    GLASS_BORDER: 'rgba(255, 255, 255, 0.1)',
    TEXT_SHADOW: 'rgba(0, 0, 0, 0.8)',
  },

  // Light Theme Colors
  LIGHT: {
    PRIMARY: '#0f0f23', // Main text (darker for contrast)
    SECONDARY: '#2d3748', // Secondary text (darker for contrast)
    ACCENT: '#4ade80', // Same green accent
    BACKGROUND: '#f8f9fa', // Main background
    GLASS_BG: 'rgba(255, 255, 255, 0.85)',
    GLASS_BORDER: 'rgba(0, 0, 0, 0.15)',
    TEXT_SHADOW: 'rgba(0, 0, 0, 0.2)',
  },
};

// Helper function to get theme-appropriate colors
export const getThemeColors = (theme) => {
  return theme === 'light' ? COLORS.LIGHT : COLORS.DARK;
};

// Timer progress color function (consistent across themes)
export const getTimerProgressColor = (progress) => {
  if (progress > 0.5) return COLORS.TIMER_GREEN;
  if (progress > 0.25) return COLORS.TIMER_ORANGE;
  return COLORS.TIMER_RED;
};
