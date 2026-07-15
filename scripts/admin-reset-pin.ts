import crypto from "node:crypto";
import { promisify } from "node:util";

import {
  closeLocalDatabase,
  migrateConfiguredDatabase,
  withDatabase,
} from "../api/_lib/database";

const scrypt = promisify(crypto.scrypt);

async function main() {
  const positional = process.argv
    .slice(2)
    .filter((argument) => !argument.startsWith("--"));
  const profile = valueOf("profile") || positional[0] || "";
  const pin = valueOf("pin") || positional[1] || "";
  if (!profile || !/^\d{4}$/.test(pin)) {
    throw new Error(
      'Usage: pnpm admin:reset-pin -- --profile="Profile name or UUID" --pin=1234',
    );
  }
  await migrateConfiguredDatabase();
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = ((await scrypt(pin, salt, 64)) as Buffer).toString("hex");
  const rows = await withDatabase(
    async (database) => {
      const updated = await database.query<{ id: string; name: string }>(
        `UPDATE admin_profiles SET pin_salt = $2, pin_hash = $3, updated_at = now()
       WHERE id::text = $1 OR normalized_name = lower(regexp_replace(trim($1), '\\s+', ' ', 'g'))
       RETURNING id, name`,
        [profile, salt, hash],
      );
      if (updated[0]) {
        await database.query(
          `DELETE FROM admin_profile_sessions WHERE profile_id = $1`,
          [updated[0].id],
        );
        await database.query(
          `INSERT INTO audit_events (action, entity_type, entity_id, metadata)
         VALUES ('profile.pin.recovered', 'profile', $1, $2::jsonb)`,
          [updated[0].id, JSON.stringify({ source: "server-command" })],
        );
      }
      return updated;
    },
    { transaction: true },
  );
  if (!rows[0]) throw new Error(`No profile matched "${profile}".`);
  console.log(
    `PIN reset for ${rows[0].name}. Existing profile sessions were invalidated.`,
  );
}

function valueOf(name: string) {
  return process.argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

main()
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeLocalDatabase());
