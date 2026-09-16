const mongoose = require("mongoose");

// A candidate's login identity. Separate from Participant, which is the
// per-hackathon profile/registration record. One CandidateUser can join
// (register a Participant profile for) many hackathons over time.
const candidateUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CandidateUser", candidateUserSchema);
