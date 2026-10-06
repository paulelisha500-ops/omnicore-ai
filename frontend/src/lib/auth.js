/* ============================================================================
   Accounts and sessions — entirely on this device.

   Passwords are never stored: each account keeps a random 16-byte salt and a
   PBKDF2-SHA-256 hash (310,000 iterations, OWASP's current floor) derived with
   the browser's WebCrypto. Sign-in is throttled per account (5 failures locks
   it for 15 minutes) and sessions expire after 24 hours.

   The first account created in a browser becomes its Platform Admin; every
   later account starts as an Analyst and can be promoted from Security &
   Governance. Roles are enforced in the data layer (see requireAdmin), not
   only by hiding navigation.
   ============================================================================ */
import { db } from "./db.js";

export const ROLES = ["Platform Admin", "Analyst"];
export const ADMIN = "Platform Admin";

export const PASSWORD_POLICY = { iterations: 310_000, hash: "SHA-256", minLength: 8 };
export const LOCKOUT = { maxFailures: 5, minutes: 15 };
export const SESSION_HOURS = 24;

const SESSION_KEY = "omnicore_session";
const LOCK_PREFIX = "omnicore_lock_";
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

// localStorage can throw (quota exceeded, storage blocked, some private
// modes). Sign-in must still work then, so writes that fail are kept in memory
// for this tab instead — the session simply won't survive a reload.
const memory = new Map();
const store = {
  get(k) {
    if (memory.has(k)) return memory.get(k);
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, v); memory.delete(k); } catch { memory.set(k, v); }
  },
  remove(k) {
    memory.delete(k);
    try { localStorage.removeItem(k); } catch { /* storage unavailable */ }
  },
};

const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password, salt, iterations) {
  if (!crypto?.subtle) throw new Error("This page must be opened over HTTPS for secure sign-in.");
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: PASSWORD_POLICY.hash, salt, iterations }, key, 256);
  return b64(bits);
}

// Constant-time string compare, so a wrong guess can't be timed character by character.
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function normalizeUsername(u) {
  return String(u || "").trim().toLowerCase();
}

export function publicUser(u) {
  return u ? { username: u.username, full_name: u.fullName, role: u.role, createdAt: u.createdAt } : null;
}

function err(en, ar) {
  const e = new Error(en);
  e.ar = ar;
  return e;
}

export function validateNewAccount({ username, fullName, password }) {
  const name = normalizeUsername(username);
  if (!USERNAME_RE.test(name)) {
    throw err("Username must be 3–32 characters: letters, numbers, dots, dashes or underscores.",
      "يجب أن يتكون اسم المستخدم من 3 إلى 32 حرفًا: أحرف أو أرقام أو نقاط أو شرطات.");
  }
  if (!String(fullName || "").trim()) throw err("Enter your full name.", "أدخل اسمك الكامل.");
  if (String(password || "").length < PASSWORD_POLICY.minLength) {
    throw err(`Password must be at least ${PASSWORD_POLICY.minLength} characters.`, `يجب ألا تقل كلمة المرور عن ${PASSWORD_POLICY.minLength} أحرف.`);
  }
  return name;
}

export async function hasAccounts() {
  return (await db.count("users")) > 0;
}

export async function createAccount({ username, fullName, password }) {
  const name = validateNewAccount({ username, fullName, password });
  if (await db.get("users", name)) throw err("That username is already taken on this device.", "اسم المستخدم هذا مستخدم بالفعل على هذا الجهاز.");
  const isFirst = !(await hasAccounts());
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const user = {
    username: name,
    fullName: String(fullName).trim().slice(0, 80),
    role: isFirst ? ADMIN : "Analyst",
    salt: b64(salt),
    hash: await derive(password, salt, PASSWORD_POLICY.iterations),
    iterations: PASSWORD_POLICY.iterations,
    createdAt: Date.now(),
  };
  await db.put("users", user);
  return startSession(user);
}

function lockState(name) {
  try { return JSON.parse(store.get(LOCK_PREFIX + name)) || { fails: 0, until: 0 }; }
  catch { return { fails: 0, until: 0 }; }
}

export async function signIn(username, password) {
  const name = normalizeUsername(username);
  // No account can have a name outside the username rules, so refuse it
  // before touching storage — otherwise any string, however long, would be
  // written as a lockout key on every attempt.
  if (!USERNAME_RE.test(name)) throw err("Incorrect username or password.", "اسم المستخدم أو كلمة المرور غير صحيحة.");
  const lock = lockState(name);
  if (lock.until > Date.now()) {
    const mins = Math.max(1, Math.ceil((lock.until - Date.now()) / 60000));
    throw err(`Too many failed attempts. Try again in ${mins} minute(s).`, `محاولات فاشلة كثيرة. حاول مرة أخرى بعد ${mins} دقيقة.`);
  }
  const user = await db.get("users", name);
  const ok = user && safeEqual(await derive(String(password), unb64(user.salt), user.iterations), user.hash);
  if (!ok) {
    const fails = (lock.until && lock.until <= Date.now() ? 0 : lock.fails) + 1;
    const next = { fails, until: fails >= LOCKOUT.maxFailures ? Date.now() + LOCKOUT.minutes * 60000 : 0 };
    store.set(LOCK_PREFIX + name, JSON.stringify(next));
    throw err("Incorrect username or password.", "اسم المستخدم أو كلمة المرور غير صحيحة.");
  }
  store.remove(LOCK_PREFIX + name);
  return startSession(user);
}

function startSession(user) {
  const session = { username: user.username, issuedAt: Date.now(), expiresAt: Date.now() + SESSION_HOURS * 3600_000 };
  store.set(SESSION_KEY, JSON.stringify(session));
  return publicUser(user);
}

/** Returns the signed-in user, or null if there's no valid, unexpired session. */
export async function restoreSession() {
  let s;
  try { s = JSON.parse(store.get(SESSION_KEY)); } catch { s = null; }
  if (!s || !s.username || !(s.expiresAt > Date.now())) {
    store.remove(SESSION_KEY);
    return { user: null, expired: Boolean(s && s.expiresAt) };
  }
  const user = await db.get("users", s.username);
  if (!user) { store.remove(SESSION_KEY); return { user: null, expired: false }; }
  return { user: publicUser(user), expired: false };
}

export function sessionInfo() {
  try { return JSON.parse(store.get(SESSION_KEY)); } catch { return null; }
}

export function signOut() {
  store.remove(SESSION_KEY);
}

export async function changePassword(username, current, next) {
  const user = await db.get("users", username);
  if (!user) throw err("Account not found.", "الحساب غير موجود.");
  const ok = safeEqual(await derive(String(current), unb64(user.salt), user.iterations), user.hash);
  if (!ok) throw err("Your current password is incorrect.", "كلمة المرور الحالية غير صحيحة.");
  if (String(next).length < PASSWORD_POLICY.minLength) {
    throw err(`Password must be at least ${PASSWORD_POLICY.minLength} characters.`, `يجب ألا تقل كلمة المرور عن ${PASSWORD_POLICY.minLength} أحرف.`);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await db.put("users", { ...user, salt: b64(salt), hash: await derive(next, salt, PASSWORD_POLICY.iterations), iterations: PASSWORD_POLICY.iterations });
}

export async function updateProfile(username, { fullName }) {
  const user = await db.get("users", username);
  if (!user) throw err("Account not found.", "الحساب غير موجود.");
  const name = String(fullName || "").trim();
  if (!name) throw err("Enter your full name.", "أدخل اسمك الكامل.");
  const updated = { ...user, fullName: name.slice(0, 80) };
  await db.put("users", updated);
  return publicUser(updated);
}

/* --------------------------------------------------------------------------
   Admin-only operations. Each re-reads the actor from the database, so a role
   edited in memory (or devtools) can't authorize anything.
   -------------------------------------------------------------------------- */
export async function requireAdmin(actorUsername) {
  const actor = await db.get("users", actorUsername);
  if (!actor || actor.role !== ADMIN) {
    throw err("This action requires the Platform Admin role.", "يتطلب هذا الإجراء دور مسؤول المنصة.");
  }
  return actor;
}

export async function listUsers(actorUsername) {
  await requireAdmin(actorUsername);
  return (await db.all("users")).map(publicUser).sort((a, b) => a.createdAt - b.createdAt);
}

async function adminCount() {
  return (await db.all("users")).filter((u) => u.role === ADMIN).length;
}

export async function setRole(actorUsername, username, role) {
  await requireAdmin(actorUsername);
  if (!ROLES.includes(role)) throw err("Unknown role.", "دور غير معروف.");
  const user = await db.get("users", username);
  if (!user) throw err("Account not found.", "الحساب غير موجود.");
  if (user.role === ADMIN && role !== ADMIN && (await adminCount()) <= 1) {
    throw err("There must always be at least one Platform Admin.", "يجب أن يبقى مسؤول منصة واحد على الأقل.");
  }
  await db.put("users", { ...user, role });
}

export async function removeUser(actorUsername, username) {
  await requireAdmin(actorUsername);
  const user = await db.get("users", username);
  if (!user) return;
  if (user.role === ADMIN && (await adminCount()) <= 1) {
    throw err("You can't remove the last Platform Admin.", "لا يمكن حذف آخر مسؤول للمنصة.");
  }
  await deleteUserData(username);
  await db.delete("users", username);
}

/** Deletes every record a user owns (not the account row itself). */
export async function deleteUserData(username) {
  for (const store of ["docs", "threads", "events", "automations", "integrations", "notifications", "records"]) {
    const rows = await db.byOwner(store, username);
    await db.deleteMany(store, rows.map((r) => r.id));
  }
}

export async function deleteOwnAccount(username, password) {
  const user = await db.get("users", username);
  if (!user) return;
  const ok = safeEqual(await derive(String(password), unb64(user.salt), user.iterations), user.hash);
  if (!ok) throw err("Password is incorrect.", "كلمة المرور غير صحيحة.");
  if (user.role === ADMIN && (await adminCount()) <= 1 && (await db.count("users")) > 1) {
    throw err("Promote another Platform Admin before deleting this account.", "رقِّ مسؤول منصة آخر قبل حذف هذا الحساب.");
  }
  await deleteUserData(username);
  await db.delete("users", username);
  signOut();
}
