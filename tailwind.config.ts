import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        conquer: {
          turq: "#1ABCCA",
          yellow: "#F8C746",
          orange: "#F26E47",
          pink: "#FCE1E1",
          navy: "#3D3758",
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-raleway)", "system-ui", "sans-serif"],
        display: ["var(--font-bebas)", "var(--font-raleway)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
