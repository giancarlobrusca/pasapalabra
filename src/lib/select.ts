import type { Category, CustomUsage, DifficultyChoice, Question } from './types';
import { shuffle } from './rng';

export interface SelectOptions {
  letters: readonly string[];
  players: number;
  difficulty: DifficultyChoice;
  custom: CustomUsage;
  /** Categorías elegidas. Vacío = todas. */
  categories?: readonly Category[];
  /** Ids ya usados en partidas anteriores (se prefieren los no usados). */
  history?: ReadonlySet<string>;
  rng: () => number;
}

export interface Selection {
  /** Una lista de preguntas (en orden de letras) por jugador. */
  roscos: Question[][];
  /** Letras que se sacaron del rosco por no tener preguntas. */
  missing: string[];
  /** Por letra: ids "elegibles" (los que cuentan para el ciclo del historial). */
  eligible: Record<string, string[]>;
}

function inCategories(q: Question, cats: readonly Category[] | undefined): boolean {
  if (!cats || cats.length === 0 || q.custom) return true;
  return q.category !== undefined && cats.includes(q.category);
}

/** Preguntas candidatas según la opción de preguntas propias. */
export function candidates(bank: Question[], customs: Question[], custom: CustomUsage): Question[] {
  if (custom === 'solo') return customs;
  if (custom === 'no') return bank;
  return [...customs, ...bank];
}

/**
 * Elige una pregunta por letra para cada jugador. Prioridades, de mayor a menor:
 * 1. preguntas propias (si se pidió "priorizar");
 * 2. de las categorías elegidas (si una letra no alcanza, completa con otras);
 * 3. no usadas en partidas anteriores (historial);
 * 4. de la dificultad elegida.
 * Dentro de una partida NUNCA se repite una pregunta entre jugadores, salvo que la letra
 * tenga menos preguntas que jugadores en total (solo posible con "Solo mías").
 */
export function selectQuestions(bank: Question[], customs: Question[], opts: SelectOptions): Selection {
  const { letters, players, difficulty, custom, categories, history, rng } = opts;
  const roscos: Question[][] = Array.from({ length: players }, () => []);
  const missing: string[] = [];
  const eligible: Record<string, string[]> = {};
  const all = candidates(bank, customs, custom);

  for (const letter of letters) {
    const pool0 = all.filter((q) => q.letter === letter);
    if (pool0.length === 0) {
      missing.push(letter);
      continue;
    }
    eligible[letter] = pool0.filter((q) => inCategories(q, categories)).map((q) => q.id);
    const rank = (q: Question): number => {
      let r = 0;
      if (custom === 'priorizar' && !q.custom) r += 1000;
      if (!inCategories(q, categories)) r += 100;
      if (history?.has(q.id)) r += 10;
      if (difficulty !== 'mixta' && !q.custom && q.difficulty !== difficulty) r += 1;
      return r;
    };
    const pool = shuffle(pool0, rng)
      .map((q, i) => ({ q, i, r: rank(q) }))
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .map((x) => x.q);
    for (let p = 0; p < players; p++) roscos[p].push(pool[p % pool.length]);
  }
  return { roscos, missing, eligible };
}

/**
 * Agrega al historial las preguntas usadas. Si en una letra ya se usaron todas las elegibles,
 * reinicia el ciclo de esa letra (quedan marcadas solo las de esta partida).
 */
export function updateHistory(history: ReadonlySet<string>, sel: Selection): Set<string> {
  const next = new Set(history);
  const used = sel.roscos.flat();
  for (const q of used) next.add(q.id);
  for (const [letter, ids] of Object.entries(sel.eligible)) {
    if (ids.length > 0 && ids.every((id) => next.has(id))) {
      for (const id of ids) next.delete(id);
      for (const q of used) if (q.letter === letter) next.add(q.id);
    }
  }
  return next;
}

/** Cuántas preguntas hay para la configuración, y cuántas sin usar. */
export function availability(
  bank: Question[],
  customs: Question[],
  custom: CustomUsage,
  categories: readonly Category[],
  history: ReadonlySet<string>,
  letters: readonly string[],
): { total: number; unused: number; minPerLetter: number } {
  const pool = candidates(bank, customs, custom).filter((q) => letters.includes(q.letter) && inCategories(q, categories));
  const per = letters.map((l) => pool.filter((q) => q.letter === l).length);
  return {
    total: pool.length,
    unused: pool.filter((q) => !history.has(q.id)).length,
    minPerLetter: Math.min(...per),
  };
}
