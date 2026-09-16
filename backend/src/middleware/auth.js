const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const User = require("../models/User");
const asyncHandler = require("./asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401);
    throw new Error("Not authorized — missing token");
  }
  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (decoded.type !== "organizer") {
      res.status(401);
      throw new Error("Not authorized — wrong token type");
    }
    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) {
      res.status(401);
      throw new Error("Not authorized — user no longer exists");
    }
    req.user = user;
    next();
  } catch (e) {
    res.status(401);
    throw new Error("Not authorized — invalid token");
  }
});

module.exports = { protect };
