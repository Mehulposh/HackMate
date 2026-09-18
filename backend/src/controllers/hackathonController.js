const Hackathon = require("../models/Hackathon");
const Participant = require("../models/Participant");
const Team = require("../models/Team");
const Feedback = require("../models/Feedback");
const GenerationRun = require("../models/GenerationRun");
const asyncHandler = require("../middleware/asyncHandler");

async function ownedHackathonOr404(id, userId) {
  const hackathon = await Hackathon.findOne({ _id: id, owner: userId });
  if (!hackathon) {
    const err = new Error("Hackathon not found");
    err.status = 404;
    throw err;
  }
  return hackathon;
}

const createHackathon = asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.create({ ...req.body, owner: req.user._id });
  res.status(201).json(hackathon);
});

const listHackathons = asyncHandler(async (req, res) => {
  const hackathons = await Hackathon.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json(hackathons);
});

const getHackathon = asyncHandler(async (req, res) => {
  const hackathon = await ownedHackathonOr404(req.params.id, req.user._id);
  res.json(hackathon);
});

const updateHackathon = asyncHandler(async (req, res) => {
  const hackathon = await ownedHackathonOr404(req.params.id, req.user._id);
  Object.assign(hackathon, req.body);
  if (req.body.weights) hackathon.weights = { ...hackathon.weights.toObject?.() ?? hackathon.weights, ...req.body.weights };
  await hackathon.save();
  res.json(hackathon);
});

const deleteHackathon = asyncHandler(async (req, res) => {
  const hackathon = await ownedHackathonOr404(req.params.id, req.user._id);
  const teams = await Team.find({ hackathon: hackathon._id });
  await Feedback.deleteMany({ hackathon: hackathon._id });
  await Team.deleteMany({ hackathon: hackathon._id });
  await GenerationRun.deleteMany({ hackathon: hackathon._id });
  await Participant.deleteMany({ hackathon: hackathon._id });
  await hackathon.deleteOne();
  res.json({ deleted: true, teamsRemoved: teams.length });
});

const feedbackAnalytics = asyncHandler(async (req, res) => {
  const hackathon = await ownedHackathonOr404(req.params.id, req.user._id);
  const teams = await Team.find({ hackathon: hackathon._id });
  const feedback = await Feedback.find({ hackathon: hackathon._id });

  const byTeam = teams.map((t) => {
    const fb = feedback.filter((f) => String(f.team) === String(t._id));
    const avgOverall = fb.length ? fb.reduce((s, f) => s + f.overall, 0) / fb.length : null;
    return {
      teamId: t._id,
      teamName: t.name,
      predictedScore: t.score,
      actualScore: avgOverall === null ? null : avgOverall * 20,
      responseCount: fb.length,
    };
  });

  res.json({ teams: byTeam, totalResponses: feedback.length });
});

module.exports = {
  createHackathon,
  listHackathons,
  getHackathon,
  updateHackathon,
  deleteHackathon,
  feedbackAnalytics,
  ownedHackathonOr404,
};
