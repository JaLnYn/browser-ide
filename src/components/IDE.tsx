"use client";

import React from "react";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/toaster";
import { FileExplorer } from "./FileExplorer";
import { Editor } from "./Editor";
// import { TerminalPanel } from "./Terminal";
import { TerminalWrapper } from "./TerminalWrapper"; // Update import

import { useEditorState } from "@/hooks/useEditorState";
import { useLsp } from "@/hooks/useLsp";
import { Tabs } from "@/components/Tabs";

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
    refresh,
  } = useEditorState();

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
          <FileExplorer
            loading={loading}
            connected={connected}
            fileTree={fileTree}
            onRefresh={refresh}
            onFileSelect={openFile}
            onFolderToggle={toggleFolder}
            expandedFolders={expandedFolders}
            selectedFile={activeTab?.path ?? null}
          />
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
