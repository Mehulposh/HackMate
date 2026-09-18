const { groqApiKey, groqModel } = require("../config/env");

class AIServiceError extends Error {}

async function callGroq(prompt, maxTokens = 900) {
  if (!groqApiKey) {
    throw new AIServiceError(
      "GROQ_API_KEY is not set. Add it to backend/.env to enable AI profile analysis and explanations."
    );
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },

    body: JSON.stringify({
      model: groqModel,
      max_tokens: maxTokens,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");

    throw new AIServiceError(
      `Groq API error ${res.status}: ${body.slice(0, 500)}`
    );
  }

  const data = await res.json();

  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new AIServiceError("Groq returned an empty response.");
  }

  return text;
}

function extractJson(text) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new AIServiceError("Model did not return JSON.");
  }

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (error) {
    throw new AIServiceError(
      `Invalid JSON returned by Groq: ${error.message}`
    );
  }
}

async function analyzeProfile(rawText) {
  const prompt = `You are extracting a structured hackathon-participant profile from free text (a bio, resume summary, or self-description).

Respond with ONLY a JSON object.
Do not include a preamble.
Do not include markdown fences.

Match exactly this shape:

{
  "skills": [
    {
      "name": "string",
      "proficiency": 1
    }
  ],
  "interests": ["string"],
  "experienceLevel": "beginner" | "intermediate" | "advanced" | "expert",
  "preferredRoles": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "collaboration": {
    "communication": 1,
    "leadership": 1
  }
}

Rules:
- proficiency must be a number from 1 to 10
- communication must be a number from 1 to 10
- leadership must be a number from 1 to 10
- skills: maximum 6
- interests: maximum 5
- strengths: maximum 3
- weaknesses: maximum 3
- Infer reasonable values even from sparse text
- Do not invent highly specific experience that is not supported by the text

Text:
"""${rawText}"""`;

  const text = await callGroq(prompt, 900);

  return extractJson(text);
}

async function explainTeam(team, members, hackathon) {
  const memberSummary = members
    .map(
      (m) =>
        `- ${m.name}: role=${
          (m.preferredRoles || [])[0] || "n/a"
        }, experience=${m.experienceLevel}, top skills=${(
          m.skills || []
        )
          .slice(0, 4)
          .map((s) => `${s.name}(${s.proficiency})`)
          .join(", ")}, interests=${(m.interests || []).join(", ")}`
    )
    .join("\n");

  const prompt = `You are writing a short, concrete explanation for why a hackathon team was assembled.

The team has already been computed by a deterministic scoring engine.
You are NOT deciding the team.
Your job is only to explain the existing result.

Write 3-5 sentences.
Do not use headers.
Do not use markdown.
Be specific rather than generic.
Reference specific members and scores where useful.

Hackathon theme:
${hackathon.theme || "General"}

Required capabilities:
${
  (hackathon.requirements || [])
    .map((r) => `${r.skill} (${r.priority})`)
    .join(", ") || "none specified"
}

Team:
${team.name}

Overall score:
${team.score.toFixed(1)}%

Score breakdown:
- Skill coverage: ${team.breakdown.skillCoverage.toFixed(0)}%
- Role diversity: ${team.breakdown.roleDiversity.toFixed(0)}%
- Experience balance: ${team.breakdown.experienceBalance.toFixed(0)}%
- Interest compatibility: ${team.breakdown.interestCompatibility.toFixed(0)}%
- Collaboration fit: ${team.breakdown.collaborationFit.toFixed(0)}%
- Project alignment: ${team.breakdown.projectAlignment.toFixed(0)}%

Members:
${memberSummary}

Known weaknesses:
${
  team.weaknesses.length
    ? team.weaknesses.join("; ")
    : "none flagged"
}`;

  const text = await callGroq(prompt, 400);

  return text.trim();
}

module.exports = {
  analyzeProfile,
  explainTeam,
  AIServiceError,
};