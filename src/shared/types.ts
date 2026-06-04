export interface Footnote {
  id: string;
  text: string;
}

export interface BookPage {
  id: string;
  page: number;
  transform: string;
  content: string;
  contentWithBase64?: string;
  footnotes: Footnote[];
  images: string[];
}

export interface Person {
  name: string;
  locale: string; // 'ru'
  uuid: string;
  works_count: number;
  image: {
    small: string;
    large: string;
    placeholder: string | null;
  };
  removed: boolean;
}

export interface BookInfo {
  library_card: {
    accessed_at: number; // Дата в сек
    changes_count: number;
    chapter_uuid: string | null;
    cfi: string;
    finished_at: number; // Дата в сек
    fragment: string;
    progress: number;
    public: boolean;
    size_approx: number;
    started_at: number; // Дата в сек
    state: 'finished';
    sync_counter: number;
    title: string;
    uuid: string;
    last_read_excerpt: string;
    is_uploaded: boolean;
    document_uuid: string;
    is_in_child_library: boolean;
  };
  annotation: string;
  authors: string;
  authors_objects: Person[];
  cover: {
    large: string;
    placeholder: string;
    ratio: number;
    small: string;
    background_color_hex: string;
  };
  language: string; // 'ru'
  paper_pages: number;
  restricted_reading_on_web: boolean;
  title: string;
  uuid: string;
  init_uuid: string;
  type: string;
  source_type: string; // 'html'
  publication_date: 1778533200;
  owner_catalog_title: string; // Издательство
  original_year: number | null;
  is_uploaded: boolean;
  editor_annotation: string;
  bookshelves_count: number;
  impressions_count: number;
  quotes_count: number;
  readers_count: number;
  can_be_read: boolean;
  access_restrictions: [
    {
      level: string;
    },
  ];
  age_restriction: string; // number
  in_library: boolean;
  in_wishlist: boolean;
  labels: string[];
  document_uuid: string;
  linked_audiobook_uuids: string[];
  library_card_uuid: string;
  series_list: string[];
  variants_count: number;
  translators: Person[];
  publishers: Person[];
  illustrators: Person[];
  external_links: string[];
  topics: [
    {
      background: string | null;
      is_subtopic: boolean;
      parent_slug: string | null;
      slug: string;
      title: string;
      uuid: string;
      icon: string;
      language: string; // 'ru'
    },
  ];
}
