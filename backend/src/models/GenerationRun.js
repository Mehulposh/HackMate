const mongoose = require("mongoose");

const generationRunSchema = new mongoose.Schema(
  {
    hackathon: { type: mongoose.Schema.Types.ObjectId, ref: "Hackathon", required: true, index: true },
    teamCount: Number,
    avgScore: Number,
    participantCount: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("GenerationRun", generationRunSchema);
