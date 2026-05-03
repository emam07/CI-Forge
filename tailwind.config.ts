import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f7f8",
          100: "#e8e8ec",
          200: "#c4c4cd",
          300: "#9a9aa6",
          400: "#6c6c78",
          500: "#4a4a55",
          600: "#2e2e36",
          700: "#1d1d23",
          800: "#131318",
          900: "#0a0a0d",
          950: "#050507"
        },
        accent: {
          DEFAULT: "#f5a524",
          soft: "#facc6a"
        },
        success: "#4ade80",
        warn: "#f5a524",
        info: "#7dd3fc"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "pulse-soft": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.55" }
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        "fade-up": "fade-up 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
