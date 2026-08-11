import bcrypt from "bcryptjs";

// One place for the bcrypt work factor, so raising it can't miss a call site.
const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/** The user shape safe to return from the API — everything but passwordHash. */
export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} as const;
