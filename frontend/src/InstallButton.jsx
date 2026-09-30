import React, { useState } from "react";
import { Download, ExternalLink, Share, PlusSquare } from "lucide-react";
import { useInstallState, install } from "./lib/install.js";

const T = {
  en: { install: "Install app", open: "Open full app", iosTitle: "Install OmniCore on your iPhone or iPad", step1: "Tap the Share button in Safari's toolbar.", step2: "Choose “Add to Home Screen”, then tap Add.", done: "Got it" },
  ar: { install: "ثبّت التطبيق", open: "افتح التطبيق كاملًا", iosTitle: "ثبّت أومنيكور على iPhone أو iPad", step1: "اضغط زر المشاركة في شريط أدوات Safari.", step2: "اختر «إضافة إلى الشاشة الرئيسية» ثم اضغط «إضافة».", done: "حسنًا" },
};

/**
 * Renders nothing when the app is already installed or the browser can't
 * install it. `render` lets each surface supply its own button styling.
 */
export default function InstallButton({ lang = "en", render }) {
  const state = useInstallState();
  const [ios, setIos] = useState(false);
  const t = T[lang];
  if (state === "installed" || state === "unsupported") return null;
  const label = state === "frame" ? t.open : t.install;
  const icon = state === "frame" ? ExternalLink : Download;
  const onClick = () => (state === "ios" ? setIos(true) : install());
  return (
    <>
      {render({ label, icon, onClick })}
      {ios && (
        <div role="dialog" aria-modal="true" onClick={() => setIos(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(8,10,14,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} dir={lang === "ar" ? "rtl" : "ltr"}
            style={{ background: "#fff", color: "#14161A", width: "100%", maxWidth: 480, borderRadius: "22px 22px 0 0", padding: "20px 20px calc(20px + env(safe-area-inset-bottom))", fontFamily: "-apple-system, system-ui, sans-serif" }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 14 }}>{t.iosTitle}</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, fontSize: 15 }}><Share size={20} color="#0C8479" /> {t.step1}</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, fontSize: 15 }}><PlusSquare size={20} color="#0C8479" /> {t.step2}</div>
            <button onClick={() => setIos(false)} style={{ width: "100%", border: "none", borderRadius: 12, padding: 13, fontWeight: 700, fontSize: 15, background: "#0C8479", color: "#fff", cursor: "pointer" }}>{t.done}</button>
          </div>
        </div>
      )}
    </>
  );
}
