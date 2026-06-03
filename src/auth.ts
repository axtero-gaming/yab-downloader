import { Browser, Page } from 'puppeteer';
import { milliseconds } from 'date-fns';

import { log, sleep } from './utils';

const AUTH_TIMEOUT = milliseconds({ minutes: 5 });

export async function checkAuth(browser: Browser, page: Page) {
  const cookies = await browser.cookies();

  let hasSession = false;
  for (const cookie of cookies) {
    const cookieName = cookie.name.toLowerCase();
    const cookieValue = cookie.value;
    if (cookieName.includes('session_id') || cookieName.includes('sessionid')) {
      if (cookieValue && cookieValue.length > 20) {
        hasSession = true;
        break;
      }
    }
    if (cookieName.includes('yandex_login') || cookieName.includes('login')) {
      if (cookieValue && cookieValue.length > 0) {
        hasSession = true;
        break;
      }
    }
  }

  if (!hasSession) return false;

  const loginButtons = await page.$$('a, button, [role="button"]');
  for (const btn of loginButtons) {
    const text = await page.evaluate((el) => (el as HTMLButtonElement).innerText, btn);
    const href = await page.evaluate((el) => el.getAttribute('href'), btn);

    const loweredText = (text || '').toLowerCase();

    if (loweredText.includes('войти') || loweredText.includes('вход') || loweredText.includes('login')) {
      if (href && (href.includes('passport') || href.includes('auth'))) {
        return false;
      }
    }
  }

  return true;
}

export async function waitForAuth(browser: Browser, page: Page) {
  log(`Проверка авторизации`);
  await sleep({ seconds: 2 });

  if (await checkAuth(browser, page)) {
    log(`✓ Вы уже авторизованы`);
    return true;
  }
  log(`Ожидание авторизации`);

  const startTime = Date.now();
  let checkCount = 0;

  while (Date.now() - startTime < AUTH_TIMEOUT) {
    await sleep({ milliseconds: 1500 });
    checkCount++;

    if (await checkAuth(browser, page)) {
      log('✓ Авторизация успешна!');
      return true;
    }

    if (checkCount % 10 === 0) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      log(`Ожидание авторизации... (${elapsed} сек)`);
    }
  }

  log('⚠ Таймаут ожидания авторизации');
  return false;
}
