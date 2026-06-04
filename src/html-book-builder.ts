import { log } from './utils';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BookPage } from './shared/types';

/**
 * Сохраняет содержимое файла в папку книги.
 */
async function saveContentToFile(bookId: string, fileName: string, content: string) {
  const bookPath = path.resolve(path.dirname(`.`), 'downloads', bookId);
  const filePath = path.resolve(bookPath, fileName);
  await fs.mkdir(bookPath, { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

/**
 * По-этапно выгружает содержимое книги.
 */
export async function buildHTMLBookFile(bookId: string, pages: BookPage[]) {
  log(`Сохранение содержимого в HTML файл.`);
  const styleFilePath = path.resolve(path.dirname(`.`), 'book.css');
  const styleFile = await fs.readFile(styleFilePath);

  const bookContent = pages.reduce((acc, page) => {
    return acc + page.content;
  }, '');

  const htmlContent = `
  <html lang="ru">
    <head>
      <style>
        ${styleFile}
      </style>
    </head>
    <body class="bookContent">${bookContent}</body>
  </html>
  `;

  await saveContentToFile(bookId, `book.html`, htmlContent);
}
