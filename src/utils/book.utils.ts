import { isNil } from 'lodash-es';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Page } from 'puppeteer';

/**
 * Собирает путь к папке книги.
 */
export function buildBookFolderPath(bookId: string) {
  const bookPath = path.resolve(path.dirname(`.`), 'downloads', bookId);
  return bookPath;
}

/**
 * Сохраняет содержимое файла в папку книги.
 */
export async function saveContentToFile(bookId: string, fileName: string, content: string) {
  const bookPath = buildBookFolderPath(bookId);
  const filePath = path.resolve(bookPath, fileName);
  await fs.mkdir(bookPath, { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

/**
 * Переводит изображения в Base64 формате в файл.
 */
export async function saveBase64Image(bookId: string, base64Image: string, fileName: string, inSubfolder = true) {
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

  const bookPath = buildBookFolderPath(bookId);
  const bookImagesPath = inSubfolder ? path.resolve(bookPath, 'images') : bookPath;
  const filePath = path.resolve(bookImagesPath, `${fileName}.${imageType}`);

  // Сохраняем с правильным расширением
  await fs.mkdir(bookImagesPath, { recursive: true });
  await fs.writeFile(filePath, imageBuffer);
  console.log(`Изображение сохранено как: ${filePath}`);
  return filePath;
}

/**
 * Выгружает изображение по указанном пути в контексте страницы в Base64 формате.
 */
export async function loadBase64Image(page: Page, imgSrc: string | null | undefined) {
  if (isNil(imgSrc)) {
    return;
  }

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

  return imgBase64;
}
