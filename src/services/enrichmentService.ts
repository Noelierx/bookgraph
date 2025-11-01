import { Book } from "@/types/book";
import { searchBooks as searchOpenLibrary } from "./openLibraryService";
import { searchGoogleBooks } from "./googleBooksService";

interface EnrichmentOptions {
  includeOpenLibrary?: boolean;
  includeGoogleBooks?: boolean;
  delayBetweenCalls?: number;
}

const DEFAULT_OPTIONS: EnrichmentOptions = {
  includeOpenLibrary: true,
  includeGoogleBooks: true,
  delayBetweenCalls: 100,
};

export async function enrichBook(
  book: Book, 
  options: EnrichmentOptions = {}
): Promise<Book> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let enrichedBook = { ...book };

  if (opts.includeOpenLibrary) {
    enrichedBook = await enrichWithOpenLibrary(enrichedBook, opts);
    
    if (opts.delayBetweenCalls) {
      await delay(opts.delayBetweenCalls);
    }
  }

  if (opts.includeGoogleBooks && needsMoreData(enrichedBook)) {
    enrichedBook = await enrichWithGoogleBooks(enrichedBook, opts);
  }

  return enrichedBook;
}

export async function enrichBookCollection(
  books: Book[],
  onProgress?: (current: number, total: number, message: string) => void,
  options: EnrichmentOptions = {}
): Promise<Book[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const enrichedBooks: Book[] = [];

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    onProgress?.(i + 1, books.length, `Enriching "${book.title}"...`);

    try {
      if (needsEnrichment(book)) {
        const enriched = await enrichBook(book, opts);
        enrichedBooks.push(enriched);
      } else {
        enrichedBooks.push(book);
      }
    } catch (error) {
      console.error(`Error enriching book "${book.title}":`, error);
      enrichedBooks.push(book);
    }

    if (i < books.length - 1 && opts.delayBetweenCalls) {
      await delay(opts.delayBetweenCalls);
    }
  }

  return enrichedBooks;
}

async function enrichWithOpenLibrary(book: Book, options: EnrichmentOptions): Promise<Book> {
  try {
    let results: Book[] = [];

    if (book.isbn && book.isbn.length >= 10) {
      results = await searchOpenLibrary(book.isbn, "isbn");
    }

    if (results.length === 0 && book.title) {
      results = await searchOpenLibrary(book.title, "title");
    }

    if (results.length > 0) {
      return mergeBookData(book, results[0], "OpenLibrary");
    }
  } catch (error) {
    console.error("OpenLibrary enrichment failed:", error);
  }

  return book;
}

async function enrichWithGoogleBooks(book: Book, options: EnrichmentOptions): Promise<Book> {
  try {
    let results: Book[] = [];

    if (book.isbn && book.isbn.length >= 10) {
      results = await searchGoogleBooks(book.isbn, "isbn");
    }

    if (results.length === 0 && book.title && book.author && book.author !== "Unknown Author") {
      const query = `${book.title} ${book.author}`;
      results = await searchGoogleBooks(query, "title");

      const bestMatch = results.find(result =>
        result.title.toLowerCase().includes(book.title.toLowerCase()) &&
        result.author.toLowerCase().includes(book.author.toLowerCase())
      );

      if (bestMatch) {
        return mergeBookData(book, bestMatch, "GoogleBooks");
      }
    } else if (results.length > 0) {
      return mergeBookData(book, results[0], "GoogleBooks");
    }
  } catch (error) {
    console.error("Google Books enrichment failed:", error);
  }

  return book;
}

function mergeBookData(existingBook: Book, newBook: Book, source: string): Book {
  const merged: Book = { ...existingBook };

  if (newBook.title && newBook.title.length > merged.title.length) {
    merged.title = newBook.title;
  }

  if (newBook.author && 
      newBook.author !== "Unknown Author" && 
      newBook.author.trim() &&
      (merged.author === "Unknown Author" || newBook.author.length > merged.author.length)) {
    merged.author = newBook.author;
  }

  if (newBook.isbn && 
      (!merged.isbn || newBook.isbn.length > merged.isbn.length)) {
    merged.isbn = newBook.isbn;
  }

  if (!merged.description && newBook.description && newBook.description.trim()) {
    merged.description = newBook.description;
  } else if (newBook.description && 
             newBook.description.trim() && 
             newBook.description.length > (merged.description?.length || 0)) {
    merged.description = newBook.description;
  }

  if (!merged.publishYear && newBook.publishYear) {
    merged.publishYear = newBook.publishYear;
  }

  if (!merged.coverUrl && newBook.coverUrl && newBook.coverUrl.trim()) {
    merged.coverUrl = newBook.coverUrl;
  }

  if (newBook.subjects && newBook.subjects.length > 0) {
    const existingSubjects = merged.subjects || [];
    const allSubjects = [...existingSubjects, ...newBook.subjects];
    const uniqueSubjects = allSubjects.filter((subject, index, arr) =>
      arr.findIndex(s => s.toLowerCase() === subject.toLowerCase()) === index
    );
    merged.subjects = uniqueSubjects;
  }

  if (source === "GoogleBooks" && newBook.id.startsWith('googlebooks-')) {
    merged.id = newBook.id;
  }

  return merged;
}

export function needsEnrichment(book: Book): boolean {
  return !book.description || 
         !book.subjects?.length || 
         !book.coverUrl || 
         !book.isbn ||
         book.author === "Unknown Author";
}

function needsMoreData(book: Book): boolean {
  return !book.description || 
         !book.coverUrl || 
         !book.subjects?.length || 
         !book.isbn;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function hybridSearch(query: string, type: "title" | "author" | "isbn"): Promise<Book[]> {
  const results: Book[] = [];
  const seenISBNs = new Set<string>();
  const seenTitleAuthor = new Set<string>();

  try {
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
    const googleBooksResults = await searchGoogleBooks(query, type);
    
    for (const book of googleBooksResults) {
      let isDuplicate = false;
      
      if (book.isbn && book.isbn.length >= 10) {
        const cleanISBN = book.isbn.replace(/[^0-9X]/gi, '');
        if (seenISBNs.has(cleanISBN)) {
          isDuplicate = true;
        } else {
          seenISBNs.add(cleanISBN);
        }
      }
      
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

  return results.slice(0, 20);
}
