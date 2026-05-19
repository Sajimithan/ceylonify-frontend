/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0EA5A4",
          dark: "#0B6E6D",
        },
        navy: "#0B1220",
        background: {
          light: "#F7FAFC",
          dark: "#07101D",
        },
        surface: "#FFFFFF",
        text: {
          primary: "#0B1220",
          onDark: "#EAF2FF",
          muted: "#667085",
        },
        border: "#E5E7EB",
        accent: {
          orange: "#FF6B35",
        },
        status: {
          success: "#22C55E",
          warning: "#F59E0B",
          error: "#EF4444",
          info: "#3B82F6",
        },
      },
      borderRadius: {
        card: "16px",
        input: "12px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};
