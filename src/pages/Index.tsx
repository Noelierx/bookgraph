import { useState, useEffect, useMemo } from "react";
import { Book, BookConnection, GraphData } from "@/types/book";
import { SearchBar } from "@/components/SearchBar";
import { BookGraph } from "@/components/BookGraph";
import { BookDetails } from "@/components/BookDetails";
import { SearchResults } from "@/components/SearchResults";
import { EditBookDialog } from "@/components/EditBookDialog";
import { Button } from "@/components/ui/button";
import { Plus, Library, RefreshCw, Download, Upload } from "lucide-react";
import { searchBooks } from "@/services/openLibraryService";
import { analyzeBookConnections } from "@/services/connectionService";
import { exportBooksToJSON, importBooksFromJSON } from "@/services/importExportService";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY = "book-graph-data";

const Index = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [connections, setConnections] = useState<BookConnection[]>([]);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const isMobile = useIsMobile();

  // Load books from localStorage on mount
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

  // Save books to localStorage whenever they change
  useEffect(() => {
    if (books.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    }
  }, [books]);

  const handleSearch = async (query: string, type: "title" | "author" | "isbn") => {
    setIsSearching(true);
    try {
      const results = await searchBooks(query, type);
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

  const handleAddCustomBook = () => {
    setEditingBook(null);
    setShowEditDialog(true);
  };

  const handleAnalyzeConnections = async () => {
    if (books.length < 2) {
      toast.info("Add at least 2 books to see connections");
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const newConnections = await analyzeBookConnections(books);
      setConnections(newConnections);
      toast.success("Connections analyzed!");
    } catch (error) {
      toast.error("Failed to analyze connections");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
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
    
    try {
      const importedBooks = await importBooksFromJSON(file);
      
      // Merge with existing books, avoiding duplicates
      const existingIds = new Set(books.map(b => b.id));
      const newBooks = importedBooks.filter(b => !existingIds.has(b.id));
      
      if (newBooks.length === 0) {
        toast.info("All books from import already exist in your collection");
      } else {
        setBooks([...books, ...newBooks]);
        toast.success(`Imported ${newBooks.length} new books`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import books");
      console.error(error);
    }
    
    // Reset file input
    event.target.value = "";
  };

  const graphData: GraphData = useMemo(() => {
    return {
      nodes: books.map(book => ({
        id: book.id,
        name: book.title.length > 30 ? book.title.substring(0, 30) + "..." : book.title,
        book,
      })),
      links: connections,
    };
  }, [books, connections]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow-primary">
                <Library className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">BookGraph</h1>
                <p className="text-sm text-muted-foreground">Discover hidden connections in your reading</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport} disabled={books.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>
              </Button>
              <Button variant="outline" onClick={handleAnalyzeConnections} disabled={isAnalyzing || books.length < 2}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? "animate-spin" : ""}`} />
                Analyze
              </Button>
              <Button onClick={handleAddCustomBook}>
                <Plus className="w-4 h-4 mr-2" />
                Add Book
              </Button>
            </div>
          </div>
          
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph Visualization */}
          <div className="lg:col-span-2">
            {books.length === 0 ? (
              <div className="flex items-center justify-center h-[600px] bg-card/50 rounded-lg border border-border">
                <div className="text-center space-y-4 max-w-md px-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-primary flex items-center justify-center shadow-glow-primary">
                    <Library className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold">Start Your Book Journey</h2>
                  <p className="text-muted-foreground">
                    Search for books or add them manually to build your reading network and discover fascinating connections.
                  </p>
                </div>
              </div>
            ) : (
              <BookGraph
                data={graphData}
                onNodeClick={setSelectedBookId}
                width={isMobile ? window.innerWidth - 32 : undefined}
                height={600}
              />
            )}
            
            {books.length > 0 && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <span className="font-medium">{books.length}</span> books in your collection
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {selectedBook && (
              <BookDetails
                book={selectedBook}
                onClose={() => setSelectedBookId(null)}
                onEdit={handleEditBook}
                onRemove={handleRemoveBook}
              />
            )}
            
            {searchResults.length > 0 && (
              <SearchResults
                books={searchResults}
                onAddBook={handleAddBook}
                existingBookIds={existingBookIds}
              />
            )}
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      <EditBookDialog
        book={editingBook}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleSaveBook}
      />
    </div>
  );
};

export default Index;
