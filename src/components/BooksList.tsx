import React, { useMemo, useState } from "react";
import { Book } from "@/types/book";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BooksListProps {
  books: Book[];
  onSelect: (id: string) => void;
  onEdit: (book: Book) => void;
  onRemove: (id: string) => void;
}

export function BooksList({ books, onSelect, onEdit, onRemove }: BooksListProps) {
  const [query, setQuery] = useState("");

  const truncateTitle = (t: string) => (t && t.length > 20 ? t.slice(0, 20) + "..." : t);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      (b.author || "").toLowerCase().includes(q) ||
      (b.isbn || "").toLowerCase().includes(q)
    );
  }, [books, query]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search books..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button variant="ghost" onClick={() => setQuery("")}>Clear</Button>
      </div>

      <div className="space-y-2 max-h-[260px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">No books</div>
        ) : (
          filtered.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-2 border rounded-md bg-card/60">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{truncateTitle(b.title)}</div>
                <div className="text-xs text-muted-foreground truncate">{b.author}{b.isbn ? ` • ${b.isbn}` : ""}</div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <Button size="icon" variant="ghost" onClick={() => onSelect(b.id)} title="Open details">
                  Open
                </Button>
                <Button size="icon" variant="outline" onClick={() => onEdit(b)} title="Edit">
                  Edit
                </Button>
                <Button size="icon" variant="destructive" onClick={() => onRemove(b.id)} title="Remove">
                  Del
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}