// Admin section definitions for bug reporting and monitoring
export const ADMIN_SECTIONS = [
  { value: 'song_moderation', label: 'Song Moderation' },
  { value: 'user_management', label: 'User Management' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'orders', label: 'Orders' },
  { value: 'licenses', label: 'License Management' },
  { value: 'withdrawals', label: 'Withdrawals' },
  { value: 'disputes', label: 'Disputes' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'featured_content', label: 'Featured Content' },
  { value: 'platform_settings', label: 'Platform Settings' },
  { value: 'activity_logs', label: 'Activity Logs' },
  { value: 'bug_reports', label: 'Bug Reports' },
  { value: 'system_monitoring', label: 'System Monitoring' },
  { value: 'general', label: 'General/Other' },
] as const;

export const BUG_SEVERITIES = [
  { value: 'low', label: 'Low', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  { value: 'high', label: 'High', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500/10 text-red-500 border-red-500/30' },
] as const;

export const BUG_STATUSES = [
  { value: 'open', label: 'Open', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  { value: 'resolved', label: 'Resolved', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  { value: 'closed', label: 'Closed', color: 'bg-muted text-muted-foreground border-muted' },
] as const;

export const ERROR_TYPES = [
  { value: 'api_error', label: 'API Error' },
  { value: 'permission_error', label: 'Permission Error' },
  { value: 'validation_error', label: 'Validation Error' },
  { value: 'network_error', label: 'Network Error' },
  { value: 'render_error', label: 'Render Error' },
  { value: 'unknown_error', label: 'Unknown Error' },
] as const;

export type AdminSection = typeof ADMIN_SECTIONS[number]['value'];
export type BugSeverity = typeof BUG_SEVERITIES[number]['value'];
export type BugStatus = typeof BUG_STATUSES[number]['value'];
export type ErrorType = typeof ERROR_TYPES[number]['value'];
