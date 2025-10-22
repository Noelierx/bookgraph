import { Book } from "@/types/book";

const OPEN_LIBRARY_API = "https://openlibrary.org";

/* -----------------------------------------
   Helpers réseau / parsing
   ----------------------------------------- */
async function fetchJson(path: string): Promise<any | null> {
  try {
    const url = path.startsWith("http") ? path : `${OPEN_LIBRARY_API}${path}.json`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

function extractDescriptionFromData(desc: any): string {
  if (!desc) return "";
  if (typeof desc === "string") return desc;
  if (typeof desc === "object") return desc.value ?? "";
  return "";
}

/* -----------------------------------------
   Helpers ISBN (nettoyage / validation / conversion)
   ----------------------------------------- */
function cleanIsbnRaw(input: any): string | null {
  if (!input) return null;
  const val = Array.isArray(input) ? input[0] : input;
  if (typeof val !== "string" && typeof val !== "number") return null;
  let s = String(val).toUpperCase().trim();
  s = s.replace(/[^0-9X]/g, "");
  return s.length ? s : null;
}

function isIsbn10(isbn: string): boolean {
  return /^[0-9]{9}[0-9X]$/.test(isbn);
}

function isIsbn13(isbn: string): boolean {
  return /^[0-9]{13}$/.test(isbn);
}

function computeIsbn13CheckDigit(digits12: string): string {
  let sum = 0;
  for (let i = 0; i < digits12.length; i++) {
    const n = parseInt(digits12[i], 10);
    sum += (i % 2 === 0) ? n : n * 3;
  }
  const mod = sum % 10;
  return String((10 - mod) % 10);
}

function isbn10ToIsbn13(isbn10: string): string | null {
  if (!isIsbn10(isbn10)) return null;
  const core = isbn10.slice(0, 9);
  const prefixed = "978" + core;
  const check = computeIsbn13CheckDigit(prefixed);
  return prefixed + check;
}

function extractIsbnsFromIdentifiers(obj: any): string[] {
  if (!obj || typeof obj !== "object") return [];
  const candidates: string[] = [];
  if (obj.identifiers) {
    if (Array.isArray(obj.identifiers.isbn_13)) candidates.push(...obj.identifiers.isbn_13.map(String));
    if (Array.isArray(obj.identifiers.isbn_10)) candidates.push(...obj.identifiers.isbn_10.map(String));
  }
  if (Array.isArray(obj.isbn_13)) candidates.push(...obj.isbn_13.map(String));
  if (Array.isArray(obj.isbn_10)) candidates.push(...obj.isbn_10.map(String));
  if (Array.isArray(obj.isbn)) candidates.push(...obj.isbn.map(String));
  return candidates;
}

// Retourne le premier ISBN normalisé (préférence ISBN-13, sinon conversion ISBN-10->13)
function pickFirstIsbn(...sources: any[]): string {
  const collected: string[] = [];

  for (const s of sources) {
    if (!s) continue;
    if (Array.isArray(s)) {
      collected.push(...s.map((it: any) => String(it)));
    } else if (typeof s === "object") {
      collected.push(...extractIsbnsFromIdentifiers(s));
      // fallback: try top-level arrays if present
      if (s.isbn) collected.push(...(Array.isArray(s.isbn) ? s.isbn.map(String) : [String(s.isbn)]));
      if (s.isbn_13) collected.push(...(Array.isArray(s.isbn_13) ? s.isbn_13.map(String) : [String(s.isbn_13)]));
      if (s.isbn_10) collected.push(...(Array.isArray(s.isbn_10) ? s.isbn_10.map(String) : [String(s.isbn_10)]));
    } else {
      collected.push(String(s));
    }
  }

  // prefer isbn13
  for (const raw of collected) {
    const c = cleanIsbnRaw(raw);
    if (!c) continue;
    if (isIsbn13(c)) return c;
  }
  // convert isbn10 -> isbn13
  for (const raw of collected) {
    const c = cleanIsbnRaw(raw);
    if (!c) continue;
    if (isIsbn10(c)) {
      const conv = isbn10ToIsbn13(c);
      if (conv) return conv;
      return c;
    }
  }
  // fallback: first cleaned
  for (const raw of collected) {
    const c = cleanIsbnRaw(raw);
    if (c) return c;
  }
  return "";
}

/* -----------------------------------------
   Mapping helpers
   ----------------------------------------- */
function mapSearchResult(doc: any): Book {
  const isbn = pickFirstIsbn(doc.isbn, doc.isbn_13, doc.isbn_10);
  return {
    id: doc.key || `book-${Date.now()}-${Math.random()}`,
    title: doc.title || "Unknown Title",
    author: doc.author_name?.[0] || "Unknown Author",
    isbn: String(isbn ?? ""),
    publishYear: doc.first_publish_year?.toString(),
    subjects: doc.subject?.slice(0, 5) || [],
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
    description:
      extractDescriptionFromData(doc.description) ||
      (Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : (typeof doc.first_sentence === "string" ? doc.first_sentence : "")),
  };
}

function mapOpenLibraryBook(data: any): Book {
  const isbn = pickFirstIsbn(data, data.isbn, data.isbn_13, data.isbn_10);
  return {
    id: data.key || `book-${Date.now()}-${Math.random()}`,
    title: data.title || "Unknown Title",
    author: data.authors?.[0]?.name || "Unknown Author",
    isbn: String(isbn ?? ""),
    publishYear: data.publish_date,
    subjects: data.subjects?.slice(0, 5) || [],
    coverUrl: data.covers?.[0] ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg` : undefined,
    description: extractDescriptionFromData(data.description),
  };
}

/* -----------------------------------------
   Enrichissement: edition -> work -> editions list
   ----------------------------------------- */
async function getEditionsForWork(workKey: string, limit = 10): Promise<any[]> {
  const path = `${workKey}/editions.json?limit=${limit}`;
  const data = await fetchJson(path);
  if (!data) return [];
  return data.entries || data.docs || [];
}

async function enrichFromEditionOrWork(book: Book, doc: any): Promise<Book> {
  const enriched = { ...book };

  // 1) try specific edition (fast)
  const editionKey = Array.isArray(doc.edition_key) && doc.edition_key[0] ? doc.edition_key[0] : null;
  if (editionKey) {
    const ed = await fetchJson(`/books/${editionKey}`);
    if (ed) {
      const isbnEd = pickFirstIsbn(ed, ed.isbn, ed.isbn_13, ed.isbn_10);
      if (isbnEd && !enriched.isbn) enriched.isbn = isbnEd;
      if ((!enriched.subjects || enriched.subjects.length === 0) && Array.isArray(ed.subjects)) enriched.subjects = ed.subjects.slice(0, 5);
      if ((!enriched.description || enriched.description === "") && ed.description) enriched.description = extractDescriptionFromData(ed.description);
    }
  }

  // 2) try work object
  const workKey = doc.key || (Array.isArray(doc.work_key) && doc.work_key[0] ? doc.work_key[0] : null);
  if (workKey) {
    const wk = await fetchJson(workKey);
    if (wk) {
      if ((!enriched.description || enriched.description === "") && wk.description) enriched.description = extractDescriptionFromData(wk.description);
      if ((!enriched.subjects || enriched.subjects.length === 0) && Array.isArray(wk.subjects)) enriched.subjects = wk.subjects.slice(0, 5);
      const isbnWk = pickFirstIsbn(wk, wk.identifiers, wk.isbn, wk.isbn_13, wk.isbn_10);
      if (isbnWk && !enriched.isbn) enriched.isbn = isbnWk;

      // 3) if still no ISBN, inspect editions list for the work
      if ((!enriched.isbn || enriched.isbn === "")) {
        const editions = await getEditionsForWork(workKey, 10);
        for (const edDoc of editions) {
          const isbnFromEdition = pickFirstIsbn(edDoc, edDoc.identifiers, edDoc.isbn, edDoc.isbn_13, edDoc.isbn_10);
          if (isbnFromEdition) {
            enriched.isbn = isbnFromEdition;
            break;
          }
        }
      }
    }
  }

  return enriched;
}

/* -----------------------------------------
   API: searchBooks + getBookDescription
   ----------------------------------------- */
export async function searchBooks(query: string, searchType: "title" | "author" | "isbn"): Promise<Book[]> {
  try {
    if (searchType === "isbn") {
      const data = await fetchJson(`/isbn/${query}`);
      if (!data) return [];
      const book = mapOpenLibraryBook(data);
      // try work description if missing
      if (!book.description && data.works?.[0]?.key) {
        const workDesc = await getBookDescription(data.works[0].key);
        if (workDesc) book.description = workDesc;
      }
      return [book];
    }

    const searchParam = searchType === "title" ? "title" : "author";
    const resp = await fetch(`${OPEN_LIBRARY_API}/search.json?${searchParam}=${encodeURIComponent(query)}&limit=10`);
    if (!resp.ok) return [];
    const data = await resp.json();
    const docs = data.docs || [];

    const mapped = await Promise.all(docs.map(async (doc: any) => {
      const basic = mapSearchResult(doc);
      const enriched = await enrichFromEditionOrWork(basic, doc);
      if (!enriched.description && doc.key) {
        const desc = await getBookDescription(doc.key);
        if (desc) enriched.description = desc;
      }
      return enriched;
    }));

    return mapped;
  } catch (error) {
    console.error("Error searching books:", error);
    return [];
  }
}

export async function getBookDescription(bookId: string): Promise<string> {
  if (!bookId) return "";
  const normalized = bookId.startsWith("/") ? bookId : `/${bookId}`;
  const data = await fetchJson(normalized);
  if (!data) return "";

  const desc = extractDescriptionFromData(data.description);
  if (desc) return desc;

  // try work -> description (editions handled elsewhere if needed)
  if (data.works?.[0]?.key) {
    const wk = await fetchJson(data.works[0].key);
    if (wk) return extractDescriptionFromData(wk.description);
  }

  return "";
}
