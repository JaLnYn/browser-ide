"use client";

import React, { useCallback } from "react";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/toaster";
import { FileExplorer } from "./FileExplorer";
import { Editor } from "./Editor";
// import { TerminalPanel } from "./Terminal";
import { TerminalWrapper } from "./TerminalWrapper"; // Update import

import { useEditorState } from "@/hooks/useEditorState";
import { useLsp } from "@/hooks/useLsp";
import { Tabs } from "@/components/Tabs";
import { useSearch } from "@/hooks/useSearch";
import {
  Tabs as TabsComponent,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { SearchPanel } from "./SearchPanel";

export default function IDE() {
  const {
    tabs,
    activeTab,
    activeTabId,
    expandedFolders,
    fileTree,
    loading,
    connected,
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
    refresh,
  } = useEditorState();

  const { results, isSearching, search, cancelSearch } = useSearch();

  const handleSearchResult = useCallback(
    (path: string, line: number) => {
      // Open the file and scroll to line
      openFile(path);
      // You might need to add line scrolling functionality to your Editor component
    },
    [openFile],
  );

  const { diagnostics } = useLsp();

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={40}
          className="overflow-hidden"
        >
          <TabsComponent defaultValue="files">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
            </TabsList>
            <TabsContent value="files" className="h-[calc(100vh-2.5rem)]">
              <FileExplorer
                loading={loading}
                connected={connected}
                fileTree={fileTree}
                onRefresh={refresh}
                onFileSelect={openFile}
                onFolderToggle={toggleFolder}
                expandedFolders={expandedFolders}
                selectedFile={activeTab?.path ?? null}
                onCreateFile={createFile}
                onDeleteFile={deleteFile}
                onRenameFile={renameFile}
              />
            </TabsContent>
            <TabsContent value="search" className="h-[calc(100vh-2.5rem)]">
              <SearchPanel
                results={results}
                isSearching={isSearching}
                onSearch={search}
                onCancel={cancelSearch}
                onResultClick={handleSearchResult}
              />
            </TabsContent>
          </TabsComponent>
        </ResizablePanel>
        <ResizablePanel defaultSize={60} className="overflow-hidden">
          <ResizablePanelGroup direction="vertical" className="h-full">
            <ResizablePanel defaultSize={70} className="overflow-hidden">
              <div className="flex h-full flex-col overflow-hidden">
                <Tabs
                  tabs={tabs}
                  activeTabId={activeTabId ?? ""}
                  onTabSelect={(tabId) => setActiveTabId(tabId)}
                  onTabClose={closeTab}
                />
                <Editor
                  content={activeTab?.content ?? ""}
                  path={activeTab?.path ?? null}
                  language={activeTab?.language ?? "plaintext"}
                  onContentChange={(newContent: string) => {
                    if (activeTabId) {
                      updateTabContent(activeTabId, newContent);
                    }
                  }}
                  isDirty={activeTab?.isDirty ?? false}
                  diagnostics={
                    activeTab ? diagnostics.get(activeTab.path) : undefined
                  }
                  onSave={() => {
                    if (activeTabId) {
                      const tab = tabs.find((t) => t.id === activeTabId);
                      if (tab) {
                        saveTab(tab.id);
                      }
                    }
                  }}
                />
              </div>
            </ResizablePanel>
            <ResizablePanel defaultSize={30} className="overflow-hidden">
              <TerminalWrapper />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
      <Toaster />
    </div>
  );
}
