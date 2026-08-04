export const ROLES = {
  ADMIN: 'ADMIN',
  TRADER: 'TRADER',
  CUSTOMER: 'CUSTOMER'
} as const;


export type Role = typeof ROLES[keyof typeof ROLES];


export const isAdmin = (role: string) => role === ROLES.ADMIN;
export const isTrader = (role: string) => role === ROLES.TRADER;
