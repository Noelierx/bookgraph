import { Book, BookConnection, RelationshipType } from "@/types/book";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, BookOpen, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookConnectionsModalProps {
  book: Book;
  connections: BookConnection[];
  allBooks: Book[];
  visibleTypes: Set<RelationshipType>;
  onClose: () => void;
  onBookClick: (bookId: string) => void;
}

const RELATIONSHIP_COLORS = {
  "similar-themes": "bg-purple-500",
  "similar-plots": "bg-orange-500",
  "similar-concepts": "bg-cyan-500",
  "common-subjects": "bg-green-500",
};

const RELATIONSHIP_LABELS = {
  "similar-themes": "Similar Themes",
  "similar-plots": "Similar Plots",
  "similar-concepts": "Similar Concepts",
  "common-subjects": "Common Subjects",
};

export function BookConnectionsModal({ 
  book, 
  connections, 
  allBooks, 
  visibleTypes,
  onClose, 
  onBookClick 
}: BookConnectionsModalProps) {
  // Find all connections for this book that match the current filters
  const bookConnections = connections.filter(
    conn => (conn.source === book.id || conn.target === book.id) &&
            visibleTypes.has(conn.type || "similar-concepts")
  );

  // Check if all types are selected (to show appropriate message)
  const allTypesSelected = visibleTypes.size === Object.keys(RELATIONSHIP_LABELS).length;

  const getConnectedBook = (connection: BookConnection): Book | undefined => {
    const connectedBookId = connection.source === book.id 
      ? connection.target 
      : connection.source;
    return allBooks.find(b => b.id === connectedBookId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <div>
                <CardTitle 
                  className="text-lg hover:text-primary cursor-pointer transition-colors flex items-center gap-2"
                  onClick={() => onBookClick(book.id)}
                  title="Click to view book details"
                >
                  {book.title}
                  <ExternalLink className="w-4 h-4 opacity-60" />
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  by {book.author} • {bookConnections.length} 
                  {allTypesSelected ? '' : ' filtered'} connections
                  {!allTypesSelected && (
                    <span className="ml-1 text-xs opacity-75">
                      (some types hidden)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            {bookConnections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                {allTypesSelected ? (
                  <>
                    <p>No connections found for this book.</p>
                    {!book.description ? (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                        <p className="text-sm font-medium">Missing description for analysis</p>
                        <p className="text-xs mt-1">
                          This book is missing a description needed for connection analysis.
                        </p>
                        <p className="text-xs mt-1">Try enriching the book data first.</p>
                      </div>
                    ) : (
                      <p className="text-sm">Try analyzing connections first.</p>
                    )}
                  </>
                ) : (
                  <>
                    <p>No connections match the current filters.</p>
                    <p className="text-sm">Try enabling more connection types or clear filters.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {bookConnections.map((connection, index) => {
                  const connectedBook = getConnectedBook(connection);
                  if (!connectedBook) return null;

                  return (
                    <div
                      key={`${connection.source}-${connection.target}-${index}`}
                      className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/50"
                      onClick={() => onBookClick(connectedBook.id)}
                    >
                      {/* Book Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{connectedBook.title}</h4>
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          by {connectedBook.author}
                          {connectedBook.publishYear && (
                            <span className="ml-2">({connectedBook.publishYear})</span>
                          )}
                        </p>
                      </div>

                      {/* Connection Details */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={`${RELATIONSHIP_COLORS[connection.type || "similar-concepts"]} text-white text-xs`}
                          >
                            {RELATIONSHIP_LABELS[connection.type || "similar-concepts"]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.round((connection.strength || 0) * 100)}%
                          </span>
                        </div>
                        
                        {connection.reason && (
                          <p className="text-xs text-muted-foreground text-right max-w-xs">
                            {connection.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
