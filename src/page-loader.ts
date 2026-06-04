import { Page } from 'puppeteer';
import { buildBookFolderPath, getRandom, log, sleep } from './utils';
import { waitForContentLoading } from './browser.utils';
import { isNil } from 'lodash-es';
import fs from 'node:fs/promises';
import path from 'node:path';
import { openSliderPanel } from './more-reader-to-start';
import { BookPage, Footnote } from './shared/types';

let imageIndex = 0;

/**
 * Получает информацию о странице.
 */
export async function getPaginationDescriptor(page: Page) {
  const paginationDescriptor: BookPage | null = await page.evaluate(() => {
    const pageContainerEl = document.querySelector<HTMLDivElement>('div#TEXTS_CONTAINER_WRAPPER');
    if (!pageContainerEl) {
      return null;
    }

    const contentContainerEl = pageContainerEl.querySelector<HTMLElement>('r-chapter-horizontal');
    if (!contentContainerEl) {
      return null;
    }

    const imgTags = contentContainerEl.querySelectorAll('img');
    const images = [...imgTags].map((imgTags) => {
      return imgTags.getAttribute('src') || '';
    });

    const footnotes: Footnote[] = [];
    const footnoteEls = contentContainerEl.querySelectorAll<HTMLElement>('.footnote-content');
    for (const footnoteEl of footnoteEls ?? []) {
      footnotes.push({
        id: footnoteEl.id,
        text: footnoteEl.innerText.trim(),
      });
    }

    const contentEl = contentContainerEl.cloneNode(true) as HTMLElement;
    const footnotesEl = contentEl.querySelector('.footnotes');
    if (footnotesEl) {
      footnotesEl.remove();
    }

    return {
      id: contentContainerEl.id,
      page: Number(contentContainerEl.dataset.pageIndex),
      transform: pageContainerEl.style.transform,
      content: contentEl?.innerHTML ?? '',
      footnotes,
      images: images.filter(Boolean),
    };
  });

  return paginationDescriptor || null;
}

/**
 * Переключает страницу на следующую.
 */
export async function clickNextPage(page: Page) {
  // Запутывание бан-системы
  const viewport = page.viewport() || { width: 1920, height: 1080 };
  const randomXCoeff = getRandom(0.4, 0.6);
  const randomYCoeff = getRandom(0.4, 0.6);
  await page.mouse.move(viewport.width * randomXCoeff, viewport.height * randomYCoeff, { steps: 7 });
  await sleep(350);
  await page.mouse.down();
  await sleep(150);
  await page.mouse.up();
  await sleep(200);
  await openSliderPanel(page);
  await sleep(400);

  // Перемещаем указатель на кнопку следующей страницы.
  await page.mouse.move(viewport.width - 5, viewport.height * 0.4, { steps: 7 });
  await sleep(450);

  let clicked = false;
  const exactButton = await page.$('div.Pagination_pagination_forward__AENcl');
  if (exactButton) {
    await page.evaluate(async (el) => {
      el.click();
    }, exactButton);

    await exactButton.click();
    clicked = true;
  }

  if (!clicked) {
    const genericButton = await page.$('div[class*="Pagination_pagination_forward"]');
    if (genericButton) {
      await page.evaluate(async (el) => {
        el.click();
      }, genericButton);
      await genericButton.click();
      clicked = true;
    }
  }

  if (!clicked) {
    const x = viewport.width * 0.92;
    const y = viewport.height * 0.5;
    await page.mouse.click(x, y);
    clicked = true;
  }

  await waitForContentLoading(page, { seconds: 2.5 });
  await sleep(2500);

  // Эмуляция попытки скрллинга страницы после выгрузки
  await page.evaluate(() => {
    window.scrollBy(0, 133);
    window.scrollTo(0, 0);
  });
  await sleep(500);
}

/**
 * Сохраняет содержимое файла в папку книги.
 */
async function saveContentToFile(bookId: string, fileName: string, content: string) {
  const bookPath = buildBookFolderPath(bookId);
  const filePath = path.resolve(bookPath, fileName);
  await fs.mkdir(bookPath, { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

/**
 * Переводит изображения в Base64 формате в файл.
 */
async function saveBase64Image(bookId: string, base64Image: string, fileName: string) {
  // Удаляем префикс и получаем тип файла
  const matches = base64Image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (isNil(matches)) {
    console.log(`Неопознанный формат изображения`);
    return;
  }

  const imageType = matches[1]; // 'jpeg', 'png', 'gif' и т.д.
  const base64Data = matches[2];

  // Конвертируем в Buffer
  const imageBuffer = Buffer.from(base64Data, 'base64');

  const bookImagesPath = path.resolve(buildBookFolderPath(bookId), 'images');
  const filePath = path.resolve(bookImagesPath, `${fileName}.${imageType}`);

  // Сохраняем с правильным расширением
  await fs.mkdir(bookImagesPath, { recursive: true });
  await fs.writeFile(filePath, imageBuffer);
  console.log(`Изображение сохранено как: ${filePath}`);
  return filePath;
}

/**
 * По-этапно выгружает содержимое книги.
 */
export async function loadBookPages(bookId: string, page: Page) {
  let lastPagination = await getPaginationDescriptor(page);
  if (isNil(lastPagination)) {
    return;
  }

  const imagesSet = new Set<string>();
  const pages = [];

  const loadedPagesSet = new Map<string, string>();
  while (true) {
    // Сохраняем новый контент
    if (!loadedPagesSet.has(lastPagination.id)) {
      pages.push(lastPagination);

      for (const imgSrc of lastPagination.images) {
        imagesSet.add(imgSrc);
      }

      loadedPagesSet.set(lastPagination.id, lastPagination.content);
    }

    if (lastPagination.page > 2) {
      break;
    }

    // Переходим на следующую страницу
    await clickNextPage(page);

    log(`Чтение информации со страницы...`);
    const nextPaginationDescriptor = await getPaginationDescriptor(page);

    if (isNil(nextPaginationDescriptor)) {
      throw new Error(`❌ Не удалось получить информацию о странице`);
    }
    log(
      `Получен блок данных.`,
      `ID: ${nextPaginationDescriptor.id},`,
      `Страница: ${nextPaginationDescriptor.page},`,
      `Позиция: ${nextPaginationDescriptor.transform}`,
    );

    if (
      nextPaginationDescriptor.id === lastPagination.id &&
      nextPaginationDescriptor.transform === lastPagination.transform
    ) {
      log(`Достигнут конец книги. Завершение парсинга.`);
      break;
    } else {
      // Конец не достигнут, переходим к следующему этапу
      lastPagination = nextPaginationDescriptor;
    }
  }

  log(`Перевод ссылок в base64.`);
  const images = [...imagesSet];
  for (const imgSrc of images) {
    log(`Перевод ссылки в base64: ${imgSrc}`);

    await sleep(200);

    const imgBase64 = await page.evaluate(async (imgSrc) => {
      try {
        const response = await fetch(imgSrc);
        const blob = await response.blob();

        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Ошибка:', error);
      }
    }, imgSrc);

    if (!isNil(imgBase64)) {
      const imagePath = await saveBase64Image(bookId, imgBase64, `img-${imageIndex++}`);
      for (const page of pages) {
        if (!isNil(imagePath)) {
          page.content = `${page.content}`.replace(imgSrc, `file://${imagePath}`);
        }
        page.contentWithBase64 = `${page.content}`.replace(imgSrc, imgBase64);
      }
    }
  }

  log(`Сохранение страниц книги в JSON файл.`);
  await saveContentToFile(bookId, `pages.json`, JSON.stringify(pages, null, 2));
  return pages;
}
