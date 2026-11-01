import { describe, expect, it } from 'vitest';
import { isCorrectAnswer, isPassWord, letterKey, matchesLetter, normalizeAnswer } from '../../src/lib/normalize';

describe('normalizeAnswer', () => {
  it('ignora mayúsculas, tildes, diéresis, espacios y signos', () => {
    expect(normalizeAnswer('  Árbol ')).toBe('arbol');
    expect(normalizeAnswer('PINGÜINO')).toBe('pinguino');
    expect(normalizeAnswer('Ca-ra cas!')).toBe('caracas');
  });
  it('es tolerante con la Ñ al comparar', () => {
    expect(isCorrectAnswer('nino', 'niño')).toBe(true);
    expect(isCorrectAnswer('NIÑO', 'niño')).toBe(true);
  });
});

describe('isCorrectAnswer', () => {
  it('acepta la respuesta y sus alternativas', () => {
    expect(isCorrectAnswer('fresa', 'frutilla', ['fresa'])).toBe(true);
    expect(isCorrectAnswer('Frutilla', 'frutilla', ['fresa'])).toBe(true);
    expect(isCorrectAnswer('futbol', 'fútbol')).toBe(true);
  });
  it('rechaza respuestas distintas o vacías', () => {
    expect(isCorrectAnswer('frutillas', 'frutilla')).toBe(false);
    expect(isCorrectAnswer('', 'abeja')).toBe(false);
    expect(isCorrectAnswer('   ', 'abeja')).toBe(false);
  });
  it('detecta "pasapalabra" escrito', () => {
    expect(isPassWord('Pasa palabra')).toBe(true);
    expect(isPassWord('pasa')).toBe(false);
  });
});

describe('letterKey / matchesLetter', () => {
  it('conserva la Ñ para validar la letra', () => {
    expect(letterKey('Ñandú')).toBe('ñandu');
    expect(matchesLetter('ñandú', 'Ñ', 'empieza')).toBe(true);
    expect(matchesLetter('nandu', 'Ñ', 'empieza')).toBe(false);
    expect(matchesLetter('otoño', 'Ñ', 'contiene')).toBe(true);
    expect(matchesLetter('otono', 'Ñ', 'contiene')).toBe(false);
  });
  it('trata vocales con tilde como su letra', () => {
    expect(matchesLetter('águila', 'A', 'empieza')).toBe(true);
    expect(matchesLetter('taxi', 'X', 'empieza')).toBe(false);
    expect(matchesLetter('taxi', 'X', 'contiene')).toBe(true);
  });
});
