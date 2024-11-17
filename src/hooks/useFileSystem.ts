import { useState, useCallback, useEffect } from "react";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import { FileNode, ServerMessage, FileEvent, FileMetadata } from "../types";
import { useToast } from "@/hooks/use-toast";
import { useWebSocketWithResponse } from "./useWebSocket";

interface FileSystemProps {
  onFileContent: (path: string, content: string, version: number) => void;
}

export function useFileSystem({ onFileContent }: FileSystemProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [fileContent, setFileContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [rootPath, setRootPath] = useState("");

  const { lastMessage, readyState } = useWebSocketContext();
  const { sendMessage } = useWebSocketWithResponse();
  const { sendMessage: rawSendMessage } = useWebSocketContext();

  const { toast } = useToast();

  const connected = readyState === 1;

  const normalizePath = useCallback(
    (path: string): string => {
      if (rootPath && path.startsWith(rootPath)) {
        return path.slice(rootPath.length);
      }
      return path;
    },
    [rootPath]
  );

  const pathExistsInTree = useCallback(
    (nodes: FileNode[], path: string): boolean => {
      const normalizedPath = normalizePath(path);
      return nodes.some((node) => {
        if (node.path === normalizedPath) return true;
        if (node.children)
          return pathExistsInTree(node.children, normalizedPath);
        return false;
      });
    },
    [normalizePath]
  );

  const updateTreeNode = useCallback(
    (
      nodes: FileNode[],
      path: string,
      updateFn: (node: FileNode) => FileNode
    ): FileNode[] => {
      const normalizedPath = normalizePath(path);
      return nodes.map((node) => {
        if (node.path === normalizedPath) {
          return updateFn(node);
        }
        if (node.is_directory && node.children) {
          const newChildren = updateTreeNode(node.children, path, updateFn);
          if (newChildren !== node.children) {
            return { ...node, children: newChildren };
          }
        }
        return node;
      });
    },
    [normalizePath]
  );

  const addNode = useCallback(
    (nodes: FileNode[], path: string, metadata: FileMetadata): FileNode[] => {
      const normalizedPath = normalizePath(path);
      const pathParts = normalizedPath.split("/").filter(Boolean);
      const fileName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.slice(0, -1).join("/");

      if (pathExistsInTree(nodes, normalizedPath)) {
        return updateTreeNode(nodes, path, (node) => ({
          ...node,
          size: metadata.size,
          is_directory: metadata.is_directory,
        }));
      }

      const newNode: FileNode = {
        name: fileName,
        path: normalizedPath,
        is_directory: metadata.is_directory,
        size: metadata.size,
        children: metadata.is_directory ? [] : undefined,
        is_loaded: false,
      };

      if (pathParts.length === 1) {
        return [...nodes, newNode];
      }

      return nodes.map((node) => {
        if (node.path === parentPath) {
          return {
            ...node,
            children: [...(node.children || []), newNode],
          };
        }
        if (node.is_directory && node.children) {
          return {
            ...node,
            children: addNode(node.children, path, metadata),
          };
        }
        return node;
      });
    },
    [normalizePath, updateTreeNode, pathExistsInTree]
  );

  const removeNode = useCallback(
    (nodes: FileNode[], path: string): FileNode[] => {
      const normalizedPath = normalizePath(path);
      return nodes
        .filter((node) => node.path !== normalizedPath)
        .map((node) => {
          if (node.is_directory && node.children) {
            return {
              ...node,
              children: removeNode(node.children, path),
            };
          }
          return node;
        });
    },
    [normalizePath]
  );

  const updateTreeWithContent = useCallback(
    (prevTree: FileNode[], path: string, content: FileNode[]): FileNode[] => {
      const normalizedPath = normalizePath(path);
      return prevTree.map((node) => {
        if (node.path === normalizedPath) {
          return {
            ...node,
            children: content,
            is_loaded: true,
          };
        }
        if (node.is_directory && node.children) {
          return {
            ...node,
            children: updateTreeWithContent(node.children, path, content),
          };
        }
        return node;
      });
    },
    [normalizePath]
  );

  const handleFileSystemEvents = useCallback(
    (events: FileEvent[]) => {
      setFileTree((prevTree) => {
        let newTree = [...prevTree];

        events.forEach((event) => {
          if (event.Created) {
            newTree = addNode(
              newTree,
              event.Created.path,
              event.Created.metadata
            );
          } else if (event.Modified) {
            const { path, modification_type, new_metadata } = event.Modified;

            if (modification_type === "Name") {
              newTree = removeNode(newTree, path);
              newTree = addNode(newTree, path, new_metadata);
            } else if (
              modification_type === "Create" ||
              !pathExistsInTree(newTree, path)
            ) {
              newTree = addNode(newTree, path, new_metadata);
            } else if (modification_type === "Remove") {
              newTree = removeNode(newTree, path);
            } else {
              newTree = updateTreeNode(newTree, path, (node) => ({
                ...node,
                size: new_metadata.size,
                is_directory: new_metadata.is_directory,
              }));
            }
          } else if (event.Deleted) {
            newTree = removeNode(newTree, event.Deleted.path);
          }
        });

        // Sort the tree
        const sortNodes = (nodes: FileNode[]): FileNode[] => {
          return nodes
            .sort((a, b) => {
              if (a.is_directory !== b.is_directory) {
                return a.is_directory ? -1 : 1;
              }
              return a.name.localeCompare(b.name);
            })
            .map((node) => {
              if (node.children) {
                return { ...node, children: sortNodes(node.children) };
              }
              return node;
            });
        };

        return sortNodes(newTree);
      });
    },
    [addNode, removeNode, updateTreeNode, pathExistsInTree]
  );

  // Initial directory load
  useEffect(() => {
    console.log("Connected:", connected);
    if (connected) {
      console.log("Requesting directory content");
      rawSendMessage(
        JSON.stringify({
          type: "GetDirectory",
          content: {
            path: "",
          },
        })
      );
    }
  }, [connected]);

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);

        if (data.type === "DirectoryContent") {
          const { path, content } = data.content;
          if (!rootPath) setRootPath(path);

          const normalizedContent = content.map((item: any) => ({
            ...item,
            path: normalizePath(item.path),
          }));

          setFileTree((prevTree) => {
            if (!path || path === rootPath) return normalizedContent;
            return updateTreeWithContent(prevTree, path, normalizedContent);
          });

          setLoading(false);
        } else if (data.type === "FileSystemEvents") {
          handleFileSystemEvents(data.content.events);
        } else if (data.type === "DocumentContent") {
          onFileContent(
            data.content.path,
            data.content.content,
            data.content.version
          );
        } else if (data.type === "Error") {
          toast({
            variant: "destructive",
            title: "Error",
            description: data.content.message,
          });
        }
      } catch (error) {
        console.error("Error processing message:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            "Failed to process server message: " + (error as Error).message,
        });
      }
    }
  }, [
    lastMessage,
    rootPath,
    normalizePath,
    handleFileSystemEvents,
    updateTreeWithContent,
    toast,
    onFileContent,
  ]);

  return {
    fileTree,
    loading,
    connected,
    rootPath,
    // sendMessage: async (message: string) => {
    //   if (!connected) {
    //     throw new Error("WebSocket not connected");
    //   }
    //   return new Promise((resolve, reject) => {
    //     const timeoutId = setTimeout(() => {
    //       reject(new Error("Server response timeout"));
    //     }, 5000);

    //     const messageHandler = (event: MessageEvent) => {
    //       clearTimeout(timeoutId);
    //       resolve(event.data);
    //     };

    //     const errorHandler = (error: Event) => {
    //       clearTimeout(timeoutId);
    //       reject(error);
    //     };

    //     // Add temporary listeners for this message
    //     const ws = (lastMessage as any)?.target;
    //     if (ws) {
    //       ws.addEventListener("message", messageHandler, { once: true });
    //       ws.addEventListener("error", errorHandler, { once: true });
    //     }

    //     sendMessage(message);
    //   });
    // },
    setLoading,
  };
}
