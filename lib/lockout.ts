type Attempt = { count: number; lockedUntil: number };

const attempts = new Map<string, Attempt>();

function keyFor(email: string) {
  return email.trim().toLowerCase();
}

export function isLocked(email: string) {
  const attempt = attempts.get(keyFor(email));
  if (!attempt) return false;
  if (attempt.lockedUntil > Date.now()) return true;
  if (attempt.lockedUntil > 0 && attempt.lockedUntil <= Date.now()) {
    attempt.lockedUntil = 0;
  }
  return false;
}

export function recordFailure(email: string) {
  const key = keyFor(email);
  const attempt = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  attempt.count += 1;
  if (attempt.count >= 5) {
    const minutes = Math.min(15, 2 ** (attempt.count - 5));
    attempt.lockedUntil = Date.now() + minutes * 60_000;
  }
  attempts.set(key, attempt);
}

export function clearFailures(email: string) {
  attempts.delete(keyFor(email));
}
