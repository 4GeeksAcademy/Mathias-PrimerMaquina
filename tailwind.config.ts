import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#ececf4",
        card: "#f2f3fb",
        ink: "#0f1222",
        accent: "#3326d0",
        accentSoft: "#dbd9ff",
        line: "#c7cae1",
        ok: "#5ee7b8",
      },
      boxShadow: {
        panel: "0 12px 28px rgba(38, 30, 146, 0.14)",
      },
      borderRadius: {
        ui: "18px",
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "'Segoe UI'", "sans-serif"],
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 350ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
