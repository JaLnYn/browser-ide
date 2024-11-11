"use client";

import React, { useState } from "react";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/toaster";
import { FileExplorer } from "./FileExplorer";
import { Editor } from "./Editor";
import { useIDE } from "../hooks/useIDE";
import { useLsp } from "../hooks/useLsp";
import { useEditorState } from "@/hooks/useEditorState";
import { Tabs } from "@/components/Tabs";
import "@/styles/global.scss";

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
    <div className="h-screen bg-background text-foreground">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full overflow-hidden"
      >
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
        <ResizablePanel defaultSize={80} className="overflow-hidden">
          <div className="h-full flex flex-col overflow-hidden">
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
      </ResizablePanelGroup>
      <Toaster />
    </div>
  );
}
