// src/utils/constants.ts

export const ROLES = {
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
  USER: 'USER',
  TRADER: 'TRADER',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
