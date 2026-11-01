/** Quita tildes/diéresis pero conserva la Ñ (para validar letras del rosco). */
export function letterKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/ñ/g, '\u0000')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0000/g, 'ñ')
    .replace(/[^a-zñ]/g, '');
}

/**
 * Normalización para comparar respuestas: sin mayúsculas, tildes, espacios ni signos.
 * Es tolerante con la Ñ (acepta "nino" por "niño") porque en teclados sin Ñ es común.
 */
export function normalizeAnswer(text: string): string {
  return letterKey(text).replace(/ñ/g, 'n');
}

export function isCorrectAnswer(input: string, answer: string, alt: string[] = []): boolean {
  const given = normalizeAnswer(input);
  if (!given) return false;
  return [answer, ...alt].some((a) => normalizeAnswer(a) === given);
}

/** ¿La respuesta respeta la consigna "Empieza con" / "Contiene"? */
export function matchesLetter(answer: string, letter: string, type: 'empieza' | 'contiene'): boolean {
  const key = letterKey(answer);
  const l = letterKey(letter);
  if (!key || !l) return false;
  return type === 'empieza' ? key.startsWith(l) : key.includes(l);
}

export function isPassWord(input: string): boolean {
  return normalizeAnswer(input) === 'pasapalabra';
}
