/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg)",
        card: "var(--color-card-bg)",
        "card-hover": "var(--color-card-hover)",
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-muted)",
        border: "var(--color-border)",
        input: "var(--color-input-bg)",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}