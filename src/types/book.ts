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

export type RelationshipType = 
  | "similar-themes"
  | "similar-plots" 
  | "similar-concepts"
  | "common-subjects"
  | "contrasting-ideas"
  | "mixed";

export interface BookConnection {
  source: string;
  target: string;
  strength: number;
  reason: string;
  type: RelationshipType;
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
    type: RelationshipType;
  }>;
}
