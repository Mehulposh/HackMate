const { z } = require("zod");

const requirementSchema = z.object({
  skill: z.string().min(1),
  priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
});

const weightsSchema = z.object({
  skillCoverage: z.number().min(0).max(100).optional(),
  roleDiversity: z.number().min(0).max(100).optional(),
  experienceBalance: z.number().min(0).max(100).optional(),
  interestCompatibility: z.number().min(0).max(100).optional(),
  collaborationFit: z.number().min(0).max(100).optional(),
  projectAlignment: z.number().min(0).max(100).optional(),
}).partial();

const createHackathonSchema = z.object({
  name: z.string().min(1),
  theme: z.string().optional().default(""),
  teamSize: z.number().int().min(2).optional().default(4),
  teamSizeMin: z.number().int().min(1).optional().default(3),
  teamSizeMax: z.number().int().min(1).optional().default(5),
  requirements: z.array(requirementSchema).optional().default([]),
  weights: weightsSchema.optional(),
  registrationOpen: z.boolean().optional().default(true),
});

const updateHackathonSchema = createHackathonSchema.partial().extend({
  status: z.enum(["draft", "active", "published", "archived"]).optional(),
});

module.exports = { createHackathonSchema, updateHackathonSchema };