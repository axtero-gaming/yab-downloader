import fs from 'node:fs/promises';
import path from 'node:path';
import epub from 'epub-gen-memory';
import { BookPage } from './shared/types';
import { buildBookFolderPath } from './utils/book.utils';

const bookPath = buildBookFolderPath(`V2Lfcler`);
const filePath = path.resolve(bookPath, 'pages.json');
const pages: BookPage[] = JSON.parse(await fs.readFile(filePath, 'utf8'));

// const bookContent = pages.reduce((acc, page) => {
//   return acc + page.content;
// }, '');

// const htmlContent = `
//   <html lang="ru">
//     <head>
//       <style>
//         ${styleFile}
//       </style>
//     </head>
//     <body class="bookContent">${bookContent}</body>
//   </html>
//   `;

const result = await (epub as any).default(
  { title: '' },
  pages.map((page) => {
    return {
      title: '',
      content: page.content,
    };
  }),
);

const epubFilePath = path.resolve(bookPath, 'book.epub');
await fs.writeFile(epubFilePath, Buffer.from(result));

// console.log(`---- pages`, pages);
