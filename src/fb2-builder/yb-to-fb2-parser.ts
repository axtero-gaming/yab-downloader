import { HTMLElement, NodeType, parse } from 'node-html-parser';
import { isNil } from 'lodash-es';

import { BookPage } from '../shared/types';
import { BookBlock, BookBlockSegment, BookEpigraph } from './shared/types';

/**
 * Собирает publish-info секцию FB2 книги.
 */
export function convertPagesToFBBlocks(pages: BookPage[]) {
  const bookContent = pages.reduce((acc, page) => {
    return acc + page.content;
  }, '');

  const parsedHTMLBook = parse(`<html><body>${bookContent}</body></html>`);
  const contentContainers = parsedHTMLBook.querySelectorAll('.content-container');

  let bookEls: HTMLElement[] = [];
  for (const contentContainer of contentContainers) {
    if (contentContainer.classList.length === 1 && contentContainer.tagName !== 'H1') {
      const imgTag = contentContainer.querySelector('img');

      if (!isNil(imgTag)) {
        imgTag.classList.add(`block-image`);
        bookEls.push(imgTag);
      }
      continue;
    }

    if (contentContainer.tagName === `H1`) {
      contentContainer.classList.add(`block-title`);
      bookEls.push(contentContainer);
      continue;
    }

    if (contentContainer.classList.contains('section1') || contentContainer.classList.contains('hsection1')) {
      const childEls = (contentContainer.childNodes as HTMLElement[]).map((el) => {
        if (el.tagName !== 'DIV') {
          return el;
        }

        const imgEl = el.querySelector('img');
        if (!isNil(imgEl)) {
          return imgEl;
        } else {
          return el;
        }
      });
      bookEls = [...bookEls, ...childEls];
    }
  }

  const blocks: BookBlock[] = [];
  let lastBlock: BookBlock | null = null;
  let lastSegment: BookBlockSegment | null = null;

  let segmentContentWas = false;
  for (const bookEl of bookEls) {
    if (bookEl.nodeType === NodeType.TEXT_NODE) {
      continue;
    }

    // Если встречает блок-заголовок - создаём новый блок
    if (bookEl.tagName === 'H1' && bookEl.classList.contains(`block-title`)) {
      lastSegment = {
        level: 1,
        annotation: [],
        content: [],
      };

      lastBlock = {
        img: undefined,
        title: bookEl,
        segments: [lastSegment],
      };
      blocks.push(lastBlock);

      segmentContentWas = false;
      continue;
    }

    if (isNil(lastBlock)) {
      continue;
    }

    // Если встречаем заголовок - создаём сегмент.
    if (['H1', 'H2', 'H3'].includes(bookEl.tagName)) {
      lastSegment = {
        level: Number(bookEl.tagName.slice(1)),
        title: bookEl,
        annotation: [],
        content: [],
      };
      lastBlock.segments.push(lastSegment);
      segmentContentWas = false;
      continue;
    }

    if (isNil(lastSegment)) {
      continue;
    }

    // Пока не было контента, пытаемся определить эпиграфа и картинку сегмента
    if (!segmentContentWas) {
      if (bookEl.tagName === 'BLOCKQUOTE') {
        const authorEl = bookEl.querySelector(`blockquote`);
        const epigraph: BookEpigraph = {
          text: '',
        };

        if (!isNil(authorEl)) {
          epigraph.author = authorEl.innerText.trim();
          authorEl.remove();
        }

        epigraph.text = bookEl.innerText.trim();
        lastSegment.epigraph = epigraph;
        continue;
      }

      if (bookEl.tagName === 'IMG') {
        lastSegment.img = {
          src: bookEl?.getAttribute('src'),
        };
        continue;
      }
    }

    // Дальнейшие теги являются контентом сегмента
    segmentContentWas = true;
    lastSegment.content.push(bookEl);
  }

  return blocks;
}
