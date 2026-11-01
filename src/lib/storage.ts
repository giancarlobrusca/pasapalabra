import type { Question } from './types';
import { ALL_LETTERS } from './letters';
import { matchesLetter } from './normalize';

const CUSTOM_KEY = 'pasapalabra.custom.v1';
const SETTINGS_KEY = 'pasapalabra.settings.v1';

export function loadCustom(): Question[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    return parseQuestions(JSON.parse(raw)).questions;
  } catch {
    return [];
  }
}

export function saveCustom(questions: Question[]): void {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(questions));
}

export function loadSettings<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveSettings<T>(s: T): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* modo privado: ignoramos */
  }
}

export interface ParseResult {
  questions: Question[];
  errors: string[];
}

/** Valida un JSON importado: acepta un array o `{ questions: [...] }`. */
export function parseQuestions(data: unknown): ParseResult {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { questions?: unknown }).questions)
      ? (data as { questions: unknown[] }).questions
      : null;
  if (!list) return { questions: [], errors: ['El archivo no tiene una lista de preguntas.'] };
  const questions: Question[] = [];
  const errors: string[] = [];
  list.forEach((item, i) => {
    const r = validateQuestion(item);
    if (typeof r === 'string') errors.push(`Pregunta ${i + 1}: ${r}`);
    else questions.push(r);
  });
  return { questions, errors };
}

export function validateQuestion(item: unknown): Question | string {
  if (!item || typeof item !== 'object') return 'formato inválido';
  const o = item as Record<string, unknown>;
  const letter = String(o.letter ?? '').trim().toUpperCase();
  const type = o.type === 'contiene' ? 'contiene' : o.type === 'empieza' || o.type == null ? 'empieza' : null;
  const answer = String(o.answer ?? '').trim();
  const definition = String(o.definition ?? '').trim();
  const difficulty = o.difficulty === 'facil' || o.difficulty === 'dificil' ? o.difficulty : 'media';
  if (!(ALL_LETTERS as readonly string[]).includes(letter)) return 'letra inválida';
  if (!type) return 'tipo inválido (usá "empieza" o "contiene")';
  if (!answer) return 'falta la respuesta';
  if (!definition) return 'falta la definición';
  if (!matchesLetter(answer, letter, type)) {
    return `"${answer}" no ${type === 'empieza' ? 'empieza con' : 'contiene'} la ${letter}`;
  }
  const alt = Array.isArray(o.alt) ? o.alt.map(String).filter(Boolean) : [];
  const id = typeof o.id === 'string' && o.id ? o.id : `custom-${Math.random().toString(36).slice(2, 10)}`;
  return { id, letter, type, answer, alt, definition, difficulty, custom: true };
}
