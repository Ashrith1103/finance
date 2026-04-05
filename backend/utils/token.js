const jwt = require("jsonwebtoken");

exports.generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      status: user.status
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};
