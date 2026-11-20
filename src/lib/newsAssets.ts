import champCover from '../assets/images/news_featured_championship_1795190287797.jpg';
import trainingCover from '../assets/images/news_training_technique_1795190289258.jpg';
import communityCover from '../assets/images/news_club_community_1795190289065.jpg';
import { NewsCategory } from '../types';

export interface EditorialCoverPreset {
  id: string;
  label: string;
  src: string;
  categoryHint: NewsCategory;
}

export const EDITORIAL_COVER_PRESETS: EditorialCoverPreset[] = [
  {
    id: 'preset-championship',
    label: 'Kejuaraan & Start Lomba',
    src: champCover,
    categoryHint: 'Kejuaraan',
  },
  {
    id: 'preset-training',
    label: 'Sesi Latihan & Teknik',
    src: trainingCover,
    categoryHint: 'Latihan',
  },
  {
    id: 'preset-community',
    label: 'Kebersamaan & Prestasi Tim',
    src: communityCover,
    categoryHint: 'Prestasi',
  },
];

export function getDefaultCoverByCategory(category?: NewsCategory): string {
  switch (category) {
    case 'Latihan':
      return trainingCover;
    case 'Prestasi':
    case 'Komunitas':
      return communityCover;
    case 'Kejuaraan':
    case 'Pengumuman':
    default:
      return champCover;
  }
}

export function transformImageUrl(url?: string): string {
  if (!url) return '';
  const cleaned = url.trim();
  if (!cleaned) return '';

  const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=))([a-zA-Z0-9_-]{25,45})/;
  const driveMatch = cleaned.match(driveRegex);
  if (driveMatch && driveMatch[1]) {
    return `https://docs.google.com/uc?export=view&id=${driveMatch[1]}`;
  }

  if (cleaned.includes('dropbox.com')) {
    return cleaned.replace('?dl=0', '?raw=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  }

  return cleaned;
}

export function resolveNewsCoverUrl(imageUrl?: string, category?: NewsCategory): string {
  if (!imageUrl || !imageUrl.trim()) {
    return getDefaultCoverByCategory(category);
  }
  const trimmed = imageUrl.trim();
  if (trimmed === 'preset:championship') return champCover;
  if (trimmed === 'preset:training') return trainingCover;
  if (trimmed === 'preset:community') return communityCover;
  return transformImageUrl(trimmed);
}

export function serializeCoverChoice(src: string): string {
  if (src === champCover) return 'preset:championship';
  if (src === trainingCover) return 'preset:training';
  if (src === communityCover) return 'preset:community';
  return transformImageUrl(src).slice(0, 2000);
}

export function formatEditorialDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export function estimateReadingMinutes(content?: string): number {
  if (!content) return 1;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}
