export type Difficulty = 'facil' | 'media' | 'dificil';
export type QuestionType = 'empieza' | 'contiene';

export interface Question {
  id: string;
  letter: string;
  type: QuestionType;
  answer: string;
  alt?: string[];
  definition: string;
  difficulty: Difficulty;
  custom?: boolean;
}

export type LetterStatus = 'pending' | 'correct' | 'wrong' | 'passed';

export interface LetterSlot {
  letter: string;
  question: Question;
  status: LetterStatus;
}

export interface Player {
  name: string;
  slots: LetterSlot[];
  index: number;
  timeLeftMs: number;
  finished: boolean;
}

export type Phase = 'ready' | 'playing' | 'paused' | 'finished';

export interface GameState {
  players: Player[];
  current: number;
  phase: Phase;
  turnTimeMs: number;
  /** Último resultado, para animaciones/sonidos (se incrementa seq en cada acción). */
  last: { result: AnswerResult; letter: string; player: number; seq: number } | null;
}

export type AnswerResult = 'correct' | 'wrong' | 'pass';

export type DifficultyChoice = Difficulty | 'mixta';
export type CustomUsage = 'no' | 'mezclar' | 'priorizar' | 'solo';
