import { Book } from "@/types/book";
import { searchBooks as searchOpenLibrary } from "./openLibraryService";
import { searchGoogleBooks } from "./googleBooksService";

/**
 * Hybrid search service that combines results from OpenLibrary and Google Books
 */
export async function searchBooks(query: string, type: "title" | "author" | "isbn"): Promise<Book[]> {
  const results: Book[] = [];
  const seenISBNs = new Set<string>();
  const seenTitleAuthor = new Set<string>();

  try {
    // Search OpenLibrary first (usually faster and more reliable)
    const openLibraryResults = await searchOpenLibrary(query, type);
    
    for (const book of openLibraryResults) {
      const normalizedKey = `${book.title.toLowerCase().trim()}|||${book.author.toLowerCase().trim()}`;
      
      if (!seenTitleAuthor.has(normalizedKey)) {
        results.push(book);
        seenTitleAuthor.add(normalizedKey);
        
        if (book.isbn && book.isbn.length >= 10) {
          const cleanISBN = book.isbn.replace(/[^0-9X]/gi, '');
          seenISBNs.add(cleanISBN);
        }
      }
    }
  } catch (error) {
    console.error("OpenLibrary search failed:", error);
  }

  try {
    // Search Google Books to supplement results
    const googleBooksResults = await searchGoogleBooks(query, type);
    
    for (const book of googleBooksResults) {
      let isDuplicate = false;
      
      // Check for ISBN duplicates
      if (book.isbn && book.isbn.length >= 10) {
        const cleanISBN = book.isbn.replace(/[^0-9X]/gi, '');
        if (seenISBNs.has(cleanISBN)) {
          isDuplicate = true;
        } else {
          seenISBNs.add(cleanISBN);
        }
      }
      
      // Check for title/author duplicates
      if (!isDuplicate) {
        const normalizedKey = `${book.title.toLowerCase().trim()}|||${book.author.toLowerCase().trim()}`;
        if (seenTitleAuthor.has(normalizedKey)) {
          isDuplicate = true;
        } else {
          seenTitleAuthor.add(normalizedKey);
        }
      }
      
      if (!isDuplicate) {
        results.push(book);
      }
    }
  } catch (error) {
    console.error("Google Books search failed:", error);
  }

  // Limit total results to avoid overwhelming the UI
  return results.slice(0, 20);
}

/**
 * Legacy function - maintained for compatibility
 * @deprecated Use enrichmentService.enrichBook instead
 */
export async function enrichBookData(book: Book): Promise<Book> {
  const { enrichBook } = await import("./enrichmentService");
  return enrichBook(book);
}
