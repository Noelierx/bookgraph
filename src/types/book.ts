export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  coverUrl?: string;
  publishYear?: string;
  subjects?: string[];
}

export interface BookConnection {
  source: string;
  target: string;
  strength: number;
  reason: string;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    name: string;
    book: Book;
  }>;
  links: Array<{
    source: string;
    target: string;
    strength: number;
    reason: string;
  }>;
}
