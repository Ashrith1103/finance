const { ValidationError, UniqueConstraintError } = require("sequelize");

module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ValidationError || err instanceof UniqueConstraintError) {
    return res.status(400).json({
      message: err.message,
      details: err.errors?.map((item) => item.message) || []
    });
  }

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    message: err.message || "Internal server error.",
    details: err.details || undefined
  });
};
