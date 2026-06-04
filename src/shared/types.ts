export interface Footnote {
  id: string;
  text: string;
}

export interface BookPage {
  id: string;
  page: number;
  transform: string;
  content: string;
  footnotes: Footnote[];
  images: string[];
}
