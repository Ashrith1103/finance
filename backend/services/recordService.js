const { Op } = require("sequelize");
const { Record, User } = require("../models");
const { AppError } = require("../utils/errors");

const buildWhereClause = (filters) => {
  const where = {};

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.category) {
    where.category = {
      [Op.like]: `%${filters.category}%`
    };
  }

  if (filters.startDate || filters.endDate) {
    where.date = {};

    if (filters.startDate) {
      where.date[Op.gte] = filters.startDate;
    }

    if (filters.endDate) {
      where.date[Op.lte] = filters.endDate;
    }
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    where.amount = {};

    if (filters.minAmount !== undefined) {
      where.amount[Op.gte] = filters.minAmount;
    }

    if (filters.maxAmount !== undefined) {
      where.amount[Op.lte] = filters.maxAmount;
    }
  }

  if (filters.search) {
    where[Op.or] = [
      { category: { [Op.like]: `%${filters.search}%` } },
      { notes: { [Op.like]: `%${filters.search}%` } }
    ];
  }

  return where;
};

const ensureRecordAccess = (record, actor) => {
  if (!actor) {
    return;
  }

  if (actor.role === "VIEWER" && Number(record.userId) !== Number(actor.id)) {
    throw new AppError(403, "You can only access your own financial records.");
  }
};

const findRecordById = async (id, actor) => {
  const record = await Record.findByPk(id, {
    include: [
      {
        model: User,
        as: "owner",
        attributes: ["id", "name", "email", "role", "status"]
      }
    ]
  });

  if (!record) {
    throw new AppError(404, "Financial record not found.");
  }

  ensureRecordAccess(record, actor);
  return record;
};

const createRecord = async (data) => {
  return Record.create(data);
};

const getAllRecords = async (filters, actor) => {
  const where = buildWhereClause(filters);

  if (actor?.role === "VIEWER") {
    where.userId = actor.id;
  }

  const limit = Math.min(filters.limit, 100);
  const offset = (filters.page - 1) * limit;

  const result = await Record.findAndCountAll({
    where,
    limit,
    offset,
    order: [["date", "DESC"], ["id", "DESC"]],
    include: [
      {
        model: User,
        as: "owner",
        attributes: ["id", "name", "email", "role", "status"]
      }
    ]
  });

  return {
    data: result.rows,
    pagination: {
      total: result.count,
      page: filters.page,
      limit,
      totalPages: Math.ceil(result.count / limit) || 1
    }
  };
};

const updateRecord = async (id, data, actor) => {
  const record = await findRecordById(id, actor);
  await record.update(data);
  return findRecordById(id, actor);
};

const deleteRecord = async (id, actor) => {
  const record = await findRecordById(id, actor);
  await record.destroy();
};

module.exports = {
  createRecord,
  getAllRecords,
  findRecordById,
  updateRecord,
  deleteRecord
};
