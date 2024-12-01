// hooks/useEditorState.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { useFileSystem } from "./useFileSystem";
import { useToast } from "@/hooks/use-toast";
import { debounce } from "../utils/debounce";
import { computeDocumentChanges } from "../utils/diff-utils";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { useWebSocketWithResponse } from "./useWebSocket";

interface Tab {
  id: string;
  path: string;
  content: string;
  isDirty?: boolean;
  language?: string;
  version: number; // Added version tracking
  lastSavedContent?: string; // Track last saved content for diff calculation
}

export function useEditorState() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set<string>());
  const { toast } = useToast();

  const latestContentRef = useRef<{ [tabId: string]: string }>({});

  const handleFileContent = useCallback(
    (path: string, content: string, version: number) => {
      const tabId = `tab-${Date.now()}`;
      setTabs((prev) => {
        const existingTab = prev.find((tab) => tab.path === path);
        if (existingTab) {
          if (existingTab.version < version) {
            return prev.map((tab) =>
              tab.path === path
                ? {
                    ...tab,
                    content,
                    version,
                    isDirty: false,
                    lastSavedContent: content,
                  }
                : tab,
            );
          }
          return prev;
        }

        return [
          ...prev,
          {
            id: tabId,
            path,
            content,
            version,
            isDirty: false,
            lastSavedContent: content,
            language: getLanguageFromPath(path),
          },
        ];
      });

      setActiveTabId(tabId);
    },
    [],
  );

  const pendingChangesRef = useRef<{ [tabId: string]: boolean }>({});

  // File system integration with version handling
  const { fileTree, loading, connected, rootPath, setLoading } = useFileSystem({
    onFileContent: handleFileContent,
  });

  // no need sendMessage. remove later

  const tabsRef = useRef(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const { sendMessage } = useWebSocketWithResponse();

  // Create debounced change sender
  const sendChanges = useCallback(
    debounce(async (tabId: string, newContent: string) => {
      const tab = tabsRef.current.find((t) => t.id === tabId);
      if (!tab) return;

      // Get the previous content - either from our latest content ref or fall back to lastSavedContent
      const previousContent =
        latestContentRef.current[tabId] || tab.lastSavedContent || "";

      console.log("Computing changes from content:", {
        tabId,
        previousLength: previousContent.length,
        newLength: newContent.length,
      });

      const changes = computeDocumentChanges(previousContent, newContent);

      try {
        console.log("Sending changes:", {
          tabId,
          version: tab.version + 1,
          changes,
        });

        const response = await sendMessage(
          JSON.stringify({
            type: "ChangeFile",
            content: {
              document: {
                uri: tab.path,
                version: tab.version + 1,
              },
              changes,
            },
          }),
        );

        const data = JSON.parse(response as string);

        if (data.type === "ChangeSuccess") {
          console.log("Change success received:", data);
          // Update our latest content ref after successful change
          latestContentRef.current[tabId] = newContent;

          setTabs((prev) =>
            prev.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    version: data.content.document.version,
                  }
                : t,
            ),
          );
        } else if (data.type === "Error") {
          throw new Error(data.content.message);
        }
      } catch (error) {
        console.error("Change failed:", error);
        toast({
          variant: "destructive",
          title: "Change failed",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });

        // On error, reset the tab content to the last known good state
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  content:
                    latestContentRef.current[tabId] || t.lastSavedContent || "",
                  isDirty: false,
                }
              : t,
          ),
        );
      }
    }, 300),
    [sendMessage, toast],
  );

  const updateTabContent = useCallback(
    (tabId: string, newContent: string) => {
      console.log("Content update triggered for tab:", tabId);

      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId
            ? {
                ...tab,
                content: newContent,
                isDirty: newContent !== tab.lastSavedContent,
              }
            : tab,
        ),
      );

      sendChanges(tabId, newContent);
    },
    [sendChanges],
  );

  // Add logging to track state updates

  const saveTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || !tab.isDirty) return;

      try {
        // Calculate final changes for saving

        const response = await sendMessage(
          JSON.stringify({
            type: "SaveFile",
            content: {
              document: {
                uri: tab.path,
                version: tab.version + 1,
              },
            },
          }),
        );

        const data = JSON.parse(response as string);

        if (data.type === "SaveSuccess") {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    isDirty: false,
                    version: data.content.document.version,
                    lastSavedContent: t.content,
                  }
                : t,
            ),
          );

          toast({
            title: "File saved",
            description: `Successfully saved ${tab.path}`,
          });
        } else if (data.type === "Error") {
          throw new Error(data.content.message);
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Save failed",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    [tabs, sendMessage, toast],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      if (tab.isDirty) {
        // Show confirmation dialog before closing
        if (!window.confirm("You have unsaved changes. Close anyway?")) {
          return;
        }
      }

      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId && newTabs.length > 0) {
          setActiveTabId(newTabs[newTabs.length - 1].id);
        } else if (newTabs.length === 0) {
          setActiveTabId(null);
        }
        return newTabs;
      });

      delete latestContentRef.current[tabId];

      // Notify server about file close
      sendMessage(
        JSON.stringify({
          type: "CloseFile",
          content: { path: rootPath + tab.path },
        }),
      );
    },
    [activeTabId, tabs, rootPath, sendMessage],
  );

  // Make sure this is properly implemented for save action
  const updateTabDirtyState = useCallback((tabId: string, isDirty: boolean) => {
    console.log("Updating tab dirty state", { tabId, isDirty });
    setTabs((prev) => {
      const newTabs = prev.map((tab) =>
        tab.id === tabId ? { ...tab, isDirty } : tab,
      );
      console.log("New tabs state after dirty update:", newTabs); // Debug log
      return newTabs;
    });
  }, []);

  const openFile = useCallback(
    (path: string) => {
      const existingTab = tabs.find((tab) => tab.path === path);
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        sendMessage(
          JSON.stringify({
            type: "OpenFile",
            content: { path: rootPath + path },
          }),
        );
      }
    },
    [tabs, rootPath, sendMessage],
  );

  // Folder management
  const toggleFolder = useCallback(
    (path: string) => {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
          sendMessage(
            JSON.stringify({
              type: "GetDirectory",
              content: { path: rootPath + path },
            }),
          );
        }
        return next;
      });
    },
    [rootPath, sendMessage],
  );

  const createFile = useCallback(
    async (path: string, isDirectory: boolean) => {
      try {
        const name = prompt(
          `Enter name for new ${isDirectory ? "folder" : "file"}:`,
        );
        if (!name) return;

        console.log("Creating file:", {
          path: rootPath + "/" + name,
          isDirectory,
        });
        await sendMessage(
          JSON.stringify({
            type: "CreateFile",
            content: {
              path: rootPath + "/" + name,
              is_directory: isDirectory,
            },
          }),
        );

        // // Request directory content update
        // sendMessage(
        //   JSON.stringify({
        //     type: "GetDirectory",
        //     content: { path: rootPath || "" },
        //   }),
        // );
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to create file",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    [sendMessage, rootPath, toast],
  );

  const deleteFile = useCallback(
    async (path: string) => {
      try {
        await sendMessage(
          JSON.stringify({
            type: "DeleteFile",
            content: {
              path: path,
            },
          }),
        );
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to delete file",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    [sendMessage, toast],
  );

  const renameFile = useCallback(
    async (oldPath: string, newPath: string) => {
      try {
        const newName = prompt("Enter new name:", oldPath);
        if (!newName || newName === oldPath) return;

        await sendMessage(
          JSON.stringify({
            type: "RenameFile",
            content: {
              old_path: oldPath,
              new_path: newName,
            },
          }),
        );
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to rename file",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    [sendMessage, toast],
  );

  return {
    // State
    tabs,
    activeTabId,
    activeTab: tabs.find((tab) => tab.id === activeTabId) ?? null,
    expandedFolders,
    fileTree,
    loading,
    connected,

    // Actions
    setActiveTabId,
    openFile,
    closeTab,
    toggleFolder,
    updateTabContent,
    updateTabDirtyState,
    saveTab,
    createFile,
    deleteFile,
    renameFile,
    refresh: () => {
      setLoading(true);
      sendMessage(
        JSON.stringify({
          type: "RefreshDirectory",
          content: { path: rootPath || "" },
        }),
      );
    },
  };
}

// Helper function to determine language from file extension
function getLanguageFromPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "javascript",
    tsx: "typescript",
    py: "python",
    rs: "rust",
    go: "go",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
  };
  return languageMap[extension || ""] || "plaintext";
}
