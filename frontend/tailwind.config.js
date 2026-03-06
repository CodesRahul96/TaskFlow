/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "bg-primary":    "#0f0f1a",
        "bg-secondary":  "#161625",
        "surface-1":     "#1e1e35",
        "surface-2":     "#252540",
        "border-subtle": "#2a2a4a",
        "border-default":"#3d3d60",
        "border-strong": "#5555a0",
        "text-primary":  "#f1f0ff",
        "text-secondary":"#c5c3e8",
        "text-muted":    "#7b79a8",
        "accent-primary":"#6366f1",
        "accent-glow":   "#818cf8",
        "neon-green":    "#10b981",
        "neon-blue":     "#3b82f6",
        "neon-red":      "#ef4444",
        "neon-yellow":   "#f59e0b",
        "neon-cyan":     "#06b6d4",
        "neon-purple":   "#8b5cf6",
      },
      fontFamily: {
        sans:    ["Inter", "sans-serif"],
        display: ["Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "glow":    "0 0 20px rgba(99,102,241,0.4)",
        "glow-sm": "0 0 10px rgba(99,102,241,0.3)",
        "glow-lg": "0 0 40px rgba(99,102,241,0.5)",
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
