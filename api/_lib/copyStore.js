import fs from "node:fs/promises";
import path from "node:path";

import { get, put } from "@vercel/blob";

import { getStorageDriver } from "./storage.js";

const LOCAL_COPY_PATH = path.resolve(
  process.cwd(),
  ".context/admin-data/copy/overrides.json",
);
const BLOB_COPY_PATH = "copy/overrides.json";

export async function listCopyOverrides() {
  const driver = getStorageDriver();
  if (!driver) {
    throw new Error(
      "No persistent storage configured. Connect a private Vercel Blob store before using copy overrides in production.",
    );
  }

  if (driver === "blob") {
    try {
      const result = await get(BLOB_COPY_PATH, {
        access: "private",
        useCache: false,
      });
      if (!result?.stream) return {};
      return await new Response(result.stream).json();
    } catch (error) {
      if (isNotFound(error)) return {};
      throw error;
    }
  }

  try {
    return JSON.parse(await fs.readFile(LOCAL_COPY_PATH, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function saveCopyOverride(key, value) {
  const map = await listCopyOverrides();
  map[key] = value;
  await writeMap(map);
  return map;
}

export async function deleteCopyOverride(key) {
  const map = await listCopyOverrides();
  delete map[key];
  await writeMap(map);
  return map;
}

async function writeMap(map) {
  const driver = getStorageDriver();
  if (!driver) {
    throw new Error(
      "No persistent storage configured. Connect a private Vercel Blob store before using copy overrides in production.",
    );
  }

  const body = JSON.stringify(map, null, 2);

  if (driver === "blob") {
    await put(BLOB_COPY_PATH, body, {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }

  await fs.mkdir(path.dirname(LOCAL_COPY_PATH), { recursive: true });
  await fs.writeFile(LOCAL_COPY_PATH, body, "utf8");
}

function isNotFound(error) {
  if (!(error && typeof error === "object")) return false;
  return error.status === 404 || error.code === "ENOENT";
}
