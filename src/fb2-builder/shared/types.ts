import { HTMLElement } from 'node-html-parser';

export interface BookImage {
  src: string;
}

export interface BookEpigraph {
  text: string;
  author?: string;
}

export interface BookBlockSegment {
  level: number;
  img?: BookImage;
  title?: HTMLElement;
  epigraph?: BookEpigraph;
  annotation: HTMLElement[];
  content: HTMLElement[];
}

export interface BookBlock {
  img?: BookImage;
  title?: HTMLElement;
  epigraph?: BookEpigraph;
  segments: BookBlockSegment[];
}
