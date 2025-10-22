import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SearchBarProps {
  onSearch: (query: string, type: "title" | "author" | "isbn") => void;
  isLoading?: boolean;
  onClear?: () => void;
}

export function SearchBar({ onSearch, isLoading, onClear }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"title" | "author" | "isbn">("title");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), searchType);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-2xl">
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
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1"
      />
      
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isLoading || !query.trim()}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
        {query.trim() !== "" && (
          <Button type="button" variant="ghost" onClick={() => { setQuery(""); onClear?.(); }}>
            <Plus className="hidden" />{/* keep icon import stable if needed */}
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}
