import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#19498e",
        "primary-container": "#3761a8",
        secondary: "#39693b",
        tertiary: "#56482e",
        surface: "#fdf9f1",
        "surface-container-low": "#f7f3ec",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#ece8e0",
        "surface-container-highest": "#e6e2db",
        "surface-variant": "#e6e2db",
        outline: "#737782",
        "outline-variant": "#c3c6d2",
        "on-surface": "#1c1c17",
        "on-surface-variant": "#434751",
        "on-primary": "#ffffff",
        "primary-fixed": "#d7e2ff",
        "secondary-fixed": "#baf0b6",
        "tertiary-fixed": "#f5e0bc",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
      },
      fontFamily: {
        headline: ["Manrope", "Avenir Next", "Segoe UI", "sans-serif"],
        body: ["Plus Jakarta Sans", "Avenir Next", "Segoe UI", "sans-serif"],
        label: ["Plus Jakarta Sans", "Avenir Next", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        ambient: "0 24px 48px -12px rgba(28, 28, 23, 0.06)",
      },
      borderRadius: {
        xl: "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
