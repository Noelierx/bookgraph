import { Book } from "@/types/book";
import { searchBooks } from "./openLibraryService";
import { removeDuplicatesFromList } from "./deduplicationService";

export interface GoodReadsBook {
  "Book Id": string;
  "Title": string;
  "Author": string;
  "ISBN": string;
  "ISBN13": string;
}

function splitCSVRows(csvContent: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];

    if (char === '"') {
      current += char;
      if (csvContent[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === '\n' && !inQuotes) {
      rows.push(current);
      current = "";
    } else if (char === '\r') {
      if (inQuotes) current += char;
    } else {
      current += char;
    }
  }

  if (current.trim()) rows.push(current);
  return rows;
}

function parseGoodReadsCSV(csvContent: string): GoodReadsBook[] {
  const lines = splitCSVRows(csvContent);
  if (lines.length < 2) return [];
  
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  const books: GoodReadsBook[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    
    if (values.length >= headers.length) {
      const book: Partial<GoodReadsBook> = {};
      headers.forEach((header, index) => {
        book[header as keyof GoodReadsBook] = values[index] || '';
      });
      books.push(book as GoodReadsBook);
    }
  }
  
  return books;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        currentValue += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
    i++;
  }
  values.push(currentValue.trim());
  
  return values;
}

async function enrichWithOpenLibraryData(book: Book): Promise<Book> {
  if (book.isbn && book.isbn.length >= 10) {
    try {
      const openLibraryBooks = await searchBooks(book.isbn, "isbn");
      
      if (openLibraryBooks.length > 0) {
        const olBook = openLibraryBooks[0];
        
        return {
          id: olBook.id,
          title: olBook.title || book.title,
          author: olBook.author || book.author,
          isbn: olBook.isbn || book.isbn,
          description: olBook.description || book.description,
          publishYear: olBook.publishYear || book.publishYear,
          subjects: olBook.subjects || book.subjects || [],
          coverUrl: olBook.coverUrl || book.coverUrl,
        };
      }
    } catch (error) {
    }
  }
  
  return book;
}

function convertGoodReadsBookToBook(grBook: GoodReadsBook): Book | null {
  if (!grBook.Title || !grBook.Author) {
    return null;
  }
  
  const isbn13 = grBook.ISBN13?.replace(/[^0-9X]/gi, '').trim();
  const isbn = grBook.ISBN?.replace(/[^0-9X]/gi, '').trim();
  
  let finalIsbn = '';
  if (isbn13 && isbn13.length >= 13) {
    finalIsbn = isbn13;
  } else if (isbn && isbn.length >= 10) {
    finalIsbn = isbn;
  }
  
  return {
    id: `goodreads-${grBook["Book Id"] || Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    title: grBook.Title.trim(),
    author: grBook.Author.trim(),
    isbn: finalIsbn,
    description: '',
    publishYear: undefined,
    subjects: [],
  };
}

export const importGoodReadsCSV = (
  file: File,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      reject(new Error('Please select a CSV file exported from GoodReads'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const csvContent = event.target?.result as string;
        
        if (!csvContent.includes('Book Id') || !csvContent.includes('Title') || !csvContent.includes('Author')) {
          throw new Error('This doesn\'t appear to be a valid GoodReads export CSV. Please make sure you exported your library from GoodReads.');
        }
        
        const goodReadsBooks = parseGoodReadsCSV(csvContent);
        
        if (goodReadsBooks.length === 0) {
          throw new Error('No books found in the CSV file. Please check the file format.');
        }
        
        const books: Book[] = [];
        let skipped = 0;
        
        onProgress?.(0, goodReadsBooks.length, "Starting import...");
        
        for (let i = 0; i < goodReadsBooks.length; i++) {
          const grBook = goodReadsBooks[i];
          const message = `Processing "${grBook.Title}" by ${grBook.Author}`;
          onProgress?.(i, goodReadsBooks.length, message);
          
          const book = convertGoodReadsBookToBook(grBook);
          if (book) {
            const enrichedBook = await enrichWithOpenLibraryData(book);
            books.push(enrichedBook);
          } else {
            skipped++;
          }
        }
        onProgress?.(goodReadsBooks.length, goodReadsBooks.length, "Removing duplicates within import...");
        const { uniqueBooks } = removeDuplicatesFromList(books);
        
        onProgress?.(goodReadsBooks.length, goodReadsBooks.length, "Import completed!");
        
        if (uniqueBooks.length === 0) {
          throw new Error('No valid books could be imported from the CSV file.');
        }
        
        resolve(uniqueBooks);
        
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse GoodReads CSV file.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read the CSV file'));
    };
    
    reader.readAsText(file, 'utf-8');
  });
};
