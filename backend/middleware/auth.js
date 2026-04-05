const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { AppError } = require("../utils/errors");

module.exports = async (req, res, next) => {
  const rawHeader = req.headers.authorization || "";
  const token = rawHeader.startsWith("Bearer ") ? rawHeader.slice(7) : rawHeader;

  if (!token) {
    return next(new AppError(401, "Authentication token is required."));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return next(new AppError(401, "User linked to this token no longer exists."));
    }

    if (user.status !== "ACTIVE") {
      return next(new AppError(403, "This user account is inactive."));
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    };

    return next();
  } catch (error) {
    return next(new AppError(401, "Invalid or expired token."));
  }
};
