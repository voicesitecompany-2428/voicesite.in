import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "primary": "#1C81E8",
        "background-light": "#F9FAFB",
        "background-dark": "#101922",
      },
      fontFamily: {
        "sans": ["var(--font-inter)", "sans-serif"],
        "display": ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
