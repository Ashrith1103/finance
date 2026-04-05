const { Sequelize } = require("sequelize");

const shouldUseSsl = process.env.DB_SSL !== "false";
const baseConfig = {
  dialect: "postgres",
  logging: false,
  define: {
    underscored: true
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

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, baseConfig)
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
