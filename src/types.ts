export interface AthleteData {
  id?: string;
  fullName: string;
  gender?: string;
  birthDate: string;
  school: string;
  instagram: string;
  whatsappAthlete: string;
  height: string;
  photoUrl?: string;
  parentName: string;
  parentJob: string;
  address: string;
  whatsappParent: string;
  email: string;
  sessionsPerWeek: string;
  trainingSchedule: string;
  timestamp?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  imageUrl?: string;
}

export interface Competition {
  id?: string;
  name: string;
  date: string;
  location: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  createdAt: any;
}

export interface CompetitionEntry {
  id?: string;
  competitionId: string;
  competitionName?: string; // Cache for real-time display
  date?: string; // Cache for real-time display
  athleteName: string;
  athleteId?: string; // Reference to athlete
  gender?: string;
  ku?: string;
  eventName: string;
  time?: string; // Set when result is recorded
  status: 'registered' | 'finished' | 'dns';
}

export interface CompetitionResult {
  id?: string;
  athleteId?: string;
  athleteName: string;
  gender?: string;
  ku?: string;
  eventName: string; // e.g., '25M gaya bebas'
  time: string; // format mm:ss.ms
  competitionName: string;
  date: string;
  createdAt?: any;
}

export const SWIMMING_EVENTS = [
  '25M papan bebas',
  '25M papan dada',
  '25M gaya bebas',
  '25M gaya dada',
  '25M gaya Punggung',
  '25M gaya Kupu',
  '50M gaya bebas',
  '50M gaya dada',
  '50M gaya Punggung',
  '50M gaya Kupu'
];

export interface Album {
  id?: string;
  title: string;
  description: string;
  createdAt: any;
}

export interface Photo {
  id?: string;
  albumId: string;
  url: string;
  title?: string;
  description?: string;
  createdAt: any;
}
