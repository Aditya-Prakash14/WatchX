/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef9ff",
          100: "#d8f1ff",
          200: "#bae8ff",
          300: "#8adbff",
          400: "#52c4ff",
          500: "#2aa4ff",
          600: "#1486f5",
          700: "#0d6de1",
          800: "#1158b6",
          900: "#144b8f",
          950: "#112f57",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
