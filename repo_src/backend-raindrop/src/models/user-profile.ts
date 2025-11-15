import { z } from 'zod';

// UserProfile schema
export const UserProfileSchema = z.object({
  id: z.string().describe('Unique identifier, e.g., "usr_..."'),
  lead_id: z.string().describe('Foreign key to Lead'),
  segments: z.array(z.string()).default([]).describe('User segments, e.g., ["creator", "student"]'),
  interest_level: z.enum(['high', 'medium', 'low']).describe('Interest level'),
  budget_band: z.enum(['low', 'mid', 'high']).optional().describe('Budget band'),
  problem_tags: z.array(z.string()).default([]).describe('Problem tags, e.g., ["overwhelm", "task management"]'),
  feature_requests: z.array(z.string()).default([]).describe('Requested features'),
  sentiment: z.enum(['excited', 'neutral', 'skeptical', 'negative']).optional().describe('Sentiment analysis'),

  created_at: z.string().datetime().describe('ISO 8601 timestamp'),
  updated_at: z.string().datetime().describe('ISO 8601 timestamp'),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// CreateUserProfile schema
export const CreateUserProfileSchema = UserProfileSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateUserProfile = z.infer<typeof CreateUserProfileSchema>;

// UpdateUserProfile schema
export const UpdateUserProfileSchema = UserProfileSchema.partial().required({ id: true });

export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;

// Helper function to generate user profile ID
export function generateUserProfileId(): string {
  return `usr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
