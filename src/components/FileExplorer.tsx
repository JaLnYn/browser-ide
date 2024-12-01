import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { FileTree, FileTreeNode } from "@/components/ui/file-tree";
import { FileNode } from "../types";
import { Plus, Trash, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditorState } from "@/hooks/useEditorState";

interface FileExplorerProps {
  loading: boolean;
  connected: boolean;
  fileTree: FileNode[];
  onRefresh: () => void;
  onFileSelect: (path: string) => void;
  onFolderToggle: (path: string) => void;
  expandedFolders: Set<string>;
  selectedFile: string | null;
  onCreateFile?: (path: string, isDirectory: boolean) => void;
  onDeleteFile?: (path: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
}

export function FileExplorer({
  loading,
  connected,
  fileTree,
  onRefresh,
  onFileSelect,
  onFolderToggle,
  expandedFolders,
  selectedFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}: FileExplorerProps) {
  const renderFileTree = (nodes: any[]) => {
    return nodes.map((node) => (
      <FileTreeNode
        key={node.path}
        label={node.name}
        isFolder={node.is_directory}
        expanded={expandedFolders.has(node.path)}
        selected={selectedFile === node.path}
        onClick={() => {
          if (!node.is_directory) {
            onFileSelect(node.path);
          }
        }}
        onToggle={() => {
          if (node.is_directory) {
            onFolderToggle(node.path);
          }
        }}
      >
        {node.children && renderFileTree(node.children)}
      </FileTreeNode>
    ));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {" "}
      {/* Added overflow-hidden */}
      <div className="flex-none p-2 border-b bg-background">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold">Explorer</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateFile?.("", false)}>
                New File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateFile?.("", true)}>
                New Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedFile && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onRenameFile?.(selectedFile, "")}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (
                    window.confirm("Are you sure you want to delete this file?")
                  ) {
                    onDeleteFile?.(selectedFile);
                  }
                }}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </>
          )}
          <div className="flex items-center space-x-2">
            {!connected && (
              <span className="text-xs text-red-500 animate-pulse">●</span>
            )}
            <button
              onClick={onRefresh}
              disabled={loading || !connected}
              className="p-1 hover:bg-accent rounded-sm disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 border-none">
        <div className="p-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : (
            <FileTree>
              {fileTree.length > 0 ? (
                renderFileTree(fileTree)
              ) : (
                <div className="p-2 text-muted-foreground text-sm">
                  No files found
                </div>
              )}
            </FileTree>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
