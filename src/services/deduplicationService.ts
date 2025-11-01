import { Book } from "@/types/book";
import { detectLanguage, getStopWords } from "./textRankService";

const titleCache = new Map<string, string>();
const authorCache = new Map<string, string>();

export function normalizeTitle(title: string): string {
  if (titleCache.has(title)) {
    return titleCache.get(title)!;
  }

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

  if (titleCache.size < 1000) {
    titleCache.set(title, normalized);
  }

  return normalized;
}

export function normalizeAuthor(author: string): string {
  if (authorCache.has(author)) {
    return authorCache.get(author)!;
  }

  const normalized = author
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+(jr|sr|ii|iii|iv|md|phd)\.?$/i, '')
    .trim();

  if (authorCache.size < 1000) {
    authorCache.set(author, normalized);
  }

  return normalized;
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
  
  const normalize = (str: string) => str
    .replace(/[\(\)\[\]\{\}\-\:\;\,\.\!\?\"\']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const norm1 = normalize(title1);
  const norm2 = normalize(title2);
  
  if (norm1 === norm2) return true;
  
  const words1 = norm1.split(' ').filter(w => w.length > 0);
  const words2 = norm2.split(' ').filter(w => w.length > 0);
  
  const shorter = words1.length <= words2.length ? norm1 : norm2;
  const longer = words1.length <= words2.length ? norm2 : norm1;
  
  if (longer.startsWith(shorter)) {
    return true;
  }
  
  if (words1.length <= 2 || words2.length <= 2) {
    return norm1 === norm2;
  }
  
  if (words1.length <= 4 && words2.length <= 4) {
    const commonWords = words1.filter(w => words2.includes(w));
    return commonWords.length >= Math.min(words1.length, words2.length) - 1;
  }
  
  const combinedText = `${norm1} ${norm2}`;
  const language = detectLanguage(combinedText);
  const stopWords = getStopWords(language);
  
  const isSignificant = (w: string) => w.length > 2 && !stopWords.has(w.toLowerCase());
  
  const significantWords1 = words1.filter(isSignificant);
  const significantWords2 = words2.filter(isSignificant);
  
  if (significantWords1.length === 0 || significantWords2.length === 0) return false;
  
  const commonWords = significantWords1.filter(w => significantWords2.includes(w));
  const similarity = commonWords.length / Math.max(significantWords1.length, significantWords2.length);
  
  return similarity > 0.75;
}

export function mergeBookData(existingBook: Book, newBook: Book): Book {
  const merged: Book = { ...existingBook };
  
  if (newBook.title.length > existingBook.title.length) {
    merged.title = newBook.title;
  }
  
  const existingAuthorNorm = normalizeAuthor(existingBook.author);
  const newAuthorNorm = normalizeAuthor(newBook.author);
  
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

export function removeDuplicatesFromList(books: Book[]): { 
  uniqueBooks: Book[]; 
  duplicatesCount: number; 
  mergedGroups?: Array<{originalBooks: Book[], mergedBook: Book, reason: string}>
} {
  const uniqueBooks: Book[] = [];
  const seenIds = new Set<string>();
  const seenIsbns = new Map<string, number>();
  const seenTitleAuthor = new Map<string, { title: string; author: string; index: number }>();
  const mergedGroups: Array<{originalBooks: Book[], mergedBook: Book, reason: string}> = [];
  let duplicatesCount = 0;

  for (const book of books) {
    let isDuplicate = false;
    let mergeReason = '';
    let mergeTarget: Book | null = null;
    let mergeTargetIndex = -1;

    if (seenIds.has(book.id)) {
      isDuplicate = true;
      duplicatesCount++;
      mergeReason = 'Same ID';
    } else {
      seenIds.add(book.id);

      if (book.isbn && book.isbn.length >= 10) {
        const cleanIsbn = book.isbn.replace(/[^0-9X]/gi, '');
        if (seenIsbns.has(cleanIsbn)) {
          const existingIndex = seenIsbns.get(cleanIsbn)!;
          mergeTarget = uniqueBooks[existingIndex];
          mergeTargetIndex = existingIndex;
          isDuplicate = true;
          duplicatesCount++;
          mergeReason = 'Same ISBN';
        }
      }

      if (!isDuplicate) {
        const normalizedTitle = normalizeTitle(book.title);
        const normalizedAuthor = normalizeAuthor(book.author);
        
        for (const [, existingData] of seenTitleAuthor.entries()) {
          if (areTitlesSimilar(normalizedTitle, existingData.title) && 
              areAuthorsSimilar(normalizedAuthor, existingData.author)) {
            mergeTarget = uniqueBooks[existingData.index];
            mergeTargetIndex = existingData.index;
            isDuplicate = true;
            duplicatesCount++;
            mergeReason = 'Similar title and author';
            break;
          }
        }
        
        if (!isDuplicate) {
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

    if (isDuplicate && mergeTarget && mergeTargetIndex >= 0) {
      const mergedBook = mergeBookData(mergeTarget, book);
      uniqueBooks[mergeTargetIndex] = mergedBook;
      
      mergedGroups.push({
        originalBooks: [mergeTarget, book],
        mergedBook,
        reason: mergeReason
      });
    }
  }

  return { uniqueBooks, duplicatesCount, mergedGroups };
}


export async function removeDuplicatesWithEnrichment(books: Book[]): Promise<{
  uniqueBooks: Book[], 
  duplicatesCount: number,
  mergedGroups?: Array<{originalBooks: Book[], mergedBook: Book, reason: string}>
}> {
  const result = removeDuplicatesFromList(books);
  
  const { enrichBookCollection } = await import("./enrichmentService");
  const enrichedBooks = await enrichBookCollection(result.uniqueBooks);
  
  return {
    uniqueBooks: enrichedBooks,
    duplicatesCount: result.duplicatesCount,
    mergedGroups: result.mergedGroups
  };
}

export function removeDuplicatesOnly(books: Book[]): {
  uniqueBooks: Book[], 
  duplicatesCount: number,
  mergedGroups?: Array<{originalBooks: Book[], mergedBook: Book, reason: string}>
} {
  return removeDuplicatesFromList(books);
}

export function clearNormalizationCaches(): void {
  titleCache.clear();
  authorCache.clear();
}
