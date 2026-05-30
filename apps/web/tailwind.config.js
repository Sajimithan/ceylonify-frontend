/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        accent: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        sidebar: {
          bg:     "#0f172a",
          hover:  "#1e293b",
          border: "#1e293b",
          text:   "#94a3b8",
          muted:  "#475569",
        },
        surface: {
          page: "#f8fafc",
          card: "#ffffff",
        },
      },
      backgroundImage: {
        "header-gradient": "linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #0369a1 100%)",
      },
    },
  },
  plugins: [],
}
