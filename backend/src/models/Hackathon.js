const mongoose = require("mongoose");

const requirementSchema = new mongoose.Schema(
  { skill: String, priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" } },
  { _id: false }
);

const weightsSchema = new mongoose.Schema(
  {
    skillCoverage: { type: Number, default: 30 },
    roleDiversity: { type: Number, default: 20 },
    experienceBalance: { type: Number, default: 15 },
    interestCompatibility: { type: Number, default: 15 },
    collaborationFit: { type: Number, default: 10 },
    projectAlignment: { type: Number, default: 10 },
  },
  { _id: false }
);

const hackathonSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    theme: { type: String, default: "" },
    teamSize: { type: Number, default: 4 },
    teamSizeMin: { type: Number, default: 3 },
    teamSizeMax: { type: Number, default: 5 },
    requirements: { type: [requirementSchema], default: [] },
    constraints: {
      cannotTogether: { type: [[mongoose.Schema.Types.ObjectId]], default: [] },
      mustTogether: { type: [[mongoose.Schema.Types.ObjectId]], default: [] },
      maxSameRole: { type: Number, default: null },
    },
    weights: { type: weightsSchema, default: () => ({}) },
    status: { type: String, enum: ["draft", "active", "published", "archived"], default: "draft" },
    // Whether candidates can currently self-register via the public join link.
    registrationOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hackathon", hackathonSchema);
