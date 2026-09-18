require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/hackmate",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  groqApiKey : process.env.GROQ_API_KEY,
  groqModel : process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
};
