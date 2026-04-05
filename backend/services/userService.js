const bcrypt = require("bcryptjs");
const { User, Record, sequelize } = require("../models");
const { AppError } = require("../utils/errors");

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status
});

const ensureEmailAvailable = async (email, excludedUserId) => {
  const existing = await User.unscoped().findOne({ where: { email } });

  if (existing && existing.id !== excludedUserId) {
    throw new AppError(409, "A user with this email already exists.");
  }
};

const listUsers = async () => {
  const users = await User.findAll({
    order: [["id", "DESC"]]
  });

  return users.map(sanitizeUser);
};

const getUserById = async (id) => {
  const user = await User.findByPk(id);

  if (!user) {
    throw new AppError(404, "User not found.");
  }

  return sanitizeUser(user);
};

const createUser = async (payload) => {
  await ensureEmailAvailable(payload.email);
  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const user = await User.create({
    ...payload,
    password: hashedPassword,
    role: payload.role || "VIEWER",
    status: payload.status || "ACTIVE"
  });

  return sanitizeUser(user);
};

const updateUser = async (id, payload) => {
  const user = await User.unscoped().findByPk(id);

  if (!user) {
    throw new AppError(404, "User not found.");
  }

  if (payload.email) {
    await ensureEmailAvailable(payload.email, user.id);
  }

  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }

  await user.update(payload);

  const refreshed = await User.findByPk(id);
  return sanitizeUser(refreshed);
};

const updateUserStatus = async (id, status) => {
  return updateUser(id, { status });
};

const deleteUser = async (id, actor) => {
  const user = await User.unscoped().findByPk(id);

  if (!user) {
    throw new AppError(404, "User not found.");
  }

  if (actor && Number(actor.id) === Number(user.id)) {
    throw new AppError(400, "You cannot delete your own account.");
  }

  await sequelize.transaction(async (transaction) => {
    await Record.destroy({
      where: { userId: user.id },
      transaction
    });

    await user.destroy({ transaction });
  });
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser
};
