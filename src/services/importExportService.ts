import { Book } from "@/types/book";
import { removeDuplicatesFromList } from "./deduplicationService";

export interface ExportData {
  version: string;
  exportDate: string;
  books: Book[];
}

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

export const importBooksFromJSON = (
  file: File,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const jsonString = event.target?.result as string;
        const data = JSON.parse(jsonString);
        
        if (!data.books || !Array.isArray(data.books)) {
          throw new Error("Invalid import file: 'books' array not found");
        }
        
        onProgress?.(0, data.books.length, "Validating books...");
        
        const validatedBooks: Book[] = data.books.map((book: unknown, index: number) => {
          const b = book as Record<string, unknown>;
          if (!b.id || !b.title || !b.author) {
            throw new Error(`Invalid book data at index ${index}: missing required fields (id, title, author)`);
          }
          
          onProgress?.(index + 1, data.books.length, `Validating "${String(b.title)}" by ${String(b.author)}`);
          
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
        
        onProgress?.(data.books.length, data.books.length, "Removing duplicates within import...");
        
        const { uniqueBooks } = removeDuplicatesFromList(validatedBooks);
        
        onProgress?.(data.books.length, data.books.length, "Import completed!");
        
        resolve(uniqueBooks);
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
