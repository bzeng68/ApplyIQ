import type { Config } from 'tailwindcss';

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#F5F3EF",
        ink: "#1A1714",
        muted: "#6B6560",
        border: "#E8E4DC",
        accent: "#3D6B5B",
        score: {
          high: "#4A7C59",
          mid: "#A07C40",
          low: "#8B3A3A"
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,23,20,0.06)"
      },
      borderRadius: {
        card: "0.5rem"
      }
    }
  },
  plugins: []
};

export default config;
