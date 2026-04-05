const { Op, Sequelize } = require("sequelize");
const { Record } = require("../models");
const { AppError } = require("../utils/errors");

const normalizeMoney = (value) => Number(Number(value || 0).toFixed(2));

const buildScopeFilter = ({ scope, userId, currentUser }) => {
  if (scope === "overall") {
    if (currentUser.role === "VIEWER") {
      throw new AppError(403, "Viewers can only access their own summary.");
    }

    return {};
  }

  if (scope === "user") {
    if (currentUser.role === "VIEWER") {
      throw new AppError(403, "Viewers can only access their own summary.");
    }

    if (!userId) {
      throw new AppError(400, "A userId is required for user-specific summary.");
    }

    return { userId };
  }

  return { userId };
};

const getSummary = async ({ scope = "self", userId, currentUser }) => {
  const effectiveUserId = userId || currentUser.id;
  const where = buildScopeFilter({
    scope,
    userId: effectiveUserId,
    currentUser
  });

  const totals = await Record.findAll({
    attributes: [
      [
        Sequelize.fn(
          "SUM",
          Sequelize.literal("CASE WHEN type = 'INCOME' THEN amount ELSE 0 END")
        ),
        "income"
      ],
      [
        Sequelize.fn(
          "SUM",
          Sequelize.literal("CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END")
        ),
        "expense"
      ]
    ],
    where,
    raw: true
  });

  const totalIncome = normalizeMoney(totals[0]?.income);
  const totalExpense = normalizeMoney(totals[0]?.expense);

  const categoryTotals = await Record.findAll({
    attributes: [
      "category",
      "type",
      [Sequelize.fn("SUM", Sequelize.col("amount")), "totalAmount"]
    ],
    where,
    group: ["category", "type"],
    order: [[Sequelize.literal("totalAmount"), "DESC"]],
    raw: true
  });

  const recentActivity = await Record.findAll({
    where,
    limit: 5,
    order: [["date", "DESC"], ["id", "DESC"]],
    raw: true
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthExpression = Sequelize.literal(`TO_CHAR("date", 'YYYY-MM')`);

  const monthlyTrend = await Record.findAll({
    attributes: [
      [monthExpression, "month"],
      "type",
      [Sequelize.fn("SUM", Sequelize.col("amount")), "totalAmount"]
    ],
    where: {
      ...where,
      date: {
        [Op.gte]: thirtyDaysAgo.toISOString().slice(0, 10)
      }
    },
    group: [monthExpression, "type"],
    order: [[monthExpression, "ASC"], ["type", "ASC"]],
    raw: true
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const weeklyTrend = await Record.findAll({
    attributes: [
      "date",
      "type",
      [Sequelize.fn("SUM", Sequelize.col("amount")), "totalAmount"]
    ],
    where: {
      ...where,
      date: {
        [Op.gte]: sevenDaysAgo.toISOString().slice(0, 10)
      }
    },
    group: ["date", "type"],
    order: [["date", "ASC"]],
    raw: true
  });

  return {
    scope,
    userId: scope === "overall" ? null : effectiveUserId,
    totalIncome,
    totalExpense,
    netBalance: normalizeMoney(totalIncome - totalExpense),
    categoryTotals: categoryTotals.map((item) => ({
      category: item.category,
      type: item.type,
      totalAmount: normalizeMoney(item.totalAmount)
    })),
    recentActivity: recentActivity.map((item) => ({
      id: item.id,
      amount: normalizeMoney(item.amount),
      type: item.type,
      category: item.category,
      date: item.date,
      notes: item.notes
    })),
    monthlyTrend: monthlyTrend.map((item) => ({
      month: item.month,
      type: item.type,
      totalAmount: normalizeMoney(item.totalAmount)
    })),
    weeklyTrend: weeklyTrend.map((item) => ({
      date: item.date,
      type: item.type,
      totalAmount: normalizeMoney(item.totalAmount)
    }))
  };
};

module.exports = { getSummary };
