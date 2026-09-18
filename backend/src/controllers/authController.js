const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const { jwtSecret, jwtExpiresIn } = require("../config/env");

function signToken(user) {
  return jwt.sign({ id: user._id, type: "organizer" }, jwtSecret, { expiresIn: jwtExpiresIn });
}
function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) {
    res.status(409);
    throw new Error("An account with this email already exists");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });
  res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }
  res.json({ user: publicUser(user), token: signToken(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = { register, login, me };
