const LOGIN_ATTEMPTS_KEY = 'login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

function getRecord(): AttemptRecord {
  try {
    const raw = sessionStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: 0, firstAttempt: 0, lockedUntil: null };
}

function saveRecord(record: AttemptRecord) {
  sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(record));
}

export function checkRateLimit(): { allowed: boolean; remainingSeconds?: number } {
  const record = getRecord();
  const now = Date.now();

  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      allowed: false,
      remainingSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  // Reset if lockout expired
  if (record.lockedUntil && now >= record.lockedUntil) {
    saveRecord({ count: 0, firstAttempt: 0, lockedUntil: null });
    return { allowed: true };
  }

  // Reset if window expired
  if (record.firstAttempt && now - record.firstAttempt > LOCKOUT_DURATION_MS) {
    saveRecord({ count: 0, firstAttempt: 0, lockedUntil: null });
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedAttempt(): { locked: boolean; remainingSeconds?: number } {
  const record = getRecord();
  const now = Date.now();

  // Reset if window expired
  if (record.firstAttempt && now - record.firstAttempt > LOCKOUT_DURATION_MS) {
    record.count = 0;
    record.firstAttempt = 0;
  }

  record.count += 1;
  if (!record.firstAttempt) record.firstAttempt = now;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    saveRecord(record);
    return {
      locked: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  saveRecord(record);
  return { locked: false };
}

export function resetAttempts() {
  sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY);
}
