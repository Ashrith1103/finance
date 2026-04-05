const app = require("../app");
const { connectDatabase } = require("../models");

let dbReadyPromise;
const DB_CONNECT_TIMEOUT_MS = Number(process.env.DB_CONNECT_TIMEOUT_MS || 8000);

const withTimeout = (promise, timeoutMs) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Database connection timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

const ensureDatabase = async () => {
  if (!dbReadyPromise) {
    dbReadyPromise = connectDatabase().catch((error) => {
      dbReadyPromise = null;
      throw error;
    });
  }

  return dbReadyPromise;
};

module.exports = async (req, res) => {
  // Keep health and root checks independent from DB startup status.
  if (req.url === "/" || req.url.startsWith("/health") || req.url.startsWith("/api-docs")) {
    return app(req, res);
  }

  try {
    await withTimeout(ensureDatabase(), DB_CONNECT_TIMEOUT_MS);
    return app(req, res);
  } catch (error) {
    console.error("Vercel function startup error:", {
      message: error?.message,
      name: error?.name,
      code: error?.original?.code || error?.parent?.code || error?.code
    });

    return res.status(500).json({
      message: "Database connection failed.",
      details: error?.message || "Unknown error"
    });
  }
};
