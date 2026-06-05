import { create } from 'xmlbuilder2';
import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import { format } from 'date-fns';
import { isEmpty, isNil } from 'lodash-es';
import { BookInfo, BookPage } from '../shared/types';
import { convertPagesToFBBlocks } from './yb-to-fb2-parser';
import { HTMLElement, Node, NodeType } from 'node-html-parser';

/**
 * Собирает title-info секцию FB2 книги.
 */
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

/**
 * Собирает document-info секцию FB2 книги.
 */
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
 * Собирает publish-info секцию FB2 книги.
 */
async function buildPublishInfo(descriptionEl: XMLBuilder, bookInfo: BookInfo) {
  const publishInfoEl = descriptionEl.ele('publish-info');

  publishInfoEl.ele('book-name').txt(bookInfo.title);

  const publishers = bookInfo.publishers
    .reduce((acc, publisher) => {
      acc.push(publisher.name);
      return acc;
    }, [] as string[])
    .join(`, `);
  publishInfoEl.ele('publisher').txt(publishers);

  const publicationDate = new Date(bookInfo.publication_date * 1000);
  publishInfoEl.ele('year').txt(format(publicationDate, 'yyyy'));
}

/**
 * Собирает publish-info секцию FB2 книги.
 */
async function buildPages(bookEl: XMLBuilder, pages: BookPage[]) {
  const blocks = convertPagesToFBBlocks(pages);

  for (const block of blocks) {
    const bodyEl = bookEl.ele('body');
    if (!isNil(block.title) && !isEmpty(block.title)) {
      insertHTMLForFB2(bodyEl.ele('title'), block.title);
    }

    for (const segment of block.segments) {
      const sectionEl = bodyEl.ele('section');
      if (!isNil(segment.title) && !isEmpty(segment.title)) {
        insertHTMLForFB2(sectionEl.ele('title'), segment.title);
      }

      if (!isNil(segment.epigraph)) {
        const epigraphEl = sectionEl.ele('epigraph');
        epigraphEl.ele('p').txt(segment.epigraph.text);
        if (!isNil(segment.epigraph.author)) {
          epigraphEl.ele('text-author').txt(segment.epigraph.author);
        }
      }

      if (!isNil(segment.annotation) && !isEmpty(segment.annotation)) {
        const annotationEl = sectionEl.ele('annotation');
        for (const contentEl of segment.annotation) {
          insertHTMLForFB2(annotationEl, contentEl);
        }
      }

      for (const contentEl of segment.content) {
        insertHTMLForFB2(sectionEl, contentEl);
      }
    }
  }
}

function insertHTMLForFB2(xmlEl: XMLBuilder, nodeEl: Node | HTMLElement) {
  if (nodeEl.nodeType === NodeType.TEXT_NODE) {
    const text = (nodeEl.textContent || '')?.trim();
    if (!isEmpty(text)) {
      xmlEl.txt(text);
    }
    return;
  }

  const xmlElementMap = {
    strong: 'strong',
    b: 'strong',
    p: 'p',
    h1: 'p',
    h2: 'p',
    h3: 'p',
    h4: 'subtitle',
    h5: 'subtitle',
    i: 'emphasis',
    blockquote: 'cite',
  };

  if (nodeEl instanceof HTMLElement) {
    const tagName = nodeEl.tagName.toLowerCase();
    if (tagName === 'br') {
      xmlEl.ele('empty-line');
      return;
    }

    if (['a', 'div'].includes(tagName)) {
      for (const el of nodeEl.childNodes) {
        insertHTMLForFB2(xmlEl, el);
      }
      return;
    }

    if (tagName in xmlElementMap) {
      const value = xmlElementMap[tagName as keyof typeof xmlElementMap];
      const rootEl = xmlEl.ele(value);
      for (const el of nodeEl.childNodes) {
        insertHTMLForFB2(rootEl, el);
      }
      return;
    }

    console.log(`---- SKIPPED TAGS`, tagName);
  }
}

/**
 * Собирает FB2 книгу
 */
export async function buildFB2Book(bookInfo: BookInfo, pages: BookPage[]) {
  const bookEl = create({ encoding: 'utf-8' }).ele('FictionBook', {
    xmlns: 'http://www.gribuser.ru/xml/fictionbook/2.0',
    'xmlns:l': 'http://www.w3.org/1999/xlink',
  });

  const descriptionEl = bookEl.ele('description');
  await buildTitleInfo(descriptionEl, bookInfo);
  await buildDocumentInfo(descriptionEl, bookInfo);
  await buildPublishInfo(descriptionEl, bookInfo);

  await buildPages(bookEl, pages);

  return bookEl.end({ prettyPrint: true });
}
