import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#0B1220",
          soft: "#111a2e",
          line: "#1e293b",
        },
        surface: "#F6F8FB",
        card: "#FFFFFF",
        line: "#E6EAF0",
        brand: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          soft: "#EFF4FF",
        },
        ok: { DEFAULT: "#16A34A", soft: "#E9F7EF" },
        warn: { DEFAULT: "#D97706", soft: "#FEF3E2" },
        danger: { DEFAULT: "#DC2626", soft: "#FDECEC" },
        info: { DEFAULT: "#6D28D9", soft: "#F1ECFE" },
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        pop: "0 8px 30px rgba(16,24,40,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
