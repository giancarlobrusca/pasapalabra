import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

type Q = { definition: string; answer: string };
const BANK = (JSON.parse(readFileSync('src/data/bank.json', 'utf8')) as { questions: Q[] }).questions;

export async function press(page: Page, testid: string) {
  const el = page.getByTestId(testid);
  if (page.viewportSize()!.width < 600) await el.tap();
  else await el.click();
}

/** Configura y arranca una partida desde la pantalla de inicio. */
export async function setup(page: Page, opts: { players: number; names?: string[]; mode?: 'presentador' | 'escrita'; seed?: number }) {
  await page.goto(`/?seed=${opts.seed ?? 1}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('players-count').getByRole('radio', { name: String(opts.players), exact: true }).click();
  for (const [i, n] of (opts.names ?? []).entries()) await page.getByTestId(`name-${i}`).fill(n);
  if (opts.mode === 'escrita') await page.getByTestId('mode').getByRole('radio', { name: /escrita/ }).click();
  await press(page, 'start');
  await expect(page.getByTestId('game')).toBeVisible();
}

export async function phase(page: Page) {
  return page.getByTestId('game').getAttribute('data-phase', { timeout: 500 });
}

export async function currentAnswer(page: Page): Promise<string> {
  const def = (await page.getByTestId('q-def').textContent())!.trim();
  const q = BANK.find((b) => b.definition === def);
  if (!q) throw new Error(`No encuentro la definición: ${def}`);
  return q.answer;
}

/** Marca acierto en todo lo que quede hasta la pantalla final, empezando turnos cuando haga falta. */
export async function playOutCorrect(page: Page) {
  for (let i = 0; i < 200; i++) {
    if (await page.getByTestId('final').isVisible()) return;
    const ph = await phase(page).catch(() => null);
    if (ph === 'ready') await press(page, 'start-turn');
    else if (ph === 'playing') await press(page, 'btn-correct');
    else await page.waitForTimeout(150);
  }
  throw new Error('La partida no terminó');
}
