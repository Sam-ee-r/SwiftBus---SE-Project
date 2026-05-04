---
colors:
  primary: "hsl(215, 60%, 25%)"
  primaryForeground: "hsl(210, 40%, 98%)"
  accent: "hsl(185, 60%, 42%)"
  accentForeground: "hsl(0, 0%, 100%)"
  background:
    light: "hsl(210, 25%, 98%)"
    dark: "hsl(215, 35%, 8%)"
  surface:
    light: "hsl(0, 0%, 100%)"
    dark: "hsl(215, 30%, 12%)"
  border:
    light: "hsl(210, 20%, 88%)"
    dark: "hsl(215, 25%, 20%)"
  text:
    primary:
      light: "hsl(215, 35%, 15%)"
      dark: "hsl(210, 25%, 95%)"
    muted:
      light: "hsl(215, 15%, 45%)"
      dark: "hsl(215, 15%, 55%)"
  status:
    success: "hsl(145, 65%, 42%)"
    warning: "hsl(38, 92%, 50%)"
    destructive: "hsl(0, 84%, 60%)"
  gradients:
    primary: "linear-gradient(135deg, hsl(215 60% 25%) 0%, hsl(215 70% 35%) 100%)"
    accent: "linear-gradient(135deg, hsl(185 60% 42%) 0%, hsl(195 62% 48%) 100%)"
    hero: "linear-gradient(180deg, hsl(215 60% 20%) 0%, hsl(215 55% 30%) 50%, hsl(220 45% 35%) 100%)"
    card: "linear-gradient(145deg, hsl(0 0% 100%) 0%, hsl(210 25% 97%) 100%)"

typography:
  fontFamilies:
    primary: "'Plus Jakarta Sans', system-ui, sans-serif"

radii:
  sm: "calc(0.75rem - 4px)"
  md: "calc(0.75rem - 2px)"
  lg: "0.75rem"

shadows:
  soft: "0 2px 8px -2px hsla(215, 60%, 25%, 0.08)"
  medium: "0 8px 24px -8px hsla(215, 60%, 25%, 0.12)"
  large: "0 16px 48px -12px hsla(215, 60%, 25%, 0.18)"
  glow: "0 0 20px hsla(185, 60%, 42%, 0.4)"
  glowLg: "0 0 40px hsla(185, 60%, 42%, 0.5)"

motion:
  float: "float 6s ease-in-out infinite"
  slideUp: "slide-up 0.5s ease-out"
  fadeIn: "fade-in 0.4s ease-out"
  pulseGlow: "pulse-glow 2s ease-in-out infinite"

components:
  glassCard:
    background: "bg-card/80"
    backdropBlur: "md"
    border: "border-border/50"
---

# SwiftBus Passenger Experience Design System

## Core Aesthetic: Deep Navy & Luminous Teal
The SwiftBus passenger interface is built to evoke trust, reliability, and modern efficiency. It rejects harsh starkness in favor of a **Deep Navy Theme** combined with **Luminous Teal** accents. This creates a high-contrast, premium travel booking experience that feels simultaneously grounded and forward-looking. 

The aesthetic leans heavily into "Atmospheric Glass" motifs, pairing translucent card backgrounds with subtle, colorful background blurs that give the app depth without sacrificing legibility. 

## Typography
The entire application relies on **Plus Jakarta Sans**, a geometric sans-serif that balances modern digital crispness with friendly, humanist curves. 
- **Headings** should feel structural and bold (wght 700-800).
- **Interactive elements** use medium weights (wght 500-600).
- **Data displays** (like dates, times, and prices) should prioritize clarity.

## Color Strategy
- **Backgrounds:** The primary background uses a very subtle cool tint (`210 25% 98%` in light mode, `215 35% 8%` in dark mode) instead of pure white/black, reducing eye strain.
- **Accents:** The signature Teal (`hsl(185 60% 42%)`) is reserved exclusively for primary actions, active states, and elements that require immediate attention. It provides a striking pop of color against the deep navy.
- **Gradients:** Gradients are used structurally to define space. The `hero-gradient` gives depth to headers and landing sections, while the `accent-gradient` is used for high-impact buttons or illustrative text (e.g., "SwiftBus").

## Depth, Elevation & Glassmorphism
SwiftBus eschews flat design for a subtly layered approach:
- **Cards** frequently use the `.glass-card` pattern, which applies a slight translucency (`bg-card/80`) and a backdrop blur, combined with a barely-there border.
- **Shadows** (`soft`, `medium`, `large`) are tinted with the brand's primary navy hue (`hsl(215 60% 25%)`), ensuring that even shadows contribute to the cohesive color palette rather than looking like muddy black artifacts.
- **Glows:** High-priority elements (like the primary "Book Now" CTA or active seat selections) utilize the `--shadow-glow` token to emit a soft teal halo, drawing the eye without aggressive animations.

## Motion & Interaction
Animations are purposeful, fluid, and never jarring:
- Elements entering the viewport should use the `slide-up` or `fade-in` utility for a gentle, progressive disclosure.
- Floating illustrative elements (like a bus icon or map marker) can utilize the 6-second `float` animation to make the interface feel "alive" while waiting or browsing.
- Interactive states (hover/focus) should feel snappy but smooth, typically using Tailwind's default `transition-colors` or `transition-all`.

## UI Composition Patterns (Passenger Pages)
When building or redesigning passenger-facing pages (Search, Booking, Dashboard):
1. **Atmospheric Backgrounds:** Use large, blurred, off-center radial gradients in the background (using Primary/Accent with 5% opacity) to break up empty space.
2. **Clear Information Hierarchy:** Travel times, prices, and locations must stand out. Use `muted-foreground` for secondary details (like seat numbers or bus types) to let the primary data breathe.
3. **Padded Modularity:** Use the established radii (`0.75rem` for main cards) and generous spacing to keep the interface from feeling cluttered, even when displaying dense schedule matrices.
