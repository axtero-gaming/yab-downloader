import { create } from 'xmlbuilder2';
import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import { format } from 'date-fns';
import { BookInfo, BookPage } from '../shared/types';

async function buildTitleInfo(descriptionEl: XMLBuilder, bookInfo: BookInfo) {
  const titleInfoEl = descriptionEl.ele('title-info');

  for (const author of bookInfo.authors_objects) {
    const authorEl = titleInfoEl.ele('author');
    authorEl.ele('nickname').txt(author.name);
  }

  titleInfoEl.ele('book-title').txt(bookInfo.title);
  titleInfoEl.ele('annotation').ele('p').txt(bookInfo.annotation);

  // Дата публикации
  const publicationDate = new Date(bookInfo.publication_date * 1000);
  titleInfoEl.ele('date', { value: format(publicationDate, 'yyyy-MM-dd') }).txt(format(publicationDate, 'yyyy'));

  // Обложка
  const coverFormat = bookInfo.cover.large.split('?')[0].split('.').slice(-1);
  titleInfoEl.ele('coverpage').ele('image', { 'l:href': `#cover.${coverFormat}` });

  titleInfoEl.ele('lang').txt(bookInfo.language);
  titleInfoEl.ele('src-lang').txt(bookInfo.language);
}

async function buildDocumentInfo(descriptionEl: XMLBuilder, bookInfo: BookInfo) {
  const documentInfoEl = descriptionEl.ele('document-info');

  for (const author of bookInfo.authors_objects) {
    const authorEl = documentInfoEl.ele('author');
    authorEl.ele('nickname').txt(author.name);
  }

  // Дата создания документа
  const createdAt = format(new Date(), 'yyyy-MM-dd');
  documentInfoEl.ele('date', { value: createdAt }).txt(createdAt);

  documentInfoEl.ele('id').txt(`${bookInfo.uuid}-${bookInfo.publication_date}`);

  documentInfoEl.ele('version').txt(`1.0`);
}

/**
 * Собирает FB2 книгу
 */
export async function buildFB2Book(bookInfo: BookInfo, pages: BookPage[]) {
  const bookEl = create({ encoding: 'utf-8' }).ele('FictionBook', {
    xmlns: 'http://www.gribuser.ru/xml/fictionbook/2.0',
    'xmlns:l': 'http://www.w3.org/1999/xlink',
  });

  const descriptionEl = bookEl.root().ele('description');
  await buildTitleInfo(descriptionEl, bookInfo);
  await buildDocumentInfo(descriptionEl, bookInfo);

  return bookEl.end({ prettyPrint: true });
}
