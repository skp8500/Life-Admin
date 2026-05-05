import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

export interface CreditCheck {
  ok: boolean;
  remaining: number;
}

/**
 * Atomically deduct 1 credit from the user. Returns ok=false if user is out of credits.
 */
export async function deductCredit(userId: string): Promise<CreditCheck> {
  const result = await db
    .update(usersTable)
    .set({ credits: sql`${usersTable.credits} - 1` })
    .where(sql`${usersTable.id} = ${userId} AND ${usersTable.credits} > 0`)
    .returning({ remaining: usersTable.credits });
  if (result.length === 0) {
    const [u] = await db
      .select({ credits: usersTable.credits })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    return { ok: false, remaining: u?.credits ?? 0 };
  }
  return { ok: true, remaining: result[0].remaining };
}
