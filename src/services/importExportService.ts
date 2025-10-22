import { Book } from "@/types/book";

export interface ExportData {
  version: string;
  exportDate: string;
  books: Book[];
}

/**
 * Export books to a JSON file
 */
export const exportBooksToJSON = (books: Book[]): void => {
  const exportData: ExportData = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    books,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `bookgraph-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Import books from a JSON file
 */
export const importBooksFromJSON = (file: File): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const data = JSON.parse(jsonString);
        
        // Validate the structure
        if (!data.books || !Array.isArray(data.books)) {
          throw new Error("Invalid import file: 'books' array not found");
        }
        
        // Validate each book has required fields
        const validatedBooks: Book[] = data.books.map((book: unknown) => {
          const b = book as Record<string, unknown>;
          if (!b.id || !b.title || !b.author) {
            throw new Error("Invalid book data: missing required fields (id, title, author)");
          }
          
          return {
            id: String(b.id),
            title: String(b.title),
            author: String(b.author),
            isbn: b.isbn ? String(b.isbn) : undefined,
            description: b.description ? String(b.description) : undefined,
            coverUrl: b.coverUrl ? String(b.coverUrl) : undefined,
            publishYear: b.publishYear ? String(b.publishYear) : undefined,
            subjects: Array.isArray(b.subjects) ? b.subjects.map(String) : undefined,
          };
        });
        
        resolve(validatedBooks);
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Failed to parse JSON file"));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsText(file);
  });
};
