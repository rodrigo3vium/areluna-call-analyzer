import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Atlas Comercial — paleta warm editorial (hex literal, sem theme switching)
        primary: {
          DEFAULT: "#2E2620",
          foreground: "#FAF6F0",
          900: "#2E2620",
          800: "#3D332C",
          700: "#4A3F37",
          600: "#6B5D52",
        },
        gold: {
          DEFAULT: "#C9A86B",
          500: "#C9A86B",
          400: "#D9BC85",
          200: "#EBD9B8",
        },
        // Fundos / superfícies
        cream: "#FAF6F0",
        sand: "#F1E9DD",
        surface: "#FFFFFF",
        background: "#FAF6F0",
        foreground: "#2E2620",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#2E2620",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#2E2620",
        },
        // Aliases semânticos (mantêm primitivos shadcn compilando)
        border: "#E5DBCB",
        input: "#E5DBCB",
        ring: "#C9A86B",
        muted: {
          DEFAULT: "#F1E9DD",
          foreground: "#9A8C7E",
        },
        accent: {
          DEFAULT: "#F1E9DD",
          foreground: "#2E2620",
        },
        secondary: {
          DEFAULT: "#F1E9DD",
          foreground: "#2E2620",
        },
        // Status
        success: {
          DEFAULT: "#5B7A5A",
          foreground: "#FAF6F0",
        },
        warning: {
          DEFAULT: "#C49B5C",
          foreground: "#2E2620",
        },
        error: {
          DEFAULT: "#A85A4D",
          foreground: "#FAF6F0",
        },
        info: {
          DEFAULT: "#6F7D8C",
          foreground: "#FAF6F0",
        },
        destructive: {
          DEFAULT: "#A85A4D",
          foreground: "#FAF6F0",
        },
      },
      borderRadius: {
        pill: "9999px",
        card: "24px",
        "card-lg": "32px",
        xl: "12px",
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-cormorant)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 8px 24px rgba(46, 38, 32, 0.08)",
        elevated: "0 20px 48px rgba(46, 38, 32, 0.12)",
        "gold-glow": "0 0 32px rgba(201, 168, 107, 0.25)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;
