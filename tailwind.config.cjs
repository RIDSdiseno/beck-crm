/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // 👈 importante
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta Beck
        "beck-primary": "#F5A623",
        "beck-primary-dark": "#C27800",
        "beck-accent": "#FFCE73",

        // Fondos para ambos modos
        "beck-bg-dark": "#05060A",
        "beck-bg-light": "#F5F5F5",

        "beck-card-dark": "#101320",
        "beck-card-light": "#FFFFFF",

        "beck-border-dark": "#202636",
        "beck-border-light": "#E5E7EB",
      },
      boxShadow: {
        "beck-soft": "0 18px 35px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
