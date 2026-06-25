import { z } from "zod";

export const RoleSchema = z.enum(["servidor", "banco", "averbadora", "prefeitura"]);
export type Role = z.infer<typeof RoleSchema>;

export const LoginRequestSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
  device_id: z.string().optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const UserSchema = z.object({
  id: z.number().int(),
  nome: z.string(),
  role: RoleSchema,
  avatar_url: z.string().url().nullable().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const AuthSuccessSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number().int(),
  role: RoleSchema,
  user: UserSchema,
});
export type AuthSuccess = z.infer<typeof AuthSuccessSchema>;

export const RefreshRequestSchema = z.object({
  refresh_token: z.string(),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
