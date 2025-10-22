import { Book } from "@/types/book";

const OPEN_LIBRARY_API = "https://openlibrary.org";

export async function searchBooks(query: string, searchType: "title" | "author" | "isbn"): Promise<Book[]> {
  try {
    let url = "";
    
    if (searchType === "isbn") {
      url = `${OPEN_LIBRARY_API}/isbn/${query}.json`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return [mapOpenLibraryBook(data)];
    } else {
      const searchParam = searchType === "title" ? "title" : "author";
      url = `${OPEN_LIBRARY_API}/search.json?${searchParam}=${encodeURIComponent(query)}&limit=10`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return data.docs?.map(mapSearchResult) || [];
    }
  } catch (error) {
    console.error("Error searching books:", error);
    return [];
  }
}

function mapSearchResult(doc: any): Book {
  return {
    id: doc.key || `book-${Date.now()}-${Math.random()}`,
    title: doc.title || "Unknown Title",
    author: doc.author_name?.[0] || "Unknown Author",
    isbn: doc.isbn?.[0],
    publishYear: doc.first_publish_year?.toString(),
    subjects: doc.subject?.slice(0, 5) || [],
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
    description: doc.first_sentence?.[0] || "",
  };
}

function mapOpenLibraryBook(data: any): Book {
  return {
    id: data.key || `book-${Date.now()}-${Math.random()}`,
    title: data.title || "Unknown Title",
    author: data.authors?.[0]?.name || "Unknown Author",
    isbn: data.isbn_13?.[0] || data.isbn_10?.[0],
    publishYear: data.publish_date,
    subjects: data.subjects?.slice(0, 5) || [],
    coverUrl: data.covers?.[0] ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg` : undefined,
    description: typeof data.description === "string" ? data.description : data.description?.value || "",
  };
}

export async function getBookDescription(bookId: string): Promise<string> {
  try {
    const response = await fetch(`${OPEN_LIBRARY_API}${bookId}.json`);
    if (!response.ok) return "";
    const data = await response.json();
    return typeof data.description === "string" ? data.description : data.description?.value || "";
  } catch (error) {
    console.error("Error fetching book description:", error);
    return "";
  }
}
