const asyncHandler = require("../utils/asyncHandler");
const userService = require("../services/userService");
const {
  validateStatusPayload,
  validateUserPayload
} = require("../utils/validators");

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsers();
  res.json(users);
});

exports.getCurrentUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  res.json(user);
});

exports.getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json(user);
});

exports.createUser = asyncHandler(async (req, res) => {
  const payload = validateUserPayload(req.body);
  const user = await userService.createUser(payload);
  res.status(201).json(user);
});

exports.updateUser = asyncHandler(async (req, res) => {
  const payload = validateUserPayload(req.body, { partial: true });
  const user = await userService.updateUser(req.params.id, payload);
  res.json(user);
});

exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = validateStatusPayload(req.body);
  const user = await userService.updateUserStatus(req.params.id, status);
  res.json(user);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id, req.user);
  res.json({ message: "User deleted successfully." });
});
