/* ============================================================================
   "Sign in with Hugging Face" — powers the online AI engine.

   The Hugging Face Space enables OAuth (`hf_oauth: true` with the
   `inference-api` scope in its README). A visitor signs in once; OmniCore
   receives a token that lets it run AI on Hugging Face's servers on the
   visitor's behalf, using their account's free monthly inference credit.
   The token stays in this browser only.

   Login runs in the same window (the Space iframe or the full-screen app), so
   the PKCE code verifier stored before the redirect is found again after it.
   ============================================================================ */
import { useSyncExternalStore } from "react";

const KEY = "omnicore_hf_session";
const subs = new Set();
const emit = () => subs.forEach((f) => f());

function read() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (!s?.accessToken) return null;
    if (s.expiresAt && Date.parse(s.expiresAt) < Date.now() + 60_000) { localStorage.removeItem(KEY); return null; }
    return s;
  } catch { return null; }
}
let session = typeof window !== "undefined" ? read() : null;

export const getHFSession = () => session;
export function useHFSession() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => session);
}

/** Online sign-in is available where the Space's OAuth app is configured. */
export const signInAvailable = () => Boolean(typeof window !== "undefined" && window.huggingface?.variables?.OAUTH_CLIENT_ID);

export const SPACE_APP_URL = "https://elisha622-omnicore-ai.static.hf.space/";

/** Call once at startup: completes a sign-in if we just came back from Hugging Face. */
export async function completeSignInIfPresent() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("code") || !url.searchParams.has("state")) return null;
  let r = null;
  try {
    const { oauthHandleRedirectIfPresent } = await import("@huggingface/hub");
    r = await oauthHandleRedirectIfPresent();
    if (r) {
      session = {
        accessToken: r.accessToken,
        expiresAt: new Date(r.accessTokenExpiresAt).toISOString(),
        name: r.userInfo?.name || r.userInfo?.preferred_username || "",
        username: r.userInfo?.preferred_username || "",
        avatar: r.userInfo?.picture || "",
        scope: r.scope || "",
      };
      localStorage.setItem(KEY, JSON.stringify(session));
      emit();
    }
    return r || null;
  } catch (e) {
    console.error("[hf sign-in]", e);
    return null;
  } finally {
    // Drop ?code=&state= from the address bar, keep the in-app route.
    let route = "";
    try { const s = JSON.parse(r?.state || "null"); if (typeof s?.route === "string" && s.route.startsWith("#")) route = s.route; } catch { /* not ours */ }
    history.replaceState(null, "", `${url.origin}${url.pathname}${route}`);
  }
}

export async function signInWithHF() {
  const { oauthLoginUrl } = await import("@huggingface/hub");
  const url = await oauthLoginUrl({
    redirectUrl: `${window.location.origin}${window.location.pathname}`,
    state: JSON.stringify({ route: window.location.hash || "" }),
  });
  window.location.href = url;
}

export function signOutHF() {
  localStorage.removeItem(KEY);
  session = null;
  emit();
}

/** Called when Hugging Face rejects the token (expired or revoked). */
export function invalidateHF() { signOutHF(); }
