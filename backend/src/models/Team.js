const mongoose = require("mongoose");

const breakdownSchema = new mongoose.Schema(
  {
    skillCoverage: Number,
    roleDiversity: Number,
    experienceBalance: Number,
    interestCompatibility: Number,
    collaborationFit: Number,
    projectAlignment: Number,
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    hackathon: { type: mongoose.Schema.Types.ObjectId, ref: "Hackathon", required: true, index: true },
    name: { type: String, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Participant" }],
    score: { type: Number, default: 0 },
    breakdown: { type: breakdownSchema, default: () => ({}) },
    weaknesses: { type: [String], default: [] },
    explanation: { type: String, default: "" },
    locked: { type: Boolean, default: false },
    generationRun: { type: mongoose.Schema.Types.ObjectId, ref: "GenerationRun" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", teamSchema);
