import { describe, expect, it } from 'vitest';
import { createGame, gameReducer, nextOpenIndex, scoreOf, winners, type GameAction } from '../../src/lib/game';
import type { GameState, Question } from '../../src/lib/types';

const mk = (letters: string): Question[] =>
  letters.split('').map((l) => ({ id: l, letter: l, type: 'empieza', answer: l.toLowerCase(), definition: l, difficulty: 'facil' }));

const run = (s: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, s);
const A = (result: 'correct' | 'wrong' | 'pass'): GameAction => ({ type: 'answer', result });

describe('1 jugador', () => {
  it('arranca en "ready" y no descuenta tiempo hasta empezar', () => {
    const g = createGame(['Ana'], [mk('ABC')], 10_000);
    expect(g.phase).toBe('ready');
    expect(gameReducer(g, { type: 'tick', ms: 5000 }).players[0].timeLeftMs).toBe(10_000);
    const playing = run(g, { type: 'start' }, { type: 'tick', ms: 1500 });
    expect(playing.players[0].timeLeftMs).toBe(8500);
  });

  it('pasapalabra vuelve a la letra al dar la vuelta y sigue jugando', () => {
    let g = run(createGame(['Ana'], [mk('ABC')], 10_000), { type: 'start' });
    g = run(g, A('pass'));
    expect(g.phase).toBe('playing');
    expect(g.players[0].slots[0].status).toBe('passed');
    expect(g.players[0].index).toBe(1);
    g = run(g, A('correct'), A('wrong'));
    expect(g.players[0].index).toBe(0); // vuelve a la A pasada
    g = run(g, A('correct'));
    expect(g.phase).toBe('finished');
    expect(scoreOf(g.players[0])).toEqual({ name: 'Ana', correct: 2, wrong: 1, unanswered: 0 });
  });

  it('se termina al agotarse el tiempo', () => {
    const g = run(createGame(['Ana'], [mk('ABC')], 1000), { type: 'start' }, { type: 'tick', ms: 1200 });
    expect(g.phase).toBe('finished');
    expect(g.players[0].timeLeftMs).toBe(0);
  });

  it('la pausa congela el tiempo y las respuestas', () => {
    let g = run(createGame(['Ana'], [mk('AB')], 5000), { type: 'start' }, { type: 'pause' });
    g = run(g, { type: 'tick', ms: 3000 }, A('correct'));
    expect(g.players[0].timeLeftMs).toBe(5000);
    expect(g.players[0].slots[0].status).toBe('pending');
    g = run(g, { type: 'resume' }, A('correct'));
    expect(g.players[0].slots[0].status).toBe('correct');
  });
});

describe('2 jugadores', () => {
  const base = () => run(createGame(['Ana', 'Beto'], [mk('ABC'), mk('ABC')], 10_000), { type: 'start' });

  it('el acierto mantiene el turno; error y pasapalabra lo pasan (con pausa)', () => {
    let g = run(base(), A('correct'));
    expect(g.current).toBe(0);
    expect(g.phase).toBe('playing');
    g = run(g, A('wrong'));
    expect(g.current).toBe(1);
    expect(g.phase).toBe('ready');
    // El reloj del que no juega no corre
    g = run(g, { type: 'tick', ms: 3000 });
    expect(g.players[0].timeLeftMs).toBe(10_000);
    expect(g.players[1].timeLeftMs).toBe(10_000);
    g = run(g, { type: 'start' }, A('pass'));
    expect(g.current).toBe(0);
    expect(g.phase).toBe('ready');
    expect(g.players[1].slots[0].status).toBe('passed');
  });

  it('cuando uno termina, el otro sigue solo sin cambios de turno', () => {
    let g = run(base(), A('correct'), A('correct'), A('correct'));
    expect(g.players[0].finished).toBe(true);
    expect(g.current).toBe(1);
    g = run(g, { type: 'start' }, A('pass'));
    expect(g.current).toBe(1);
    expect(g.phase).toBe('playing');
    g = run(g, A('wrong'), A('wrong'), A('correct'));
    expect(g.phase).toBe('finished');
    expect(winners(g)).toEqual([0]);
  });

  it('si a uno se le acaba el tiempo pasa el turno al otro', () => {
    const g = run(base(), { type: 'tick', ms: 10_000 });
    expect(g.players[0].finished).toBe(true);
    expect(g.current).toBe(1);
    expect(g.phase).toBe('ready');
  });

  it('desempata por menos errores y detecta empates', () => {
    let g = run(base(), A('correct'), A('wrong'));
    g = run(g, { type: 'start' }, A('correct'), A('pass'));
    expect(winners(g)).toEqual([1]);
    const tie = run(createGame(['A', 'B'], [mk('A'), mk('A')], 1000), { type: 'start' }, A('correct'), { type: 'start' }, A('correct'));
    expect(tie.phase).toBe('finished');
    expect(winners(tie)).toEqual([0, 1]);
  });
});

describe('nextOpenIndex', () => {
  it('devuelve -1 cuando no quedan letras', () => {
    const g = createGame(['Ana'], [mk('AB')], 1000);
    const p = { ...g.players[0], slots: g.players[0].slots.map((s) => ({ ...s, status: 'correct' as const })) };
    expect(nextOpenIndex(p, 0)).toBe(-1);
  });
});
