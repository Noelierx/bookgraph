import { Book } from "@/types/book";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    canonicalVolumeLink?: string;
  };
}

interface GoogleBooksResponse {
  items?: GoogleBooksVolume[];
  totalItems: number;
}

async function fetchGoogleBooks(query: string): Promise<GoogleBooksResponse | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `${GOOGLE_BOOKS_API}?q=${encodedQuery}&maxResults=5&printType=books`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Google Books API error: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching from Google Books API:", error);
    return null;
  }
}

function extractISBN(volume: GoogleBooksVolume): string {
  const identifiers = volume.volumeInfo.industryIdentifiers || [];
  
  const isbn13 = identifiers.find(id => id.type === "ISBN_13");
  if (isbn13) return isbn13.identifier;
  
  const isbn10 = identifiers.find(id => id.type === "ISBN_10");
  if (isbn10) return isbn10.identifier;
  
  return "";
}

function extractPublishYear(publishedDate?: string): string | undefined {
  if (!publishedDate) return undefined;
  
  const yearMatch = publishedDate.match(/^(\d{4})/);
  return yearMatch ? yearMatch[1] : undefined;
}

function mapGoogleBookToBook(volume: GoogleBooksVolume): Book {
  const volumeInfo = volume.volumeInfo;
  const isbn = extractISBN(volume);
  
  return {
    id: `googlebooks-${volume.id}`,
    title: volumeInfo.title || "Unknown Title",
    author: volumeInfo.authors?.[0] || "Unknown Author",
    isbn: isbn,
    description: volumeInfo.description || "",
    publishYear: extractPublishYear(volumeInfo.publishedDate),
    subjects: volumeInfo.categories?.slice(0, 5) || [],
    coverUrl: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail,
  };
}

export async function searchGoogleBooks(query: string, type: "title" | "author" | "isbn"): Promise<Book[]> {
  let searchQuery = "";
  
  switch (type) {
    case "isbn":
      searchQuery = `isbn:${query}`;
      break;
    case "author":
      searchQuery = `inauthor:${query}`;
      break;
    case "title":
    default:
      searchQuery = `intitle:${query}`;
      break;
  }
  
  const response = await fetchGoogleBooks(searchQuery);
  
  if (!response || !response.items) {
    return [];
  }
  
  return response.items.map(mapGoogleBookToBook);
}

export async function enrichWithGoogleBooks(book: Book): Promise<Book> {
  if (book.isbn && book.isbn.length >= 10) {
    try {
      const isbnResults = await searchGoogleBooks(book.isbn, "isbn");
      if (isbnResults.length > 0) {
        return mergeGoogleBooksData(book, isbnResults[0]);
      }
    } catch (error) {
      console.error("Error enriching with Google Books (ISBN):", error);
    }
  }
  
  if (book.title && book.author && book.author !== "Unknown Author") {
    try {
      const titleAuthorQuery = `${book.title} ${book.author}`;
      const titleResults = await searchGoogleBooks(titleAuthorQuery, "title");
      
      const bestMatch = titleResults.find(result => 
        result.title.toLowerCase().includes(book.title.toLowerCase()) &&
        result.author.toLowerCase().includes(book.author.toLowerCase())
      );
      
      if (bestMatch) {
        return mergeGoogleBooksData(book, bestMatch);
      }
    } catch (error) {
      console.error("Error enriching with Google Books (title/author):", error);
    }
  }
  
  return book;
}

function mergeGoogleBooksData(existingBook: Book, googleBook: Book): Book {
  return {
    ...existingBook,
    id: googleBook.id.startsWith('googlebooks-') ? googleBook.id : existingBook.id,
    title: googleBook.title.length > existingBook.title.length ? googleBook.title : existingBook.title,
    author: (googleBook.author && googleBook.author !== "Unknown Author" && googleBook.author.length > existingBook.author.length) 
      ? googleBook.author : existingBook.author,
    isbn: (!existingBook.isbn || googleBook.isbn.length > existingBook.isbn.length) 
      ? googleBook.isbn : existingBook.isbn,
    description: !existingBook.description && googleBook.description 
      ? googleBook.description : existingBook.description,
    publishYear: !existingBook.publishYear && googleBook.publishYear 
      ? googleBook.publishYear : existingBook.publishYear,
    subjects: [...new Set([...(existingBook.subjects || []), ...(googleBook.subjects || [])])],
    coverUrl: !existingBook.coverUrl && googleBook.coverUrl 
      ? googleBook.coverUrl : existingBook.coverUrl,
  };
}
