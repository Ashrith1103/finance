const bcrypt = require("bcrypt");
const { User } = require("../models");
const { generateToken } = require("../utils/token");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");
const { validateLogin, validateRegistration } = require("../utils/validators");
const userService = require("../services/userService");

exports.register = asyncHandler(async (req, res) => {
  const payload = validateRegistration(req.body);
  const userCount = await User.count();

  const user = await userService.createUser({
    ...payload,
    role: userCount === 0 ? "ADMIN" : "VIEWER",
    status: "ACTIVE"
  });

  res.status(201).json({
    message:
      userCount === 0
        ? "First user created as ADMIN."
        : "Account created successfully. You have viewer access by default.",
    user
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = validateLogin(req.body);
  const user = await User.scope("withPassword").findOne({ where: { email } });

  if (!user) {
    throw new AppError(401, "Invalid email or password.");
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(403, "This user account is inactive.");
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    throw new AppError(401, "Invalid email or password.");
  }

  const token = generateToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  });
});
