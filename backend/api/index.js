const app = require("../app");
const { connectDatabase } = require("../models");

let dbReadyPromise;

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
  try {
    await ensureDatabase();
    return app(req, res);
  } catch (error) {
    return res.status(500).json({
      message: "Database connection failed.",
      details: error?.message || "Unknown error"
    });
  }
};
