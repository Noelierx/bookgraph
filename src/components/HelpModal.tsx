import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Upload } from "lucide-react";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpModal({ open, onClose }: HelpModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative max-w-2xl w-full mx-4 bg-card rounded-lg border border-border p-6 shadow-lg max-h-[80vh] overflow-y-auto">
        <h2 id="help-modal-title" className="text-xl font-semibold mb-4">BookGraph User Guide</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Data Import and Export
          </h3>
          
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Download className="w-4 h-4" />
                Native JSON Export/Import
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-100 mb-2">
                Save and restore your complete BookGraph collection with all enriched metadata.
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li><strong>Export:</strong> "Export" button to save your collection</li>
                <li><strong>Import:</strong> "Import" button to restore a saved collection</li>
                <li><strong>Format:</strong> Native BookGraph JSON file (.json)</li>
                <li><strong>Effect:</strong> Merges with your current collection (does not replace)</li>
              </ul>
            </div>
            
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-medium mb-2 flex items-center gap-2 text-green-900 dark:text-green-100">
                <FileText className="w-4 h-4" />
                Goodreads CSV Import
              </h4>
              <p className="text-sm text-green-800 dark:text-green-100 mb-2">
                Add books from your Goodreads export to your existing collection.
              </p>
              <ul className="text-sm text-green-700 dark:text-green-200 space-y-1 list-disc list-inside mb-3">
                <li><strong>Button:</strong> "Import Goodreads CSV" in the search bar</li>
                <li><strong>Format:</strong> CSV file exported from Goodreads (.csv)</li>
                <li><strong>Effect:</strong> Adds new books to your collection (no replacement)</li>
                <li><strong>Deduplication:</strong> Automatically avoids duplicates</li>
                <li><strong>Data:</strong> Title, author, ISBN, review, shelves/subjects</li>
              </ul>
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded border border-green-300 dark:border-green-700">
                <p className="text-xs text-green-900 dark:text-green-100">
                  <strong>Need help exporting from Goodreads?</strong>{" "}
                  <a 
                    href="https://help.goodreads.com/s/article/How-do-I-import-or-export-my-books-1553870934590" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-green-700 dark:hover:text-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    See Goodreads export guide →
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        {/* Section Connexions */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Improving book connections</h3>
          <p className="text-sm text-foreground mb-3">
            If a book doesn't connect to others in the graph:
          </p>
          <ul className="list-disc list-inside text-sm space-y-2">
            <li><strong>Check the description:</strong> Descriptions help semantic analysis</li>
            <li><strong>Edit the book:</strong> Use the "Edit" button to improve description/subjects/author</li>
            <li><strong>Re-run analysis:</strong> Click "Analyze" after your modifications</li>
            <li><strong>Add more books:</strong> A too small collection limits connections</li>
            <li><strong>Automatic enrichment:</strong> Search automatically enriches metadata</li>
          </ul>
        </div>
        
        <Separator className="my-6" />
        
        {/* Section Recherche */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Search and enrichment</h3>
          <ul className="list-disc list-inside text-sm space-y-2">
            <li><strong>OpenLibrary search:</strong> Uses OpenLibrary for book search and metadata</li>
            <li><strong>Search types:</strong> By title, author or ISBN</li>
            <li><strong>Automatic enrichment:</strong> Adds descriptions, subjects, covers and analytics</li>
            <li><strong>Deduplication:</strong> Automatically avoids duplicates in results</li>
          </ul>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            aria-label="Close help modal"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
