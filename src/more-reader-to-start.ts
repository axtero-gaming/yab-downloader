import { Page } from 'puppeteer';
import { sleep } from './utils';
import { isNil } from 'lodash-es';

/**
 * Переводит книгу в 0ю страницу.
 */
export async function moveReaderToStart(page: Page) {
  try {
    await sleep(1500);

    for (let attempt = 1; attempt <= 4; attempt++) {
      const viewport = page.viewport() || { width: 1020, height: 1080 };
      await page.mouse.move(viewport.width * 0.5, viewport.height * 0.9, { steps: 6 });
      await sleep(200);
      await page.mouse.click(viewport.width * 0.5, viewport.height * 0.95);
      await sleep(200);
    }

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

    const sliderLeftX = sliderRect.x + 1;
    const sliderMidY = sliderRect.y + sliderRect.height / 2;

    await page.mouse.click(sliderLeftX, sliderMidY);
    await sleep(200);
    await page.mouse.move(sliderLeftX + Math.floor(sliderRect.width * 0.3), sliderMidY, { steps: 3 });
    await sleep(400);
    await page.mouse.down();
    await sleep(200);
    await page.mouse.move(sliderLeftX, sliderMidY, { steps: 5 });
    await sleep(400);
    await page.mouse.up();
    await sleep(200);
  } catch (err) {
    // Игнорируем ошибки
  }
}
