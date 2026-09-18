const { z } = require("zod");

const candidateRegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const candidateLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const joinHackathonSchema = z.object({
  bio: z.string().optional().default(""),
});

const updateOwnProfileSchema = z.object({
  bio: z.string().optional(),
  name: z.string().min(1).optional(),
});

module.exports = { candidateRegisterSchema, candidateLoginSchema, joinHackathonSchema, updateOwnProfileSchema };
