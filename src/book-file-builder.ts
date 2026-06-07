import fs from 'node:fs/promises';
import path from 'node:path';
import { EPub } from 'epub-gen-memory';
import { log } from './utils/utils';
import { BookInfo, BookPage } from './shared/types';
import { buildBookFolderPath } from './utils/book.utils';
import { buildFB2Book } from './fb2-builder/fb2-book-bulder';

/**
 * Создаёт HTML книгу и сохраняет на диск.
 */
export async function buildHTMLBookFile(bookId: string, pages: BookPage[], bookInfo: BookInfo) {
  const bookPath = buildBookFolderPath(bookId);
  const bookFilesFolder = path.resolve(bookPath, 'books');
  const filePath = path.resolve(bookFilesFolder, `${bookInfo.title}.html`);
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

  await fs.mkdir(bookFilesFolder, { recursive: true });
  await fs.writeFile(filePath, htmlContent, 'utf8');
}

/**
 * Создаёт EPUB книгу и сохраняет на диск.
 */
export async function buildEpubBookFile(bookId: string, pages: BookPage[], bookInfo: BookInfo) {
  const bookPath = buildBookFolderPath(bookId);
  const bookFilesFolder = path.resolve(bookPath, 'books');
  const epubFilePath = path.resolve(bookFilesFolder, `${bookInfo.title}.epub`);
  const largeCoverFilePath = path.resolve(bookPath, 'large-cover.jpeg');
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

  await fs.mkdir(bookFilesFolder, { recursive: true });
  await fs.writeFile(epubFilePath, Buffer.from(result));
}

/**
 * Создаёт FB2 книгу и сохраняет на диск.
 */
export async function buildFB2BookFile(bookId: string, pages: BookPage[], bookInfo: BookInfo) {
  const bookPath = buildBookFolderPath(bookId);
  const bookFilesFolder = path.resolve(bookPath, 'books');
  const fb2FilePath = path.resolve(bookFilesFolder, `${bookInfo.title}.fb2`);
  log(`Сохранение содержимого в FB2 файл:`, fb2FilePath);

  const fb2Book = await buildFB2Book(bookId, bookInfo, pages);

  await fs.mkdir(bookFilesFolder, { recursive: true });
  await fs.writeFile(fb2FilePath, fb2Book, 'utf8');
}
