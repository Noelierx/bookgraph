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
  | "similar-themes"       // Themes in common (love, war, mystery, etc.)
  | "similar-plots"        // Plot elements in common (journey, betrayal, etc.)
  | "similar-concepts"     // Keywords/concepts in common
  | "common-subjects";     // Specific subject categories in common

export interface BookConnection {
  source: string;
  target: string;
  strength: number;
  reason: string;
  type?: RelationshipType;
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
    type?: RelationshipType;
  }>;
}
