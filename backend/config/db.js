const { Sequelize } = require("sequelize");
require("pg");
require("pg-hstore");

const shouldUseSsl = process.env.DB_SSL !== "false";
const appendSslMode = (url) => {
  if (!url) {
    return url;
  }

  const trimmed = url.trim();

  if (/sslmode=/i.test(trimmed)) {
    return trimmed.replace(/sslmode=[^&]+/i, "sslmode=no-verify");
  }

  return `${trimmed}${trimmed.includes("?") ? "&" : "?"}sslmode=no-verify`;
};

const databaseUrl = process.env.DATABASE_URL ? appendSslMode(process.env.DATABASE_URL) : null;

const baseConfig = {
  dialect: "postgres",
  logging: false,
  define: {
    underscored: true
  },
  pool: {
    max: Number(process.env.DB_POOL_MAX || 1),
    min: Number(process.env.DB_POOL_MIN || 0),
    idle: Number(process.env.DB_POOL_IDLE_MS || 10000),
    acquire: Number(process.env.DB_POOL_ACQUIRE_MS || 30000),
    evict: Number(process.env.DB_POOL_EVICT_MS || 1000)
  },
  dialectOptions: shouldUseSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    : {}
};

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, baseConfig)
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        ...baseConfig,
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5432)
      }
    );

module.exports = sequelize;
