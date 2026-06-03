import { Page } from 'puppeteer';
import { isNil } from 'lodash-es';
import { log, sleep } from './utils';
import { milliseconds } from 'date-fns';

/**
 * Открываем страницу с книгой, находим там кнопку Читать и переходим в ридер.
 */
export async function openReader(bookLink: string, page: Page) {
  log(`Открываю страницу книги`, bookLink);
  await page.goto(bookLink, { waitUntil: 'domcontentloaded', timeout: milliseconds({ seconds: 30 }) });

  const dimensions = await page.evaluate(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });
  page.setViewport({ width: 1020, height: dimensions.height });

  log('Пробую открыть режим чтения (читатель)...');
  const openReaderSelectors = [
    'a[href*="/reader/"]',
    'a:has-text("Читать")',
    'button:has-text("Читать")',
    '[data-testid*="read"]',
    '[class*="read"] a',
    '[class*="read"] button',
  ];

  let readerOpened = false;
  for (const selector of openReaderSelectors) {
    try {
      const el = await page.$(selector);
      if (isNil(el)) {
        continue;
      }

      if (await el.isVisible()) {
        await el.scrollIntoView();
        await sleep(250);
        await el.click();
        readerOpened = true;
        log(`Найден элемент для открытия чтения: ${selector}`);
        break;
      }
    } catch (err) {
      continue;
    }
  }

  if (!readerOpened) {
    try {
      const parsed = new URL(bookLink);
      const pathParts = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/');
      if (pathParts.length >= 2 && pathParts[0] === 'books') {
        const bookId = pathParts[1];
        const readerUrl = `https://books.yandex.ru/reader/${bookId}?resource=book`;

        log(`Пытаюсь открыть ридер по URL: ${readerUrl}`);
        await page.goto(readerUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        readerOpened = true;
      }
    } catch (err) {
      throw new Error(`⚠ Не удалось открыть ридер по URL`);
    }
  }
}
