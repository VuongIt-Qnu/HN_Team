import bcrypt from 'bcryptjs';

/** Bam & kiem tra mat khau bang Bcrypt (khong chay tren Edge Runtime). */
const SALT_ROUNDS = 10;

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}
