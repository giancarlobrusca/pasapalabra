import { expect, test } from '@playwright/test';
import { playOutCorrect, press, setup } from './helpers';

test('2 jugadores: turnos, reloj en pausa y ganador', async ({ page }) => {
  await setup(page, { players: 2, names: ['Abuela', 'Nietos'] });
  await expect(page.getByTestId('turn-name')).toHaveText('Abuela');
  await press(page, 'start-turn');

  // Abuela: acierto mantiene turno; error lo pasa.
  await press(page, 'btn-correct');
  await expect(page.getByTestId('game')).toHaveAttribute('data-phase', 'playing');
  await press(page, 'btn-wrong');
  await expect(page.getByTestId('turn-overlay')).toBeVisible();
  await expect(page.getByTestId('turn-name')).toHaveText('Nietos');

  // Con el cartel de turno, ningún reloj corre.
  const before = [await page.getByTestId('chip-0').textContent(), await page.getByTestId('chip-1').textContent()];
  await page.waitForTimeout(1500);
  expect([await page.getByTestId('chip-0').textContent(), await page.getByTestId('chip-1').textContent()]).toEqual(before);

  await press(page, 'start-turn');
  // Cada uno tiene su propio rosco: Nietos arranca en la A.
  await expect(page.getByTestId('rosco').locator('.letter.current')).toHaveAttribute('data-letter', 'A');
  await press(page, 'btn-pass');
  await expect(page.getByTestId('turn-name')).toHaveText('Abuela');
  await press(page, 'start-turn');
  await expect(page.getByTestId('rosco').locator('.letter.current')).toHaveAttribute('data-letter', 'C');

  // Todo acierto de ahí al final: Abuela 24 (1 error), Nietos 25.
  await playOutCorrect(page);
  await expect(page.getByTestId('winner')).toHaveText('¡Ganó Nietos!');
  await expect(page.getByTestId('result-correct-0')).toContainText('24');
  await expect(page.getByTestId('result-correct-1')).toContainText('25');
  await expect(page.getByTestId('result-1')).toHaveClass(/winner/);
});

test('atajos de teclado del presentador', async ({ page, isMobile }) => {
  test.skip(isMobile, 'teclado solo en desktop/tele');
  await setup(page, { players: 2 });
  await page.keyboard.press('Enter'); // empezar turno
  await expect(page.getByTestId('game')).toHaveAttribute('data-phase', 'playing');
  await page.keyboard.press('a');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('score-0')).toHaveText('2');
  await page.keyboard.press('r');
  await expect(page.getByTestId('answer')).toHaveClass(/shown/);
  await page.keyboard.press('ArrowDown'); // pasapalabra
  await expect(page.getByTestId('turn-name')).toHaveText('Equipo 2');
  await page.keyboard.press(' ');
  await page.keyboard.press('e');
  await expect(page.getByTestId('turn-name')).toHaveText('Equipo 1');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-overlay')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('game')).toHaveAttribute('data-phase', 'playing');
  // Equipo 1 vuelve en la D (la C quedó pasada); flecha izquierda = error y pasa el turno.
  await expect(page.getByTestId('rosco').locator('[data-letter="C"]')).toHaveAttribute('data-status', 'passed');
  await expect(page.getByTestId('q-letter')).toHaveText('D');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('turn-name')).toHaveText('Equipo 2');
  await expect(page.getByTestId('score-0')).toHaveText('2');
});
