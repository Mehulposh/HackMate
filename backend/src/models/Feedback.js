const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    hackathon: { type: mongoose.Schema.Types.ObjectId, ref: "Hackathon", required: true, index: true },
    skillBalance: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    collaboration: { type: Number, min: 1, max: 5 },
    technicalFit: { type: Number, min: 1, max: 5 },
    overall: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
