import { useState, useEffect, useMemo } from "react";
import { Book, BookConnection, RelationshipType } from "@/types/book";
import { hybridSearch } from "@/services/enrichmentService";
import { analyzeBookConnectionsWithEnrichment, analyzeBookConnections } from "@/services/connectionService";
import { exportBooksToJSON, importBooksFromJSON } from "@/services/importExportService";
import { importGoodReadsCSV } from "@/services/goodreadsImportService";
import { processImportWithMerge } from "@/services/deduplicationService";
import { toast } from "sonner";

const STORAGE_KEY = "book-graph-data";

export function useBookManagement() {
  const [books, setBooks] = useState<Book[]>([]);
  const [connections, setConnections] = useState<BookConnection[]>([]);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImportingGoodReads, setIsImportingGoodReads] = useState(false);
  const [isImportingJSON, setIsImportingJSON] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, message: "" });
  
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connectionModalBook, setConnectionModalBook] = useState<Book | null>(null);
  const [visibleConnectionTypes, setVisibleConnectionTypes] = useState<Set<RelationshipType>>(
    new Set(["similar-themes", "similar-plots", "similar-concepts", "common-subjects"])
  );

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setBooks(data);
        toast.success(`Loaded ${data.length} books from storage`);
      } catch (error) {
        console.error("Error loading books:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (books.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
  }, [books]);

  useEffect(() => {
    const updateConnections = async () => {
      if (books.length >= 2) {
        const newConnections = await analyzeBookConnections(books);
        setConnections(newConnections);
      } else {
        setConnections([]);
      }
    };
    updateConnections();
  }, [books]);

  const selectedBook = books.find(b => b.id === selectedBookId);
  const existingBookIds = useMemo(() => new Set(books.map(b => b.id)), [books]);

  const handleSearch = async (query: string, type: "title" | "author" | "isbn") => {
    setIsSearching(true);
    try {
      const results = await hybridSearch(query, type);
      setSearchResults(results);
      if (results.length === 0) {
        toast.info("No books found. Try a different search or add manually.");
      } else {
        toast.success(`Found ${results.length} books`);
      }
    } catch (error) {
      toast.error("Failed to search books");
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddBook = (book: Book) => {
    if (books.some(b => b.id === book.id)) {
      toast.info("Book already in your collection");
      return;
    }
    setBooks([...books, book]);
    toast.success(`Added "${book.title}" to your collection`);
  };

  const handleRemoveBook = (bookId: string) => {
    setBooks(books.filter(b => b.id !== bookId));
    setSelectedBookId(null);
    toast.success("Book removed");
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setShowEditDialog(true);
  };

  const handleSaveBook = (updatedBook: Book) => {
    if (books.some(b => b.id === updatedBook.id)) {
      setBooks(books.map(b => b.id === updatedBook.id ? updatedBook : b));
      toast.success("Book updated");
    } else {
      setBooks([...books, updatedBook]);
      toast.success("Book added");
    }
    setEditingBook(null);
  };

  const handleAnalyzeConnections = async () => {
    if (books.length < 2) {
      toast.info("Add at least 2 books to see connections");
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeBookConnectionsWithEnrichment(books, (current, total, message) => {
        setImportProgress({ current, total, message });
      });
      
      setConnections(result.connections);
      
      if (result.enrichedBooks.length > 0) {
        setBooks(result.enrichedBooks);
        toast.success(`Connections analyzed! Enriched ${result.enrichedBooks.length} books with external data.`);
      } else {
        toast.success("Connections analyzed!");
      }
    } catch (error) {
      toast.error("Failed to analyze connections");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
      setImportProgress({ current: 0, total: 0, message: "" });
    }
  };

  const handleExport = () => {
    if (books.length === 0) {
      toast.info("No books to export");
      return;
    }
    
    try {
      exportBooksToJSON(books);
      toast.success(`Exported ${books.length} books`);
    } catch (error) {
      toast.error("Failed to export books");
      console.error(error);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsImportingJSON(true);
    setImportProgress({ current: 0, total: 0, message: "Starting import..." });
    
    try {
      const importedBooks = await importBooksFromJSON(file, (current, total, message) => {
        setImportProgress({ current, total, message });
      });
      
      const { updatedBooks, newBooks } = processImportWithMerge(importedBooks, books);
      setBooks(updatedBooks);

      const addedCount = newBooks.length;
      const mergedCount = importedBooks.length - newBooks.length;

      if (addedCount === 0 && mergedCount === 0) {
        toast.info("All books from import already exist in your collection");
      } else {
        let message = '';
        if (addedCount > 0 && mergedCount > 0) {
          message = `Added ${addedCount} new books and merged ${mergedCount} duplicates`;
        } else if (addedCount > 0) {
          message = `Imported ${addedCount} new books`;
        } else {
          message = `Merged ${mergedCount} books with existing collection`;
        }
        toast.success(message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import books");
      console.error('❌ JSON import error:', error);
    } finally {
      setIsImportingJSON(false);
    }
    
    event.target.value = "";
  };

  const handleGoodReadsImport = async (file: File) => {
    setIsImportingGoodReads(true);
    setImportProgress({ current: 0, total: 0, message: "Starting import..." });
    
    try {
      toast.info("Importing Goodreads CSV... This may take a moment as we enrich the data.");
      
      const importedBooks = await importGoodReadsCSV(file, (current, total, message) => {
        setImportProgress({ current, total, message });
      });
      
      if (importedBooks.length === 0) {
        toast.error("No valid books found in the Goodreads export");
      } else {
        const { updatedBooks, newBooks } = processImportWithMerge(importedBooks, books);
        setBooks(updatedBooks);
        
        const addedCount = newBooks.length;
        const mergedCount = importedBooks.length - newBooks.length;
        
        let message = '';
        if (addedCount > 0 && mergedCount > 0) {
          message = `Added ${addedCount} new books and merged ${mergedCount} duplicates from Goodreads`;
        } else if (addedCount > 0) {
          message = `Imported ${addedCount} books from Goodreads`;
        } else if (mergedCount > 0) {
          message = `Merged ${mergedCount} books with existing collection from Goodreads`;
        } else {
          message = "No new books to import from Goodreads";
        }
        
        toast.success(message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import Goodreads CSV");
    } finally {
      setIsImportingGoodReads(false);
    }
  };

  return {
    books,
    connections,
    searchResults,
    selectedBook,
    existingBookIds,
    
    isSearching,
    isAnalyzing,
    isImportingGoodReads,
    isImportingJSON,
    importProgress,
    
    editingBook,
    showEditDialog,
    showHelpModal,
    showConnectionsModal,
    connectionModalBook,
    visibleConnectionTypes,
    selectedBookId,
    
    setSelectedBookId,
    setSearchResults,
    setEditingBook,
    setShowEditDialog,
    setShowHelpModal,
    setShowConnectionsModal,
    setConnectionModalBook,
    setVisibleConnectionTypes,
    
    handleSearch,
    handleAddBook,
    handleRemoveBook,
    handleEditBook,
    handleSaveBook,
    handleAnalyzeConnections,
    handleExport,
    handleImport,
    handleGoodReadsImport,
  };
}
