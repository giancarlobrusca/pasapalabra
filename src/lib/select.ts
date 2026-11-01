import type { CustomUsage, DifficultyChoice, Question } from './types';
import { shuffle } from './rng';

export interface SelectOptions {
  letters: readonly string[];
  players: number;
  difficulty: DifficultyChoice;
  custom: CustomUsage;
  rng: () => number;
}

export interface Selection {
  /** Una lista de preguntas (en orden de letras) por jugador. */
  roscos: Question[][];
  /** Letras que se sacaron del rosco por no tener preguntas. */
  missing: string[];
}

/**
 * Elige una pregunta por letra para cada jugador:
 * - prioriza la dificultad pedida y cae a las otras si no alcanza;
 * - evita repetir la misma pregunta entre jugadores mientras haya alternativas;
 * - mezcla/prioriza/usa solo las personalizadas según `custom`.
 * Una letra entra al rosco solo si todos los jugadores pueden tener pregunta.
 */
export function selectQuestions(bank: Question[], customs: Question[], opts: SelectOptions): Selection {
  const { letters, players, difficulty, custom, rng } = opts;
  const roscos: Question[][] = Array.from({ length: players }, () => []);
  const missing: string[] = [];

  for (const letter of letters) {
    const base = custom === 'solo' ? [] : bank.filter((q) => q.letter === letter);
    const mine = custom === 'no' ? [] : customs.filter((q) => q.letter === letter);
    if (base.length + mine.length === 0) {
      missing.push(letter);
      continue;
    }
    const rank = (q: Question): number => {
      let r = 0;
      if (custom === 'priorizar' && !q.custom) r += 10;
      if (difficulty !== 'mixta' && q.difficulty !== difficulty && !q.custom) r += 1;
      return r;
    };
    // Barajamos y ordenamos de forma estable por prioridad.
    const pool = shuffle([...mine, ...base], rng)
      .map((q, i) => ({ q, i, r: rank(q) }))
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .map((x) => x.q);
    for (let p = 0; p < players; p++) {
      roscos[p].push(pool[p % pool.length]);
    }
  }
  return { roscos, missing };
}
