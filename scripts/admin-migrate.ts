import {
  closeLocalDatabase,
  databaseDriver,
  migrateConfiguredDatabase,
} from "../api/_lib/database";

async function main() {
  console.log(`Applying admin migrations with ${databaseDriver()}…`);
  await migrateConfiguredDatabase();
  console.log("Admin database is up to date.");
  await closeLocalDatabase();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
