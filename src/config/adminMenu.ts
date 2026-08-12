export interface AdminMenuItem {
  label: string;
  icon: string;
  path: string;
}

export const adminMenuItems: AdminMenuItem[] = [
  { label: 'Dashboard', icon: '📊', path: '/admin' },
  { label: 'Users', icon: '👥', path: '/admin/users' },
  { label: 'Broker Connect', icon: '📡', path: '/admin/broker-connect' },
  { label: 'Market Data', icon: '📉', path: '/admin/market-data' },
  { label: 'AI Assist', icon: '⚡', path: '/admin/ai-settings' },
  { label: 'Settings', icon: '⚙️', path: '/admin/settings' },
];
