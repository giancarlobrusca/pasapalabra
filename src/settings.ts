import type { Category, CustomUsage, DifficultyChoice } from './lib/types';

export type Mode = 'presentador' | 'escrita';

export interface Settings {
  names: string[];
  seconds: number;
  difficulty: DifficultyChoice;
  custom: CustomUsage;
  mode: Mode;
  sound: boolean;
  /** Categorías elegidas; vacío = todas. */
  categories: Category[];
}

export const MAX_PLAYERS = 6;

export const DEFAULT_SETTINGS: Settings = {
  names: ['Equipo 1', 'Equipo 2'],
  seconds: 150,
  difficulty: 'mixta',
  custom: 'mezclar',
  mode: 'presentador',
  sound: true,
  categories: [],
};
