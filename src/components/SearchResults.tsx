import { Book } from "@/types/book";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResultsProps {
  books: Book[];
  onAddBook: (book: Book) => void;
  existingBookIds: Set<string>;
}

export function SearchResults({ books, onAddBook, existingBookIds }: SearchResultsProps) {
  if (books.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Search Results</CardTitle>
        <CardDescription>Click to add books to your collection</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {books.map((book) => {
              const isAdded = existingBookIds.has(book.id);
              return (
                <Card key={book.id} className="overflow-hidden">
                  <div className="flex gap-4 p-4">
                    {book.coverUrl && (
                      <img 
                        src={book.coverUrl} 
                        alt={book.title}
                        className="w-16 h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{book.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                      {book.publishYear && (
                        <p className="text-xs text-muted-foreground mt-1">{book.publishYear}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={isAdded ? "secondary" : "default"}
                      onClick={() => onAddBook(book)}
                      disabled={isAdded}
                      className="shrink-0"
                    >
                      {isAdded ? (
                        "Added"
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
