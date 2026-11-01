import { expect, test } from '@playwright/test';
import { currentAnswer, playOutCorrect, press, setup } from './helpers';

test('1 jugador, modo presentador: rosco completo hasta la pantalla final', async ({ page }) => {
  await setup(page, { players: 1, names: ['Gian'] });
  await expect(page.getByTestId('turn-overlay')).toBeVisible();
  // El reloj no corre antes de empezar.
  const t0 = await page.getByTestId('timer').textContent();
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('timer')).toHaveText(t0!);

  await press(page, 'start-turn');
  const rosco = page.getByTestId('rosco');
  await expect(rosco.locator('.letter.current')).toHaveAttribute('data-letter', 'A');
  await expect(rosco.locator('.letter')).toHaveCount(25);
  await expect(page.getByTestId('q-prompt')).toHaveText('Empieza con la A:');

  // Ver respuesta (para quien presenta).
  await expect(page.getByTestId('answer')).not.toHaveClass(/shown/);
  await press(page, 'reveal');
  await expect(page.getByTestId('answer')).toHaveText((await currentAnswer(page)).toUpperCase());

  await press(page, 'btn-correct');
  await expect(rosco.locator('[data-letter="A"]')).toHaveAttribute('data-status', 'correct');
  await expect(page.getByTestId('answer')).not.toHaveClass(/shown/);
  await press(page, 'btn-pass');
  await expect(rosco.locator('[data-letter="B"]')).toHaveAttribute('data-status', 'passed');
  await press(page, 'btn-wrong');
  await expect(rosco.locator('[data-letter="C"]')).toHaveAttribute('data-status', 'wrong');
  await expect(page.getByTestId('toast')).toContainText('Era:');
  await expect(page.getByTestId('correct')).toHaveText('1');
  // En 1 jugador se sigue jugando tras el error.
  await expect(page.getByTestId('game')).toHaveAttribute('data-phase', 'playing');

  await playOutCorrect(page);
  await expect(page.getByTestId('winner')).toHaveText('24 de 25');
  await expect(page.getByTestId('result-0')).toContainText('1 errores');
  // Respuestas reveladas
  await expect(page.getByTestId('result-0').locator('.answers li')).toHaveCount(25);
});

test('1 jugador, respuesta escrita: acierto sin tildes, error y pasapalabra', async ({ page }) => {
  await setup(page, { players: 1, mode: 'escrita', seed: 3 });
  await press(page, 'start-turn');
  const input = page.getByTestId('answer-input');
  const rosco = page.getByTestId('rosco');

  const a = await currentAnswer(page);
  const sloppy = ` ${a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()} `;
  await input.fill(sloppy);
  await input.press('Enter');
  await expect(rosco.locator('[data-letter="A"]')).toHaveAttribute('data-status', 'correct');

  await input.fill('zzzz');
  await press(page, 'submit');
  await expect(rosco.locator('[data-letter="B"]')).toHaveAttribute('data-status', 'wrong');

  await input.fill('pasapalabra');
  await input.press('Enter');
  await expect(rosco.locator('[data-letter="C"]')).toHaveAttribute('data-status', 'passed');
  await press(page, 'btn-pass');
  await expect(rosco.locator('[data-letter="D"]')).toHaveAttribute('data-status', 'passed');

  page.once('dialog', (d) => d.accept());
  await press(page, 'end');
  await expect(page.getByTestId('final')).toBeVisible();
  await expect(page.getByTestId('winner')).toHaveText('1 de 25');
});
