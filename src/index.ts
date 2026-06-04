import { milliseconds } from 'date-fns';
import puppeteer from 'puppeteer';
import { isEmpty } from 'lodash-es';
import path from 'node:path';

import { log, sleep } from './utils';
import { waitForAuth } from './auth';
import { openReader } from './open-reader';
import { moveReaderToStart } from './more-reader-to-start';
import { loadCookies, saveCookies } from './browser.utils';
import { loadBookPages } from './page-loader';

const COOKIES_FILE_NAME = 'cookies_session.json';

// Launch the browser and open a new blank page.
log(`Запуск браузера`);
const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: null,
  args: ['--disable-blink-features=AutomationControlled'],
});

// Восстанавливаем куки
await loadCookies(browser, COOKIES_FILE_NAME);

const [page] = await browser.pages();
page.on('close', async () => {
  const pages = await browser.pages();
  if (isEmpty(pages)) {
    console.log('Браузер был закрыт (пользователем или программно)');
    process.exit(0);
  }
});

// Получение ссылки на страницу с книгой
const filePath = path.resolve(path.dirname(`.`), 'entry.html');
await page.goto(`file://${filePath}`);
// const bookLink = await waitForBookLink(context, page);
const bookLink = `https://books.yandex.ru/books/V2Lfcler`;

// Навигация на главную страницу каталога (для проверки авторизации)
log(`Открываю главную страницу Yandex Books для авторизации`);
await page.goto('https://books.yandex.ru/', { waitUntil: 'domcontentloaded', timeout: milliseconds({ seconds: 30 }) });

// Ожидание авторизации (пока юзер сам прокликает флоу)
const userIsAuthorized = await waitForAuth(browser, page);
if (!userIsAuthorized) {
  throw new Error(`⚠ Не удалось подтвердить авторизацию`);
}
await saveCookies(browser, COOKIES_FILE_NAME);

// Открытие книги
await openReader(bookLink, page);
await browser.waitForTarget((target) => target.url().startsWith('https://books.yandex.ru/reader'));
await sleep({ seconds: 1 });

const bookId = bookLink.split('/').slice(-1)[0];

// Установка ридера в 0ю страницу.
await moveReaderToStart(page);

await loadBookPages(bookId, page);

log(`Закрытие браузера`);
await browser.close();
