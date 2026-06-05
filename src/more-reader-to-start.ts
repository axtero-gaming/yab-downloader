import { Page } from 'puppeteer';
import { getRandom, log, sleep } from './utils/utils';
import { isNil } from 'lodash-es';

/**
 * Открывает панель с слайдером, если она закрыта.
 */
export async function openSliderPanel(page: Page) {
  const viewport = page.viewport() || { width: 1920, height: 1080 };

  const randomXCoeff = getRandom(0.4, 0.6);
  const randomYCoeff = getRandom(0.9, 0.91);
  await page.mouse.move(viewport.width * randomXCoeff, viewport.height * randomYCoeff, { steps: 6 });
  await sleep(200);
  await page.mouse.click(viewport.width * 0.5, viewport.height * 0.95);
  await sleep(200);
}

/**
 * Переводит книгу в 0ю страницу.
 */
export async function moveReaderToStart(page: Page) {
  try {
    log('Переход на первую страницу книги');
    await sleep(1500);

    await openSliderPanel(page);

    await page.waitForSelector('[data-e2e="progress.slider"]');
    const sliderRect: DOMRect = await page.evaluate(async () => {
      const slider = document.querySelector('[data-e2e="progress.slider"]');
      if (slider) {
        const sliderRect = slider.getBoundingClientRect();
        return JSON.parse(JSON.stringify(sliderRect));
      }
    });

    if (isNil(sliderRect)) {
      throw new Error(`❌ Не удалось выставить прогресс в 0 для этой книги`);
    }

    const sliderLeftX = sliderRect.x;
    const sliderMidY = sliderRect.y + sliderRect.height / 2;

    await page.mouse.click(sliderLeftX, sliderMidY);
    await sleep(1000);
    await page.mouse.move(sliderLeftX + Math.floor(sliderRect.width * 0.3), sliderMidY, { steps: 3 });
    await sleep(400);
    await page.mouse.down();
    await sleep(2000);
    await page.mouse.move(sliderLeftX, sliderMidY, { steps: 5 });
    await sleep(400);
    await page.mouse.up();
    await sleep(200);
  } catch (err) {
    // Игнорируем ошибки
  }
}
