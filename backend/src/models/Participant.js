const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  { name: String, proficiency: { type: Number, min: 0, max: 10, default: 5 } },
  { _id: false }
);

const participantSchema = new mongoose.Schema(
  {
    hackathon: { type: mongoose.Schema.Types.ObjectId, ref: "Hackathon", required: true, index: true },
    // Set only when the participant self-registered through the public join flow.
    // Organizer-added participants have no candidateUser and cannot log in.
    candidateUser: { type: mongoose.Schema.Types.ObjectId, ref: "CandidateUser", default: null, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    bio: { type: String, default: "" },
    skills: { type: [skillSchema], default: [] },
    interests: { type: [String], default: [] },
    experienceLevel: { type: String, enum: ["beginner", "intermediate", "advanced", "expert"], default: "intermediate" },
    preferredRoles: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    collaboration: {
      communication: { type: Number, min: 0, max: 10, default: 5 },
      leadership: { type: Number, min: 0, max: 10, default: 5 },
    },
    locked: { type: Boolean, default: false },
    excluded: { type: Boolean, default: false },
    aiAnalyzed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// A candidate can only register once per hackathon.
participantSchema.index(
  { hackathon: 1, candidateUser: 1 },
  { unique: true, partialFilterExpression: { candidateUser: { $type: "objectId" } } }
);

module.exports = mongoose.model("Participant", participantSchema);
