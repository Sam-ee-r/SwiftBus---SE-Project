import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        "label-sm": ["Plus Jakarta Sans"],
        "h3": ["Space Grotesk"],
        "label-md": ["Plus Jakarta Sans"],
        "h1": ["Space Grotesk"],
        "body-lg": ["Plus Jakarta Sans"],
        "h2": ["Space Grotesk"],
        "body-md": ["Plus Jakarta Sans"]
      },
      fontSize: {
        "label-sm": ["12px", { "lineHeight": "1.0", "letterSpacing": "0.05em", "fontWeight": "700" }],
        "h3": ["24px", { "lineHeight": "1.3", "fontWeight": "600" }],
        "label-md": ["14px", { "lineHeight": "1.2", "letterSpacing": "0.02em", "fontWeight": "600" }],
        "h1": ["48px", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "body-lg": ["18px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "h2": ["32px", { "lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "body-md": ["16px", { "lineHeight": "1.6", "fontWeight": "400" }]
      },
      spacing: {
        "md": "24px",
        "xs": "4px",
        "lg": "40px",
        "gutter": "24px",
        "base": "8px",
        "xl": "64px",
        "sm": "12px",
        "margin": "32px"
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#14121a", // Overridden by Stitch
        foreground: "hsl(var(--foreground))",
        primary: "#cabeff", // Overridden by Stitch
        secondary: "#43eeb8", // Overridden by Stitch
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Stitch Custom Colors
        "secondary-container": "#00d19d",
        "surface-variant": "#36343c",
        "surface-dim": "#14121a",
        "surface-container-low": "#1c1b22",
        "electric-violet": "hsl(255, 65%, 60%)",
        "surface-tint": "#cabeff",
        "on-error": "#690005",
        "surface-container-lowest": "#0f0d14",
        "on-tertiary-fixed-variant": "#5f4100",
        "outline": "#938e9f",
        "on-background": "#e6e0eb",
        "on-primary": "#310a94",
        "tertiary-fixed-dim": "#f9bc49",
        "sunset-orange": "hsl(25, 95%, 55%)",
        "primary-container": "#937efa",
        "inverse-on-surface": "#312f37",
        "inverse-surface": "#e6e0eb",
        "surface-bright": "#3a3840",
        "on-secondary": "#003828",
        "on-secondary-fixed-variant": "#00513b",
        "on-secondary-container": "#00543d",
        "on-surface": "#e6e0eb",
        "deep-space": "hsl(245, 40%, 4%)",
        "accent-glow-dark": "hsla(255, 65%, 60%, 0.3)",
        "on-tertiary-container": "#392600",
        "surface": "#14121a",
        "surface-container": "#201f26",
        "on-tertiary": "#422c00",
        "midnight-indigo": "hsl(245, 30%, 8%)",
        "secondary-fixed": "#56fdc5",
        "arctic-white": "hsl(210, 20%, 98%)",
        "surface-container-high": "#2b2931",
        "emerald-spark": "hsl(165, 80%, 50%)",
        "tertiary-container": "#bc8710",
        "on-tertiary-fixed": "#271900",
        "surface-container-highest": "#36343c",
        "tertiary-fixed": "#ffdeaa",
        "primary-fixed-dim": "#cabeff",
        "on-secondary-fixed": "#002116",
        "on-primary-fixed-variant": "#482eaa",
        "error": "#ffb4ab",
        "inverse-primary": "#604ac3",
        "on-primary-container": "#2a0088",
        "on-error-container": "#ffdad6",
        "tertiary": "#f9bc49",
        "on-primary-fixed": "#1c0062",
        "aviation-blue": "hsl(210, 90%, 45%)",
        "accent-glow-light": "hsla(210, 90%, 45%, 0.1)",
        "primary-fixed": "#e6deff",
        "secondary-fixed-dim": "#2ae0aa",
        "outline-variant": "#484553",
        "on-surface-variant": "#c9c4d5",
        "error-container": "#93000a"
      },
      borderRadius: {
        lg: "0.5rem", // Overridden by Stitch
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "0.75rem",
        full: "9999px"
      },
      boxShadow: {
        'glow': '0 0 20px hsl(var(--teal-1) / 0.4)',
        'glow-lg': '0 0 40px hsl(var(--teal-1) / 0.5)',
        'soft': '0 2px 8px -2px hsl(215 60% 25% / 0.08)',
        'medium': '0 8px 24px -8px hsl(215 60% 25% / 0.12)',
        'large': '0 16px 48px -12px hsl(215 60% 25% / 0.18)',
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
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 6s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
