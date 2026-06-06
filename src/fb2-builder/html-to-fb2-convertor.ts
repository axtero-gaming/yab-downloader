import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import { isEmpty, isNil } from 'lodash-es';
import { HTMLElement, Node, NodeType } from 'node-html-parser';

import { log } from '../utils/utils';
import { BinaryImage } from './shared/types';

/**
 * Вставляет HTML контент в указанных XML элемент.
 */
export function insertHTMLForFB2(xmlEl: XMLBuilder, nodeEl: Node | HTMLElement, images: BinaryImage[]) {
  if (nodeEl.nodeType === NodeType.TEXT_NODE) {
    const text = (nodeEl.textContent || '')?.trim();
    if (!isEmpty(text)) {
      xmlEl.txt(text);
    }
    return;
  }

  const xmlElementMap = {
    code: 'code',
    small: 'sup',
    strong: 'strong',
    b: 'strong',
    p: 'p',
    h1: 'p',
    h2: 'p',
    h3: 'p',
    h4: 'subtitle',
    h5: 'subtitle',
    i: 'emphasis',
    em: 'emphasis',
    blockquote: 'cite',
  };

  if (nodeEl instanceof HTMLElement) {
    const tagName = nodeEl.tagName.toLowerCase();
    if (tagName === 'br') {
      xmlEl.ele('empty-line');
      return;
    }

    if (['a', 'div', 'span'].includes(tagName)) {
      for (const el of nodeEl.childNodes) {
        insertHTMLForFB2(xmlEl, el, images);
      }
      return;
    }

    if (['img'].includes(tagName)) {
      const imgSrc = nodeEl.getAttribute('src');
      if (isNil(imgSrc)) {
        return;
      }

      const imgName = imgSrc.split(`/`).slice(-1)[0];
      xmlEl.ele('image', { 'l:href': `#${imgName}` });
      images.push({
        src: imgSrc,
        name: imgName,
      });
      return;
    }

    if (['h1', 'h2', 'h3', 'h4'].includes(tagName)) {
      // Группируем внутренний контент по блокам (<br/> является разрывом между блоками)
      let lastPBlock: Node[] = [];
      const pBlocks: Node[][] = [lastPBlock];
      for (const el of nodeEl.childNodes) {
        const htmlEl = el as HTMLElement;
        if (htmlEl.tagName === 'BR') {
          lastPBlock = [];
          pBlocks.push(lastPBlock);
        } else {
          lastPBlock.push(el);
        }
      }

      // Каждый блок выводим как отдельный P элемент
      // Пустые блоки выводим в виде p+empty-line
      for (const pBlockEls of pBlocks) {
        if (isEmpty(pBlockEls)) {
          xmlEl.ele('p').ele('empty-line');
        } else {
          const rootEl = xmlEl.ele('p');
          for (const el of pBlockEls) {
            insertHTMLForFB2(rootEl, el, images);
          }
        }
      }

      return;
    }

    const poemEl = nodeEl.querySelector('.Стихи');
    if (!isNil(poemEl)) {
      let lastStanza: HTMLElement[] = [];
      const stanzas: HTMLElement[][] = [lastStanza];
      let numOfBr = 0;
      for (const el of poemEl.childNodes) {
        const htmlEl = el as HTMLElement;
        if (htmlEl.tagName === 'BR') {
          numOfBr += 1;
        } else {
          lastStanza.push(htmlEl);
          numOfBr = 0;
        }

        if (numOfBr > 1 && !isEmpty(lastStanza)) {
          lastStanza = [];
          stanzas.push(lastStanza);
          numOfBr = 0;
        }
      }

      const poemRootEl = xmlEl.ele('poem');
      for (const stanza of stanzas) {
        const stanzaRootEl = poemRootEl.ele('stanza');
        for (const lineEl of stanza) {
          const lineRootEl = stanzaRootEl.ele('v');
          insertHTMLForFB2(lineRootEl, lineEl, images);
        }
      }
      poemEl.remove();
    }

    if (tagName in xmlElementMap) {
      const value = xmlElementMap[tagName as keyof typeof xmlElementMap];
      const rootEl = xmlEl.ele(value);
      for (const el of nodeEl.childNodes) {
        insertHTMLForFB2(rootEl, el, images);
      }
      return;
    }

    log(`Не вышло обработать тег при вставке HTML контента в XML:`, tagName);
  }
}
