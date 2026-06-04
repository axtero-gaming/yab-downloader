import { Browser, Page } from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

import { DurationWithMilliseconds, getDurationMs, log, sleep } from './utils';

// Функция сохранения куки
export async function saveCookies(browser: Browser, fileName: string) {
  const filePath = path.resolve(path.dirname(`.`), fileName);
  const cookies = await browser.cookies();
  fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
  log(`✅ Сохранено ${cookies.length} куки`);
}

// Функция загрузки куки
export async function loadCookies(browser: Browser, fileName: string) {
  const filePath = path.resolve(path.dirname(`.`), fileName);
  if (fs.existsSync(filePath)) {
    const cookies = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    await browser.setCookie(...cookies);
    log(`✅ Загружено ${cookies.length} куки`);
  }
}

export async function waitForContentLoading(page: Page, duration: DurationWithMilliseconds) {
  try {
    await page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: getDurationMs(duration),
    });
  } catch (err) {
    await sleep(1000);
  }
}
