// License type display names and descriptions
export const LICENSE_INFO = {
  commercial: {
    name: 'Commercial',
    description: 'For advertising, marketing, and commercial projects',
    icon: 'Building2',
  },
  exclusive: {
    name: 'Exclusive Rights',
    description: 'Full ownership - song removed from marketplace after purchase',
    icon: 'Crown',
  },
} as const;

// License types for components
export const LICENSE_TYPES = {
  commercial: { label: 'Commercial', description: 'For advertising, marketing, and commercial projects' },
  exclusive: { label: 'Exclusive Rights', description: 'Full ownership - song removed from marketplace after purchase' },
} as const;

// Song status display
export const SONG_STATUS = {
  pending: { label: 'Pending Review', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'destructive' },
} as const;

// Withdrawal status display
export const WITHDRAWAL_STATUS = {
  pending: { label: 'Pending', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  processed: { label: 'Processed', color: 'success' },
  rejected: { label: 'Rejected', color: 'destructive' },
} as const;

// Role display names
export const ROLE_DISPLAY = {
  buyer: 'Buyer',
  seller: 'Seller',
  admin: 'Admin',
} as const;

// Languages
export const LANGUAGES = [
  'English',
  'Hindi',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Italian',
  'Japanese',
  'Korean',
  'Chinese',
  'Arabic',
  'Russian',
  'Tamil',
  'Telugu',
  'Bengali',
  'Punjabi',
  'Marathi',
  'Gujarati',
  'Kannada',
  'Malayalam',
] as const;

// Default commission rate
export const DEFAULT_COMMISSION_RATE = 15;
export const DEFAULT_MIN_WITHDRAWAL = 500;
