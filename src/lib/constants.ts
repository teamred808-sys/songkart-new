// License type display names and descriptions
export const LICENSE_INFO = {
  personal: {
    name: 'Personal Use',
    description: 'For personal projects, demos, and non-commercial use',
    icon: 'User',
  },
  youtube: {
    name: 'YouTube/Streaming',
    description: 'For YouTube, Twitch, podcasts, and online content',
    icon: 'Youtube',
  },
  commercial: {
    name: 'Commercial',
    description: 'For advertising, marketing, and commercial projects',
    icon: 'Building2',
  },
  film: {
    name: 'Film/TV',
    description: 'For films, TV shows, documentaries, and broadcasts',
    icon: 'Film',
  },
  exclusive: {
    name: 'Exclusive Rights',
    description: 'Full ownership - song removed from marketplace after purchase',
    icon: 'Crown',
  },
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
