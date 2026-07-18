// Offline authentication cache.
// After a successful ONLINE login we derive a PBKDF2 hash of the user's
// credential (password / DOB) and cache it locally together with a snapshot
// of their AuthUser. When the browser is offline, the login pages can
// verify the same credential against the cached hash and hydrate the app
// from the snapshot — no network round-trip required.
//
// Security notes:
// - PBKDF2-SHA256, 120k iterations, random 16-byte salt (WebCrypto).
// - We never store the raw password; only salt + derived hash.
// - Snapshot is per-role/per-identifier so multiple users on the same
//   device don't clobber each other.

import type { AuthUser, UserRole } from './auth';

const CRED_PREFIX = 'offline:auth:cred:';
const CURRENT_KEY = 'offline:auth:current';
const ITERATIONS = 120_000;

type StoredCred = {
  role: UserRole;
  identifier: string;
  saltB64: string;
  hashB64: string;
  user: AuthUser;
  savedAt: number;
};

function credKey(role: UserRole, identifier: string) {
  return `${CRED_PREFIX}${role}:${identifier.toLowerCase()}`;
}

function toB64(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}

function fromB64(b64: string) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, hash: 'SHA-256', iterations: ITERATIONS },
    key,
    256,
  );
  return toB64(bits);
}

export async function saveCredentialForOffline(
  role: UserRole,
  identifier: string,
  password: string,
  user: AuthUser,
): Promise<void> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hashB64 = await derive(password, salt);
    const record: StoredCred = {
      role,
      identifier: identifier.toLowerCase(),
      saltB64: toB64(salt),
      hashB64,
      user,
      savedAt: Date.now(),
    };
    localStorage.setItem(credKey(role, identifier), JSON.stringify(record));
  } catch (err) {
    // Non-fatal — offline login just won't be available for this session.
    console.warn('saveCredentialForOffline failed', err);
  }
}

export async function tryOfflineLogin(
  role: UserRole,
  identifier: string,
  password: string,
): Promise<AuthUser | null> {
  const raw = localStorage.getItem(credKey(role, identifier));
  if (!raw) return null;
  let record: StoredCred;
  try {
    record = JSON.parse(raw) as StoredCred;
  } catch {
    return null;
  }
  const salt = fromB64(record.saltB64);
  const derived = await derive(password, salt);
  // constant-time-ish compare
  if (derived.length !== record.hashB64.length) return null;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) {
    diff |= derived.charCodeAt(i) ^ record.hashB64.charCodeAt(i);
  }
  if (diff !== 0) return null;
  localStorage.setItem(CURRENT_KEY, JSON.stringify(record.user));
  return record.user;
}

export function getOfflineUser(): AuthUser | null {
  const raw = localStorage.getItem(CURRENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearOfflineCurrent() {
  localStorage.removeItem(CURRENT_KEY);
}

export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|network|networkerror|load failed|timeout|offline/i.test(msg);
}
