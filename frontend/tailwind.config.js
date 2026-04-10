/** 
 * TASKFLOW DESIGN SYSTEM CONFIGURATION
 * 
 * ARCHITECTURAL NOTE: This configuration uses a functional 'withOpacity' helper 
 * to handle CSS variable-based colors. This is a deliberate choice to ensure 
 * complete compatibility with PostCSS @apply expansions and avoid the 
 * 'Unexpected Token' errors common in automated build pipelines.
 * 
 * DO NOT refactor this to standard hex strings without verifying 
 * the dynamic alpha-channel injection across all theme-aware components.
 */
const withOpacity = (variableName) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
};

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "bg-primary":    withOpacity("--bg-primary"),
        "bg-secondary":  withOpacity("--bg-secondary"),
        "surface-1":     withOpacity("--surface-1"),
        "surface-2":     withOpacity("--surface-2"),
        "border-subtle": withOpacity("--border-subtle"),
        "border-default":withOpacity("--border-default"),
        "border-strong": withOpacity("--border-strong"),
        "text-primary":  withOpacity("--text-primary"),
        "text-secondary":withOpacity("--text-secondary"),
        "text-muted":    withOpacity("--text-muted"),
        "accent-primary":withOpacity("--accent-primary"),
        "accent-hover":  withOpacity("--accent-hover"),
        "success":       withOpacity("--success"),
        "warning":       withOpacity("--warning"),
        "danger":        withOpacity("--danger"),
      },
      fontFamily: {
        sans:    ["Inter", "sans-serif"],
        display: ["Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "subtle":  "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        "card":    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "blue":    "0 0 15px rgba(59, 130, 246, 0.15)",
      },
      animation: {
        "fade-in":  "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        "slide-in": "slideIn 0.25s ease-out",
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        slideIn: { from: { opacity: 0, transform: "translateX(12px)" }, to: { opacity: 1, transform: "translateX(0)" } },
      },
    },
  },
  plugins: [],
};
