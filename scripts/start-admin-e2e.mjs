import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";

const dataDirectory = path.resolve(
  process.cwd(),
  ".context/test-data/playwright",
);
await rm(dataDirectory, { recursive: true, force: true });

const child = spawn("pnpm", ["exec", "vercel", "dev", "--listen", "4183"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ADMIN_PGLITE_DATA_DIR: dataDirectory,
    ADMIN_PGLITE_SERIAL: "true",
    ADMIN_V2_ENABLED: "true",
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
