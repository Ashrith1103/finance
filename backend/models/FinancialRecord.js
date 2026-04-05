const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const FinancialRecord = sequelize.define(
  "FinancialRecord",
  {
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: 0.01
      }
    },
    type: {
      type: DataTypes.ENUM("INCOME", "EXPENSE"),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50]
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500]
      }
    }
  },
  {
    timestamps: false
  }
);

module.exports = FinancialRecord;
