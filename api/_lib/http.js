function collectStream(req, options = {}) {
  const { maxBytes = Infinity } = options;
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      const part = Buffer.from(chunk);
      total += part.length;
      if (total > maxBytes) {
        const error = new Error("Payload too large.");
        error.code = "PAYLOAD_TOO_LARGE";
        reject(error);
        req.destroy(error);
        return;
      }
      chunks.push(part);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export async function readRequestBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return parseBodyText(req.body, req.headers["content-type"] || "");
  }

  if (Buffer.isBuffer(req.body)) {
    return parseBodyText(
      req.body.toString("utf8"),
      req.headers["content-type"] || "",
    );
  }

  const raw = (await collectStream(req)).toString("utf8");
  return parseBodyText(raw, req.headers["content-type"] || "");
}

export async function readRequestBuffer(req, options = {}) {
  const { maxBytes = Infinity } = options;

  if (typeof req.body === "string") {
    const buffer = Buffer.from(req.body, "utf8");
    enforceMaxBytes(buffer.length, maxBytes);
    return buffer;
  }

  if (Buffer.isBuffer(req.body)) {
    enforceMaxBytes(req.body.length, maxBytes);
    return req.body;
  }

  if (req.body && typeof req.body === "object") {
    const buffer = Buffer.from(JSON.stringify(req.body));
    enforceMaxBytes(buffer.length, maxBytes);
    return buffer;
  }

  return collectStream(req, { maxBytes });
}

export function json(res, status, payload) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

export function redirect(res, location, status = 303) {
  res.status(status);
  res.setHeader("Location", location);
  res.end();
}

export function methodNotAllowed(res, methods) {
  res.setHeader("Allow", methods.join(", "));
  return json(res, 405, {
    ok: false,
    error: `Method not allowed. Use ${methods.join(" or ")}.`,
  });
}

export function requestUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host || "localhost";
  return new URL(req.url || "/", `${proto}://${host}`);
}

export function wantsHtml(req) {
  const accept = req.headers.accept || "";
  return accept.includes("text/html");
}

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "";
}

function parseBodyText(text, contentType) {
  if (!text) return {};

  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(text));
  }

  return {};
}

function enforceMaxBytes(size, maxBytes) {
  if (size <= maxBytes) return;
  const error = new Error("Payload too large.");
  error.code = "PAYLOAD_TOO_LARGE";
  throw error;
}
