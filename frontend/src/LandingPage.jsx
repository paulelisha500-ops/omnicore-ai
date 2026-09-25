import React, { useEffect, useState } from "react";
import {
  Zap, Globe, Menu, X, ChevronDown, ArrowUpRight, Sparkles,
  MessageSquare, FileText, Camera, Mic, Bot, TrendingUp, Star, Search,
  Workflow, Shield, PlugZap, Home, Rocket, Map, HelpCircle, Layers, Server,
  Cpu, Building2, Scale,
} from "lucide-react";
import {
  NumberTicker, BlurFade, BorderBeam, ShimmerButton, AnimatedGradientText,
  DotPattern, Marquee, Ripple,
} from "./magicui.jsx";

/* ============================================================================
   PRE-LOGIN THEME
   Deliberately distinct from the teal/navy palette used inside the signed-in
   app (see App.jsx TOKENS) — this is the "front door": cream canvas, deep
   oxblood for structure, a single vivid red for action and for the "Live"
   signal. Kept in its own tiny token set so it can't drift the dashboard's
   already-settled design system.
   ============================================================================ */
export const PREAUTH_TOKENS = `
/* Fonts are loaded from index.html (<link>), not @import — see there. */

.oc-preauth {
  --cream: #FBF1E4;
  --cream-2: #F4E4CC;
  --paper: #FFFDF9;
  --maroon: #3A0A10;
  --maroon-2: #55131A;
  --red: #C81E33;
  --red-dark: #9E1526;
  --red-soft: #F6DCDC;
  --tan-soft: #EFE1C8;
  --border: #E7D8BE;
  --border-strong: #D9C6A3;
  --ink: #2A1512;
  --ink-soft: #6B4D42;
  --ink-faint: #9C8574;
  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  font-family: var(--font-body);
  color: var(--ink);
  background: var(--cream);
}
.oc-preauth * { box-sizing: border-box; }
.oc-preauth .oc-display { font-family: var(--font-display); letter-spacing: -0.01em; }
.oc-preauth .oc-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.oc-preauth .oc-focusable:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; border-radius: 8px; }
.oc-preauth a { color: inherit; }
@keyframes oc-fade-up { from { opacity: 0; transform: translateY(8px);} to { opacity: 1; transform: translateY(0);} }
.oc-preauth .oc-fade-up { animation: oc-fade-up 0.4s ease-out both; }
@keyframes oc-pulse-dot { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
.oc-preauth .oc-pulse-dot { animation: oc-pulse-dot 1.1s ease-in-out infinite; }
.oc-preauth .oc-hover-lift { transition: transform 0.15s ease, box-shadow 0.15s ease; }
.oc-preauth .oc-hover-lift:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(58,10,16,0.10); }
.oc-preauth .oc-nav-link { position: relative; }
.oc-preauth .oc-nav-link::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -4px; height: 2px;
  background: var(--red); transform: scaleX(0); transition: transform 0.15s ease;
}
.oc-preauth .oc-nav-link:hover::after { transform: scaleX(1); }
.oc-preauth .oc-mobile-nav { display: none; }
.oc-preauth .oc-skip { position: absolute; inset-inline-start: 8px; top: -60px; z-index: 100; background: var(--maroon); color: #fff; padding: 10px 16px; border-radius: 10px; font-weight: 700; font-size: 13.5px; text-decoration: none; transition: top 0.12s ease; }
.oc-preauth .oc-skip:focus { top: 8px; }
.oc-preauth .oc-gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 180px; gap: 14px; }
.oc-preauth .oc-gallery-grid .oc-span-wide { grid-column: span 2; }
.oc-preauth .oc-gallery-grid .oc-span-tall { grid-row: span 2; }
.oc-preauth .oc-gallery-grid .oc-span-full { grid-column: span 3; }
@media (max-width: 860px) {
  .oc-preauth .oc-desktop-nav { display: none !important; }
  .oc-preauth .oc-mobile-toggle { display: flex !important; }
  .oc-preauth .oc-mobile-nav.open { display: flex !important; }
  .oc-preauth .oc-hero-grid { grid-template-columns: 1fr !important; }
  .oc-preauth .oc-hero-visual { order: -1; }
  .oc-preauth .oc-modules-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .oc-preauth .oc-about-grid { grid-template-columns: 1fr !important; }
  .oc-preauth .oc-gallery-grid { grid-template-columns: 1fr 1fr !important; }
  .oc-preauth .oc-gallery-grid .oc-span-tall { grid-row: span 1; }
}
@media (max-width: 560px) {
  .oc-preauth .oc-modules-grid { grid-template-columns: 1fr !important; }
  .oc-preauth .oc-gallery-grid { grid-template-columns: 1fr !important; }
  .oc-preauth .oc-gallery-grid .oc-span-wide, .oc-preauth .oc-gallery-grid .oc-span-full { grid-column: span 1 !important; }
  .oc-preauth .oc-roadmap-grid { grid-template-columns: 1fr !important; }
}
`;

/* ============================================================================
   CONTENT
   ============================================================================ */
const text = {
  en: {
    nav: { modules: "Modules", roadmap: "Roadmap", about: "About", faq: "FAQ", signIn: "Sign in", menu: "Menu", primary: "Primary", skip: "Skip to content" },
    hero: {
      eyebrow: "Enterprise Multimodal AI Operating System",
      titleA: "One AI core for how your", titleHighlight: "whole company", titleB: "actually works",
      sub: "Chat, vision, documents, speech, agents, and forecasting — running on your own self-hosted model, a real trained ML model, and a backend honest enough to show you exactly what's live and what isn't.",
      ctaPrimary: "Get started", ctaSecondary: "See what's really live",
      liveNow: "modules live right now", modulesTotal: "modules total, each labeled honestly",
    },
    trust: [
      { k: "84.5%", v: "Churn model ROC-AUC, on real held-out data" },
      { k: "7,043", v: "Real customer records behind Module 06" },
      { k: "2", v: "Self-hosted models — zero per-token cost" },
      { k: "0", v: "API keys required to run the default setup" },
    ],
    modules: {
      eyebrow: "What's actually running", title: "Every module, labeled honestly",
      desc: "Every card below carries its real status — not marketing gloss. The full breakdown, module by module, lives in PROJECT_NOTES.md in the repo.",
      statusLabel: { live: "Live", partial: "Live (partial)", sample: "Sample data" },
    },
    gallery: {
      eyebrow: "Built for real work", title: "The people this is actually built for",
    },
    roadmap: {
      eyebrow: "Where this is headed", title: "The bigger vision — not built yet, said plainly",
      desc: "This is the direction, not a claim about today's build. Each item below is a real, scoped next step toward the full enterprise-AI-OS vision.",
    },
    about: {
      eyebrow: "About this build", title: "Built to be checked, not just believed",
      p1: "This platform was built end to end — frontend, FastAPI backend, a real trained churn model, real Postgres-backed authentication — with one rule: never claim a feature is live when it isn't. PROJECT_NOTES.md in the repo documents every single module's real status, including the two real bugs found and fixed along the way (a thinking-mode leak that broke JSON parsing, and swallowed error messages that hid the real cause of failures).",
      p2: "It's designed for the people who'd actually use a platform like this day to day — across the roles below — not just for a demo audience.",
      forLabel: "Built with these roles in mind",
      roles: ["CEOs", "Managers", "Analysts", "Engineers", "Customer Support", "HR", "Finance", "IT Operations", "Government Agencies"],
    },
    faq: {
      eyebrow: "Questions", title: "Frequently asked",
      items: [
        { q: "Is this actually calling a real AI model?", a: "Yes. By default every AI module calls a self-hosted Ollama model — qwen3:4b for text, qwen2.5vl:7b for vision — running in this same Docker Compose stack, no API key and no per-token cost. Set LLM_PROVIDER=anthropic in .env to route the same calls to Claude instead; the frontend never knows which one answered." },
        { q: "What's real vs. sample data?", a: "Of thirteen modules, eleven are fully live (real model calls, a real trained model, persisted Postgres state, or live retrieval), one is live in part (Recommendation Engine), and one (Integration Hub) is representative UI over sample data — and says so in the product. The Modules section above shows every module's actual status; PROJECT_NOTES.md has the full per-module explanation." },
        { q: "How accurate is the churn prediction model, really?", a: "78.3% accuracy, 84.5% ROC-AUC, evaluated on 1,409 real customers the model never saw during training or tuning — not the 90% accuracy that's sometimes asked for, and there's a real reason for that: only 26.5% of customers in the real dataset churn, so accuracy alone is a misleading target on imbalanced data. The model was selected on F1, not accuracy, for exactly that reason." },
        { q: "Is my data private?", a: "Your documents, chats and uploads stay in this Docker stack: with the default Ollama provider the AI model runs locally and no external AI API is called. The exception is web lookup. Chat's web-search tool, the Research Agent, Trade & Regulatory, and Enterprise Search (only when you tick \"Also search the web\") send the search text — never your documents — to public search engines through the self-hosted SearXNG. Every data endpoint requires a signed-in token, and sign-in itself is rate-limited." },
        { q: "Can I run this myself?", a: "Yes — one docker compose up --build from the project root. No GPU and no cloud account required for the default CPU setup. The full Windows/VS Code walkthrough is in README.md." },
        { q: "What are the demo accounts?", a: "admin / admin123 (Platform Admin) and analyst / analyst123 (Analyst) — seeded for local demo use only. Change or remove them before this runs anywhere but your own machine." },
        { q: "Is this production-ready?", a: "Honestly: not yet. The core AI, the trained model, rate-limited sign-in with a required signing secret, per-route authentication and a persisted audit log are real. Still missing: a job queue so automations dispatch real work (a \"run\" is currently recorded, not delivered), real OAuth connectors, and production hardening such as HTTPS termination, secret management and backups — see \"Where this is headed\" above." },
      ],
    },
    ctaBand: { title: "See exactly what's real. Then sign in.", sub: "No sales call, no waitlist — the demo accounts are right there.", button: "Get started" },
    footer: {
      tagline: "Enterprise Multimodal AI Operating System",
      builtWith: "Built with",
      frontendLabel: "Frontend", backendLabel: "Backend & AI",
    },
  },
  ar: {
    nav: { modules: "الوحدات", roadmap: "خارطة الطريق", about: "حول", faq: "الأسئلة الشائعة", signIn: "تسجيل الدخول", menu: "القائمة", primary: "الرئيسية", skip: "تخطَّ إلى المحتوى" },
    hero: {
      eyebrow: "نظام تشغيل ذكاء اصطناعي متعدد الوسائط للمؤسسات",
      titleA: "نواة ذكاء اصطناعي واحدة لكيفية عمل", titleHighlight: "شركتك بأكملها", titleB: "فعليًا",
      sub: "دردشة، رؤية حاسوبية، مستندات، صوت، وكلاء، وتنبؤات — تعمل على نموذجك المستضاف ذاتيًا، ونموذج تعلّم آلي مدرّب حقيقي، وخادم صريح بما يكفي ليُظهر لك بالضبط ما هو مباشر وما ليس كذلك.",
      ctaPrimary: "ابدأ الآن", ctaSecondary: "شاهد ما هو مباشر فعلًا",
      liveNow: "وحدات مباشرة الآن", modulesTotal: "وحدة إجمالًا، كل منها موصوفة بصدق",
    },
    trust: [
      { k: "84.5%", v: "دقة نموذج التسرّب (ROC-AUC) على بيانات حقيقية" },
      { k: "7,043", v: "سجل عميل حقيقي خلف الوحدة 06" },
      { k: "2", v: "نموذجان مستضافان ذاتيًا — بدون تكلفة لكل رمز" },
      { k: "0", v: "مفاتيح API مطلوبة لتشغيل الإعداد الافتراضي" },
    ],
    modules: {
      eyebrow: "ما يعمل فعليًا الآن", title: "كل وحدة، موصوفة بصدق",
      desc: "كل بطاقة أدناه تحمل حالتها الحقيقية — لا تجميل تسويقي. التفاصيل الكاملة لكل وحدة موجودة في PROJECT_NOTES.md داخل المستودع.",
      statusLabel: { live: "مباشر", partial: "مباشر جزئيًا", sample: "بيانات توضيحية" },
    },
    gallery: {
      eyebrow: "مبني للعمل الفعلي", title: "الأشخاص الذين بُني هذا من أجلهم فعليًا",
    },
    roadmap: {
      eyebrow: "إلى أين يتجه هذا", title: "الرؤية الأكبر — لم تُبنَ بعد، وهذا مذكور بوضوح",
      desc: "هذا هو الاتجاه، وليس ادعاءً حول البناء الحالي. كل عنصر أدناه خطوة تالية حقيقية ومحددة نحو رؤية نظام تشغيل الذكاء الاصطناعي المؤسسي الكامل.",
    },
    about: {
      eyebrow: "حول هذا البناء", title: "بُني ليُراجَع، لا ليُصدَّق فقط",
      p1: "بُنيت هذه المنصة من البداية إلى النهاية — الواجهة الأمامية، خادم FastAPI، نموذج تسرّب حقيقي مدرّب، ومصادقة حقيقية مدعومة بـ Postgres — بقاعدة واحدة: لا تدّعِ أن ميزة ما مباشرة إن لم تكن كذلك. يوثّق ملف PROJECT_NOTES.md في المستودع الحالة الحقيقية لكل وحدة، بما في ذلك خطأان حقيقيان تم اكتشافهما وإصلاحهما أثناء البناء.",
      p2: "صُمم هذا من أجل الأشخاص الذين قد يستخدمون فعليًا منصة كهذه يوميًا — عبر الأدوار أدناه — لا لجمهور عرض توضيحي فقط.",
      forLabel: "بُني مع وضع هذه الأدوار في الاعتبار",
      roles: ["الرؤساء التنفيذيون", "المديرون", "المحللون", "المهندسون", "دعم العملاء", "الموارد البشرية", "المالية", "عمليات تقنية المعلومات", "الجهات الحكومية"],
    },
    faq: {
      eyebrow: "أسئلة", title: "الأسئلة الشائعة",
      items: [
        { q: "هل هذا يستدعي فعليًا نموذج ذكاء اصطناعي حقيقي؟", a: "نعم. افتراضيًا، تستدعي كل وحدة ذكاء اصطناعي نموذج Ollama مستضافًا ذاتيًا — qwen3:4b للنصوص وqwen2.5vl:7b للرؤية — يعمل ضمن نفس حزمة Docker Compose هذه، دون مفتاح API أو تكلفة لكل رمز. يمكن ضبط LLM_PROVIDER=anthropic في .env لتوجيه نفس الاستدعاءات إلى Claude بدلًا من ذلك." },
        { q: "ما الحقيقي مقابل التوضيحي؟", a: "من أصل ثلاث عشرة وحدة، إحدى عشرة مباشرة بالكامل، وواحدة مباشرة جزئيًا (محرك التوصيات)، وواحدة (مركز التكاملات) واجهة تمثيلية فوق بيانات توضيحية — ويُذكر ذلك داخل المنتج. قسم الوحدات أعلاه يوضح الحالة الفعلية لكل وحدة." },
        { q: "ما مدى دقة نموذج التنبؤ بالتسرّب فعليًا؟", a: "78.3% دقة، و84.5% ROC-AUC، على 1,409 عميلًا حقيقيًا لم يرهم النموذج أثناء التدريب أو الضبط — وليس 90% كما يُطلب أحيانًا، ولذلك سبب حقيقي: 26.5% فقط من العملاء في البيانات الحقيقية يتسربون فعلًا، لذا فإن الدقة وحدها هدف مضلل في بيانات غير متوازنة." },
        { q: "هل بياناتي خاصة؟", a: "مستنداتك ومحادثاتك وما ترفعه تبقى داخل حزمة Docker هذه: مع مزوّد Ollama الافتراضي يعمل النموذج محليًا ولا يُستدعى أي واجهة ذكاء اصطناعي خارجية. الاستثناء هو البحث في الويب: أداة البحث في الدردشة ووكيل البحث والتجارة والتنظيم والبحث المؤسسي (فقط عند تفعيل «ابحث في الويب أيضًا») ترسل نص البحث — وليس مستنداتك أبدًا — إلى محركات بحث عامة عبر SearXNG المستضاف ذاتيًا. كل واجهة بيانات تتطلب رمز دخول صالحًا، وتسجيل الدخول نفسه محدود المحاولات." },
        { q: "هل يمكنني تشغيل هذا بنفسي؟", a: "نعم — أمر واحد docker compose up --build من جذر المشروع. لا حاجة لبطاقة رسومات أو حساب سحابي للإعداد الافتراضي على المعالج. الدليل الكامل في README.md." },
        { q: "ما هي الحسابات التجريبية؟", a: "admin / admin123 (مسؤول المنصة) وanalyst / analyst123 (محلّل) — مخصصة للاستخدام التجريبي المحلي فقط." },
        { q: "هل هذا جاهز للإنتاج؟", a: "بصراحة: ليس بعد. جوهر الذكاء الاصطناعي والنموذج المدرّب وتسجيل دخول محدود المحاولات بمفتاح توقيع إلزامي والتحقق لكل مسار وسجل تدقيق دائم كلها حقيقية. الناقص: طابور مهام لتنفيذ الأتمتة فعليًا (التشغيل حاليًا مُسجَّل وليس مُسلَّمًا)، وموصلات OAuth حقيقية، وتحصين الإنتاج مثل إنهاء HTTPS وإدارة الأسرار والنسخ الاحتياطي — راجع «إلى أين يتجه هذا» أعلاه." },
      ],
    },
    ctaBand: { title: "شاهد بالضبط ما هو حقيقي. ثم سجّل الدخول.", sub: "لا مكالمة مبيعات، لا قائمة انتظار — الحسابات التجريبية جاهزة أمامك.", button: "ابدأ الآن" },
    footer: {
      tagline: "نظام تشغيل ذكاء اصطناعي متعدد الوسائط للمؤسسات",
      builtWith: "مبني باستخدام",
      frontendLabel: "الواجهة الأمامية", backendLabel: "الخادم والذكاء الاصطناعي",
    },
  },
};

const MODULE_INFO = [
  { key: "dashboard", icon: Home, en: "Executive Dashboard", ar: "لوحة القيادة التنفيذية", status: "live",
    enD: "Real AI insight, and the 14-day trend is computed from your persisted activity — no hardcoded chart.",
    arD: "رؤية ذكاء اصطناعي حقيقية، ومخطط الأيام الـ14 محسوب من نشاطك المحفوظ — بلا بيانات ثابتة." },
  { key: "chat", icon: MessageSquare, en: "AI Chat Assistant", ar: "مساعد الدردشة الذكي", status: "live",
    enD: "Real calls to your self-hosted model (or Claude), grounded in your notes, with real web search.",
    arD: "استدعاءات حقيقية لنموذجك المستضاف ذاتيًا (أو Claude)، مع الاستناد إلى ملاحظاتك وبحث ويب حقيقي." },
  { key: "documents", icon: FileText, en: "Document Intelligence", ar: "ذكاء المستندات", status: "live",
    enD: "Upload a document or image — the model summarizes, extracts key points, answers follow-ups.",
    arD: "ارفع مستندًا أو صورة — يلخّص النموذج ويستخرج النقاط الرئيسية ويجيب عن الأسئلة." },
  { key: "vision", icon: Camera, en: "Computer Vision", ar: "الرؤية الحاسوبية", status: "live",
    enD: "Real vision-model analysis of uploaded images — scene, objects, and multilingual OCR.",
    arD: "تحليل حقيقي بنموذج رؤية للصور المرفوعة — المشهد والعناصر وتعرّف ضوئي متعدد اللغات." },
  { key: "speech", icon: Mic, en: "Speech AI", ar: "الذكاء الصوتي", status: "live",
    enD: "Live mic transcription and text-to-speech in the browser, plus AI summarization of transcripts.",
    arD: "تفريغ صوتي مباشر وتحويل نص إلى كلام عبر المتصفح، مع تلخيص بالذكاء الاصطناعي." },
  { key: "agents", icon: Bot, en: "AI Agent Platform", ar: "منصة الوكلاء الأذكياء", status: "live",
    enD: "Eight live agents, each with its own system prompt — the Reporting Agent reads your real session.",
    arD: "ثمانية وكلاء مباشرين، لكل منهم تعليماته الخاصة — وكيل التقارير يقرأ جلستك الحقيقية." },
  { key: "analytics", icon: TrendingUp, en: "Predictive Analytics", ar: "التحليلات التنبؤية", status: "live",
    enD: "A real scikit-learn model trained on 7,043 real customers — try a live churn prediction.",
    arD: "نموذج حقيقي مبني بـ scikit-learn ومدرّب على 7,043 عميلًا حقيقيًا — جرّب توقعًا حيًا." },
  { key: "recommend", icon: Star, en: "Recommendation Engine", ar: "محرك التوصيات", status: "partial",
    enD: "Live recommendations grounded in your session's real data; catalog tabs below use sample records.",
    arD: "توصيات حية مبنية على بيانات جلستك الحقيقية؛ تبويبات الكتالوج أدناه توضيحية." },
  { key: "search", icon: Search, en: "Enterprise Search", ar: "البحث المؤسسي", status: "live",
    enD: "Server-side ranked search over your session corpus and the live web, with real source URLs.",
    arD: "بحث مرتَّب على الخادم عبر محتوى جلستك والويب المباشر، مع روابط مصادر حقيقية." },
  { key: "automation", icon: Workflow, en: "Automation Platform", ar: "منصة الأتمتة", status: "live",
    enD: "Rules are real Postgres rows — create, toggle, run and delete all survive a refresh. A run is recorded, not yet dispatched.",
    arD: "القواعد صفوف حقيقية في Postgres — الإنشاء والتبديل والتشغيل والحذف تبقى بعد التحديث. التشغيل مُسجَّل ولم يُرسَل بعد." },
  { key: "security", icon: Shield, en: "Security & Governance", ar: "الأمان والحوكمة", status: "live",
    enD: "Real backend-verified login, role-gating, and a live timestamped audit log.",
    arD: "تسجيل دخول حقيقي يتحقق منه الخادم، وتقييد حسب الدور، وسجل تدقيق مباشر." },
  { key: "plugins", icon: PlugZap, en: "Integration Hub", ar: "مركز التكاملات", status: "sample",
    enD: "Connect/disconnect toggles work locally; real OAuth connectors are the honestly-labeled next step.",
    arD: "مفاتيح الربط تعمل محليًا؛ موصلات OAuth الحقيقية هي الخطوة التالية الموصوفة بوضوح." },
  { key: "trade", icon: Scale, en: "Trade & Regulatory", ar: "التجارة والتنظيم", status: "live",
    enD: "Cross-border trade law, retrieved live from official government portals and cited — never written from memory.",
    arD: "قانون التجارة عبر الحدود، يُسترجع مباشرة من البوابات الحكومية الرسمية مع التوثيق — لا يُكتب من الذاكرة." },
];

// Free-license stock photography (Unsplash) for atmosphere only — not
// screenshots of the product, not photos of real customers or employees.
// Sized 2/1/2 across a bento grid; captions tie each shot to a real product
// theme without claiming the photo depicts OmniCore itself.
// Kept as arrays, not one delimited string. The previous version stored the
// stack as "React · Vite · … · Ollama (qwen3:4b · qwen2.5vl:7b) · …" and split
// it on "·" at render time, which tore the parenthetical in half and shipped a
// marquee item reading "qwen2.5vl:7b)". Entries are proper nouns, so they are
// not translated — only the row labels are.
const STACK_FRONTEND = [
  "React", "Vite", "Tailwind CSS", "Magic UI", "Motion", "Recharts", "lucide-react",
];
const STACK_BACKEND = [
  "FastAPI", "PostgreSQL", "Redis", "Ollama", "qwen3:4b", "qwen2.5vl:7b",
  "SearXNG", "scikit-learn", "Docker",
];

const GALLERY_PHOTOS = [
  { url: "https://images.unsplash.com/photo-1758691736097-7f735ac5f118?fm=jpg&q=80&w=1200&fit=crop", span: "wide",
    altEn: "A man presents a data chart on a large screen to seated colleagues.", altAr: "رجل يعرض مخططًا بيانيًا على شاشة كبيرة أمام زملاء جالسين.",
    en: "Turning data into decisions", ar: "تحويل البيانات إلى قرارات" },
  { url: "https://images.unsplash.com/photo-1681505526188-b05e68c77582?fm=jpg&q=80&w=900&fit=crop", span: "tall", pos: "60% center",
    altEn: "Two men in business dress shake hands across a table with signed documents on it.", altAr: "رجلان بلباس رسمي يتصافحان عبر طاولة عليها مستندات موقّعة.",
    en: "Arabic and English, both first-class", ar: "العربية والإنجليزية، كلتاهما من الدرجة الأولى" },
  { url: "https://images.unsplash.com/photo-1581091877018-dac6a371d50f?fm=jpg&q=80&w=1200&fit=crop", span: "normal",
    altEn: "Two colleagues discuss ideas at a whiteboard in an office.", altAr: "زميلان يتناقشان في أفكار أمام سبورة بيضاء في مكتب.",
    en: "Grounded answers, not guesses", ar: "إجابات مُسندة إلى مصادرك، لا تخمينات" },
  { url: "https://images.unsplash.com/photo-1758873269461-49cfd01504c1?fm=jpg&q=80&w=1200&fit=crop", span: "normal",
    altEn: "A woman on a video call with colleagues on her laptop in a modern office.", altAr: "امرأة في مكالمة فيديو مع زملائها على حاسوبها في مكتب حديث.",
    en: "Your whole team, one AI core", ar: "فريقك بأكمله، نواة ذكاء اصطناعي واحدة" },
  { url: "https://images.unsplash.com/photo-1758599543154-af711da44cbe?fm=jpg&q=80&w=1200&fit=crop", span: "wide",
    altEn: "A man and a woman walk and talk outside a glass office building, coffee in hand.", altAr: "رجل وامرأة يمشيان ويتحدثان خارج مبنى مكاتب زجاجي وفي يد أحدهما قهوة.",
    en: "Built for how modern teams actually start their day", ar: "مبني لكيفية بدء الفرق الحديثة يومها فعليًا" },
];

const ROADMAP_ITEMS = [
  { icon: Layers, en: { t: "Pixel-level computer vision", d: "YOLO / Segment Anything (SAM) for real object detection and segmentation, alongside today's free-form vision analysis." },
    ar: { t: "رؤية حاسوبية على مستوى البكسل", d: "YOLO / Segment Anything (SAM) لكشف وتجزئة حقيقيين للعناصر، إلى جانب التحليل الحر الحالي." } },
  { icon: Bot, en: { t: "Multi-agent orchestration", d: "LangChain / LangGraph coordinating specialist agents through a planner → specialists → validator pipeline." },
    ar: { t: "تنسيق متعدد الوكلاء", d: "LangChain / LangGraph لتنسيق وكلاء متخصصين عبر مخطط: مخطِّط ← متخصصون ← مدقِّق." } },
  { icon: Server, en: { t: "Knowledge graph + vector retrieval at scale", d: "Neo4j, Elasticsearch, and pgvector replacing today's in-memory, prompt-stuffed RAG." },
    ar: { t: "رسم معرفي واسترجاع متجهي على نطاق واسع", d: "Neo4j وElasticsearch وpgvector بدلًا من الاسترجاع الحالي المؤقت في الذاكرة." } },
  { icon: Cpu, en: { t: "Real job-queue automation", d: "Celery + Redis wiring Module 09's toggles to actual scheduled work, not just local state." },
    ar: { t: "أتمتة حقيقية بطابور مهام", d: "Celery + Redis لربط مفاتيح الوحدة 09 بعمل مجدول فعلي لا مجرد حالة محلية." } },
  { icon: Rocket, en: { t: "Native mobile app", d: "A Flutter app for chat, document scanning, voice notes, alerts, and on-the-go workflow approvals." },
    ar: { t: "تطبيق جوال أصلي", d: "تطبيق Flutter للدردشة ومسح المستندات والملاحظات الصوتية والتنبيهات واعتماد سير العمل أثناء التنقل." } },
  { icon: Map, en: { t: "Cloud-native MLOps", d: "Kubernetes, MLflow, and GitHub Actions on AWS, replacing single-host Docker Compose for scale." },
    ar: { t: "عمليات تعلّم آلي سحابية أصلية", d: "Kubernetes وMLflow وGitHub Actions على AWS بدلًا من Docker Compose أحادي المضيف." } },
];

function statusTone(status) {
  if (status === "live") return { bg: "var(--red-soft)", fg: "var(--red-dark)", dot: "var(--red)" };
  if (status === "partial") return { bg: "var(--tan-soft)", fg: "var(--ink-soft)", dot: "var(--border-strong)" };
  return { bg: "var(--cream-2)", fg: "var(--ink-faint)", dot: "var(--border-strong)" };
}

function StatusBadge({ status, label }) {
  const tone = statusTone(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, background: tone.bg, color: tone.fg,
      fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, lineHeight: 1.6,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: tone.dot }} />
      {label}
    </span>
  );
}

function HeroVisual({ dir }) {
  // The fade must dissolve the edge that touches the headline. In LTR that is
  // the image's left edge; in RTL the columns swap, so it is the right edge.
  // A hardcoded `to right` faded the wrong side in Arabic (QA-verified).
  const fadeFrom = dir === "rtl" ? "left" : "right";
  const mask = `linear-gradient(to ${fadeFrom}, transparent 0%, #000 26%, #000 100%)`;
  return (
    <div className="relative">
      {/* The photograph is served unmodified — nothing is composited onto the
          screen inside the shot, which would read as documentary evidence of
          these particular people running the product. */}
      <div
        style={{
          borderRadius: 22, overflow: "hidden",
          boxShadow: "0 30px 70px rgba(58,10,16,0.20)",
          aspectRatio: "4 / 3", background: "var(--cream-2)",
          // Dissolves the inner edge into the cream canvas so the image reads
          // as continuous with the headline beside it rather than a pasted box.
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      >
        <img
          src="https://images.unsplash.com/photo-1758691736483-5f600b509962?fm=jpg&q=85&w=1600&fit=crop"
          alt="An analyst presenting performance charts on a large screen to colleagues in a daylit meeting room"
          decoding="async"
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "58% center", display: "block" }}
        />
      </div>
    </div>
  );
}

function GalleryCard({ photo, lang }) {
  const spanClass = photo.span === "wide" ? "oc-span-wide" : photo.span === "tall" ? "oc-span-tall" : photo.span === "full" ? "oc-span-full" : "";
  return (
    <div className={`${spanClass} oc-hover-lift`} style={{
      position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)",
    }}>
      <img src={photo.url} alt={lang === "ar" ? photo.altAr : photo.altEn} loading="lazy" decoding="async"
        onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: photo.pos || "center", display: "block" }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(0deg, rgba(58,10,16,0.82) 0%, rgba(58,10,16,0.15) 55%, rgba(58,10,16,0) 75%)",
      }} />
      <div style={{ position: "absolute", insetInline: 14, bottom: 12, color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.35 }}>
        {lang === "ar" ? photo.ar : photo.en}
      </div>
    </div>
  );
}

function FaqItem({ item, open, onToggle, id }) {
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button id={`${id}-btn`} aria-expanded={open} aria-controls={`${id}-panel`} onClick={onToggle} className="oc-focusable" style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        background: "none", border: "none", padding: "18px 4px", cursor: "pointer", textAlign: "start",
      }}>
        <span style={{ fontSize: 15.5, fontWeight: 700, color: "var(--maroon)" }}>{item.q}</span>
        <ChevronDown size={18} color="var(--red)" aria-hidden="true" style={{ flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-btn`} style={{ padding: "0 4px 18px", fontSize: 14, lineHeight: 1.65, color: "var(--ink-soft)", maxWidth: 760 }}>{item.a}</div>}
    </div>
  );
}

export default function LandingPage({ lang, setLang, onGetStarted }) {
  const t = text[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  // Escape closes the open mobile menu (QA: it stayed open). Only listens while
  // the menu is open, so it never interferes with Escape elsewhere on the page.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMobileNavOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const navLink = (href, label) => (
    <a href={href} className="oc-nav-link oc-focusable" onClick={() => setMobileNavOpen(false)}
      style={{ textDecoration: "none", fontSize: 14, fontWeight: 600, color: "var(--maroon)" }}>
      {label}
    </a>
  );

  return (
    <div dir={dir} className="oc-preauth" style={{ minHeight: "100vh" }}>
      <style>{PREAUTH_TOKENS}</style>
      <a href="#main" className="oc-skip">{t.nav.skip}</a>

      {/* NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "var(--cream)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, var(--maroon), var(--red))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={16} color="#fff" />
            </div>
            <span className="oc-display" style={{ fontSize: 17, fontWeight: 700, color: "var(--maroon)" }}>OmniCore AI</span>
          </div>
          <nav aria-label={t.nav.primary} className="oc-desktop-nav" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {navLink("#modules", t.nav.modules)}
            {navLink("#roadmap", t.nav.roadmap)}
            {navLink("#about", t.nav.about)}
            {navLink("#faq", t.nav.faq)}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="oc-focusable" style={{
              display: "flex", alignItems: "center", gap: 6, background: "var(--paper)", border: "1px solid var(--border)",
              borderRadius: 99, padding: "9px 14px", minHeight: 36, fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "var(--maroon)",
            }}>
              <Globe size={13} aria-hidden="true" /> <span lang={lang === "en" ? "ar" : "en"}>{lang === "en" ? "العربية" : "English"}</span>
            </button>
            <button onClick={onGetStarted} className="oc-focusable oc-desktop-nav" style={{
              display: "inline-flex", alignItems: "center", gap: 6, background: "var(--maroon)", color: "#fff",
              border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}>
              {t.nav.signIn}
            </button>
            <button className="oc-mobile-toggle oc-focusable" aria-label={t.nav.menu} aria-expanded={mobileNavOpen} aria-controls="mobile-nav"
              onClick={() => setMobileNavOpen((v) => !v)} style={{
              display: "none", alignItems: "center", justifyContent: "center", width: 40, height: 40, background: "none", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--maroon)",
            }}>
              {mobileNavOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <nav id="mobile-nav" aria-label={t.nav.primary} className={`oc-mobile-nav${mobileNavOpen ? " open" : ""}`} style={{
          flexDirection: "column", gap: 2, padding: "4px 24px 16px", borderTop: "1px solid var(--border)",
        }}>
          {navLink("#modules", t.nav.modules)}
          <div style={{ height: 12 }} />
          {navLink("#roadmap", t.nav.roadmap)}
          <div style={{ height: 12 }} />
          {navLink("#about", t.nav.about)}
          <div style={{ height: 12 }} />
          {navLink("#faq", t.nav.faq)}
          <button onClick={onGetStarted} className="oc-focusable" style={{
            marginTop: 14, background: "var(--maroon)", color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
          }}>
            {t.nav.signIn}
          </button>
        </nav>
      </header>

      <main id="main" tabIndex={-1} style={{ outline: "none" }}>
      {/* HERO */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <DotPattern
          className="opacity-40 [&>*]:fill-[var(--border-strong)] [mask-image:radial-gradient(520px_circle_at_30%_35%,#000,transparent)]"
          width={20} height={20} cr={1}
        />
        <div style={{ position: "relative", maxWidth: 1160, margin: "0 auto", padding: "64px 24px 40px" }}>
        <div className="oc-hero-grid" style={{ display: "grid", gridTemplateColumns: "0.92fr 1.08fr", gap: 40, alignItems: "center" }}>
          <div>
            <BlurFade delay={0}>
              <AnimatedGradientText className="!mx-0 !rounded-full !py-1.5 !px-3 mb-[18px] font-bold !text-[12px]">
                <span className="inline-flex items-center gap-1.5"><Sparkles size={12} /> {t.hero.eyebrow}</span>
              </AnimatedGradientText>
            </BlurFade>
            <BlurFade delay={0.08}>
              <h1 className="oc-display" style={{ fontSize: "clamp(32px, 4.4vw, 50px)", fontWeight: 700, lineHeight: 1.12, color: "var(--maroon)", margin: 0 }}>
                {t.hero.titleA} <span style={{ color: "var(--red)" }}>{t.hero.titleHighlight}</span> {t.hero.titleB}
              </h1>
            </BlurFade>
            <BlurFade delay={0.16}>
              <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--ink-soft)", marginTop: 20, maxWidth: 560 }}>{t.hero.sub}</p>
            </BlurFade>
            <BlurFade delay={0.24}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
                <ShimmerButton onClick={onGetStarted} className="oc-focusable !text-[15px] shadow-[0_10px_24px_rgba(200,30,51,0.28)]">
                  <span className="inline-flex items-center gap-2">{t.hero.ctaPrimary} <ArrowUpRight size={16} /></span>
                </ShimmerButton>
                <a href="#modules" className="oc-focusable" style={{
                  display: "inline-flex", alignItems: "center", gap: 8, background: "var(--paper)", color: "var(--maroon)",
                  border: "1px solid var(--border-strong)", borderRadius: 12, padding: "13px 22px", fontSize: 15, fontWeight: 700, textDecoration: "none",
                }}>
                  {t.hero.ctaSecondary}
                </a>
              </div>
            </BlurFade>
            <BlurFade delay={0.32}>
              {/* Counts are derived from MODULE_INFO, the same registry that
                  drives the status badges further down the page — so this can
                  never drift out of sync with what the module cards claim. */}
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 26, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--ink-soft)" }}>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: "var(--red)" }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--red)" }} />
                  </span>
                  <strong className="oc-mono" style={{ color: "var(--maroon)", fontWeight: 700 }}>
                    <NumberTicker value={MODULE_INFO.filter((m) => m.status === "live").length} delay={0.35} />
                  </strong>
                  {t.hero.liveNow}
                </span>
                <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>
                  <strong className="oc-mono" style={{ color: "var(--maroon)", fontWeight: 700 }}>
                    <NumberTicker value={MODULE_INFO.length} delay={0.4} />
                  </strong>{" "}{t.hero.modulesTotal}
                </span>
              </div>
            </BlurFade>
          </div>
          <div className="oc-hero-visual">
            <BlurFade delay={0.12}>
              <HeroVisual dir={dir} />
            </BlurFade>
          </div>
        </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ position: "relative", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--paper)", overflow: "hidden" }}>
        <DotPattern className="opacity-[0.35] [&>*]:fill-[var(--border-strong)]" width={18} height={18} cr={0.9} />
        <div style={{ position: "relative", maxWidth: 1160, margin: "0 auto", padding: "28px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          {t.trust.map((item, i) => {
            // The stat strings are authored per-language ("84.5%", "7,043").
            // Split off the numeric part so it can count up, and keep whatever
            // trails it (%, etc.) as a static suffix — the figure still lands
            // on exactly the authored value.
            const m = String(item.k).match(/^([\d.,]+)(.*)$/);
            const num = m ? parseFloat(m[1].replace(/,/g, "")) : null;
            const decimals = m && m[1].includes(".") ? 1 : 0;
            return (
              <BlurFade key={i} delay={i * 0.07}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span className="oc-mono oc-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--red)" }}>
                    {num === null ? item.k
                      : <NumberTicker value={num} decimalPlaces={decimals} suffix={m[2]} delay={i * 0.07} />}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.4 }}>{item.v}</span>
                </div>
              </BlurFade>
            );
          })}
        </div>
      </section>

      {/* PHOTO GALLERY */}
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px 20px" }}>
        <div style={{ maxWidth: 640, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{t.gallery.eyebrow}</div>
          <h2 className="oc-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--maroon)", margin: 0 }}>{t.gallery.title}</h2>
        </div>
        <div className="oc-gallery-grid">
          {GALLERY_PHOTOS.map((photo, i) => <GalleryCard key={i} photo={photo} lang={lang} />)}
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px 20px" }}>
        <div style={{ maxWidth: 640, marginBottom: 34 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{t.modules.eyebrow}</div>
          <h2 className="oc-display" style={{ fontSize: 30, fontWeight: 700, color: "var(--maroon)", margin: 0 }}>{t.modules.title}</h2>
          <p style={{ fontSize: 14.5, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.6 }}>{t.modules.desc}</p>
        </div>
        <div className="oc-modules-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {MODULE_INFO.map((m, i) => {
            const Icon = m.icon;
            return (
              <BlurFade key={m.key} delay={(i % 3) * 0.06}>
                <div className="oc-hover-lift relative overflow-hidden h-full" style={{
                  background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 16, padding: 20,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--red-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={17} color="var(--red-dark)" />
                    </div>
                    <StatusBadge status={m.status} label={t.modules.statusLabel[m.status]} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--maroon)", marginBottom: 6 }}>{lang === "ar" ? m.ar : m.en}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-soft)" }}>{lang === "ar" ? m.arD : m.enD}</div>
                  {/* The beam runs only on fully-live modules, so the animation
                      carries the same signal as the badge rather than decorating
                      every card equally. */}
                  {m.status === "live" && <BorderBeam size={120} duration={9} delay={i * 0.8} />}
                </div>
              </BlurFade>
            );
          })}
        </div>
      </section>

      {/* ROADMAP */}
      <section id="roadmap" style={{ background: "var(--maroon)", marginTop: 64 }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px" }}>
          <div style={{ maxWidth: 640, marginBottom: 34 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#F0A9B2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              <Rocket size={13} /> {t.roadmap.eyebrow}
            </div>
            <h2 className="oc-display" style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>{t.roadmap.title}</h2>
            <p style={{ fontSize: 14.5, color: "#E7C7CA", marginTop: 10, lineHeight: 1.6 }}>{t.roadmap.desc}</p>
          </div>
          <div className="oc-roadmap-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {ROADMAP_ITEMS.map((item, i) => {
              const Icon = item.icon;
              const c = lang === "ar" ? item.ar : item.en;
              return (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.25)",
                  borderRadius: 16, padding: 20,
                }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Icon size={16} color="#F0A9B2" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: "#fff", marginBottom: 6 }}>{c.t}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: "#D9AFB3" }}>{c.d}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px" }}>
        <div className="oc-about-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 48, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{t.about.eyebrow}</div>
            <h2 className="oc-display" style={{ fontSize: 28, fontWeight: 700, color: "var(--maroon)", margin: 0 }}>{t.about.title}</h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginTop: 16 }}>{t.about.p1}</p>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", marginTop: 14 }}>{t.about.p2}</p>
          </div>
          <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Building2 size={16} color="var(--red-dark)" />
              <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--maroon)" }}>{t.about.forLabel}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {t.about.roles.map((r) => (
                <span key={r} style={{ background: "var(--cream-2)", color: "var(--ink-soft)", fontSize: 12.5, fontWeight: 600, padding: "5px 11px", borderRadius: 999 }}>{r}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ background: "var(--cream-2)" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "64px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <HelpCircle size={16} color="var(--red)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.faq.eyebrow}</span>
          </div>
          <h2 className="oc-display" style={{ fontSize: 28, fontWeight: 700, color: "var(--maroon)", margin: "0 0 20px" }}>{t.faq.title}</h2>
          <div>
            {t.faq.items.map((item, i) => (
              <FaqItem key={i} id={`faq-${i}`} item={item} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px" }}>
        <div className="relative overflow-hidden" style={{
          background: "linear-gradient(135deg, var(--maroon), var(--maroon-2))", borderRadius: 24, padding: "48px 40px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap",
        }}>
          <Ripple mainCircleSize={190} numCircles={5} />
          <div className="relative">
            <h3 className="oc-display" style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>{t.ctaBand.title}</h3>
            <p style={{ fontSize: 14, color: "#E7C7CA", marginTop: 8 }}>{t.ctaBand.sub}</p>
          </div>
          <ShimmerButton onClick={onGetStarted} className="oc-focusable relative !text-[15px] whitespace-nowrap">
            <span className="inline-flex items-center gap-2">{t.ctaBand.button} <ArrowUpRight size={16} /></span>
          </ShimmerButton>
        </div>
      </section>

      </main>

      {/* FOOTER */}
      <footer style={{ background: "var(--maroon)", padding: "30px 24px 34px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={14} color="#F0A9B2" />
              <span className="oc-display" style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>OmniCore AI</span>
            </div>
            <div style={{ textAlign: "end", fontSize: 12, color: "#C99094" }}>{t.footer.tagline}</div>
          </div>

          {/* Two counter-rotating rows: frontend scrolls one way, backend the
              other. The opposing directions read as one system with two halves,
              and the edge mask fades items out instead of guillotining them
              mid-word at the container edge. */}
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { label: t.footer.frontendLabel, items: STACK_FRONTEND, reverse: false, dur: "38s" },
              { label: t.footer.backendLabel, items: STACK_BACKEND, reverse: true, dur: "46s" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, color: "#C99094", flexShrink: 0,
                  textTransform: "uppercase", letterSpacing: "0.07em", width: 96,
                }}>{row.label}</span>
                <div
                  className="relative min-w-0 flex-1"
                  style={{
                    WebkitMaskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
                    maskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
                  }}
                >
                  {/* Duration goes through `style`, not a className: Tailwind's
                      JIT scans source statically and cannot generate a class
                      from a runtime template string like [--duration:${dur}]. */}
                  <Marquee pauseOnHover reverse={row.reverse} className="!p-0" style={{ "--gap": "1.6rem", "--duration": row.dur }}>
                    {row.items.map((tech) => (
                      <span key={tech} className="oc-mono" style={{
                        fontSize: 11.5, color: "#E7C7CA", whiteSpace: "nowrap",
                        border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "3px 11px",
                      }}>
                        {tech}
                      </span>
                    ))}
                  </Marquee>
                </div>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
