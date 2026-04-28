import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        line: "#D7DEE5",
        panel: "#F7F9FB",
        accent: "#0F766E"
      }
    }
  },
  plugins: []
};

export default config;
