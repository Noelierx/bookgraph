import { Book } from "@/types/book";

export function normalizeTitle(title: string): string {
  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*:\s*.*$/, '')
    .replace(/['`]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

export function normalizeAuthor(author: string): string {
  return author
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+(jr|sr|ii|iii|iv|md|phd)\.?$/i, '')
    .trim();
}

export function areAuthorsSimilar(author1: string, author2: string): boolean {
  const norm1 = normalizeAuthor(author1);
  const norm2 = normalizeAuthor(author2);
  
  if (norm1 === 'unknown author' || norm2 === 'unknown author' || !norm1 || !norm2) {
    return true;
  }
  
  if (norm1 === norm2) return true;
  
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  if (words1.length >= 2 && words2.length >= 2) {
    const lastName1 = words1[words1.length - 1];
    const lastName2 = words2[words2.length - 1];
    
    if (lastName1 === lastName2) {
      const firstName1 = words1[0];
      const firstName2 = words2[0];
      
      if (firstName1.length === 1 && firstName2.startsWith(firstName1)) return true;
      if (firstName2.length === 1 && firstName1.startsWith(firstName2)) return true;
    }
  }
  
  return false;
}

export function areTitlesSimilar(title1: string, title2: string): boolean {
  if (title1 === title2) return true;
  
  const words1 = title1.split(' ').filter(w => w.length > 0);
  const words2 = title2.split(' ').filter(w => w.length > 0);
  
  // Check for substring matches (one title contained in another)
  if (title1.includes(title2) || title2.includes(title1)) return true;
  
  // Check if one title starts with the other (handles truncated titles)
  const shorter = words1.length <= words2.length ? title1 : title2;
  const longer = words1.length <= words2.length ? title2 : title1;
  
  if (longer.startsWith(shorter)) {
    // Allow if the longer title just adds subtitle or additional info
    const remaining = longer.substring(shorter.length).trim();
    // If what remains starts with common separators, it's likely the same book
    if (remaining.match(/^[\s\-\:\.\,\;]/)) {
      return true;
    }
  }
  
  // For very short titles (1-2 words), require exact match to avoid false positives
  if (words1.length <= 2 || words2.length <= 2) {
    return title1 === title2;
  }
  
  // For short titles (3 words), be more strict
  if (words1.length <= 3 && words2.length <= 3) {
    // Allow one word difference for 3-word titles
    const commonWords = words1.filter(w => words2.includes(w));
    return commonWords.length >= Math.min(words1.length, words2.length) - 1;
  }
  
  // For longer titles, use word-based similarity but consider all words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by']);
  
  // Keep significant words (length > 2) and important short words that aren't stop words
  const significantWords1 = words1.filter(w => w.length > 2 || !stopWords.has(w));
  const significantWords2 = words2.filter(w => w.length > 2 || !stopWords.has(w));
  
  if (significantWords1.length === 0 || significantWords2.length === 0) return false;
  
  const commonWords = significantWords1.filter(w => significantWords2.includes(w));
  const similarity = commonWords.length / Math.max(significantWords1.length, significantWords2.length);
  
  // Require higher similarity for titles with stop words preserved
  return similarity > 0.75;
}

export function mergeBookData(existingBook: Book, newBook: Book): Book {
  const merged: Book = { ...existingBook };
  
  if (newBook.title.length > existingBook.title.length) {
    merged.title = newBook.title;
  }
  
  const existingAuthorNorm = normalizeAuthor(existingBook.author);
  const newAuthorNorm = normalizeAuthor(newBook.author);
  
  // Only update author if new book has meaningful author data
  if (existingAuthorNorm === 'unknown author' && newAuthorNorm !== 'unknown author' && newBook.author.trim()) {
    merged.author = newBook.author;
  } else if (newAuthorNorm !== 'unknown author' && newBook.author.trim() && 
             newBook.author.length > existingBook.author.length) {
    merged.author = newBook.author;
  }
  
  if (!merged.description && newBook.description && newBook.description.trim()) {
    merged.description = newBook.description;
  } else if (newBook.description && newBook.description.trim() && 
             newBook.description.length > (merged.description?.length || 0)) {
    merged.description = newBook.description;
  }
  
  if (!merged.isbn && newBook.isbn && newBook.isbn.trim()) {
    merged.isbn = newBook.isbn;
  } else if (newBook.isbn && newBook.isbn.trim() && 
             newBook.isbn.length > (merged.isbn?.length || 0)) {
    merged.isbn = newBook.isbn;
  }
  
  if (!merged.coverUrl && newBook.coverUrl && newBook.coverUrl.trim()) {
    merged.coverUrl = newBook.coverUrl;
  }
  
  if (!merged.publishYear && newBook.publishYear) {
    merged.publishYear = newBook.publishYear;
  }
  
  if (newBook.subjects && newBook.subjects.length > 0) {
    const existingSubjects = merged.subjects || [];
    const allSubjects = [...existingSubjects, ...newBook.subjects];
    const uniqueSubjects = allSubjects.filter((subject, index, arr) => 
      arr.findIndex(s => s.toLowerCase() === subject.toLowerCase()) === index
    );
    merged.subjects = uniqueSubjects;
  }
  
  return merged;
}

export function findDuplicateBook(newBook: Book, existingBooks: Book[]): { isDuplicate: boolean; duplicateIndex?: number; mergedBook?: Book } {
  const newNormalizedTitle = normalizeTitle(newBook.title);
  const newAuthor = normalizeAuthor(newBook.author);
  
  for (let i = 0; i < existingBooks.length; i++) {
    const existingBook = existingBooks[i];
    
    if (newBook.isbn && existingBook.isbn && 
        newBook.isbn.length >= 10 && existingBook.isbn.length >= 10) {
      const newIsbn = newBook.isbn.replace(/[^0-9X]/gi, '');
      const existingIsbn = existingBook.isbn.replace(/[^0-9X]/gi, '');
      if (newIsbn === existingIsbn) {
        const mergedBook = mergeBookData(existingBook, newBook);
        return { isDuplicate: true, duplicateIndex: i, mergedBook };
      }
    }
    
    const existingNormalizedTitle = normalizeTitle(existingBook.title);
    const existingAuthor = normalizeAuthor(existingBook.author);
    
    if (areTitlesSimilar(newNormalizedTitle, existingNormalizedTitle) && 
        areAuthorsSimilar(newAuthor, existingAuthor)) {
      const mergedBook = mergeBookData(existingBook, newBook);
      return { isDuplicate: true, duplicateIndex: i, mergedBook };
    }
  }
  
  return { isDuplicate: false };
}

export function processImportWithMerge(booksToImport: Book[], existingBooks: Book[]): { updatedBooks: Book[]; newBooks: Book[] } {
  const updatedBooks = [...existingBooks];
  const newBooks: Book[] = [];
  const processedInImport = new Set<number>();
  
  for (let i = 0; i < booksToImport.length; i++) {
    if (processedInImport.has(i)) continue;
    
    const book = booksToImport[i];
    
    const duplicateResult = findDuplicateBook(book, updatedBooks);
    
    if (duplicateResult.isDuplicate && duplicateResult.duplicateIndex !== undefined && duplicateResult.mergedBook) {
      updatedBooks[duplicateResult.duplicateIndex] = duplicateResult.mergedBook;
      processedInImport.add(i);
    } else {
      const duplicateIndices: number[] = [];
      let mergedBook = book;
      
      for (let j = i + 1; j < booksToImport.length; j++) {
        if (processedInImport.has(j)) continue;
        
        const otherBook = booksToImport[j];
        const internalDuplicateResult = findDuplicateBook(otherBook, [mergedBook]);
        
        if (internalDuplicateResult.isDuplicate && internalDuplicateResult.mergedBook) {
          mergedBook = internalDuplicateResult.mergedBook;
          duplicateIndices.push(j);
        }
      }
      
      processedInImport.add(i);
      duplicateIndices.forEach(index => processedInImport.add(index));
      
      newBooks.push(mergedBook);
    }
  }
  
  const finalBooks = [...updatedBooks, ...newBooks];
  
  return { updatedBooks: finalBooks, newBooks };
}

export function removeDuplicatesFromImport(booksToImport: Book[], existingBooks: Book[]): Book[] {
  const result = processImportWithMerge(booksToImport, existingBooks);
  return result.newBooks;
}

export function removeDuplicatesFromList(books: Book[]): { uniqueBooks: Book[]; duplicatesCount: number } {
  const uniqueBooks: Book[] = [];
  const seenIds = new Set<string>();
  const seenIsbns = new Map<string, number>();
  const seenTitleAuthor = new Map<string, { title: string; author: string; index: number }>();
  let duplicatesCount = 0;

  for (const book of books) {
    let isDuplicate = false;

    if (seenIds.has(book.id)) {
      isDuplicate = true;
      duplicatesCount++;
    } else {
      seenIds.add(book.id);

      if (book.isbn && book.isbn.length >= 10) {
        const cleanIsbn = book.isbn.replace(/[^0-9X]/gi, '');
        if (seenIsbns.has(cleanIsbn)) {
          isDuplicate = true;
          duplicatesCount++;
        }
      }

      if (!isDuplicate) {
        const normalizedTitle = normalizeTitle(book.title);
        const normalizedAuthor = normalizeAuthor(book.author);
        
        let foundSimilar = false;
        for (const [, existingData] of seenTitleAuthor.entries()) {
          if (areTitlesSimilar(normalizedTitle, existingData.title) && 
              areAuthorsSimilar(normalizedAuthor, existingData.author)) {
            isDuplicate = true;
            duplicatesCount++;
            foundSimilar = true;
            break;
          }
        }
        
        if (!foundSimilar) {
          uniqueBooks.push(book);
          const currentIndex = uniqueBooks.length - 1;
          
          if (book.isbn && book.isbn.length >= 10) {
            const cleanIsbn = book.isbn.replace(/[^0-9X]/gi, '');
            seenIsbns.set(cleanIsbn, currentIndex);
          }
          
          const titleAuthorKey = `${normalizedTitle}|||${normalizedAuthor}`;
          seenTitleAuthor.set(titleAuthorKey, {
            title: normalizedTitle,
            author: normalizedAuthor,
            index: currentIndex
          });
        }
      }
    }
  }

  return { uniqueBooks, duplicatesCount };
}

/**
 * Enrich book data using centralized enrichment service
 * @deprecated Use enrichmentService.enrichBook instead
 */
export async function enrichBookWithHybridSearch(book: Book): Promise<Book> {
  const { enrichBook } = await import("./enrichmentService");
  return enrichBook(book);
}

/**
 * Enhanced deduplication with centralized enrichment
 */
export async function removeDuplicatesWithEnrichment(books: Book[]): Promise<{uniqueBooks: Book[], duplicatesCount: number}> {
  const result = removeDuplicatesFromList(books);
  
  // Enrich unique books with missing data using centralized service
  const { enrichBookCollection } = await import("./enrichmentService");
  const enrichedBooks = await enrichBookCollection(result.uniqueBooks);
  
  return {
    uniqueBooks: enrichedBooks,
    duplicatesCount: result.duplicatesCount
  };
}
