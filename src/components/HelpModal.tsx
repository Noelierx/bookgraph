import React from "react";
import { Button } from "@/components/ui/button";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative max-w-xl w-full mx-4 bg-card rounded-lg border border-border p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-2">Tips for connections</h2>
            <p className="text-sm text-muted-foreground mb-4">
              If a book you added does not connect to the others:
            </p>
            <ul className="list-disc list-inside text-sm space-y-2 mb-4">
              <li>Check that a description is provided — descriptions help semantic analysis. </li>
              <li>Edit the book (Edit button) and add or improve the description/subjects/author.</li>
              <li>Click Analyze to restart the connection calculation after editing.</li>
              <li>Add more books if the collection is too small to establish relevant links.</li>
            </ul>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
