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

async function midGame(page: Page) {
  await page.getByTestId('start').click();
  await page.getByTestId('start-turn').click();
  for (const id of ['btn-correct', 'btn-correct', 'btn-correct', 'btn-pass']) await page.getByTestId(id).click();
  await page.getByTestId('start-turn').click();
  for (const id of ['btn-correct', 'btn-correct', 'btn-wrong']) await page.getByTestId(id).click();
  await page.getByTestId('start-turn').click();
  for (const id of ['btn-correct', 'btn-wrong']) await page.getByTestId(id).click();
  await page.getByTestId('start-turn').click();
  await page.getByTestId('btn-correct').click();
  await page.waitForTimeout(2200); // que se vaya el cartel y corra el reloj
  await expect(page.getByTestId('toast')).toHaveCount(0);
}

test('capturas', async ({ browser }) => {
  test.setTimeout(90_000);
  // 1) Inicio / configuración (laptop Retina)
  let p = await open(browser, 1440, 900, 2);
  await p.screenshot({ path: `${DIR}/01-inicio-config.png` });
  // 2) Rosco en juego desktop (laptop Retina)
  await midGame(p);
  await p.screenshot({ path: `${DIR}/02-rosco-desktop.png` });
  await p.context().close();

  // 3) Modo presentador en tele 1920x1080
  p = await open(browser, 1920, 1080, 1);
  await midGame(p);
  await p.getByTestId('reveal').click();
  await p.screenshot({ path: `${DIR}/03-presentador-tv-1920x1080.png` });
  // Cartel de cambio de turno en la tele
  await p.getByTestId('btn-pass').click();
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `${DIR}/03b-cambio-de-turno-tv.png` });
  await p.context().close();

  // 4) Rosco mobile (iPhone, DPR 2)
  p = await open(browser, 390, 844, 2, true);
  await midGame(p);
  await p.screenshot({ path: `${DIR}/04-rosco-mobile.png` });
  await p.context().close();

  // 5) Pantalla final (1920x1080)
  p = await open(browser, 1920, 1080, 1);
  await p.getByTestId('start').click();
  for (let i = 0; i < 200 && !(await p.getByTestId('final').isVisible()); i++) {
    const ph = await p.getByTestId('game').getAttribute('data-phase').catch(() => null);
    if (ph === 'ready') await p.getByTestId('start-turn').click();
    else if (ph === 'playing') await p.getByTestId(i % 7 === 3 ? 'btn-wrong' : i % 5 === 1 ? 'btn-pass' : 'btn-correct').click();
    else await p.waitForTimeout(150);
  }
  await expect(p.getByTestId('final')).toBeVisible();
  await p.getByTestId('result-0').locator('summary').click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${DIR}/05-final.png` });
  await p.context().close();

  // 6) Editor de preguntas (vacío, con el ejemplo marcado)
  p = await open(browser, 1440, 900, 2);
  await p.getByTestId('open-editor').click();
  await p.screenshot({ path: `${DIR}/06-editor.png` });
  // 6b) mobile
  await p.context().close();
  p = await open(browser, 390, 844, 2, true);
  await p.screenshot({ path: `${DIR}/07-inicio-mobile.png` });
  await p.context().close();
});
