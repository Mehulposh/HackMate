const { AIServiceError } = require("../services/aiService");

function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Not found - ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  if (err.name === "ValidationError") status = 400;
  if (err instanceof AIServiceError) status = 502;
  if (err.name === "CastError") status = 400;

  res.status(status).json({
    error: err.message || "Server error",
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
}

module.exports = { notFound, errorHandler };
