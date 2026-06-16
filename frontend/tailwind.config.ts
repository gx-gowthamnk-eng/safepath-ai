import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f4f9",
          100: "#e1e9f2",
          200: "#c2d3e5",
          300: "#94b3d3",
          400: "#5e8dbc",
          500: "#3d70a1",
          600: "#2d5783",
          700: "#244569",
          800: "#182c44",
          900: "#0f172a", // Deep Blue
          950: "#0a0f1d"
        },
        accent: {
          DEFAULT: "#7c3aed", // Purple
          hover: "#6d28d9",
          light: "#ddd6fe"
        },
        emergency: {
          DEFAULT: "#ef4444", // Red
          hover: "#dc2626",
          glow: "rgba(239, 68, 68, 0.4)"
        },
        safe: {
          DEFAULT: "#10b981", // Green
          hover: "#059669"
        },
        warning: {
          DEFAULT: "#f59e0b",
          hover: "#d97706"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        tamil: ["Noto Sans Tamil", "sans-serif"]
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(15, 23, 42, 0.37)',
        'glow-red': '0 0 15px 5px rgba(239, 68, 68, 0.4)',
        'glow-purple': '0 0 15px 5px rgba(124, 58, 237, 0.3)'
      },
      backdropBlur: {
        'xs': '2px'
      }
    },
  },
  plugins: [],
};
export default config;
