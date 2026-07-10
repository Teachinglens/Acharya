export function getBirthYear(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const sanitized = dateStr.replaceAll('-', '/');
  const parts = sanitized.split('/');
  const yearPart = parts.find(p => p.length === 4);
  if (yearPart) {
    return parseInt(yearPart) || 0;
  }
  const lastPart = parts[parts.length - 1];
  const firstPart = parts[0];
  if (lastPart && lastPart.length === 4) return parseInt(lastPart) || 0;
  if (firstPart && firstPart.length === 4) return parseInt(firstPart) || 0;
  return parseInt(lastPart || firstPart || '0');
}

export function getKelompokUmur(birthDate: string | null | undefined): string {
  if (!birthDate) return '10'; // Default to KU 10 if not defined
  const birthYear = getBirthYear(birthDate);
  if (birthYear === 0) return '10';
  const currentYear = 2026;
  const age = currentYear - birthYear;
  if (age <= 6) return '6';
  if (age <= 8) return '8';
  if (age <= 10) return '10';
  if (age <= 12) return '12';
  if (age <= 14) return '14';
  if (age <= 16) return '16';
  return 'Senior';
}

export function normalizeGender(genderStr: string | null | undefined): 'Male' | 'Female' {
  if (!genderStr) return 'Male';
  const normalized = genderStr.trim().toLowerCase();
  if (normalized === 'laki-laki' || normalized === 'l' || normalized === 'male') {
    return 'Male';
  }
  if (normalized === 'perempuan' || normalized === 'p' || normalized === 'female') {
    return 'Female';
  }
  return 'Male'; // Default fallback
}

export function sanitizeAthleteName(name: string | null | undefined): string {
  if (!name) return '';
  let cleaned = name.trim().toLowerCase();
  
  // Replace prefixes like:
  // - "an. ", "an.", "an "
  // - "a.n. ", "a.n.", "a.n "
  // - "a/n. ", "a/n.", "a/n "
  cleaned = cleaned.replace(/^(an\.\s*|an\s+|a\.n\.\s*|a\.n\s+|a\/n\.\s*|a\/n\s+)/g, '');
  
  // Remove dots, commas, hyphens, and multiple whitespaces to ensure standard spacing
  cleaned = cleaned.replace(/[\.,\-]/g, '').replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

export function isSameAthlete(nameA: string | null | undefined, nameB: string | null | undefined): boolean {
  if (!nameA || !nameB) return false;
  return sanitizeAthleteName(nameA) === sanitizeAthleteName(nameB);
}

export function parseTimeToMs(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();
  
  // Exclude non-time placeholders
  if (cleaned === 'NS' || cleaned === 'DQ' || cleaned === 'DNF' || cleaned === 'SCR' || cleaned === 'SCRATCH') {
    return null;
  }
  
  // If there are letters other than M, or if it has invalid chars, return null.
  if (/[A-Z]/i.test(cleaned)) {
    return null;
  }
  
  const parts = cleaned.split(/[:\.]/);
  const numericParts = parts.map(p => parseInt(p) || 0);
  
  if (numericParts.length === 0) return null;
  
  let mins = 0;
  let secs = 0;
  let ms = 0;
  
  if (parts.length === 3) {
    mins = numericParts[0];
    secs = numericParts[1];
    ms = numericParts[2];
  } else if (parts.length === 2) {
    if (cleaned.includes(':')) {
      mins = numericParts[0];
      secs = numericParts[1];
      ms = 0;
    } else {
      mins = 0;
      secs = numericParts[0];
      ms = numericParts[1];
    }
  } else if (parts.length === 1) {
    mins = 0;
    secs = numericParts[0];
    ms = 0;
  }
  
  const totalMs = (mins * 60 * 1000) + (secs * 1000) + (ms * 10);
  
  if (totalMs <= 0) return null;
  
  return totalMs;
}


