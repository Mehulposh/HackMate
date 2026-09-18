const { z } = require("zod");

const simulateSchema = z.object({
  removeParticipantId: z.string().min(1),
  addParticipantId: z.string().min(1),
  apply: z.boolean().optional().default(false),
});

const feedbackSchema = z.object({
  skillBalance: z.number().min(1).max(5),
  communication: z.number().min(1).max(5),
  collaboration: z.number().min(1).max(5),
  technicalFit: z.number().min(1).max(5),
  overall: z.number().min(1).max(5),
  comment: z.string().optional().default(""),
});

module.exports = { simulateSchema, feedbackSchema };
