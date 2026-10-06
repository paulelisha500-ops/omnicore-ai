import {
  Home, MessageSquare, FileText, Camera, Mic, Bot, TrendingUp, Star, Search, Scale, Workflow, Shield, PlugZap,
} from "lucide-react";

export const commonText = {
  en: {
    appName: "OmniCore AI", tagline: "Enterprise Multimodal AI Operating System",
    loading: "Loading…", send: "Send", cancel: "Cancel", save: "Save", delete: "Delete", retry: "Retry",
    close: "Close", copy: "Copy", copied: "Copied", live: "Live", onDevice: "On-device",
    settings: "Settings", profile: "Profile", logout: "Sign out", notifications: "Notifications",
    adminOnly: "Admin access required", adminOnlyDesc: "Security & Governance is restricted to Platform Admins. Ask an admin on this device to change your role.",
    more: "More", search: "Search", error: "Error",
    remove: "Remove", mainNav: "Main navigation", quickNav: "Quick navigation",
    showPassword: "Show password", hidePassword: "Hide password",
  },
  ar: {
    appName: "أومنيكور إيه آي", tagline: "نظام تشغيل ذكاء اصطناعي متعدد الوسائط للمؤسسات",
    loading: "جارٍ التحميل…", send: "إرسال", cancel: "إلغاء", save: "حفظ", delete: "حذف", retry: "إعادة المحاولة",
    close: "إغلاق", copy: "نسخ", copied: "تم النسخ", live: "مباشر", onDevice: "على الجهاز",
    settings: "الإعدادات", profile: "الملف الشخصي", logout: "تسجيل الخروج", notifications: "الإشعارات",
    adminOnly: "يتطلب صلاحية المسؤول", adminOnlyDesc: "الأمان والحوكمة مقتصر على مسؤولي المنصة. اطلب من مسؤول على هذا الجهاز تغيير دورك.",
    more: "المزيد", search: "بحث", error: "خطأ",
    remove: "إزالة", mainNav: "التنقل الرئيسي", quickNav: "التنقل السريع",
    showPassword: "إظهار كلمة المرور", hidePassword: "إخفاء كلمة المرور",
  },
};

export const NAV_ITEMS = [
  { key: "dashboard", icon: Home, en: "Executive Dashboard", ar: "لوحة القيادة التنفيذية", short: { en: "Home", ar: "الرئيسية" }, group: "overview" },
  { key: "chat", icon: MessageSquare, en: "AI Chat Assistant", ar: "مساعد الدردشة الذكي", short: { en: "Chat", ar: "الدردشة" }, group: "ai" },
  { key: "documents", icon: FileText, en: "Document Intelligence", ar: "ذكاء المستندات", short: { en: "Docs", ar: "المستندات" }, group: "ai" },
  { key: "vision", icon: Camera, en: "Computer Vision", ar: "الرؤية الحاسوبية", short: { en: "Vision", ar: "الرؤية" }, group: "ai" },
  { key: "speech", icon: Mic, en: "Speech AI", ar: "الذكاء الصوتي", short: { en: "Speech", ar: "الصوت" }, group: "ai" },
  { key: "agents", icon: Bot, en: "AI Agent Platform", ar: "منصة الوكلاء الأذكياء", short: { en: "Agents", ar: "الوكلاء" }, group: "ai" },
  { key: "analytics", icon: TrendingUp, en: "Predictive Analytics", ar: "التحليلات التنبؤية", short: { en: "Predict", ar: "التنبؤ" }, group: "data" },
  { key: "recommend", icon: Star, en: "Recommendation Engine", ar: "محرك التوصيات", short: { en: "For you", ar: "لك" }, group: "data" },
  { key: "search", icon: Search, en: "Enterprise Search", ar: "البحث المؤسسي", short: { en: "Search", ar: "بحث" }, group: "data" },
  { key: "trade", icon: Scale, en: "Trade & Regulatory", ar: "التجارة والتنظيم", short: { en: "Trade", ar: "التجارة" }, group: "data" },
  { key: "automation", icon: Workflow, en: "Automation Platform", ar: "منصة الأتمتة", short: { en: "Automate", ar: "الأتمتة" }, group: "ops" },
  { key: "plugins", icon: PlugZap, en: "Integration Hub", ar: "مركز التكاملات", short: { en: "Integrations", ar: "التكاملات" }, group: "ops" },
  { key: "security", icon: Shield, en: "Security & Governance", ar: "الأمان والحوكمة", short: { en: "Security", ar: "الأمان" }, group: "ops", admin: true },
];

export const GROUP_LABEL = {
  en: { overview: "Overview", ai: "AI Modules", data: "Data & Discovery", ops: "Operations" },
  ar: { overview: "نظرة عامة", ai: "وحدات الذكاء الاصطناعي", data: "البيانات والاكتشاف", ops: "العمليات" },
};

export const TAB_BAR = ["dashboard", "chat", "documents", "search"];
