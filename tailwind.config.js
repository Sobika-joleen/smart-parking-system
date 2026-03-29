/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neon: "#c6ff00",
        "neon-dim": "#a8d900",
        dark: {
          900: "#0f0f0f",
          800: "#161616",
          700: "#1e1e1e",
          600: "#252525",
          500: "#2e2e2e",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 16px rgba(198,255,0,0.35)",
        "neon-sm": "0 0 8px rgba(198,255,0,0.25)",
        "neon-lg": "0 0 32px rgba(198,255,0,0.55)",
        card: "0 4px 24px rgba(0,0,0,0.5)",
      },
      animation: {
        pulse_neon: "pulse_neon 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease forwards",
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float 8s ease-in-out 3s infinite",
        shimmer: "shimmer 2s linear infinite",
        "slide-up": "slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slot-entry": "slotEntry 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "scan-line": "scanLine 4s linear infinite",
        ticker: "ticker 28s linear infinite",
        "glow-breathe": "glowBreathe 3s ease-in-out infinite",
        "selection-ring": "selectionRing 1.5s ease-in-out infinite",
        "count-up": "countUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "slide-right": "slideRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "avatar-pulse": "avatarPulse 2.5s ease-in-out infinite",
        "stagger-in": "staggerIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "bounce-in": "bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "sweep": "sweep 2.5s ease-in-out infinite",
      },
      keyframes: {
        pulse_neon: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(198,255,0,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(198,255,0,0.7)" },
        },
        fadeIn: {
          from: { opacity: 0, transform: "translateY(4px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        slideUp: {
          from: { opacity: 0, transform: "translateY(40px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        slotEntry: {
          from: { opacity: 0, transform: "translateY(16px) scale(0.92)" },
          to: { opacity: 1, transform: "translateY(0) scale(1)" },
        },
        scanLine: {
          "0%": { transform: "translateY(-100%)", opacity: 0 },
          "10%": { opacity: 1 },
          "90%": { opacity: 1 },
          "100%": { transform: "translateY(400%)", opacity: 0 },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        glowBreathe: {
          "0%, 100%": {
            boxShadow: "0 0 8px rgba(198,255,0,0.3), 0 0 0 0 rgba(198,255,0,0)",
          },
          "50%": {
            boxShadow: "0 0 24px rgba(198,255,0,0.7), 0 0 0 6px rgba(198,255,0,0.08)",
          },
        },
        selectionRing: {
          "0%, 100%": { boxShadow: "0 0 0 2px rgba(198,255,0,0.4), 0 0 18px rgba(198,255,0,0.2)" },
          "50%": { boxShadow: "0 0 0 4px rgba(198,255,0,0.7), 0 0 28px rgba(198,255,0,0.4)" },
        },
        countUp: {
          from: { transform: "translateY(8px)", opacity: 0 },
          to: { transform: "translateY(0)", opacity: 1 },
        },
        slideRight: {
          from: { transform: "translateX(-20px)", opacity: 0 },
          to: { transform: "translateX(0)", opacity: 1 },
        },
        avatarPulse: {
          "0%, 100%": { boxShadow: "0 0 0 2px rgba(198,255,0,0.3)" },
          "50%": { boxShadow: "0 0 0 4px rgba(198,255,0,0.6)" },
        },
        staggerIn: {
          from: { opacity: 0, transform: "translateX(20px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        bounceIn: {
          "0%": { opacity: 0, transform: "scale(0.7)" },
          "60%": { transform: "scale(1.05)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};
