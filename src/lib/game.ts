import type { AnswerResult, GameState, LetterStatus, Player, Question } from './types';

export function createGame(names: string[], roscos: Question[][], turnTimeMs: number): GameState {
  const players: Player[] = names.map((name, i) => ({
    name,
    slots: roscos[i].map((q) => ({ letter: q.letter, question: q, status: 'pending' as const })),
    index: 0,
    timeLeftMs: turnTimeMs,
    finished: roscos[i].length === 0,
  }));
  return { players, current: 0, phase: 'ready', turnTimeMs, last: null };
}

/** Siguiente letra pendiente o pasada (circular), empezando DESPUÉS de `from`. -1 si no queda ninguna. */
export function nextOpenIndex(player: Player, from: number): number {
  const n = player.slots.length;
  for (let step = 1; step <= n; step++) {
    const i = (from + step) % n;
    const s = player.slots[i].status;
    if (s === 'pending' || s === 'passed') return i;
  }
  return -1;
}

/** Siguiente jugador sin terminar después de `from` (puede volver al mismo). -1 si todos terminaron. */
export function nextActivePlayer(players: Player[], from: number): number {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const i = (from + step) % n;
    if (!players[i].finished) return i;
  }
  return -1;
}

export type GameAction =
  | { type: 'start' }
  | { type: 'answer'; result: AnswerResult }
  | { type: 'tick'; ms: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'end' };

function withPlayer(state: GameState, idx: number, patch: Partial<Player>): Player[] {
  return state.players.map((p, i) => (i === idx ? { ...p, ...patch } : p));
}

/**
 * Pasa el turno al siguiente jugador activo. Si todos terminaron, fin de partida.
 * Si el único activo es el mismo jugador, sigue jugando sin pausa.
 */
function handOff(state: GameState, players: Player[], keepPlayingIfSame: boolean): GameState {
  const next = nextActivePlayer(players, state.current);
  if (next === -1) return { ...state, players, phase: 'finished' };
  if (next === state.current) {
    return { ...state, players, phase: keepPlayingIfSame ? 'playing' : 'ready' };
  }
  return { ...state, players, current: next, phase: 'ready' };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      return state.phase === 'ready' ? { ...state, phase: 'playing' } : state;
    case 'pause':
      return state.phase === 'playing' ? { ...state, phase: 'paused' } : state;
    case 'resume':
      return state.phase === 'paused' ? { ...state, phase: 'playing' } : state;
    case 'end':
      return { ...state, phase: 'finished' };
    case 'tick': {
      if (state.phase !== 'playing') return state;
      const p = state.players[state.current];
      const timeLeftMs = Math.max(0, p.timeLeftMs - action.ms);
      if (timeLeftMs > 0) return { ...state, players: withPlayer(state, state.current, { timeLeftMs }) };
      const players = withPlayer(state, state.current, { timeLeftMs: 0, finished: true });
      return handOff(state, players, false);
    }
    case 'answer': {
      if (state.phase !== 'playing') return state;
      const p = state.players[state.current];
      const slot = p.slots[p.index];
      const status: LetterStatus = action.result === 'correct' ? 'correct' : action.result === 'wrong' ? 'wrong' : 'passed';
      const slots = p.slots.map((s, i) => (i === p.index ? { ...s, status } : s));
      const updated: Player = { ...p, slots };
      const nextIdx = nextOpenIndex(updated, p.index);
      updated.finished = nextIdx === -1;
      if (nextIdx !== -1) updated.index = nextIdx;
      const players = state.players.map((pl, i) => (i === state.current ? updated : pl));
      const last = {
        result: action.result,
        letter: slot.letter,
        player: state.current,
        seq: (state.last?.seq ?? 0) + 1,
      };
      const s2: GameState = { ...state, last };
      if (action.result === 'correct' && !updated.finished) {
        return { ...s2, players };
      }
      // Error, pasapalabra o rosco terminado: turno al siguiente (si hay otro activo).
      return handOff(s2, players, true);
    }
  }
}

export interface PlayerScore {
  name: string;
  correct: number;
  wrong: number;
  unanswered: number;
}

export function scoreOf(p: Player): PlayerScore {
  let correct = 0;
  let wrong = 0;
  for (const s of p.slots) {
    if (s.status === 'correct') correct++;
    else if (s.status === 'wrong') wrong++;
  }
  return { name: p.name, correct, wrong, unanswered: p.slots.length - correct - wrong };
}

/** Ganador/es: más aciertos; desempata quien tuvo menos errores. */
export function winners(state: GameState): number[] {
  const scores = state.players.map(scoreOf);
  let best: number[] = [];
  scores.forEach((s, i) => {
    if (best.length === 0) return void (best = [i]);
    const b = scores[best[0]];
    if (s.correct > b.correct || (s.correct === b.correct && s.wrong < b.wrong)) best = [i];
    else if (s.correct === b.correct && s.wrong === b.wrong) best.push(i);
  });
  return best;
}
