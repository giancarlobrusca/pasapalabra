import { expect, test } from '@playwright/test';
import { playOutCorrect, press, setup } from './helpers';

test('6 jugadores: turnos en ronda, sin preguntas repetidas y ganador', async ({ page }) => {
  await setup(page, { players: 6 });
  const width = page.viewportSize()!.width;
  for (let i = 0; i < 6; i++) await expect(page.getByTestId(`chip-${i}`)).toBeVisible();
  // La barra de jugadores entra en pantalla sin scroll horizontal.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  for (let i = 0; i < 6; i++) {
    const box = await page.getByTestId(`chip-${i}`).boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  }

  // Ronda completa: del 1 al 5 erran, el 6 dice pasapalabra; vuelve al 1.
  const seenDefs = new Set<string>();
  for (let i = 0; i < 6; i++) {
    await expect(page.getByTestId('turn-name')).toHaveText(`Equipo ${i + 1}`);
    await press(page, 'start-turn');
    const def = (await page.getByTestId('q-def').textContent())!;
    expect(seenDefs.has(def), `pregunta repetida entre jugadores: ${def}`).toBe(false);
    seenDefs.add(def);
    await press(page, i === 5 ? 'btn-pass' : 'btn-wrong');
  }
  await expect(page.getByTestId('turn-name')).toHaveText('Equipo 1');

  // Botones grandes visibles también con 6 jugadores.
  await press(page, 'start-turn');
  const btn = await page.getByTestId('btn-wrong').boundingBox();
  expect(btn!.y + btn!.height).toBeLessThanOrEqual(page.viewportSize()!.height);

  await playOutCorrect(page);
  await expect(page.getByTestId('winner')).toHaveText('¡Ganó Equipo 6!');
  for (let i = 0; i < 6; i++) await expect(page.getByTestId(`result-${i}`)).toBeVisible();
  await expect(page.getByTestId('result-correct-5')).toContainText('25');

  // Historial: 150 preguntas distintas; la revancha usa otras 150 distintas.
  const h1 = await page.evaluate(() => JSON.parse(localStorage.getItem('pasapalabra.history.v1') ?? '[]') as string[]);
  expect(h1).toHaveLength(150);
  await press(page, 'rematch');
  await expect(page.getByTestId('game')).toBeVisible();
  const h2 = await page.evaluate(() => JSON.parse(localStorage.getItem('pasapalabra.history.v1') ?? '[]') as string[]);
  expect(h2).toHaveLength(300);
  expect(new Set(h2).size).toBe(300);
});

test('config: categorías, disponibles y reiniciar historial', async ({ page }) => {
  await setup(page, { players: 2 });
  await press(page, 'start-turn');
  page.once('dialog', (d) => d.accept());
  await press(page, 'end');
  await press(page, 'home');
  const total = Number(await page.getByTestId('avail-total').textContent());
  expect(total).toBeGreaterThanOrEqual(500);
  await expect(page.getByTestId('avail-unused')).toHaveText(String(total - 50));
  await expect(page.getByTestId('reset-history')).toContainText('(50)');

  await page.getByTestId('categories').locator('[data-cat="cine"]').click();
  await page.getByTestId('categories').locator('[data-cat="musica"]').click();
  const cm = Number(await page.getByTestId('avail-total').textContent());
  expect(cm).toBeGreaterThan(150);
  expect(cm).toBeLessThan(total);

  page.once('dialog', (d) => d.accept());
  await press(page, 'reset-history');
  await expect(page.getByTestId('reset-history')).toBeDisabled();
  await expect(page.getByTestId('avail-unused')).toHaveText(String(cm));

  // Partida solo de cine y música: la categoría se muestra en la pregunta.
  await page.getByTestId('players-count').getByRole('radio', { name: '1', exact: true }).click();
  await press(page, 'start');
  await press(page, 'start-turn');
  await expect(page.getByTestId('q-cat')).toHaveAttribute('data-cat', /cine|musica/);
});
