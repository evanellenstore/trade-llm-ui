export interface AdminMenuItem {
  label: string;
  icon: string;
  path: string;
}

export const adminMenuItems: AdminMenuItem[] = [
  { label: 'Dashboard', icon: '📊', path: '/admin' },
  { label: 'Users', icon: '👥', path: '/admin/users' },
  { label: 'Trade Files', icon: '📄', path: '/admin/documents' },
  { label: 'Broker API Docs', icon: '📡', path: '/admin/broker-api-docs' },
  { label: 'Trade Flow', icon: '🔄', path: '/admin/edi-transform' },
  { label: 'Orders', icon: '💳', path: '/admin/transactions' },
  { label: 'AI Assist', icon: '⚡', path: '/admin/ai-settings' },
  { label: 'Prompts', icon: '💬', path: '/admin/prompts' },
  { label: 'Reports', icon: '📈', path: '/admin/reports' },
  { label: 'Market Backtest', icon: '📉', path: '/admin/backtest' },
  { label: 'Audit Log', icon: '📋', path: '/admin/logs' },
  { label: 'Settings', icon: '⚙️', path: '/admin/settings' },
];
