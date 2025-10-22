import { useState } from "react";
import { Book } from "@/types/book";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface EditBookDialogProps {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (book: Book) => void;
}

export function EditBookDialog({ book, open, onOpenChange, onSave }: EditBookDialogProps) {
  const [formData, setFormData] = useState<Book>(
    book || {
      id: `custom-${Date.now()}`,
      title: "",
      author: "",
      description: "",
      isbn: "",
      publishYear: "",
      subjects: [],
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  const handleChange = (field: keyof Book, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{book ? "Edit Book" : "Add Custom Book"}</DialogTitle>
          <DialogDescription>
            {book ? "Update book information" : "Add a book manually"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="author">Author *</Label>
            <Input
              id="author"
              value={formData.author}
              onChange={(e) => handleChange("author", e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="isbn">ISBN</Label>
            <Input
              id="isbn"
              value={formData.isbn || ""}
              onChange={(e) => handleChange("isbn", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="publishYear">Publish Year</Label>
            <Input
              id="publishYear"
              value={formData.publishYear || ""}
              onChange={(e) => handleChange("publishYear", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={5}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subjects">Subjects (comma-separated)</Label>
            <Input
              id="subjects"
              value={formData.subjects?.join(", ") || ""}
              onChange={(e) => handleChange("subjects", e.target.value)}
              placeholder="e.g., Fiction, Science, History"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Book</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
