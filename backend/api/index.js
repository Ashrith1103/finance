let dbReadyPromise;
let appInstance;
let connectDatabaseFn;
const DB_CONNECT_TIMEOUT_MS = Number(process.env.DB_CONNECT_TIMEOUT_MS || 8000);

const applyCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

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
  if (!connectDatabaseFn) {
    ({ connectDatabase: connectDatabaseFn } = require("../models"));
  }

  if (!dbReadyPromise) {
    dbReadyPromise = connectDatabaseFn().catch((error) => {
      dbReadyPromise = null;
      throw error;
    });
  }

  return dbReadyPromise;
};

const getApp = () => {
  if (!appInstance) {
    appInstance = require("../app");
  }

  return appInstance;
};

module.exports = async (req, res) => {
  try {
    applyCorsHeaders(res);

    // Always satisfy browser CORS preflight without requiring DB initialization.
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    const app = getApp();

    // Keep health and root checks independent from DB startup status.
    if (req.url === "/" || req.url.startsWith("/health") || req.url.startsWith("/api-docs")) {
      return app(req, res);
    }

    await withTimeout(ensureDatabase(), DB_CONNECT_TIMEOUT_MS);
    return app(req, res);
  } catch (error) {
    applyCorsHeaders(res);

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
