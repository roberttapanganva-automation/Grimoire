import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        brain: {
          bg: "#0F1117",
          surface: "#1A1D27",
          surfaceHover: "#21243A",
          border: "#2A2D3E",
          borderHover: "#3A3D5E",
          accent: "#F59E0B",
          accentHover: "#FBBF24",
          text: "#E2E8F0",
          textMuted: "#64748B",
          textFaint: "#374151",
          success: "#10B981",
          error: "#EF4444",
          typePrompt: "#6366F1",
          typeNote: "#0EA5E9",
          typeLink: "#10B981",
          typeCommand: "#F59E0B",
          typeSnippet: "#EC4899",
        },
      },
    },
  },
  plugins: [],
};

export default config;
