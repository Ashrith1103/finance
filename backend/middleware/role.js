const { AppError } = require("../utils/errors");

module.exports = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication is required."));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "You do not have permission to perform this action."));
    }

    return next();
  };
};
