const sequelize = require("../config/db");
const User = require("./User");
const Record = require("./FinancialRecord");

User.hasMany(Record, {
  foreignKey: "userId",
  as: "records"
});

Record.belongsTo(User, {
  foreignKey: "userId",
  as: "owner"
});

const connectDatabase = async () => {
  await sequelize.authenticate();

  // Avoid schema sync on serverless platforms to prevent cold-start failures.
  if (process.env.VERCEL !== "1" && process.env.DB_SYNC !== "false") {
    await sequelize.sync();
  }
};

module.exports = {
  sequelize,
  User,
  Record,
  connectDatabase
};
