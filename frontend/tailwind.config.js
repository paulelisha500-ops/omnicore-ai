/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      animation: {
        // Magic UI component animations. Defined here rather than inline so
        // the components stay copy-paste-compatible with magicui.design.
        "shimmer-slide": "shimmer-slide var(--speed) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--speed) * 2) infinite linear",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        marquee: "marquee var(--duration) linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        gradient: "gradient 8s linear infinite",
        ripple: "ripple var(--duration, 2s) ease calc(var(--i, 0)*.2s) infinite",
      },
      keyframes: {
        "shimmer-slide": {
          to: { transform: "translate(calc(100cqw - 100%), 0)" },
        },
        "spin-around": {
          "0%": { transform: "translateZ(0) rotate(0)" },
          "15%, 35%": { transform: "translateZ(0) rotate(90deg)" },
          "65%, 85%": { transform: "translateZ(0) rotate(270deg)" },
          "100%": { transform: "translateZ(0) rotate(360deg)" },
        },
        "border-beam": {
          "100%": { "offset-distance": "100%" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
        gradient: {
          to: { backgroundPosition: "var(--bg-size, 300%) 0" },
        },
        ripple: {
          "0%, 100%": { transform: "translate(-50%, -50%) scale(1)" },
          "50%": { transform: "translate(-50%, -50%) scale(0.9)" },
        },
      },
    },
  },
  corePlugins: {
    // Preflight OFF, deliberately. This app is ~3,600 lines of hand-authored
    // inline styles and CSS variables that predate Tailwind; Preflight's
    // global reset (margins, heading sizes, list styles, border-box defaults)
    // would silently restyle every existing module. Tailwind is here only to
    // power the Magic UI components, so it must be additive — utilities on
    // elements that opt in, and nothing applied globally.
    preflight: false,
  },
  plugins: [],
};
