/**
 * Deterministic matching, scoring & optimization engine.
 * This is intentionally NOT an LLM call: team membership must be
 * reproducible, testable and explainable. The AI service only
 * (a) turns free text into structured profiles and (b) explains
 * scores that this engine already computed.
 */

const EXP_LEVELS = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
const PRIORITY_WEIGHT = { High: 3, Medium: 2, Low: 1 };

const SKILL_SYNONYM_GROUPS = [
  ["react", "reactjs", "react.js", "frontend framework"],
  ["node", "nodejs", "node.js", "express", "express.js"],
  ["ai", "ml", "machine learning", "genai", "ai/ml", "artificial intelligence", "llm"],
  ["frontend", "front-end", "ui", "ux", "ui/ux", "css", "html"],
  ["backend", "back-end", "server", "api design", "databases"],
  ["devops", "infrastructure", "ci/cd", "cloud", "docker", "kubernetes"],
  ["presentation", "product", "communication", "pitching", "storytelling"],
  ["design", "product design", "visual design", "figma"],
  ["data", "data science", "analytics", "data engineering"],
  ["mobile", "ios", "android", "react native", "flutter"],
];

function canonicalSkill(raw) {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return "";
  for (const group of SKILL_SYNONYM_GROUPS) {
    if (group.some((g) => s === g || s.includes(g) || g.includes(s))) return group[0];
  }
  return s;
}

function skillMap(participant) {
  const map = {};
  (participant.skills || []).forEach((s) => {
    const c = canonicalSkill(s.name);
    if (!c) return;
    map[c] = Math.max(map[c] || 0, Number(s.proficiency) || 0);
  });
  return map;
}

function jaccard(a = [], b = []) {
  const A = new Set(a.map((x) => String(x).toLowerCase().trim()));
  const B = new Set(b.map((x) => String(x).toLowerCase().trim()));
  if (A.size === 0 && B.size === 0) return 0;
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

function clamp(n, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }
function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function pairs(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) out.push([arr[i], arr[j]]);
  return out;
}

function scoreSkillCoverage(team, requirements) {
  if (!requirements || requirements.length === 0) {
    const unique = new Set();
    team.forEach((p) => Object.keys(skillMap(p)).forEach((k) => unique.add(k)));
    return clamp((unique.size / Math.max(1, team.length * 1.8)) * 100);
  }
  const totalWeight = requirements.reduce((s, r) => s + (PRIORITY_WEIGHT[r.priority] || 1), 0);
  if (totalWeight === 0) return 100;
  let covered = 0;
  requirements.forEach((r) => {
    const canon = canonicalSkill(r.skill);
    const best = Math.max(0, ...team.map((p) => skillMap(p)[canon] || 0));
    covered += (PRIORITY_WEIGHT[r.priority] || 1) * Math.min(1, best / 7);
  });
  return clamp((covered / totalWeight) * 100);
}

function scoreRoleDiversity(team) {
  if (team.length === 0) return 0;
  const roles = team.map((p) => (p.preferredRoles && p.preferredRoles[0]) || "Unspecified");
  const counts = {};
  roles.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  const uniqueRatio = Object.keys(counts).length / team.length;
  const maxConcentration = Math.max(...Object.values(counts)) / team.length;
  const penalty = maxConcentration > 0.5 ? (maxConcentration - 0.5) * 140 : 0;
  return clamp(uniqueRatio * 100 - penalty);
}

function scoreExperienceBalance(team) {
  if (team.length <= 1) return 70;
  const levels = team.map((p) => EXP_LEVELS[p.experienceLevel] || 2);
  const spread = Math.max(...levels) - Math.min(...levels);
  if (spread === 0) return 55;
  const idealPenalty = Math.abs(spread - 1.5) * 18;
  return clamp(100 - idealPenalty);
}

function scoreInterestCompatibility(team) {
  const pp = pairs(team);
  if (pp.length === 0) return 70;
  const avgSim = mean(pp.map(([a, b]) => jaccard(a.interests, b.interests)));
  return clamp(28 + avgSim * 160);
}

function scoreCollaborationFit(team) {
  if (team.length === 0) return 0;
  const comms = team.map((p) => (p.collaboration && p.collaboration.communication) ?? 5);
  const leads = team.map((p) => (p.collaboration && p.collaboration.leadership) ?? 5);
  const avgComm = mean(comms) * 10;
  const clashCount = leads.filter((l) => l >= 8).length;
  const penalty = clashCount > 1 ? (clashCount - 1) * 12 : 0;
  return clamp(avgComm - penalty);
}

function scoreProjectAlignment(team, hackathon) {
  const reqSkills = (hackathon.requirements || []).map((r) => r.skill);
  const keywordSrc = `${hackathon.theme || ""} ${reqSkills.join(" ")}`.toLowerCase();
  const keywords = [...new Set(keywordSrc.split(/[^a-z0-9+.#]+/).filter((w) => w.length > 2))];
  if (keywords.length === 0) return scoreSkillCoverage(team, hackathon.requirements);
  const teamText = team
    .map((p) => `${(p.interests || []).join(" ")} ${(p.skills || []).map((s) => s.name).join(" ")} ${(p.strengths || []).join(" ")}`)
    .join(" ")
    .toLowerCase();
  const hits = keywords.filter((k) => teamText.includes(k)).length;
  return clamp((hits / keywords.length) * 100 + 20);
}

const DEFAULT_WEIGHTS = {
  skillCoverage: 30,
  roleDiversity: 20,
  experienceBalance: 15,
  interestCompatibility: 15,
  collaborationFit: 10,
  projectAlignment: 10,
};

function scoreBreakdown(team, hackathon) {
  return {
    skillCoverage: scoreSkillCoverage(team, hackathon.requirements),
    roleDiversity: scoreRoleDiversity(team),
    experienceBalance: scoreExperienceBalance(team),
    interestCompatibility: scoreInterestCompatibility(team),
    collaborationFit: scoreCollaborationFit(team),
    projectAlignment: scoreProjectAlignment(team, hackathon),
  };
}

function weightedTotal(breakdown, weights) {
  const w = weights || DEFAULT_WEIGHTS;
  const keys = Object.keys(DEFAULT_WEIGHTS);
  const sum = keys.reduce((s, k) => s + breakdown[k] * (w[k] ?? 0), 0);
  const wsum = keys.reduce((s, k) => s + (w[k] ?? 0), 0) || 100;
  return clamp(sum / wsum);
}

function detectWeaknesses(team, hackathon, breakdown) {
  const issues = [];
  if (breakdown.skillCoverage < 65) {
    const gaps = (hackathon.requirements || []).filter((r) => {
      const canon = canonicalSkill(r.skill);
      const best = Math.max(0, ...team.map((p) => skillMap(p)[canon] || 0));
      return best < 5;
    });
    if (gaps.length) issues.push(`Missing/weak coverage: ${gaps.map((g) => g.skill).join(", ")}`);
    else issues.push("Overall skill coverage is below target.");
  }
  if (breakdown.roleDiversity < 55) issues.push("Role concentration — too many members share the same preferred role.");
  if (breakdown.experienceBalance < 55) issues.push("Experience imbalance — team is skewed toward one experience level.");
  if (breakdown.collaborationFit < 55) issues.push("Collaboration risk — multiple high-leadership members or low communication signals.");
  if (breakdown.interestCompatibility < 45) issues.push("Low shared-interest alignment across members.");
  const min = hackathon.teamSizeMin || 2;
  if (team.length < min) issues.push(`Understaffed — has ${team.length}, needs at least ${min}.`);
  return issues;
}

function idStr(id) { return String(id); }

function violatesConstraints(team, constraints) {
  const ids = team.map((p) => idStr(p._id || p.id));
  const cannot = (constraints && constraints.cannotTogether) || [];
  return cannot.some(([a, b]) => ids.includes(idStr(a)) && ids.includes(idStr(b)));
}

function snakeDraftAssign(participants, numTeams) {
  const byRole = {};
  participants.forEach((p) => {
    const r = (p.preferredRoles && p.preferredRoles[0]) || "Unspecified";
    (byRole[r] = byRole[r] || []).push(p);
  });
  const buckets = Object.values(byRole).sort((a, b) => b.length - a.length);
  const teams = Array.from({ length: numTeams }, () => []);
  let ti = 0, dir = 1;
  buckets.forEach((bucket) => {
    bucket.forEach((p) => {
      teams[ti].push(p);
      ti += dir;
      if (ti === numTeams) { ti = numTeams - 1; dir = -1; }
      else if (ti < 0) { ti = 0; dir = 1; }
    });
  });
  return teams;
}

const TEAM_NAME_POOL = ["Phoenix", "Nova", "Orbit", "Apex", "Vertex", "Quantum", "Catalyst", "Nimbus", "Ember", "Cipher", "Lumen", "Vortex", "Zenith", "Pulse", "Axiom", "Flux"];

/**
 * @param {Array} participants - eligible participants (mongoose docs or plain objects)
 * @param {Object} hackathon - hackathon config (requirements, teamSize, constraints, theme...)
 * @param {Object} weights - scoring weights, defaults to DEFAULT_WEIGHTS
 * @returns {Array} teams: { name, members: [participant], breakdown, score, weaknesses }
 */
function generateTeams(participants, hackathon, weights) {
  const eligible = participants.filter((p) => !p.excluded);
  if (eligible.length === 0) return [];
  const teamSize = hackathon.teamSize || 4;
  const numTeams = Math.max(1, Math.round(eligible.length / teamSize));
  let teams = snakeDraftAssign(eligible, numTeams);

  const totalScore = (tms) => tms.reduce((s, t) => s + weightedTotal(scoreBreakdown(t, hackathon), weights), 0);
  const constraints = hackathon.constraints || {};
  let best = totalScore(teams);
  const maxIters = 300;
  for (let iter = 0; iter < maxIters; iter++) {
    const t1 = Math.floor(Math.random() * teams.length);
    const t2 = Math.floor(Math.random() * teams.length);
    if (t1 === t2) continue;
    const team1 = teams[t1], team2 = teams[t2];
    const movable1 = team1.filter((p) => !p.locked);
    const movable2 = team2.filter((p) => !p.locked);
    if (movable1.length === 0 || movable2.length === 0) continue;
    const m1 = movable1[Math.floor(Math.random() * movable1.length)];
    const m2 = movable2[Math.floor(Math.random() * movable2.length)];

    const newTeam1 = team1.map((p) => (idStr(p._id || p.id) === idStr(m1._id || m1.id) ? m2 : p));
    const newTeam2 = team2.map((p) => (idStr(p._id || p.id) === idStr(m2._id || m2.id) ? m1 : p));
    if (violatesConstraints(newTeam1, constraints) || violatesConstraints(newTeam2, constraints)) continue;

    const newTeams = teams.slice();
    newTeams[t1] = newTeam1; newTeams[t2] = newTeam2;
    const newScore = totalScore(newTeams);
    if (newScore > best) { teams = newTeams; best = newScore; }
  }

  return teams.map((members, idx) => {
    const breakdown = scoreBreakdown(members, hackathon);
    const score = weightedTotal(breakdown, weights);
    return {
      name: `Team ${TEAM_NAME_POOL[idx % TEAM_NAME_POOL.length]}`,
      members,
      breakdown,
      score,
      weaknesses: detectWeaknesses(members, hackathon, breakdown),
    };
  });
}

function scoreExistingTeam(members, hackathon, weights) {
  const breakdown = scoreBreakdown(members, hackathon);
  const score = weightedTotal(breakdown, weights);
  return { breakdown, score, weaknesses: detectWeaknesses(members, hackathon, breakdown) };
}

module.exports = {
  DEFAULT_WEIGHTS,
  canonicalSkill,
  scoreBreakdown,
  weightedTotal,
  detectWeaknesses,
  violatesConstraints,
  generateTeams,
  scoreExistingTeam,
};
