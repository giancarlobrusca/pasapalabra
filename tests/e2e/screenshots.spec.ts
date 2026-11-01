import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const DIR = 'screenshots';
mkdirSync(DIR, { recursive: true });

async function open(browser: Browser, w: number, h: number, dpr: number, mobile = false): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  await page.goto('/?seed=2026');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  return page;
}

async function configure(page: Page, players: number, cats: string[] = []) {
  await page.getByTestId('players-count').getByRole('radio', { name: String(players), exact: true }).click();
  for (const c of cats) await page.getByTestId('categories').locator(`[data-cat="${c}"]`).click();
}

/** Juega unas rondas para que el rosco tenga colores y queden varios equipos con puntos. */
async function midGame(page: Page, players: number) {
  await page.getByTestId('start').click();
  const plan = ['btn-correct', 'btn-correct', 'btn-wrong', 'btn-correct', 'btn-pass', 'btn-correct', 'btn-correct', 'btn-correct', 'btn-wrong'];
  let turns = 0;
  for (const id of plan.concat(plan)) {
    if ((await page.getByTestId('game').getAttribute('data-phase')) === 'ready') {
      if (turns >= players + 1) break;
      await page.getByTestId('start-turn').click();
      turns++;
    }
    await page.getByTestId(id).click();
  }
  if ((await page.getByTestId('game').getAttribute('data-phase')) === 'ready') await page.getByTestId('start-turn').click();
  await page.waitForTimeout(2300);
  await expect(page.getByTestId('toast')).toHaveCount(0);
}

test('capturas', async ({ browser }) => {
  test.setTimeout(120_000);
  // 1) Config con 6 jugadores y categorías (laptop Retina)
  let p = await open(browser, 1440, 900, 2);
  await configure(p, 6, ['cine', 'musica']);
  await p.screenshot({ path: `${DIR}/01-config-6-jugadores-categorias.png`, fullPage: true });
  await p.context().close();

  // 2) Tele 1920x1080 con 6 jugadores, pregunta de cine o música
  p = await open(browser, 1920, 1080, 1);
  await configure(p, 6, ['cine', 'musica']);
  await midGame(p, 6);
  await expect(p.getByTestId('q-cat')).toHaveAttribute('data-cat', /cine|musica/);
  await p.screenshot({ path: `${DIR}/02-tv-1920x1080-6-jugadores-cine-musica.png` });
  await p.getByTestId('reveal').click();
  await p.screenshot({ path: `${DIR}/03-tv-1920x1080-respuesta-visible.png` });
  await p.getByTestId('btn-pass').click();
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `${DIR}/04-tv-cambio-de-turno.png` });
  await p.context().close();

  // 3) Mobile (iPhone, DPR 2) con 6 jugadores
  p = await open(browser, 390, 844, 2, true);
  await configure(p, 6);
  await midGame(p, 6);
  await p.screenshot({ path: `${DIR}/05-mobile-6-jugadores.png` });
  await p.context().close();

  // 4) Config mobile
  p = await open(browser, 390, 844, 2, true);
  await configure(p, 6, ['cine', 'musica']);
  await p.screenshot({ path: `${DIR}/06-config-mobile.png`, fullPage: true });
  await p.context().close();

  // 5) Final con 6 jugadores (tele)
  p = await open(browser, 1920, 1080, 1);
  await configure(p, 6);
  await p.getByTestId('start').click();
  for (let i = 0; i < 400 && !(await p.getByTestId('final').isVisible()); i++) {
    const ph = await p.getByTestId('game').getAttribute('data-phase').catch(() => null);
    if (ph === 'ready') await p.getByTestId('start-turn').click();
    else if (ph === 'playing') await p.getByTestId(i % 9 === 4 ? 'btn-wrong' : i % 7 === 1 ? 'btn-pass' : 'btn-correct').click();
    else await p.waitForTimeout(150);
  }
  await expect(p.getByTestId('final')).toBeVisible();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${DIR}/07-final-6-jugadores.png` });
  await p.context().close();

  // 6) Editor de preguntas
  p = await open(browser, 1440, 900, 2);
  await p.getByTestId('open-editor').click();
  await p.screenshot({ path: `${DIR}/08-editor.png` });
  await p.context().close();
});
