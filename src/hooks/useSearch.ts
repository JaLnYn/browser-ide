// src/hooks/useSearch.ts
import { useState, useCallback, useEffect } from "react";
import { useWebSocketWithResponse } from "./useWebSocket";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { useToast } from "@/hooks/use-toast";

export interface SearchResultItem {
  path: string;
  line_number: number;
  content: string;
}

export function useSearch() {
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const [previousQuery, setPreviousQuery] = useState<string>("");
  const { sendMessage } = useWebSocketWithResponse();
  const { sendMessage: sendRawMessage, lastMessage } = useWebSocketContext();
  const { toast } = useToast();

  const search = useCallback(
    async (query: string, searchContent: boolean = false) => {
      try {
        console.log("sending search", query);
        // // Only search if query is at least 2 chars different from previous
        // const queryDiff = query.length - previousQuery.length;
        // if (Math.abs(queryDiff) < 2 && query !== "") {
        //   return;
        // }
        setPreviousQuery(query);

        setIsSearching(true);
        setResults([]);

        const message = {
          type: "Search",
          content: {
            query,
            search_content: searchContent,
          } as any,
        };

        // Only include id if we have one from a previous search
        if (currentSearchId) {
          message.content.id = currentSearchId;
        } else {
          message.content.id = "noid";
        }

        sendRawMessage(JSON.stringify(message));
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Search failed",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
        setIsSearching(false);
      }
    },
    [sendMessage, toast, currentSearchId, previousQuery]
  );

  const cancelSearch = useCallback(async () => {
    if (!currentSearchId) return;

    try {
      sendRawMessage(
        JSON.stringify({
          type: "CancelSearch",
        })
      );
      setIsSearching(false);
      setCurrentSearchId(null);
    } catch (error) {
      console.error("Failed to cancel search:", error);
    }
  }, [sendMessage, currentSearchId]);

  // Handle incoming search results
  useEffect(() => {
    if (!lastMessage?.data) return;

    try {
      const data = JSON.parse(lastMessage.data);

      if (data.type === "SearchResults") {
        const { search_id, items, is_complete } = data.content;

        // Store the search ID if we receive one
        if (search_id && !currentSearchId) {
          setCurrentSearchId(search_id);
        }

        setResults((prev) => [...items]);
        if (is_complete) {
          setIsSearching(false);
        }
      } else if (data.type === "Error") {
        toast({
          variant: "destructive",
          title: "Search error",
          description: data.content.message,
        });
        setIsSearching(false);
      }
    } catch (error) {
      console.error("Error processing search message:", error);
    }
  }, [lastMessage, toast, currentSearchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentSearchId) {
        // Cancel any ongoing search
        sendRawMessage(
          JSON.stringify({
            type: "CancelSearch",
            content: {},
          })
        );
      }
    };
  }, [currentSearchId, sendMessage]);

  return {
    results,
    isSearching,
    search,
    cancelSearch,
  };
}
