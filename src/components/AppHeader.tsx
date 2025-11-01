import { Button } from "@/components/ui/button";
import { BookOpen, RefreshCw, Download, Upload, Info } from "lucide-react";

interface HeaderActionsProps {
  books: any[];
  isAnalyzing: boolean;
  isImportingJSON: boolean;
  onAnalyze: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onShowHelp: () => void;
}

export function HeaderActions({
  books,
  isAnalyzing,
  isImportingJSON,
  onAnalyze,
  onExport,
  onImport,
  onShowHelp
}: HeaderActionsProps) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onExport} disabled={books.length === 0} aria-label="Export">
        <Download className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline ml-2">Export</span>
      </Button>
      
      <Button variant="outline" asChild={!isImportingJSON} disabled={isImportingJSON} aria-label="Import">
        {isImportingJSON ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Importing...</span>
          </div>
        ) : (
          <label className="cursor-pointer flex items-center">
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline ml-2">Import</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={onImport}
            />
          </label>
        )}
      </Button>
      
      <Button variant="outline" onClick={onAnalyze} disabled={isAnalyzing || books.length < 2} aria-label="Analyze">
        <RefreshCw className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} aria-hidden="true" />
        <span className="hidden sm:inline ml-2">Analyze</span>
      </Button>
      
      <Button variant="ghost" onClick={onShowHelp} aria-label="Help">
        <Info className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline ml-2">Help</span>
      </Button>
    </div>
  );
}

interface AppHeaderProps {
  onAnalyze: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onShowHelp: () => void;
  books: any[];
  isAnalyzing: boolean;
  isImportingJSON: boolean;
}

export function AppHeader({
  onAnalyze,
  onExport,
  onImport,
  onShowHelp,
  books,
  isAnalyzing,
  isImportingJSON
}: AppHeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow-primary">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">BookGraph</h1>
              <p className="text-sm text-muted-foreground">Discover hidden connections in your reading</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start mb-4">
          <HeaderActions
            books={books}
            isAnalyzing={isAnalyzing}
            isImportingJSON={isImportingJSON}
            onAnalyze={onAnalyze}
            onExport={onExport}
            onImport={onImport}
            onShowHelp={onShowHelp}
          />
        </div>
      </div>
    </header>
  );
}
