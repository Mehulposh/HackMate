const { z } = require("zod");

const skillSchema = z.object({
  name: z.string().min(1),
  proficiency: z.number().min(0).max(10).default(5),
});

const collaborationSchema = z.object({
  communication: z.number().min(0).max(10).default(5),
  leadership: z.number().min(0).max(10).default(5),
});

const createParticipantSchema = z.object({
  hackathon: z.string().min(1),
  name: z.string().min(1),
  email: z.string().optional().default(""),
  bio: z.string().optional().default(""),
  skills: z.array(skillSchema).optional().default([]),
  interests: z.array(z.string()).optional().default([]),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional().default("intermediate"),
  preferredRoles: z.array(z.string()).optional().default([]),
  strengths: z.array(z.string()).optional().default([]),
  weaknesses: z.array(z.string()).optional().default([]),
  collaboration: collaborationSchema.optional(),
});

const updateParticipantSchema = createParticipantSchema.partial().omit({ hackathon: true });

const analyzeSchema = z.object({
  bio: z.string().min(1, "bio text is required for analysis"),
});

module.exports = { createParticipantSchema, updateParticipantSchema, analyzeSchema };
