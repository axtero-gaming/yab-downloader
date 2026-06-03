import { BrowserContext, Page } from 'puppeteer';
import { milliseconds } from 'date-fns';
import { isNil } from 'lodash-es';

import { log, sleep } from './utils';

/**
 * Получение ссылки из элемента ввода.
 */
async function getBookLink(context: BrowserContext, page: Page) {
  const bookLinkEl = await page.$('input#bookLink');
  if (isNil(bookLinkEl)) {
    throw new Error(`Поле ввода для ссылки на книгу не найдено`);
  }

  const bookLink = await page.evaluate((el) => el.value, bookLinkEl);
  if (bookLink.startsWith('https://books.yandex.ru/books/')) {
    return bookLink;
  }
}

/**
 * Ожидание ссылки из элемента ввода.
 */
export async function waitForBookLink(context: BrowserContext, page: Page) {
  log(`Ожидание ссылки на книгу`);

  const BOOK_LINK_TIMEOUT = milliseconds({ minutes: 10 });
  const startTime = Date.now();
  let checkCount = 0;

  while (Date.now() - startTime < BOOK_LINK_TIMEOUT) {
    await sleep({ milliseconds: 300 });
    checkCount++;

    const bookLink = await getBookLink(context, page);
    if (!isNil(bookLink)) {
      log('✓ Ссылка на книгу получена:', bookLink);
      return bookLink;
    }

    if (checkCount % 10 === 0) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      log(`Ожидание ссылки... (${elapsed} сек)`);
    }
  }

  throw new Error(`Таймаут ожидания ссылки на страницу книги`);
}
