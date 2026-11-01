import { describe, expect, it } from 'vitest';
import bankData from '../../src/data/bank.json';
import { availability, selectQuestions, updateHistory } from '../../src/lib/select';
import { CATEGORY_IDS } from '../../src/lib/categories';
import { LETTERS } from '../../src/lib/letters';
import { mulberry32 } from '../../src/lib/rng';
import { letterKey, matchesLetter } from '../../src/lib/normalize';
import { validateQuestion, parseQuestions } from '../../src/lib/storage';
import type { Question } from '../../src/lib/types';

const BANK = (bankData as { questions: Question[] }).questions;
const opts = { letters: LETTERS, players: 1, difficulty: 'mixta' as const, custom: 'mezclar' as const };

describe('banco de preguntas', () => {
  it('tiene al menos 20 preguntas por letra y todas respetan la consigna', () => {
    for (const l of LETTERS) {
      const qs = BANK.filter((q) => q.letter === l);
      expect(qs.length, `letra ${l}`).toBeGreaterThanOrEqual(20);
      for (const q of qs) expect(matchesLetter(q.answer, q.letter, q.type), `${q.letter}: ${q.answer}`).toBe(true);
    }
    expect(BANK.length).toBeGreaterThanOrEqual(500);
  });
  it('usa "Empieza con" cuando corresponde y "Contiene" solo si no empieza con la letra', () => {
    for (const q of BANK) {
      const starts = letterKey(q.answer).startsWith(letterKey(q.letter));
      expect(q.type, q.id).toBe(starts ? 'empieza' : 'contiene');
    }
  });
  it('categorías y dificultades válidas, con mucho cine y música', () => {
    for (const q of BANK) {
      expect(CATEGORY_IDS, q.id).toContain(q.category);
      expect(['facil', 'media', 'dificil'], q.id).toContain(q.difficulty);
    }
    const cineMusica = BANK.filter((q) => q.category === 'cine' || q.category === 'musica').length;
    expect(cineMusica / BANK.length).toBeGreaterThan(0.3);
    for (const l of LETTERS) {
      expect(BANK.some((q) => q.letter === l && (q.category === 'cine' || q.category === 'musica')), l).toBe(true);
    }
  });
  it('ids únicos, sin respuestas repetidas en la misma letra y la respuesta no aparece en su definición', () => {
    expect(new Set(BANK.map((q) => q.id)).size).toBe(BANK.length);
    for (const l of LETTERS) {
      const answers = BANK.filter((q) => q.letter === l).map((q) => letterKey(q.answer));
      expect(new Set(answers).size, l).toBe(answers.length);
    }
    for (const q of BANK) {
      const words = q.definition.split(/[^\p{L}]+/u).map(letterKey);
      expect(words, q.id).not.toContain(letterKey(q.answer));
    }
  });
});

describe('selectQuestions', () => {
  it('arma un rosco completo de 25 letras en orden', () => {
    const { roscos, missing } = selectQuestions(BANK, [], { ...opts, rng: mulberry32(1) });
    expect(missing).toEqual([]);
    expect(roscos[0].map((q) => q.letter)).toEqual([...LETTERS]);
  });
  it('es reproducible con la misma semilla y varía con otra', () => {
    const a = selectQuestions(BANK, [], { ...opts, rng: mulberry32(42) }).roscos[0].map((q) => q.id);
    const b = selectQuestions(BANK, [], { ...opts, rng: mulberry32(42) }).roscos[0].map((q) => q.id);
    const c = selectQuestions(BANK, [], { ...opts, rng: mulberry32(43) }).roscos[0].map((q) => q.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
  it('con 6 jugadores nunca repite una pregunta dentro de la partida', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { roscos } = selectQuestions(BANK, [], { ...opts, players: 6, rng: mulberry32(seed) });
      expect(roscos).toHaveLength(6);
      const ids = roscos.flat().map((q) => q.id);
      expect(ids).toHaveLength(6 * 25);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it('tampoco repite con categorías filtradas: completa con otras', () => {
    const { roscos } = selectQuestions(BANK, [], { ...opts, players: 6, categories: ['cine'], rng: mulberry32(8) });
    const ids = roscos.flat().map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Con letras que tienen ≥6 de cine, todas las del rosco son de cine.
    for (const [i, l] of LETTERS.entries()) {
      const n = BANK.filter((q) => q.letter === l && q.category === 'cine').length;
      if (n >= 6) for (const r of roscos) expect(r[i].category, `${l}`).toBe('cine');
    }
  });
  it('prioriza la dificultad elegida', () => {
    const { roscos } = selectQuestions(BANK, [], { ...opts, difficulty: 'facil', rng: mulberry32(9) });
    for (const q of roscos[0]) {
      const hasEasy = BANK.some((b) => b.letter === q.letter && b.difficulty === 'facil');
      if (hasEasy) expect(q.difficulty, q.id).toBe('facil');
    }
  });
  it('usa preguntas propias según la opción', () => {
    const mine: Question[] = [{ id: 'c1', letter: 'A', type: 'empieza', answer: 'abuela', definition: 'x', difficulty: 'media', custom: true }];
    const prio = selectQuestions(BANK, mine, { ...opts, custom: 'priorizar', rng: mulberry32(3) });
    expect(prio.roscos[0][0].id).toBe('c1');
    const none = selectQuestions(BANK, mine, { ...opts, custom: 'no', rng: mulberry32(3) });
    expect(none.roscos[0].some((q) => q.id === 'c1')).toBe(false);
    const solo = selectQuestions(BANK, mine, { ...opts, custom: 'solo', rng: mulberry32(3) });
    expect(solo.roscos[0].map((q) => q.id)).toEqual(['c1']);
    expect(solo.missing).toHaveLength(24);
  });
});

describe('historial entre partidas', () => {
  it('no repite preguntas entre partidas hasta agotar una letra, y ahí reinicia el ciclo de esa letra', () => {
    let history = new Set<string>();
    const seen = new Map<string, Set<string>>(); // por letra
    const minPerLetter = Math.min(...LETTERS.map((l) => BANK.filter((q) => q.letter === l).length));
    const safeGames = Math.floor(minPerLetter / 6); // partidas de 6 sin repetir en todas las letras
    for (let g = 0; g < safeGames; g++) {
      const sel = selectQuestions(BANK, [], { ...opts, players: 6, history, rng: mulberry32(100 + g) });
      for (const q of sel.roscos.flat()) {
        const s = seen.get(q.letter) ?? new Set<string>();
        expect(s.has(q.id), `partida ${g + 1}: ${q.id} repetida`).toBe(false);
        s.add(q.id);
        seen.set(q.letter, s);
      }
      history = updateHistory(history, sel);
    }
    expect(safeGames).toBeGreaterThanOrEqual(3);
  });

  it('dos partidas de 2 jugadores seguidas no comparten ninguna pregunta', () => {
    const s1 = selectQuestions(BANK, [], { ...opts, players: 2, rng: mulberry32(1) });
    const h = updateHistory(new Set(), s1);
    const s2 = selectQuestions(BANK, [], { ...opts, players: 2, history: h, rng: mulberry32(1) });
    const a = new Set(s1.roscos.flat().map((q) => q.id));
    for (const q of s2.roscos.flat()) expect(a.has(q.id), q.id).toBe(false);
  });

  it('al agotarse una letra, deja marcadas solo las de la última partida', () => {
    const small: Question[] = ['a1', 'a2', 'a3'].map((id) => ({ id, letter: 'A', type: 'empieza', answer: 'ala', definition: id, difficulty: 'facil', category: 'general' }));
    const o = { ...opts, letters: ['A'] as const, players: 2 };
    const s1 = selectQuestions(small, [], { ...o, rng: mulberry32(1) });
    const h1 = updateHistory(new Set(), s1);
    expect(h1.size).toBe(2);
    const s2 = selectQuestions(small, [], { ...o, history: h1, rng: mulberry32(2) });
    const ids2 = s2.roscos.flat().map((q) => q.id);
    const fresh = small.find((q) => !h1.has(q.id))!.id;
    expect(ids2).toContain(fresh); // primero la que faltaba
    expect(new Set(ids2).size).toBe(2);
    const h2 = updateHistory(h1, s2);
    expect([...h2].sort()).toEqual([...ids2].sort()); // ciclo reiniciado
  });

  it('availability cuenta disponibles y sin usar', () => {
    const all = availability(BANK, [], 'mezclar', [], new Set(), LETTERS);
    expect(all.total).toBe(BANK.length);
    expect(all.unused).toBe(BANK.length);
    const cine = availability(BANK, [], 'mezclar', ['cine'], new Set([BANK.find((q) => q.category === 'cine')!.id]), LETTERS);
    expect(cine.total).toBe(BANK.filter((q) => q.category === 'cine').length);
    expect(cine.unused).toBe(cine.total - 1);
  });
});

describe('validación de preguntas propias', () => {
  it('rechaza respuestas que no cumplen la letra', () => {
    expect(validateQuestion({ letter: 'B', type: 'empieza', answer: 'abeja', definition: 'x' })).toMatch(/no empieza/);
    expect(typeof validateQuestion({ letter: 'Ñ', type: 'contiene', answer: 'año', definition: 'x' })).toBe('object');
  });
  it('importa listas y reporta errores', () => {
    const r = parseQuestions({ questions: [{ letter: 'A', answer: 'ala', definition: 'x' }, { letter: 'A', answer: 'bote', definition: 'x' }] });
    expect(r.questions).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
    expect(parseQuestions('nada').errors).toHaveLength(1);
  });
});
