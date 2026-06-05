import fs from 'node:fs/promises';
import path from 'node:path';
import { BookInfo, BookPage } from './shared/types';
import { buildBookFolderPath } from './utils/book.utils';
import { buildFB2BookFile } from './book-file-builder';

const bookId = `V2Lfcler`;
const bookPath = buildBookFolderPath(bookId);
const pagesFilePath = path.resolve(bookPath, 'pages.json');
const pages: BookPage[] = JSON.parse(await fs.readFile(pagesFilePath, 'utf8'));
const infoFilePath = path.resolve(bookPath, 'info.json');
const bookInfo: BookInfo = JSON.parse(await fs.readFile(infoFilePath, 'utf8'));

await buildFB2BookFile(bookId, pages, bookInfo);
