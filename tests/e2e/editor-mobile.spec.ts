import { expect, test } from '@playwright/test';
import { press, setup } from './helpers';

test('editor: agregar pregunta propia, persistir y jugarla con "Solo mías"', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await press(page, 'open-editor');
  await expect(page.getByTestId('ed-example')).toContainText('EJEMPLO');

  await page.getByTestId('ed-letter').selectOption('B');
  await page.getByTestId('ed-def').fill('Prueba automática');
  await page.getByTestId('ed-answer').fill('abeja');
  await press(page, 'ed-save');
  await expect(page.getByTestId('ed-error')).toContainText('no empieza con la B');
  await page.getByTestId('ed-answer').fill('barco');
  await press(page, 'ed-save');
  await expect(page.getByTestId('ed-list')).toContainText('barco');

  await page.reload();
  await press(page, 'open-editor');
  await expect(page.getByTestId('ed-list')).toContainText('barco');
  await press(page, 'editor-back');
  await page.getByTestId('players-count').getByRole('radio', { name: '1', exact: true }).click();
  await page.getByTestId('custom').getByRole('radio', { name: 'Solo mías' }).click();
  await press(page, 'start');
  await expect(page.getByTestId('rosco').locator('.letter')).toHaveCount(1);
  // La definición no se ve hasta empezar el turno.
  await expect(page.getByTestId('q-def')).not.toHaveText('Prueba automática');
  await press(page, 'start-turn');
  await expect(page.getByTestId('q-def')).toHaveText('Prueba automática');
});

test('mobile: sin zoom por doble tap y DPR correcto', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'solo mobile');
  await setup(page, { players: 1 });
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
  const vp = await page.locator('meta[name=viewport]').getAttribute('content');
  expect(vp).toContain('width=device-width');
  await press(page, 'start-turn');
  const ta = await page.getByTestId('btn-correct').evaluate((el) => getComputedStyle(el).touchAction);
  expect(ta).toBe('manipulation');
  // Sin scroll horizontal y botones grandes dentro de la pantalla.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const box = await page.getByTestId('btn-wrong').boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  expect(box!.height).toBeGreaterThanOrEqual(64);
});
