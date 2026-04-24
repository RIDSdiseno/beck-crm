/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "beck-primary": "#F2C230",
        "beck-primary-dark": "#D0A514",
        "beck-accent": "#F8E18E",
        "beck-ink": "#17181A",
        "beck-ink-soft": "#3A4147",
        "beck-muted": "#6B7280",
        "beck-bg-dark": "#05060A",
        "beck-bg-light": "#F3F4EF",
        "beck-surface-light": "#FFFBF0",
        "beck-surface-alt": "#F8F6EC",
        "beck-card-dark": "#101320",
        "beck-card-light": "#FFFFFF",
        "beck-border-dark": "#202636",
        "beck-border-light": "#D8DCD6",
      },
      boxShadow: {
        "beck-soft": "0 18px 35px rgba(0,0,0,0.35)",
        "beck-panel": "0 16px 30px rgba(23,24,26,0.08)",
      },
    },
  },
  plugins: [],
};
