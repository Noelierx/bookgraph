import { Book } from "@/types/book";

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*:\s*.*$/, '')
    .replace(/['`]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeAuthor(author: string): string {
  return author
    .toLowerCase()
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
  
  if (words1.length <= 3 && words2.length <= 3) {
    return title1 === title2;
  }
  
  if (title1.includes(title2) || title2.includes(title1)) return true;
  
  const significantWords1 = words1.filter(w => w.length > 2);
  const significantWords2 = words2.filter(w => w.length > 2);
  
  if (significantWords1.length === 0 || significantWords2.length === 0) return false;
  
  const commonWords = significantWords1.filter(w => significantWords2.includes(w));
  const similarity = commonWords.length / Math.max(significantWords1.length, significantWords2.length);
  
  return similarity > 0.8;
}

export function mergeBookData(existingBook: Book, newBook: Book): Book {
  const merged: Book = { ...existingBook };
  
  if (newBook.title.length > existingBook.title.length) {
    merged.title = newBook.title;
  }
  
  const existingAuthorNorm = normalizeAuthor(existingBook.author);
  const newAuthorNorm = normalizeAuthor(newBook.author);
  
  if (existingAuthorNorm === 'unknown author' && newAuthorNorm !== 'unknown author') {
    merged.author = newBook.author;
  } else if (newAuthorNorm !== 'unknown author' && newBook.author.length > existingBook.author.length) {
    merged.author = newBook.author;
  }
  
  if (!merged.description && newBook.description) {
    merged.description = newBook.description;
  } else if (newBook.description && newBook.description.length > (merged.description?.length || 0)) {
    merged.description = newBook.description;
  }
  
  if (!merged.isbn && newBook.isbn) {
    merged.isbn = newBook.isbn;
  } else if (newBook.isbn && newBook.isbn.length > (merged.isbn?.length || 0)) {
    merged.isbn = newBook.isbn;
  }
  
  if (!merged.coverUrl && newBook.coverUrl) {
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
      
      // Mark all found duplicates as processed
      processedInImport.add(i);
      duplicateIndices.forEach(index => processedInImport.add(index));
      
      // Add the merged book (or original if no duplicates found)
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
  const seenTitleAuthor = new Map<string, number>();
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
        } else {
          seenIsbns.set(cleanIsbn, uniqueBooks.length);
        }
      }

      if (!isDuplicate) {
        const normalizedTitle = normalizeTitle(book.title);
        const normalizedAuthor = normalizeAuthor(book.author);
        
        let foundSimilar = false;
        for (const [existingKey] of seenTitleAuthor.entries()) {
          const [existingNormalizedTitle, existingNormalizedAuthor] = existingKey.split('::');
          
          if (areTitlesSimilar(normalizedTitle, existingNormalizedTitle) && 
              areAuthorsSimilar(normalizedAuthor, existingNormalizedAuthor)) {
            isDuplicate = true;
            duplicatesCount++;
            foundSimilar = true;
            break;
          }
        }
        
        if (!foundSimilar) {
          const titleAuthorKey = `${normalizedTitle}::${normalizedAuthor}`;
          seenTitleAuthor.set(titleAuthorKey, uniqueBooks.length);
        }
      }
    }

    if (!isDuplicate) {
      uniqueBooks.push(book);
    }
  }

  return { uniqueBooks, duplicatesCount };
}
