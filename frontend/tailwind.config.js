/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        monad: {
          dark: "#0a0a0f",
          card: "#12121a",
          border: "#1e1e2e",
          accent: "#00d4aa",
          accentDim: "#00a884",
          muted: "#6b7280",
          danger: "#ef4444",
          warn: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};
