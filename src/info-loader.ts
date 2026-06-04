import { Page } from 'puppeteer';
import { isNil } from 'lodash-es';
import { loadBase64Image, saveBase64Image, saveContentToFile } from './utils/book.utils';
import { log, sleep } from './utils/utils';
import { BookInfo } from './shared/types';

/**
 * По-этапно выгружает содержимое книги.
 */
export async function loadBookInfo(bookId: string, page: Page) {
  log(`Выгрузка информации о книге (${bookId})...`);
  await sleep(200);
  const bookInfo: BookInfo | null | undefined = await page.evaluate(async (bookId) => {
    try {
      const response = await fetch(`/node-api/p/api/v5/books/${bookId}?lang=ru`);
      const result = await response.json();
      return result?.book;
    } catch (error) {
      return null;
    }
  }, bookId);

  if (isNil(bookInfo)) {
    return;
  }

  log(`Сохранение информации о книге...`);
  await saveContentToFile(bookId, 'info.json', JSON.stringify(bookInfo, null, 2));

  if (!isNil(bookInfo.cover?.large)) {
    log(`Выгрузка большой обложки...`);
    await sleep(200);
    const largeCoverImgBase64 = await loadBase64Image(page, bookInfo.cover.large);
    if (!isNil(largeCoverImgBase64)) {
      log(`Сохранение большой обложки...`);
      await saveBase64Image(bookId, largeCoverImgBase64, `large-cover`, false);
    }
  }

  if (!isNil(bookInfo.cover?.small)) {
    log(`Выгрузка малой обложки...`);
    await sleep(200);
    const smallCoverImgBase64 = await loadBase64Image(page, bookInfo.cover.small);
    if (!isNil(smallCoverImgBase64)) {
      log(`Сохранение малой обложки...`);
      await saveBase64Image(bookId, smallCoverImgBase64, `small-cover`, false);
    }
  }
}
