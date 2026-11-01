import { describe, expect, it } from 'vitest';
import bankData from '../../src/data/bank.json';
import { selectQuestions } from '../../src/lib/select';
import { LETTERS } from '../../src/lib/letters';
import { mulberry32 } from '../../src/lib/rng';
import { matchesLetter } from '../../src/lib/normalize';
import { validateQuestion, parseQuestions } from '../../src/lib/storage';
import type { Question } from '../../src/lib/types';

const BANK = (bankData as { questions: Question[] }).questions;
const opts = { letters: LETTERS, players: 1, difficulty: 'mixta' as const, custom: 'mezclar' as const };

describe('banco de preguntas', () => {
  it('tiene al menos 3 preguntas por letra y todas respetan la consigna', () => {
    for (const l of LETTERS) {
      const qs = BANK.filter((q) => q.letter === l);
      expect(qs.length, `letra ${l}`).toBeGreaterThanOrEqual(3);
      for (const q of qs) expect(matchesLetter(q.answer, q.letter, q.type), `${q.letter}: ${q.answer}`).toBe(true);
    }
  });
  it('ids únicos y la respuesta no aparece en su propia definición', () => {
    expect(new Set(BANK.map((q) => q.id)).size).toBe(BANK.length);
    for (const q of BANK) expect(q.definition.toLowerCase().includes(q.answer.toLowerCase()), q.id).toBe(false);
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
  it('no repite preguntas entre jugadores', () => {
    const { roscos } = selectQuestions(BANK, [], { ...opts, players: 2, rng: mulberry32(5) });
    roscos[0].forEach((q, i) => expect(q.id).not.toBe(roscos[1][i].id));
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
