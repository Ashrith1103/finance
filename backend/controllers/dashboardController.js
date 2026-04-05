const asyncHandler = require("../utils/asyncHandler");
const dashboardService = require("../services/dashboardService");
const userService = require("../services/userService");

exports.summary = asyncHandler(async (req, res) => {
  const requestedScope =
    req.query.scope === "overall"
      ? "overall"
      : req.query.scope === "user"
        ? "user"
        : "self";
  const data = await dashboardService.getSummary({
    scope: requestedScope,
    userId: req.query.userId ? Number(req.query.userId) : undefined,
    currentUser: req.user
  });

  res.json(data);
});

exports.summaryUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsers();
  res.json(users);
});
