import { prisma } from "@/lib/prisma";

// Stored in Postgres so every server instance shares the same lock.
// If the migration has not been applied yet, this process keeps the lock in
// memory so sign-in still works.

type Row = { count: number; lockedUntil: Date | null };
type Attempt = { count: number; lockedUntil: number };

const memory = new Map<string, Attempt>();
let persist = true;

function keyFor(email: string) {
  return email.trim().toLowerCase();
}

function minutesLeft(lockedUntil: number) {
  const remaining = lockedUntil - Date.now();
  if (remaining <= 0) return 0;
  return Math.max(1, Math.ceil(remaining / 60_000));
}

async function readRow(email: string) {
  if (!persist) return memory.get(email) ?? null;
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT count, "lockedUntil" FROM "LoginAttempt" WHERE email = ${email}
    `;
    const row = rows[0];
    if (!row) return null;
    return { count: row.count, lockedUntil: row.lockedUntil ? new Date(row.lockedUntil).getTime() : 0 };
  } catch (error) {
    console.error("[lockout] LoginAttempt is unavailable. Using in-memory lockout until the migration is applied.", error);
    persist = false;
    return memory.get(email) ?? null;
  }
}

export async function lockMinutes(email: string) {
  const row = await readRow(keyFor(email));
  if (!row) return 0;
  return minutesLeft(row.lockedUntil);
}

export async function recordFailure(email: string) {
  const key = keyFor(email);
  const existing = (await readRow(key)) ?? { count: 0, lockedUntil: 0 };
  const count = existing.count + 1;
  const minutes = count >= 5 ? Math.min(15, 2 ** (count - 5)) : 0;
  const lockedUntil = minutes > 0 ? Date.now() + minutes * 60_000 : 0;
  memory.set(key, { count, lockedUntil });
  if (!persist) return;

  const lockedAt = lockedUntil ? new Date(lockedUntil) : null;
  try {
    await prisma.$executeRaw`
      INSERT INTO "LoginAttempt" (email, count, "lockedUntil", "updatedAt")
      VALUES (${key}, ${count}, ${lockedAt}, NOW())
      ON CONFLICT (email) DO UPDATE
      SET count = ${count}, "lockedUntil" = ${lockedAt}, "updatedAt" = NOW()
    `;
  } catch (error) {
    console.error("[lockout] Could not store the failed attempt.", error);
    persist = false;
  }
}

export async function clearFailures(email: string) {
  const key = keyFor(email);
  memory.delete(key);
  if (!persist) return;
  try {
    await prisma.$executeRaw`DELETE FROM "LoginAttempt" WHERE email = ${key}`;
  } catch (error) {
    console.error("[lockout] Could not clear attempts.", error);
    persist = false;
  }
}
