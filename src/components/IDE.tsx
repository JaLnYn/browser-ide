// src/components/IDE.tsx
"use client";

import React from "react";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/toaster";
import { FileExplorer } from "./FileExplorer";
import { Editor } from "./Editor";
import { TerminalPanel } from "./Terminal";
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
    saveTab,
    refresh,
  } = useEditorState();

  const { diagnostics } = useLsp();

  const [showTerminal, setShowTerminal] = React.useState(true);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
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

        <ResizablePanel defaultSize={80}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={70} minSize={30}>
              <div className="h-full flex flex-col">
                <Tabs
                  tabs={tabs}
                  activeTabId={activeTabId ?? ""}
                  onTabSelect={(tabId) => setActiveTabId(tabId)}
                  onTabClose={closeTab}
                />
                {activeTab && (
                  <Editor
                    content={activeTab.content}
                    path={activeTab.path}
                    language={activeTab.language ?? "plaintext"}
                    onContentChange={(newContent: string) => {
                      if (activeTabId) {
                        updateTabContent(activeTabId, newContent);
                      }
                    }}
                    isDirty={activeTab.isDirty}
                    diagnostics={diagnostics.get(activeTab.path)}
                    onSave={() => {
                      if (activeTabId) {
                        saveTab(activeTabId);
                      }
                    }}
                  />
                )}
              </div>
            </ResizablePanel>

            <ResizablePanel defaultSize={30} minSize={10}>
              <TerminalPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
      <Toaster />
    </div>
  );
}
