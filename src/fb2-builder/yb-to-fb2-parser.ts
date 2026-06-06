import { HTMLElement, Node, NodeType, parse } from 'node-html-parser';
import { isEmpty, isNil } from 'lodash-es';

import { BookPage } from '../shared/types';
import { BookBlock, BookBlockSegment, BookEpigraph } from './shared/types';

/**
 * Возвращает TRUE, если указанный узел является пустым текстовым узлом.
 */
function isEmptyNode(node: Node) {
  return !isNil(node) && node.nodeType === NodeType.TEXT_NODE && node.textContent.trim() === '';
}

/**
 * Удаляет пустые элементы из начала и конца контейнерных блоков.
 */
function trimElements(rootEl: HTMLElement) {
  const nonProcessedNodes: Node[] = [rootEl];

  while (!isEmpty(nonProcessedNodes)) {
    const node = nonProcessedNodes.shift() as Node;
    if (node.nodeType === NodeType.TEXT_NODE || isEmpty(node.childNodes)) {
      continue;
    }

    let firstNode = node.childNodes[0];
    while (isEmptyNode(firstNode)) {
      firstNode.remove();
      firstNode = node.childNodes[0];
    }

    let lastNode = node.childNodes[node.childNodes.length - 1];
    while (isEmptyNode(lastNode)) {
      lastNode.remove();
      lastNode = node.childNodes[node.childNodes.length - 1];
    }

    nonProcessedNodes.push(...node.childNodes);
  }
}

/**
 * Перегруппировывает контент, чтобы не было DIV>DIV>DIV вложенности, убирая промежуточные
 * DIV элементы. В результате останется 1 DIV или содержимое DIV если внутри 1 элемент.
 */
function removeExtraWrappers(rootEl: HTMLElement) {
  const nonProcessedNodes: Node[] = [...rootEl.childNodes];

  while (!isEmpty(nonProcessedNodes)) {
    const node = nonProcessedNodes.shift() as Node;
    if (node.nodeType === NodeType.TEXT_NODE) {
      continue;
    }

    const htmlNode = node as HTMLElement;
    if (htmlNode.childNodes.length !== 1) {
      nonProcessedNodes.push(...htmlNode.childNodes);
      continue;
    }

    const newRootNode = htmlNode.childNodes[0];
    if (htmlNode.tagName === 'DIV') {
      // Переносим всех детей в родительский узел
      htmlNode.before(newRootNode);
      // Удаляем пустой саб-узел
      htmlNode.remove();
    }

    nonProcessedNodes.unshift(newRootNode);
  }
}

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
    trimElements(contentContainer);
    removeExtraWrappers(contentContainer);

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
      continue;
    }

    if (contentContainer.childNodes.length === 1) {
      const firstChild = contentContainer.firstChild as HTMLElement;
      if (firstChild.tagName === 'H1') {
        firstChild.classList.add('block-title');
      }
      bookEls.push(firstChild);
    } else {
      bookEls.push(...(contentContainer.childNodes as HTMLElement[]));
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
          src: bookEl?.getAttribute('src') ?? '',
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
