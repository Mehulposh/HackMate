const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const CandidateUser = require("../models/CandidateUser");
const Participant = require("../models/Participant");
const Hackathon = require("../models/Hackathon");
const Team = require("../models/Team");
const asyncHandler = require("../middleware/asyncHandler");
const aiService = require("../services/aiService");
const { jwtSecret, jwtExpiresIn } = require("../config/env");

function signCandidateToken(candidate) {
  return jwt.sign({ id: candidate._id, type: "candidate" }, jwtSecret, { expiresIn: jwtExpiresIn });
}
function publicCandidate(c) { return { id: c._id, name: c.name, email: c.email }; }

const registerCandidate = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await CandidateUser.findOne({ email });
  if (exists) {
    res.status(409);
    throw new Error("An account with this email already exists — please log in instead.");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const candidate = await CandidateUser.create({ name, email, passwordHash });
  res.status(201).json({ candidate: publicCandidate(candidate), token: signCandidateToken(candidate) });
});

const loginCandidate = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const candidate = await CandidateUser.findOne({ email });
  if (!candidate || !(await bcrypt.compare(password, candidate.passwordHash))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }
  res.json({ candidate: publicCandidate(candidate), token: signCandidateToken(candidate) });
});

// Public: minimal info shown on the join page before login/registration.
const publicHackathonInfo = asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findById(req.params.hackathonId).select(
    "name theme teamSize teamSizeMin teamSizeMax requirements registrationOpen status"
  );
  if (!hackathon) { res.status(404); throw new Error("Hackathon not found"); }
  res.json(hackathon);
});

// Public: directory of every hackathon an organizer has launched (status
// "published" or "active"). Drafts and archived hackathons never appear here.
const listPublicHackathons = asyncHandler(async (req, res) => {
  const hackathons = await Hackathon.find({ status: { $in: ["published", "active"] } })
    .select("name theme teamSize teamSizeMin teamSizeMax requirements registrationOpen status createdAt")
    .sort({ createdAt: -1 });

  const counts = await Participant.aggregate([
    { $match: { hackathon: { $in: hackathons.map((h) => h._id) } } },
    { $group: { _id: "$hackathon", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

  res.json(
    hackathons.map((h) => ({ ...h.toObject(), participantCount: countMap[String(h._id)] || 0 }))
  );
});

const joinHackathon = asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findById(req.params.hackathonId);
  if (!hackathon) { res.status(404); throw new Error("Hackathon not found"); }
  if (!hackathon.registrationOpen) {
    res.status(403);
    throw new Error("Registration is closed for this hackathon");
  }
  const already = await Participant.findOne({ hackathon: hackathon._id, candidateUser: req.candidate._id });
  if (already) {
    res.status(409);
    throw new Error("You have already registered for this hackathon");
  }

  let profile = {
    hackathon: hackathon._id,
    candidateUser: req.candidate._id,
    name: req.candidate.name,
    email: req.candidate.email,
    bio: req.body.bio || "",
  };

  if (req.body.bio) {
    try {
      const extracted = await aiService.analyzeProfile(req.body.bio);
      profile = { ...profile, ...extracted, aiAnalyzed: true };
    } catch (e) {
      // Registration should still succeed even if AI extraction fails —
      // the candidate can fill in / re-analyze their profile afterward.
    }
  }

  const participant = await Participant.create(profile);
  res.status(201).json(participant);
});

// All of a candidate's registrations across hackathons, with team-assignment status.
const listMyParticipations = asyncHandler(async (req, res) => {
  const participants = await Participant.find({ candidateUser: req.candidate._id }).populate(
    "hackathon",
    "name theme teamSize status"
  );
  const teams = await Team.find({ members: { $in: participants.map((p) => p._id) } }).select("name members hackathon");

  const result = participants.map((p) => {
    const team = teams.find((t) => t.members.some((m) => String(m) === String(p._id)));
    return {
      participantId: p._id,
      hackathon: p.hackathon,
      aiAnalyzed: p.aiAnalyzed,
      teamId: team ? team._id : null,
      teamName: team ? team.name : null,
    };
  });
  res.json({ candidate: publicCandidate(req.candidate), participations: result });
});

async function ownParticipantOr404(participantId, candidateId) {
  const participant = await Participant.findOne({ _id: participantId, candidateUser: candidateId }).populate(
    "hackathon"
  );
  if (!participant) {
    const err = new Error("Registration not found");
    err.status = 404;
    throw err;
  }
  return participant;
}

const getParticipation = asyncHandler(async (req, res) => {
  const participant = await ownParticipantOr404(req.params.participantId, req.candidate._id);
  const team = await Team.findOne({ hackathon: participant.hackathon._id, members: participant._id }).populate(
    "members",
    "name preferredRoles experienceLevel skills interests"
  );
  res.json({ participant, team: team || null });
});

const updateParticipation = asyncHandler(async (req, res) => {
  const participant = await ownParticipantOr404(req.params.participantId, req.candidate._id);
  if (req.body.name) participant.name = req.body.name;
  if (req.body.bio !== undefined) participant.bio = req.body.bio;
  await participant.save();
  res.json(participant);
});

const analyzeMyProfile = asyncHandler(async (req, res) => {
  const participant = await ownParticipantOr404(req.params.participantId, req.candidate._id);
  const bio = req.body.bio || participant.bio;
  if (!bio) { res.status(400); throw new Error("Add a bio to analyze first"); }

  const extracted = await aiService.analyzeProfile(bio);
  participant.bio = bio;
  participant.skills = extracted.skills || participant.skills;
  participant.interests = extracted.interests || participant.interests;
  participant.experienceLevel = extracted.experienceLevel || participant.experienceLevel;
  participant.preferredRoles = extracted.preferredRoles || participant.preferredRoles;
  participant.strengths = extracted.strengths || participant.strengths;
  participant.weaknesses = extracted.weaknesses || participant.weaknesses;
  participant.collaboration = extracted.collaboration || participant.collaboration;
  participant.aiAnalyzed = true;
  await participant.save();
  res.json(participant);
});

// Team explanation, from the candidate's side — reuses the same cached
// explanation the organizer sees, generating one if none exists yet.
const getMyTeamAnalysis = asyncHandler(async (req, res) => {
  const participant = await ownParticipantOr404(req.params.participantId, req.candidate._id);
  const team = await Team.findOne({ hackathon: participant.hackathon._id, members: participant._id }).populate("members");
  if (!team) { res.status(404); throw new Error("You have not been assigned to a team yet"); }

  if (!team.explanation) {
    try {
      team.explanation = await aiService.explainTeam(
        { name: team.name, score: team.score, breakdown: team.breakdown, weaknesses: team.weaknesses },
        team.members,
        participant.hackathon
      );
      await team.save();
    } catch (e) {
      // fall through and return whatever we have (possibly empty explanation)
    }
  }
  res.json({ team });
});

module.exports = {
  registerCandidate,
  loginCandidate,
  publicHackathonInfo,
  listPublicHackathons,
  joinHackathon,
  listMyParticipations,
  getParticipation,
  updateParticipation,
  analyzeMyProfile,
  getMyTeamAnalysis,
};