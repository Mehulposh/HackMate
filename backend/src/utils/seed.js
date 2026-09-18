/**
 * Seeds a demo organizer account, hackathon, and sample participants.
 * Usage: npm run seed
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Hackathon = require("../models/Hackathon");
const Participant = require("../models/Participant");
const Team = require("../models/Team");

const FIRST_NAMES = ["Arjun", "Maya", "Liam", "Priya", "Noah", "Sofia", "Kenji", "Aisha", "Diego", "Elena", "Rahul", "Grace", "Omar", "Yuki", "Nadia", "Leo", "Chloe", "Ravi", "Ines", "Tobias"];
const LAST_NAMES = ["Sharma", "Chen", "Okafor", "Patel", "Garcia", "Kim", "Novak", "Silva", "Rossi", "Muller", "Nakamura", "Haddad", "Costa", "Ivanov", "Lund", "Fischer", "Diallo", "Reyes", "Petrov", "Adams"];
const ARCHETYPES = [
  { role: "Full Stack Developer", skills: [["react", 8], ["node", 8], ["mongodb", 6], ["genai", 4]], interests: ["SaaS", "Developer Tools", "GenAI"], strengths: ["API design"], weaknesses: ["UI/UX"] },
  { role: "Backend Developer", skills: [["node", 9], ["postgres", 7], ["redis", 6], ["docker", 6]], interests: ["Infrastructure", "Fintech"], strengths: ["scalability"], weaknesses: ["presentation"] },
  { role: "AI Engineer", skills: [["genai", 9], ["python", 8], ["embeddings", 7]], interests: ["GenAI", "ML Research"], strengths: ["prompt engineering"], weaknesses: ["frontend"] },
  { role: "UI/UX Designer", skills: [["design", 9], ["figma", 8], ["react", 4]], interests: ["Design Systems", "Accessibility"], strengths: ["visual design"], weaknesses: ["backend"] },
  { role: "Frontend Developer", skills: [["react", 9], ["css", 8], ["design", 5]], interests: ["Design Systems", "Web Performance"], strengths: ["component architecture"], weaknesses: ["devops"] },
  { role: "DevOps Engineer", skills: [["docker", 8], ["devops", 9], ["node", 5]], interests: ["Infrastructure", "Reliability"], strengths: ["CI/CD"], weaknesses: ["design"] },
  { role: "Product/Presenter", skills: [["presentation", 9], ["product", 8], ["design", 4]], interests: ["Product Strategy", "Storytelling"], strengths: ["pitching"], weaknesses: ["backend"] },
];
const EXP_POOL = ["beginner", "intermediate", "intermediate", "advanced", "advanced", "expert"];
const rnd = (a, b) => Math.round(a + Math.random() * (b - a));

function mockParticipant(hackathonId) {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const arch = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  return {
    hackathon: hackathonId,
    name: `${first} ${last}`,
    email: `${first}.${last}@hackmate.dev`.toLowerCase(),
    skills: arch.skills.map(([name, base]) => ({ name, proficiency: Math.max(1, Math.min(10, base + rnd(-1, 1))) })),
    interests: arch.interests,
    experienceLevel: EXP_POOL[Math.floor(Math.random() * EXP_POOL.length)],
    preferredRoles: [arch.role],
    strengths: arch.strengths,
    weaknesses: arch.weaknesses,
    collaboration: { communication: rnd(4, 9), leadership: rnd(3, 9) },
  };
}

async function seed() {
  await connectDB();

  const email = "organizer@hackmate.dev";
  let user = await User.findOne({ email });
  if (!user) {
    const passwordHash = await bcrypt.hash("password123", 10);
    user = await User.create({ name: "Demo Organizer", email, passwordHash });
    console.log(`Created user ${email} / password123`);
  }

  let hackathon = await Hackathon.findOne({ owner: user._id, name: "AI Healthcare Hackathon" });
  if (!hackathon) {
    hackathon = await Hackathon.create({
      owner: user._id,
      name: "AI Healthcare Hackathon",
      theme: "AI Healthcare — building GenAI tools for clinicians and patients",
      teamSize: 4,
      teamSizeMin: 3,
      teamSizeMax: 5,
      requirements: [
        { skill: "AI/ML", priority: "High" },
        { skill: "Backend", priority: "High" },
        { skill: "Frontend", priority: "Medium" },
        { skill: "UI/UX", priority: "Medium" },
        { skill: "Presentation", priority: "Medium" },
      ],
    });
    await Participant.insertMany(Array.from({ length: 20 }, () => mockParticipant(hackathon._id)));
    console.log(`Created hackathon "${hackathon.name}" with 20 participants`);
  }

  console.log("Seed complete.");
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
