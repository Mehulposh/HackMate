const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const CandidateUser = require("../models/CandidateUser");
const asyncHandler = require("./asyncHandler");

const protectCandidate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401);
    throw new Error("Not authorized — missing token");
  }
  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (decoded.type !== "candidate") {
      res.status(401);
      throw new Error("Not authorized — wrong token type");
    }
    const candidate = await CandidateUser.findById(decoded.id).select("-passwordHash");
    if (!candidate) {
      res.status(401);
      throw new Error("Not authorized — account no longer exists");
    }
    req.candidate = candidate;
    next();
  } catch (e) {
    res.status(401);
    throw new Error(e.message || "Not authorized — invalid token");
  }
});

module.exports = { protectCandidate };
