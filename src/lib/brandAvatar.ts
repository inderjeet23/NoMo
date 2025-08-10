function hashStringToInt(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    // Basic 32-bit hash
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getInitials(name: string, maxLetters: number = 3): string {
  const parts = name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const letters = parts.length === 1
    ? parts[0]!.slice(0, maxLetters)
    : parts.map((p) => p[0]!).join('').slice(0, maxLetters);
  return letters.toUpperCase();
}

// Tailwind color classes for dark UI backgrounds
const palette = [
  'bg-red-600',
  'bg-amber-600',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-indigo-600',
  'bg-fuchsia-600',
  'bg-teal-600',
  'bg-blue-600',
  'bg-purple-600',
  'bg-rose-600',
];

export function getBrandAvatarStyle(name: string): { bgClass: string; initials: string } {
  const idx = hashStringToInt(name.toLowerCase()) % palette.length;
  return { bgClass: palette[idx]!, initials: getInitials(name) };
}


