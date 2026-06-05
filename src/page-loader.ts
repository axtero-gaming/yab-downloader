import { Page } from 'puppeteer';
import { getRandom, log, sleep } from './utils/utils';
import { waitForContentLoading } from './utils/browser.utils';
import { isNil } from 'lodash-es';
import { openSliderPanel } from './more-reader-to-start';
import { BookPage, Footnote } from './shared/types';
import { loadBase64Image, saveBase64Image, saveContentToFile } from './utils/book.utils';

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
    log(`Переход на следующую страницу. Нажатие на точную кнопку`);
    await page.evaluate(async (el) => {
      el.click();
    }, exactButton);
    clicked = true;
  }

  if (!clicked) {
    log(`Переход на следующую страницу. Нажатие на общую кнопку`);
    const genericButton = await page.$('div[class*="Pagination_pagination_forward"]');
    if (genericButton) {
      await page.evaluate(async (el) => {
        el.click();
      }, genericButton);
      clicked = true;
    }
  }

  if (!clicked) {
    log(`Переход на следующую страницу. Нажатие на по координатам`);
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

    // FYI: Если надо ограничить кол-во выгружаемых страниц.
    // if (lastPagination.page > 2) {
    //   break;
    // }

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

    const imgBase64 = await loadBase64Image(page, imgSrc);

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
