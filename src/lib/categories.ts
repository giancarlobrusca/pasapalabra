import type { Category } from './types';

export const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'cine', label: 'Cine', icon: '🎬' },
  { id: 'musica', label: 'Música', icon: '🎵' },
  { id: 'deportes', label: 'Deportes', icon: '⚽' },
  { id: 'geografia', label: 'Geografía', icon: '🌎' },
  { id: 'comida', label: 'Comida', icon: '🍕' },
  { id: 'ciencia', label: 'Ciencia', icon: '🔬' },
  { id: 'historia', label: 'Historia', icon: '📜' },
  { id: 'naturaleza', label: 'Naturaleza', icon: '🐾' },
  { id: 'general', label: 'General', icon: '💡' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function isCategory(x: unknown): x is Category {
  return typeof x === 'string' && (CATEGORY_IDS as string[]).includes(x);
}
