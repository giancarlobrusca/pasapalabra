/** Letras del rosco, como en el programa (25: sin K ni W, con Ñ). */
export const LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'Ñ',
  'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X', 'Y', 'Z',
] as const;

export const ALL_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Ñ',
  'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
] as const;

export function prompt(letter: string, type: 'empieza' | 'contiene'): string {
  return type === 'empieza' ? `Empieza con la ${letter}` : `Contiene la ${letter}`;
}
