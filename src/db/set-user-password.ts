/**
 * Set a usable password on an existing user (by email or username) and mark the
 * account active. Intended for giving a migrated user working credentials —
 * v1 password hashes are not carried over by the migration.
 *
 * Usage:
 *   yarn set-password <email-or-username> <new-password>
 *   yarn set-password admin@smarthealthglobal.org 'Secret123!'
 */
import "dotenv/config";

import * as bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";

import { closeConnection, db } from "./index";
import { users } from "./schema";

async function main() {
  const [identifier, password] = process.argv.slice(2);
  if (!identifier || !password) {
    console.error(
      "Usage: yarn set-password <email-or-username> <new-password>",
    );
    process.exit(1);
  }

  const hash = bcrypt.hashSync(password, 10);
  const updated = await db
    .update(users)
    .set({
      passwordHash: hash,
      accountStatus: "active",
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(or(eq(users.email, identifier), eq(users.username, identifier)))
    .returning({ id: users.id, email: users.email, username: users.username });

  if (updated.length === 0) {
    console.error(`❌ No user found matching "${identifier}"`);
    process.exit(1);
  }
  for (const u of updated) {
    console.log(`✅ Password set for ${u.username ?? "(no username)"} <${u.email}> (${u.id})`);
  }
}

main()
  .then(async () => {
    await closeConnection();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ Failed:", err);
    await closeConnection().catch(() => undefined);
    process.exit(1);
  });
