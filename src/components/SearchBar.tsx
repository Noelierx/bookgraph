import { useState } from "react";
import { Search, FileText, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SearchBarProps {
  onSearch: (query: string, type: "title" | "author" | "isbn") => void;
  onGoodReadsImport?: (file: File) => void;
  onManualAdd?: () => void;
  isLoading?: boolean;
  isImportingGoodReads?: boolean;
  onClear?: () => void;
}

export function SearchBar({ onSearch, isLoading, onClear, onGoodReadsImport, isImportingGoodReads, onManualAdd }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"title" | "author" | "isbn">("title");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), searchType);
    }
  };

  const handleGoodReadsImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onGoodReadsImport) {
      onGoodReadsImport(file);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
      <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:flex-1">
        <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="author">Author</SelectItem>
            <SelectItem value="isbn">ISBN</SelectItem>
          </SelectContent>
        </Select>
        
        <Input
          type="text"
          placeholder={`Search by ${searchType}...`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim() === "") {
              onClear?.();
            }
          }}
          className="flex-1"
        />
        
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin sm:mr-2" />
            ) : (
              <Search className="w-4 h-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">{isLoading ? "Searching..." : "Search"}</span>
          </Button>
          
          {query.trim() !== "" && (
            <Button type="button" variant="ghost" onClick={() => { setQuery(""); onClear?.(); }}>
              Clear
            </Button>
          )}
        </div>
      </form>

      <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
        {onManualAdd && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onManualAdd} 
            title="Add book manually"
            className="flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Add Book</span>
          </Button>
        )}
        
        {onGoodReadsImport && (
          <Button 
            variant="outline" 
            asChild={!isImportingGoodReads} 
            disabled={isImportingGoodReads} 
            className="flex-1 sm:flex-initial text-sm whitespace-nowrap"
            title="Import from GoodReads"
          >
            {isImportingGoodReads ? (
              <div className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importing...</span>
              </div>
            ) : (
              <label className="cursor-pointer flex items-center gap-2 justify-center">
                <FileText className="w-4 h-4" />
                <span>Import from GoodReads</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleGoodReadsImport}
                />
              </label>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
