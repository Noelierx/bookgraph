import { useMemo } from "react";
import { GraphData } from "@/types/book";
import { SearchBar } from "@/components/SearchBar";
import { BookGraphD3 } from "@/components/BookGraphD3";
import { BookDetails } from "@/components/BookDetails";
import { SearchResults } from "@/components/SearchResults";
import { EditBookDialog } from "@/components/EditBookDialog";
import { BooksList } from "@/components/BooksList";
import { BookConnectionsModal } from "@/components/BookConnectionsModal";
import { AppHeader } from "@/components/AppHeader";
import { ImportProgress } from "@/components/ImportProgress";
import { BookOpen } from "lucide-react";
import HelpModal from "@/components/HelpModal";
import { useBookManagement } from "@/hooks/useBookManagement";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const {
    // State
    books,
    connections,
    searchResults,
    selectedBook,
    existingBookIds,
    
    // Loading states
    isSearching,
    isAnalyzing,
    isImportingGoodReads,
    isImportingJSON,
    importProgress,
    
    // Modal states
    editingBook,
    showEditDialog,
    showHelpModal,
    showConnectionsModal,
    connectionModalBook,
    visibleConnectionTypes,
    selectedBookId,
    
    // Setters
    setSelectedBookId,
    setSearchResults,
    setShowEditDialog,
    setShowHelpModal,
    setShowConnectionsModal,
    setConnectionModalBook,
    setVisibleConnectionTypes,
    
    // Handlers
    handleSearch,
    handleAddBook,
    handleRemoveBook,
    handleEditBook,
    handleSaveBook,
    handleAnalyzeConnections,
    handleExport,
    handleImport,
    handleGoodReadsImport,
  } = useBookManagement();

  const isMobile = useIsMobile();

  const handleVisibleTypesChange = (newVisibleTypes: Set<any>) => {
    setVisibleConnectionTypes(newVisibleTypes);
  };

  const handleNodeClick = (nodeId: string) => {
    const book = books.find(b => b.id === nodeId);
    if (book) {
      setConnectionModalBook(book);
      setShowConnectionsModal(true);
    }
  };

  const handleCloseConnectionsModal = () => {
    setShowConnectionsModal(false);
    setConnectionModalBook(null);
  };

  const handleConnectionBookClick = (bookId: string) => {
    setSelectedBookId(bookId);
    setShowConnectionsModal(false);
    setConnectionModalBook(null);
  };

  const handleAddCustomBook = () => {
    setShowEditDialog(true);
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

  // Détermine quel modal de progression afficher
  const getProgressModal = () => {
    if (isAnalyzing) return { isVisible: true, type: "analysis" as const };
    if (isImportingGoodReads) return { isVisible: true, type: "goodreads" as const };
    if (isImportingJSON) return { isVisible: true, type: "json" as const };
    return { isVisible: false, type: "analysis" as const };
  };

  const { isVisible: showProgress, type: progressType } = getProgressModal();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        books={books}
        isAnalyzing={isAnalyzing}
        isImportingJSON={isImportingJSON}
        onAnalyze={handleAnalyzeConnections}
        onExport={handleExport}
        onImport={handleImport}
        onShowHelp={() => setShowHelpModal(true)}
      />

      <div className="container mx-auto px-4 py-4">
        <SearchBar
          onSearch={handleSearch}
          onGoodReadsImport={handleGoodReadsImport}
          onManualAdd={handleAddCustomBook}
          isLoading={isSearching}
          isImportingGoodReads={isImportingGoodReads}
          onClear={() => setSearchResults([])}
        />
        
        {searchResults.length > 0 && (
          <div className="mt-4">
            <SearchResults
              books={searchResults}
              onAddBook={handleAddBook}
              existingBookIds={existingBookIds}
            />
          </div>
        )}
      </div>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {books.length === 0 ? (
              <div className="flex items-center justify-center h-[600px] bg-card/50 rounded-lg border border-border">
                <div className="text-center space-y-4 max-w-md px-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-primary flex items-center justify-center shadow-glow-primary">
                    <BookOpen className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold">Start Your Book Journey</h2>
                  <p className="text-muted-foreground">
                    Search for books or add them manually to build your reading network and discover fascinating connections.
                  </p>
                </div>
              </div>
            ) : (
              <BookGraphD3
                data={graphData}
                onNodeClick={handleNodeClick}
                onVisibleTypesChange={handleVisibleTypesChange}
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
          
          <div className="space-y-6">
            {selectedBook && (
              <BookDetails
                book={selectedBook}
                onClose={() => setSelectedBookId(null)}
                onEdit={handleEditBook}
                onRemove={handleRemoveBook}
              />
            )}
            {books.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">All books</h3>
                <BooksList
                  books={books}
                  onSelect={(id) => setSelectedBookId(id)}
                  onEdit={handleEditBook}
                  onRemove={handleRemoveBook}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modales */}
      <EditBookDialog
        book={editingBook}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleSaveBook}
      />

      <HelpModal open={showHelpModal} onClose={() => setShowHelpModal(false)} />

      <ImportProgress
        isVisible={showProgress}
        current={importProgress.current}
        total={importProgress.total}
        message={importProgress.message}
        type={progressType}
      />

      {showConnectionsModal && connectionModalBook && (
        <BookConnectionsModal
          book={connectionModalBook}
          connections={connections}
          allBooks={books}
          visibleTypes={visibleConnectionTypes}
          onClose={handleCloseConnectionsModal}
          onBookClick={handleConnectionBookClick}
        />
      )}
    </div>
  );
};

export default Index;
