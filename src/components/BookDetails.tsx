import { Book } from "@/types/book";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Edit, ExternalLink } from "lucide-react";

interface BookDetailsProps {
  book: Book;
  onClose: () => void;
  onEdit: (book: Book) => void;
  onRemove: (bookId: string) => void;
}

export function BookDetails({ book, onClose, onEdit, onRemove }: BookDetailsProps) {
  return (
    <Card className="w-full h-full overflow-auto">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1 flex-1">
          <CardTitle className="text-xl">{book.title}</CardTitle>
          <CardDescription className="text-base">{book.author}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {book.coverUrl && (
          <img 
            src={book.coverUrl} 
            alt={book.title}
            className="w-full max-w-[200px] h-auto rounded-lg shadow-lg mx-auto"
          />
        )}
        
        <div className="space-y-2">
          {book.publishYear && (
            <div className="text-sm">
              <span className="text-muted-foreground">Published:</span> {book.publishYear}
            </div>
          )}
          
          {book.isbn && (
            <div className="text-sm">
              <span className="text-muted-foreground">ISBN:</span> {book.isbn}
            </div>
          )}
          
          {book.subjects && book.subjects.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Subjects:</div>
              <div className="flex flex-wrap gap-2">
                {book.subjects.map((subject, idx) => (
                  <Badge key={idx} variant="secondary">
                    {subject}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {book.description && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Description:</div>
              <p className="text-sm leading-relaxed">{book.description}</p>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={() => onEdit(book)} className="flex-1">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => onRemove(book.id)} className="flex-1">
            Remove
          </Button>
          {book.id.startsWith("/works/") && (
            <Button variant="outline" size="icon" asChild>
              <a href={`https://openlibrary.org${book.id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
