import { Browser } from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

// Функция сохранения куки
export async function saveCookies(browser: Browser, fileName: string) {
  const filePath = path.resolve(path.dirname(`.`), fileName);
  const cookies = await browser.cookies();
  fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
  console.log(`✅ Сохранено ${cookies.length} куки`);
}

// Функция загрузки куки
export async function loadCookies(browser: Browser, fileName: string) {
  const filePath = path.resolve(path.dirname(`.`), fileName);
  if (fs.existsSync(filePath)) {
    const cookies = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    await browser.setCookie(...cookies);
    console.log(`✅ Загружено ${cookies.length} куки`);
  }
}
