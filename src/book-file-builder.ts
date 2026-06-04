import fs from 'node:fs/promises';
import path from 'node:path';
import { EPub } from 'epub-gen-memory';
import { log } from './utils/utils';
import { BookInfo, BookPage } from './shared/types';
import { buildBookFolderPath } from './utils/book.utils';

/**
 * По-этапно выгружает содержимое книги.
 */
export async function buildHTMLBookFile(bookId: string, pages: BookPage[]) {
  const bookPath = buildBookFolderPath(bookId);
  const filePath = path.resolve(bookPath, `book.html`);
  log(`Сохранение содержимого в HTML файл:`, filePath);

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

  await fs.mkdir(bookPath, { recursive: true });
  await fs.writeFile(filePath, htmlContent, 'utf8');
}

/**
 * По-этапно выгружает содержимое книги.
 */
export async function buildEpubBookFile(bookId: string, pages: BookPage[], bookInfo?: BookInfo) {
  const bookPath = buildBookFolderPath(bookId);
  const largeCoverFilePath = path.resolve(bookPath, 'large-cover.jpeg');
  const epubFilePath = path.resolve(bookPath, 'book.epub');
  log(`Сохранение содержимого в EPUB файл:`, epubFilePath);

  const epub = new EPub(
    {
      title: bookInfo?.title ?? '',
      description: bookInfo?.annotation,
      author: bookInfo?.authors,
      publisher: bookInfo?.publishers?.[0]?.name,
      cover: `file://${largeCoverFilePath}`,
    },
    pages.map((page) => {
      return {
        title: '',
        content: page.content,
      };
    }),
  );

  const result = await epub.genEpub();

  await fs.writeFile(epubFilePath, Buffer.from(result));
}
