// src/components/SearchPanel.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Search, XCircle, Loader2, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toggle } from "@/components/ui/toggle";
import { SearchResultItem } from "@/hooks/useSearch";

interface SearchPanelProps {
  results: SearchResultItem[];
  isSearching: boolean;
  onSearch: (query: string, searchFilenameOnly: boolean) => void;
  onCancel: () => void;
  onResultClick: (path: string, line: number) => void;
}

export function SearchPanel({
  results,
  isSearching,
  onSearch,
  onCancel,
  onResultClick,
}: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [searchFilenameOnly, setSearchFilenameOnly] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSearch = useCallback(
    (query: string, searchFilenameOnly: boolean) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        if (query.length >= 2) {
          // Only search if 2+ characters
          onSearch(query, !searchFilenameOnly);
        }
      }, 300); // 300ms delay
    },
    [onSearch]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query, !searchFilenameOnly);
      }
    },
    [query, searchFilenameOnly, onSearch]
  );

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <form
        onSubmit={handleSubmit}
        className="flex-none p-4 gap-2 border-b bg-background"
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => {
                const newQuery = e.target.value;
                setQuery(newQuery);
                debouncedSearch(newQuery, searchFilenameOnly);
              }}
              placeholder="Search in files..."
              className="pr-8"
            />
            {isSearching && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={onCancel}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Toggle
            pressed={searchFilenameOnly}
            onPressedChange={setSearchFilenameOnly}
            aria-label="Search filenames only"
          >
            {searchFilenameOnly ? "Files only" : "Files and content"}
          </Toggle>
          <Button type="submit" disabled={isSearching || !query.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {results.length === 0 && !isSearching && query && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No results found
            </div>
          )}
          {results.map((result, i) => (
            <button
              key={`${result.path}-${result.line_number}-${i}`}
              className="w-full text-left p-2 hover:bg-accent rounded-sm"
              onClick={() => onResultClick(result.path, result.line_number)}
            >
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 flex-none" />
                <span className="text-muted-foreground">
                  {result.path}:{result.line_number}
                </span>
              </div>
              <p className="mt-1 text-sm font-mono whitespace-pre-wrap">
                {result.content}
              </p>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
