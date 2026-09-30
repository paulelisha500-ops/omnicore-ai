/* ============================================================================
   DESIGN TOKENS — signed-in app
   Deep-navy command rail, warm neutral canvas, teal as the single "core"
   accent, amber reserved only for AI-generated content. Light and dark themes
   share every token name, so components never branch on theme.

   Motion follows iOS conventions: short, springy ease-outs
   (cubic-bezier(.22,1,.36,1)), press-down scaling on anything tappable, and
   sheets that slide up from the bottom on phones. Everything honours
   prefers-reduced-motion.
   ============================================================================ */
export const TOKENS = `
.oc-root {
  --bg: #F5F5F2;
  --surface: #FFFFFF;
  --surface-2: #FBFBFA;
  --surface-sunken: #EFF0ED;
  --border: #E3E3DE;
  --border-strong: #D0D0C9;
  --ink: #14161A;
  --ink-soft: #585C63;
  --ink-faint: #8E918A;
  --rail-bg: #0B0F14;
  --rail-ink: #C7CCD1;
  --rail-ink-dim: #6E747C;
  --rail-active: #17202A;
  --accent: #0C8479;
  --accent-ink: #FFFFFF;
  --accent-soft: #E1F2EF;
  --spark: #B8790C;
  --spark-soft: #FBF1DE;
  --spark-border: #EFDCB0;
  --danger: #C0342A;
  --danger-soft: #FBEAE8;
  --success: #1E7A4C;
  --success-soft: #E5F4EB;
  --grid: #EAEAE5;
  --shadow: 0 1px 2px rgba(15,17,20,0.04), 0 4px 16px rgba(15,17,20,0.04);
  --shadow-lg: 0 18px 50px rgba(15,17,20,0.18);
  --font-display: 'Space Grotesk', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --ease: cubic-bezier(.22,1,.36,1);
  --ease-sheet: cubic-bezier(.32,.72,0,1);
  font-family: var(--font-body);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-tap-highlight-color: transparent;
  text-rendering: optimizeLegibility;
}
.oc-root[data-theme="dark"] {
  --bg: #0A0C0F;
  --surface: #13161B;
  --surface-2: #171B21;
  --surface-sunken: #1B2027;
  --border: #252B33;
  --border-strong: #343C47;
  --ink: #ECEEF1;
  --ink-soft: #A7ADB6;
  --ink-faint: #6E7580;
  --rail-bg: #06080B;
  --rail-active: #141B24;
  --accent: #2BB3A5;
  --accent-ink: #051412;
  --accent-soft: rgba(43,179,165,0.14);
  --spark: #E6A83F;
  --spark-soft: rgba(230,168,63,0.11);
  --spark-border: rgba(230,168,63,0.28);
  --danger: #FF6B5E;
  --danger-soft: rgba(255,107,94,0.12);
  --success: #3CCB7F;
  --success-soft: rgba(60,203,127,0.12);
  --grid: #20262E;
  --shadow: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-lg: 0 18px 50px rgba(0,0,0,0.55);
  color-scheme: dark;
}
.oc-root * { box-sizing: border-box; }
.oc-root button, .oc-root a, .oc-root [role="button"], .oc-root input, .oc-root select, .oc-root textarea { touch-action: manipulation; }
.oc-root input, .oc-root select, .oc-root textarea, .oc-root button { font-family: inherit; color: inherit; }
.oc-root input::placeholder, .oc-root textarea::placeholder { color: var(--ink-faint); }
.oc-root ::selection { background: var(--accent-soft); }
.oc-display { font-family: var(--font-display); letter-spacing: -0.015em; }
.oc-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.oc-scroll { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; scrollbar-gutter: stable; }
.oc-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.oc-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
.oc-scroll::-webkit-scrollbar-track { background: transparent; }

/* Inputs */
.oc-input {
  width: 100%; border: 1px solid var(--border); border-radius: 12px; padding: 11px 13px; font-size: 14.5px;
  background: var(--surface-sunken); transition: border-color .15s, box-shadow .15s, background-color .15s; outline: none;
}
.oc-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); background: var(--surface); }
textarea.oc-input { resize: vertical; line-height: 1.55; }
select.oc-input { appearance: none; -webkit-appearance: none; padding-inline-end: 36px; cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238E918A' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center; background-size: 15px 15px; }
[dir="rtl"] select.oc-input { background-position: left 12px center; }

/* Press feedback & motion */
.oc-press { transition: transform .2s var(--ease), opacity .2s, background-color .2s, box-shadow .2s, border-color .2s; }
.oc-press:active:not(:disabled) { transform: scale(.965); }
.oc-lift { transition: transform .25s var(--ease), box-shadow .25s var(--ease), border-color .2s; }
@media (hover: hover) { .oc-lift:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); border-color: var(--border-strong); } }
.oc-focusable:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 10px; }
@keyframes oc-page-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.oc-page { animation: oc-page-in .34s var(--ease) both; }
@keyframes oc-fade-up { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: none;} }
.oc-fade-up { animation: oc-fade-up .3s var(--ease) both; }
@keyframes oc-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes oc-shimmer { 0% { background-position: -240px 0; } 100% { background-position: 240px 0; } }
.oc-skel { background: linear-gradient(90deg, var(--surface-sunken) 0%, var(--border) 50%, var(--surface-sunken) 100%); background-size: 240px 100%; animation: oc-shimmer 1.3s ease-in-out infinite; }
@keyframes oc-pulse-dot { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
.oc-pulse-dot { animation: oc-pulse-dot 1.1s ease-in-out infinite; }
@keyframes oc-spin { to { transform: rotate(360deg); } }
.oc-spin { animation: oc-spin .9s linear infinite; }
@keyframes oc-caret { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
.oc-caret > :last-child::after, .oc-caret > ul:last-child > li:last-child::after, .oc-caret > ol:last-child > li:last-child::after { content: ""; display: inline-block; width: 7px; height: 1.05em; margin-inline-start: 3px; vertical-align: -2px; background: var(--accent); border-radius: 1px; animation: oc-caret 1s steps(1) infinite; }
.oc-caret > ul:last-child::after, .oc-caret > ol:last-child::after { content: none !important; }
[dir="rtl"] .oc-flip { transform: scaleX(-1); }

/* Sheets (modal dialogs): bottom sheet on phones, centred card on desktop */
.oc-sheet-backdrop { position: fixed; inset: 0; background: rgba(8,10,14,.42); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); z-index: 80; animation: oc-fade .22s ease both; display: flex; align-items: center; justify-content: center; padding: 20px; }
@keyframes oc-pop-in { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
.oc-sheet { width: 100%; max-width: 520px; max-height: min(86vh, 760px); overflow: auto; background: var(--surface); color: var(--ink); border-radius: 22px; box-shadow: var(--shadow-lg); border: 1px solid var(--border); animation: oc-pop-in .32s var(--ease) both; }
.oc-sheet-grabber { display: none; }
@keyframes oc-sheet-up { from { transform: translateY(100%); } to { transform: none; } }
@media (max-width: 640px) {
  .oc-sheet-backdrop { align-items: flex-end; padding: 0; }
  .oc-sheet { max-width: none; border-radius: 22px 22px 0 0; max-height: 92vh; animation: oc-sheet-up .42s var(--ease-sheet) both; padding-bottom: env(safe-area-inset-bottom); }
  .oc-sheet-grabber { display: block; width: 38px; height: 5px; border-radius: 3px; background: var(--border-strong); margin: 8px auto 0; }
}

/* Toasts */
.oc-toasts { position: fixed; top: calc(12px + env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); z-index: 90; display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; width: min(92vw, 420px); }
@keyframes oc-toast-in { from { opacity: 0; transform: translateY(-14px) scale(.96); } to { opacity: 1; transform: none; } }
.oc-toast { pointer-events: auto; animation: oc-toast-in .38s var(--ease) both; background: color-mix(in srgb, var(--surface) 88%, transparent); backdrop-filter: saturate(180%) blur(18px); -webkit-backdrop-filter: saturate(180%) blur(18px); border: 1px solid var(--border); box-shadow: var(--shadow-lg); border-radius: 16px; padding: 11px 14px; font-size: 13.5px; display: flex; gap: 10px; align-items: flex-start; width: 100%; }

/* Shell */
.oc-app { display: flex; height: 100vh; height: 100dvh; overflow: hidden; }
.oc-sidebar { width: 262px; flex-shrink: 0; background: var(--rail-bg); display: flex; flex-direction: column; transition: width .26s var(--ease), transform .34s var(--ease-sheet); will-change: transform; }
.oc-sidebar.collapsed { width: 74px; }
.oc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.oc-topbar { height: 58px; flex-shrink: 0; display: flex; align-items: center; gap: 8px; padding: 0 16px; position: sticky; top: 0; z-index: 20;
  background: color-mix(in srgb, var(--surface) 82%, transparent); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: 1px solid var(--border); }
.oc-content { flex: 1; overflow-y: auto; padding: 26px; background: var(--bg); scroll-behavior: smooth; }
.oc-sidebar-backdrop { display: none; }
.oc-chat-h { height: calc(100dvh - 58px - 52px); }
.oc-mobile-only { display: none !important; }
.oc-tabbar { display: none; }
.oc-nav-btn { transition: background-color .18s, color .18s; }
@media (hover: hover) { .oc-nav-item:hover { background: var(--surface-sunken) !important; } .oc-row-hover:hover { background: var(--surface-sunken); } }
@media (hover: hover) { .oc-nav-btn:hover { background: rgba(255,255,255,0.05) !important; color: #fff !important; } }
@media (max-width: 900px) {
  .oc-sidebar { position: fixed; inset-block: 0; inset-inline-start: 0; z-index: 60; transform: translateX(-100%); height: 100dvh; box-shadow: var(--shadow-lg); }
  [dir="rtl"] .oc-sidebar { transform: translateX(100%); }
  .oc-sidebar.mobile-open { transform: translateX(0) !important; }
  .oc-sidebar.collapsed { width: 262px; }
  .oc-sidebar-backdrop.show { display: block; position: fixed; inset: 0; background: rgba(8,10,14,0.45); z-index: 55; animation: oc-fade .2s ease both; }
  .oc-desktop-only { display: none !important; }
  .oc-mobile-only { display: flex !important; }
}
@media (max-width: 760px) {
  .oc-content { padding: 16px 14px calc(84px + env(safe-area-inset-bottom)); }
  .oc-grid-2, .oc-grid-2b, .oc-dash-grid { grid-template-columns: 1fr !important; }
  .oc-tabbar { display: flex; position: fixed; inset-inline: 0; bottom: 0; z-index: 40; height: calc(62px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom);
    background: color-mix(in srgb, var(--surface) 84%, transparent); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-top: 1px solid var(--border); }
  .oc-hide-sm { display: none !important; }
  .oc-chat-h { height: calc(100dvh - 58px - 100px - env(safe-area-inset-bottom)); }
  .oc-h1 { font-size: 26px !important; }
}
@media (prefers-reduced-motion: reduce) {
  .oc-root *, .oc-root *::before, .oc-root *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
/* Markdown-ish rendering of model output */
.oc-md p { margin: 0 0 .6em; }
.oc-md p:last-child { margin-bottom: 0; }
.oc-md ul, .oc-md ol { margin: .2em 0 .6em; padding-inline-start: 1.3em; }
.oc-md li { margin: .15em 0; }
.oc-md h4 { font-size: 1em; margin: .7em 0 .3em; }
.oc-md code { font-family: var(--font-mono); font-size: .88em; background: var(--surface-sunken); border: 1px solid var(--border); border-radius: 6px; padding: 1px 5px; }
.oc-md pre { font-family: var(--font-mono); font-size: 12.5px; background: var(--surface-sunken); border: 1px solid var(--border); border-radius: 12px; padding: 12px; overflow-x: auto; margin: .4em 0 .7em; direction: ltr; text-align: left; }
.oc-md pre code { background: none; border: none; padding: 0; }
.oc-md a { color: var(--accent); }
`;
