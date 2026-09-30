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
import InstallButton from "./InstallButton.jsx";

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
  .oc-preauth .oc-install-label { display: none; }
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
    nav: { modules: "Modules", roadmap: "Roadmap", about: "About", faq: "FAQ", signIn: "Open the app", menu: "Menu", primary: "Primary", skip: "Skip to content" },
    hero: {
      eyebrow: "Enterprise Multimodal AI Operating System",
      titleA: "One AI core for how your", titleHighlight: "whole company", titleB: "actually works",
      sub: "Chat, documents, vision, speech, agents, forecasting and automation — open it and it works. Instant online AI with nothing to install, or a fully private mode that runs inside your browser.",
      ctaPrimary: "Get started — it's free", ctaSecondary: "Explore the modules",
      liveNow: "modules, all working", modulesTotal: "installs or API keys needed",
    },
    trust: [
      { k: "84.5%", v: "Churn model ROC-AUC on real held-out customers" },
      { k: "7,043", v: "Real customer records behind the churn model" },
      { k: "0", v: "Downloads needed — AI runs on Hugging Face" },
      { k: "2", v: "Languages, both first-class: English and Arabic" },
    ],
    modules: {
      eyebrow: "What's inside", title: "Thirteen modules. All of them real.",
      desc: "Every card below is a working feature — open the app and try any of them in seconds.",
      statusLabel: { live: "Live", partial: "Live", sample: "Live" },
    },
    gallery: { eyebrow: "Built for real work", title: "The people this is actually built for" },
    roadmap: {
      eyebrow: "Where this is headed", title: "What's next",
      desc: "Today's build is complete and runs entirely in the browser. These are the next steps being explored.",
    },
    about: {
      eyebrow: "How it works", title: "Open it and go — online by default, private when you want",
      p1: "By default OmniCore answers with GPT-OSS 20B (and reads images with Qwen3-VL) on Hugging Face's servers — sign in once with a free Hugging Face account and replies start in about a second, with nothing to download. Prefer full privacy? Switch to the on-device engine in Settings: open models (Qwen3, Qwen3.5, Whisper) then run on your own graphics card with WebGPU, and nothing you type leaves your device.",
      p2: "Your workspace — accounts, documents, chats, automations — is stored in your browser's own database, never on a server. The churn model is a real scikit-learn Random Forest exported to run in JavaScript with identical results.",
      forLabel: "Built with these roles in mind",
      roles: ["CEOs", "Managers", "Analysts", "Engineers", "Customer Support", "HR", "Finance", "IT Operations", "Government Agencies"],
    },
    faq: {
      eyebrow: "Questions", title: "Frequently asked",
      items: [
        { q: "Do I have to download or install anything?", a: "No. Open the page, create your workspace, and sign in once with your free Hugging Face account — the AI (GPT-OSS 20B for text, Qwen3-VL for images) then runs on Hugging Face's servers. No download and no API key. You can also install OmniCore as an app from your browser." },
        { q: "How private is it?", a: "Your workspace is stored only in your browser. In the default online mode, the content of each AI request is sent to Hugging Face Inference Providers to be answered, using your own Hugging Face account. For complete privacy, switch Settings → AI engine to On this device: open models then run inside your browser and nothing you type leaves your device." },
        { q: "Where is my data stored?", a: "In your browser's IndexedDB on this device. Accounts use PBKDF2-hashed passwords. You can export your whole workspace to a file, import it on another device, or erase it at any time from Settings." },
        { q: "Can my team share one workspace?", a: "Accounts live on the device they were created on, so several people can share one computer with separate accounts and roles. Moving between devices works through workspace export and import." },
        { q: "How accurate is the churn model?", a: "78.3% accuracy and 84.5% ROC-AUC on 1,409 real customers it never saw in training. Only 26.5% of customers churn, so the model is tuned for F1 and recall rather than raw accuracy. You can score your own customer CSV or the full IBM dataset in the app." },
        { q: "Do automations really do anything?", a: "Yes. Rules fire on real events (a document analyzed, a high-risk prediction, a meeting summarized, a schedule) and can notify you, post to Slack or Discord, call your webhook, open an email, or save to the knowledge base — while the app is open." },
        { q: "Is it free?", a: "Yes. It's a static site hosted for free on Hugging Face and GitHub Pages, and the models are open. There are no API keys or per-message costs." },
      ],
    },
    ctaBand: { title: "Your AI workspace is one click away.", sub: "Create an account on this device in seconds. No email, no credit card.", button: "Get started" },
    footer: { tagline: "Enterprise Multimodal AI Operating System", builtWith: "Built with", frontendLabel: "Interface", backendLabel: "AI" },
  },
  ar: {
    nav: { modules: "الوحدات", roadmap: "خارطة الطريق", about: "حول", faq: "الأسئلة الشائعة", signIn: "افتح التطبيق", menu: "القائمة", primary: "الرئيسية", skip: "تخطَّ إلى المحتوى" },
    hero: {
      eyebrow: "نظام تشغيل ذكاء اصطناعي متعدد الوسائط للمؤسسات",
      titleA: "نواة ذكاء اصطناعي واحدة لكيفية عمل", titleHighlight: "شركتك بأكملها", titleB: "فعليًا",
      sub: "دردشة ومستندات ورؤية وصوت ووكلاء وتنبؤات وأتمتة — افتحه ويعمل مباشرة. ذكاء اصطناعي فوري عبر الإنترنت بلا تثبيت، أو وضع خاص بالكامل يعمل داخل متصفحك.",
      ctaPrimary: "ابدأ مجانًا", ctaSecondary: "استكشف الوحدات",
      liveNow: "وحدة، كلها تعمل", modulesTotal: "تثبيت أو مفاتيح API مطلوبة",
    },
    trust: [
      { k: "84.5%", v: "دقة نموذج التسرّب (ROC-AUC) على عملاء حقيقيين محجوبين" },
      { k: "7,043", v: "سجل عميل حقيقي خلف نموذج التسرّب" },
      { k: "0", v: "تنزيلات مطلوبة — الذكاء الاصطناعي يعمل على Hugging Face" },
      { k: "2", v: "لغتان من الدرجة الأولى: العربية والإنجليزية" },
    ],
    modules: {
      eyebrow: "ما بالداخل", title: "ثلاث عشرة وحدة. كلها حقيقية.",
      desc: "كل بطاقة أدناه ميزة تعمل — افتح التطبيق وجرّب أيًا منها خلال ثوانٍ.",
      statusLabel: { live: "مباشر", partial: "مباشر", sample: "مباشر" },
    },
    gallery: { eyebrow: "مبني للعمل الفعلي", title: "الأشخاص الذين بُني هذا من أجلهم فعليًا" },
    roadmap: {
      eyebrow: "إلى أين يتجه هذا", title: "ما التالي",
      desc: "البناء الحالي مكتمل ويعمل بالكامل داخل المتصفح. هذه هي الخطوات التالية قيد الاستكشاف.",
    },
    about: {
      eyebrow: "كيف يعمل", title: "افتحه وابدأ — عبر الإنترنت افتراضيًا، وخاص عندما تريد",
      p1: "افتراضيًا يجيب أومنيكور بنموذج GPT-OSS 20B (ويقرأ الصور بنموذج Qwen3-VL) على خوادم Hugging Face — سجّل الدخول مرة واحدة بحساب مجاني فتبدأ الإجابات خلال ثانية تقريبًا ولا يوجد ما يُنزَّل. تفضّل الخصوصية الكاملة؟ اختر المحرك «على هذا الجهاز» من الإعدادات: تعمل عندها نماذج مفتوحة (Qwen3 وQwen3.5 وWhisper) على بطاقة الرسومات لديك عبر WebGPU، ولا يغادر جهازك شيء مما تكتبه.",
      p2: "مساحة عملك — الحسابات والمستندات والمحادثات والأتمتة — محفوظة في قاعدة بيانات متصفحك، وليس على أي خادم. ونموذج التسرّب غابة عشوائية حقيقية من scikit-learn مُصدَّرة لتعمل في JavaScript بنتائج مطابقة.",
      forLabel: "بُني مع وضع هذه الأدوار في الاعتبار",
      roles: ["الرؤساء التنفيذيون", "المديرون", "المحللون", "المهندسون", "دعم العملاء", "الموارد البشرية", "المالية", "عمليات تقنية المعلومات", "الجهات الحكومية"],
    },
    faq: {
      eyebrow: "أسئلة", title: "الأسئلة الشائعة",
      items: [
        { q: "هل أحتاج إلى تنزيل أو تثبيت أي شيء؟", a: "لا. افتح الصفحة وأنشئ مساحة عملك وسجّل الدخول مرة واحدة بحساب Hugging Face المجاني — يعمل بعدها الذكاء الاصطناعي (GPT-OSS 20B للنصوص وQwen3-VL للصور) على خوادم Hugging Face. بلا تنزيل ولا مفتاح API. ويمكنك أيضًا تثبيت أومنيكور كتطبيق من متصفحك." },
        { q: "ما مدى الخصوصية؟", a: "مساحة عملك محفوظة في متصفحك فقط. في الوضع الافتراضي عبر الإنترنت يُرسَل محتوى كل طلب إلى Hugging Face للإجابة عنه باستخدام حسابك. ولخصوصية كاملة اختر في الإعدادات «على هذا الجهاز»: تعمل عندها النماذج المفتوحة داخل متصفحك ولا يغادر جهازك شيء مما تكتبه." },
        { q: "هل يعمل الذكاء الاصطناعي فعلًا داخل متصفحي؟", a: "نعم. يستخدم أومنيكور مكتبتي Transformers.js وONNX Runtime Web لتشغيل Qwen3 (النصوص) وQwen3.5 (الصور) وWhisper (الكلام) مباشرة في الصفحة — وكلها متعددة اللغات بما فيها العربية. في أول استخدام يطلب إذنك قبل تنزيل نموذج النصوص (نحو 590 ميغابايت)، ولا تُنزَّل نماذج الرؤية والكلام إلا عند أول استخدام لها، ثم يُحمَّل كل شيء من ذاكرة المتصفح." },
        { q: "ماذا أحتاج؟", a: "متصفح حديث مثل Chrome أو Edge أو Safari أو Firefox. بطاقة رسومات تدعم WebGPU تجعل الإجابات سريعة، وبدونها تعمل النماذج على المعالج بشكل أبطأ. الهواتف الحديثة تعمل أيضًا." },
        { q: "أين تُحفظ بياناتي؟", a: "في IndexedDB بمتصفحك على هذا الجهاز. الحسابات تستخدم كلمات مرور مجزأة بـ PBKDF2. يمكنك تصدير مساحة عملك إلى ملف أو استيرادها على جهاز آخر أو مسحها في أي وقت من الإعدادات." },
        { q: "هل يمكن لفريقي مشاركة مساحة عمل؟", a: "الحسابات تبقى على الجهاز الذي أُنشئت عليه، لذا يمكن لعدة أشخاص مشاركة حاسوب واحد بحسابات وأدوار منفصلة. والانتقال بين الأجهزة يتم عبر تصدير مساحة العمل واستيرادها." },
        { q: "ما دقة نموذج التسرّب؟", a: "78.3% دقة و84.5% ROC-AUC على 1,409 عملاء حقيقيين لم يرهم أثناء التدريب. 26.5% فقط من العملاء يتسربون، لذا ضُبط النموذج على F1 والاستدعاء لا الدقة الخام. يمكنك تقييم ملف عملائك أو بيانات IBM كاملة داخل التطبيق." },
        { q: "هل تنفّذ الأتمتة شيئًا فعلًا؟", a: "نعم. تعمل القواعد على أحداث حقيقية (تحليل مستند، تنبؤ عالي الخطورة، تلخيص اجتماع، جدول زمني) ويمكنها إشعارك أو النشر في Slack أو Discord أو استدعاء Webhook أو فتح بريد أو الحفظ في قاعدة المعرفة — أثناء فتح التطبيق." },
        { q: "هل هو مجاني؟", a: "نعم. إنه موقع ثابت مستضاف مجانًا على Hugging Face وGitHub Pages، والنماذج مفتوحة. لا مفاتيح API ولا تكلفة لكل رسالة." },
      ],
    },
    ctaBand: { title: "مساحة عملك بالذكاء الاصطناعي على بُعد نقرة.", sub: "أنشئ حسابًا على هذا الجهاز في ثوانٍ. بلا بريد إلكتروني ولا بطاقة ائتمان.", button: "ابدأ الآن" },
    footer: { tagline: "نظام تشغيل ذكاء اصطناعي متعدد الوسائط للمؤسسات", builtWith: "مبني باستخدام", frontendLabel: "الواجهة", backendLabel: "الذكاء الاصطناعي" },
  },
};

const MODULE_INFO = [
  { key: "dashboard", icon: Home, en: "Executive Dashboard", ar: "لوحة القيادة التنفيذية", status: "live",
    enD: "KPIs, a 14-day activity trend and module usage — all computed from what you actually do, plus an on-demand AI insight.",
    arD: "مؤشرات أداء ومخطط نشاط 14 يومًا واستخدام الوحدات — كلها محسوبة مما تفعله فعليًا، مع رؤية ذكاء اصطناعي عند الطلب." },
  { key: "chat", icon: MessageSquare, en: "AI Chat Assistant", ar: "مساعد الدردشة الذكي", status: "live",
    enD: "Saved conversations with streaming answers, grounded in your knowledge base with citations, plus optional Wikipedia lookup and image questions.",
    arD: "محادثات محفوظة بإجابات متدفقة، مستندة إلى قاعدة معرفتك مع الاستشهادات، مع بحث اختياري في ويكيبيديا وأسئلة عن الصور." },
  { key: "documents", icon: FileText, en: "Document Intelligence", ar: "ذكاء المستندات", status: "live",
    enD: "PDF, Word, text or a photo of a page — summaries, key points and Q&A, with long documents summarized part by part.",
    arD: "PDF أو Word أو نص أو صورة صفحة — ملخصات ونقاط رئيسية وأسئلة وأجوبة، مع تلخيص المستندات الطويلة جزءًا بجزء." },
  { key: "vision", icon: Camera, en: "Computer Vision", ar: "الرؤية الحاسوبية", status: "live",
    enD: "Describe scenes and objects, read text in images (multilingual), or ask your own question — straight from your phone camera too.",
    arD: "صف المشاهد والعناصر، واقرأ النص في الصور (بعدة لغات)، أو اطرح سؤالك — حتى مباشرة من كاميرا هاتفك." },
  { key: "speech", icon: Mic, en: "Speech AI", ar: "الذكاء الصوتي", status: "live",
    enD: "Private on-device transcription with Whisper, meeting summaries with decisions and action items, and text-to-speech.",
    arD: "تفريغ صوتي خاص على الجهاز بواسطة Whisper، وملخصات اجتماعات بالقرارات وبنود العمل، وتحويل النص إلى كلام." },
  { key: "agents", icon: Bot, en: "AI Agent Platform", ar: "منصة الوكلاء الأذكياء", status: "live",
    enD: "Eight specialised agents — research with live sources, a data analyst that profiles your CSV, and a reporting agent that reads your real workspace.",
    arD: "ثمانية وكلاء متخصصين — بحث بمصادر حية، ومحلل بيانات يدرس ملف CSV، ووكيل تقارير يقرأ مساحة عملك الحقيقية." },
  { key: "analytics", icon: TrendingUp, en: "Predictive Analytics", ar: "التحليلات التنبؤية", status: "live",
    enD: "A real churn model trained on 7,043 customers: live what-if predictions, risk levers, and batch scoring of whole CSV files.",
    arD: "نموذج تسرّب حقيقي مدرّب على 7,043 عميلًا: تنبؤات فورية، وعوامل خفض الخطر، وتقييم ملفات CSV كاملة." },
  { key: "recommend", icon: Star, en: "Recommendation Engine", ar: "محرك التوصيات", status: "live",
    enD: "Next steps, related documents, one-click automations and at-risk customers — derived from your real activity.",
    arD: "خطوات تالية ومستندات ذات صلة وأتمتة بنقرة وعملاء معرّضون — مستخلصة من نشاطك الحقيقي." },
  { key: "search", icon: Search, en: "Enterprise Search", ar: "البحث المؤسسي", status: "live",
    enD: "Instant ranked search across every chat, document, meeting, analysis and agent run — with an AI answer from the results.",
    arD: "بحث فوري مرتَّب في كل محادثة ومستند واجتماع وتحليل وتشغيل وكيل — مع إجابة ذكاء اصطناعي من النتائج." },
  { key: "automation", icon: Workflow, en: "Automation Platform", ar: "منصة الأتمتة", status: "live",
    enD: "When-this-then-that rules on real events and schedules — notify, post to Slack or Discord, call webhooks, file to knowledge.",
    arD: "قواعد «إذا حدث هذا فافعل ذاك» على أحداث وجداول حقيقية — إشعار، نشر في Slack أو Discord، Webhooks، حفظ في المعرفة." },
  { key: "security", icon: Shield, en: "Security & Governance", ar: "الأمان والحوكمة", status: "live",
    enD: "Hashed-password accounts, enforced roles, user management and a filterable, exportable audit log.",
    arD: "حسابات بكلمات مرور مجزأة، وأدوار مفروضة، وإدارة مستخدمين، وسجل تدقيق قابل للتصفية والتصدير." },
  { key: "plugins", icon: PlugZap, en: "Integration Hub", ar: "مركز التكاملات", status: "live",
    enD: "Slack, Discord, custom webhooks, email and desktop notifications — connect in seconds, test with one click.",
    arD: "Slack وDiscord وWebhooks مخصصة والبريد وإشعارات سطح المكتب — اربطها في ثوانٍ واختبرها بنقرة." },
  { key: "trade", icon: Scale, en: "Trade & Regulatory", ar: "التجارة والتنظيم", status: "live",
    enD: "Cross-border trade questions answered from live official sources — US Federal Register, GOV.UK, EU — always cited.",
    arD: "أسئلة التجارة عبر الحدود تُجاب من مصادر رسمية حية — السجل الفيدرالي الأمريكي وGOV.UK والاتحاد الأوروبي — مع التوثيق دائمًا." },
];

// Free-license stock photography (Unsplash) for atmosphere only — not
// screenshots of the product, not photos of real customers or employees.
// Sized 2/1/2 across a bento grid; captions tie each shot to a real product
// theme without claiming the photo depicts OmniCore itself.
// Kept as arrays, not one delimited string. The previous version stored the
// stack as one "·"-delimited string and split
// it on "·" at render time, which tore the parenthetical in half and shipped a
// marquee item reading "qwen2.5vl:7b)". Entries are proper nouns, so they are
// not translated — only the row labels are.
const STACK_FRONTEND = [
  "React", "Vite", "Tailwind CSS", "Magic UI", "Motion", "Recharts", "IndexedDB", "lucide-react",
];
const STACK_BACKEND = [
  "Transformers.js", "ONNX Runtime Web", "WebGPU", "Qwen3", "Qwen3.5", "Whisper", "scikit-learn", "pdf.js",
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
  { icon: Layers, en: { t: "Pixel-level vision", d: "Object detection and segmentation models running on-device alongside today's free-form image understanding." },
    ar: { t: "رؤية على مستوى البكسل", d: "نماذج كشف وتجزئة للعناصر تعمل على الجهاز إلى جانب فهم الصور الحالي." } },
  { icon: Bot, en: { t: "Multi-step agents", d: "Agents that plan, call OmniCore's own tools (search, scoring, documents) and check their work before answering." },
    ar: { t: "وكلاء متعددو الخطوات", d: "وكلاء يخططون ويستدعون أدوات أومنيكور (البحث والتقييم والمستندات) ويراجعون عملهم قبل الإجابة." } },
  { icon: Server, en: { t: "Semantic search", d: "On-device embeddings so search and chat find meaning, not just matching words." },
    ar: { t: "بحث دلالي", d: "تضمينات على الجهاز ليجد البحث والدردشة المعنى لا الكلمات المتطابقة فقط." } },
  { icon: Cpu, en: { t: "Encrypted sync", d: "Optional end-to-end encrypted sync so a workspace can follow you between devices." },
    ar: { t: "مزامنة مشفرة", d: "مزامنة اختيارية مشفرة من طرف إلى طرف لتنتقل مساحة العمل معك بين الأجهزة." } },
  { icon: Rocket, en: { t: "Offline-first mobile", d: "Install to the home screen and keep working without a connection once models are cached." },
    ar: { t: "جوال يعمل دون اتصال", d: "ثبّته على الشاشة الرئيسية وواصل العمل دون اتصال بعد حفظ النماذج." } },
  { icon: Map, en: { t: "More official sources", d: "Additional government APIs for trade and regulatory retrieval as they open up to browsers." },
    ar: { t: "مصادر رسمية أكثر", d: "واجهات حكومية إضافية للاسترجاع التجاري والتنظيمي حالما تصبح متاحة للمتصفحات." } },
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
          src="https://images.unsplash.com/photo-1758691736483-5f600b509962?fm=jpg&q=80&w=1200&fit=crop"
          fetchpriority="high"
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
            <InstallButton lang={lang} render={({ label, icon: Icon, onClick }) => (
              <button onClick={onClick} className="oc-focusable" style={{
                display: "flex", alignItems: "center", gap: 6, background: "var(--paper)", border: "1px solid var(--border)",
                borderRadius: 99, padding: "9px 14px", minHeight: 36, fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "var(--maroon)",
              }}>
                <Icon size={13} aria-hidden="true" /> <span className="oc-install-label">{label}</span>
              </button>
            )} />
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
            <div className="oc-fade-up" style={{ animationDelay: "0.00s" }}>
              <AnimatedGradientText className="!mx-0 !rounded-full !py-1.5 !px-3 mb-[18px] font-bold !text-[12px]">
                <span className="inline-flex items-center gap-1.5"><Sparkles size={12} /> {t.hero.eyebrow}</span>
              </AnimatedGradientText>
            </div>
            <div className="oc-fade-up" style={{ animationDelay: "0.04s" }}>
              <h1 className="oc-display" style={{ fontSize: "clamp(32px, 4.4vw, 50px)", fontWeight: 700, lineHeight: 1.12, color: "var(--maroon)", margin: 0 }}>
                {t.hero.titleA} <span style={{ color: "var(--red)" }}>{t.hero.titleHighlight}</span> {t.hero.titleB}
              </h1>
            </div>
            <div className="oc-fade-up" style={{ animationDelay: "0.08s" }}>
              <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--ink-soft)", marginTop: 20, maxWidth: 560 }}>{t.hero.sub}</p>
            </div>
            <div className="oc-fade-up" style={{ animationDelay: "0.12s" }}>
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
            </div>
            <div className="oc-fade-up" style={{ animationDelay: "0.16s" }}>
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
                    0
                  </strong>{" "}{t.hero.modulesTotal}
                </span>
              </div>
            </div>
          </div>
          <div className="oc-hero-visual">
            <div className="oc-fade-up" style={{ animationDelay: "0.06s" }}>
              <HeroVisual dir={dir} />
            </div>
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
                      from a runtime template string. */}
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
