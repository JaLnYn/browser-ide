// src/components/Terminal.tsx
"use client";
import React, { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useTerminal } from "@/hooks/useTerminal";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

import "@xterm/xterm/css/xterm.css";

interface TerminalTabProps {
  id: string;
  active: boolean;
  onClick: () => void;
  onClose: () => void;
}

function TerminalTab({ id, active, onClick, onClose }: TerminalTabProps) {
  return (
    <div
      className={cn(
        "group relative flex h-10 items-center border-r border-border px-4 hover:bg-accent",
        active && "bg-accent"
      )}
    >
      <button onClick={onClick} className="mr-2">
        Terminal {id.slice(0, 6)}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="invisible absolute right-1 rounded-sm p-1 hover:bg-background/80 group-hover:visible"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TerminalPanel() {
  const [activeTerminalId, setActiveTerminalId] = React.useState<string | null>(
    null
  );
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const fitAddons = useRef<Map<string, FitAddon>>(new Map());
  const { terminals, createTerminal, closeTerminal } = useTerminal();

  const terminalIds = Array.from(terminals.keys());

  // Set initial active terminal if none selected
  useEffect(() => {
    if (!activeTerminalId && terminalIds.length > 0) {
      setActiveTerminalId(terminalIds[0]);
    }
  }, [terminalIds, activeTerminalId]);

  const handleCreateTerminal = async () => {
    const id = await createTerminal();
    if (typeof id === "string") {
      setActiveTerminalId(id);
    }
  };

  const handleCloseTerminal = async (id: string) => {
    await closeTerminal(id);
    if (activeTerminalId === id) {
      const remainingIds = terminalIds.filter((tId) => tId !== id);
      setActiveTerminalId(remainingIds.length > 0 ? remainingIds[0] : null);
    }
  };

  const handleTabClick = (id: string) => {
    setActiveTerminalId(id);
    // Trigger fit when switching tabs
    setTimeout(() => {
      const fitAddon = fitAddons.current.get(id);
      fitAddon?.fit();
    }, 0);
  };

  useEffect(() => {
    terminalIds.forEach((id) => {
      const terminal = terminals.get(id);
      const container = terminalRefs.current.get(id);
      if (container && terminal && !container.hasChildNodes()) {
        // Create and load fit addon
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        fitAddons.current.set(id, fitAddon);

        terminal.open(container);

        // Initial fit
        setTimeout(() => {
          if (id === activeTerminalId) {
            fitAddon.fit();
          }
        }, 0);

        // Setup resize observer
        const observer = new ResizeObserver(() => {
          if (id === activeTerminalId) {
            fitAddon.fit();
          }
        });
        observer.observe(container);

        return () => {
          observer.disconnect();
          fitAddons.current.delete(id);
        };
      }
    });
  }, [terminals, terminalIds, activeTerminalId]); // Added activeTerminalId dependency

  if (terminals.size === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Button onClick={handleCreateTerminal}>
          <Plus className="mr-2 h-4 w-4" />
          New Terminal
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black">
      <div className="flex border-b bg-background">
        <div className="flex overflow-x-auto">
          {Array.from(terminals.entries()).map(([id]) => (
            <TerminalTab
              key={`tab-${id}`}
              id={id}
              active={id === activeTerminalId}
              onClick={() => handleTabClick(id)} // Changed to use handleTabClick
              onClose={() => handleCloseTerminal(id)}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={handleCreateTerminal}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative flex-1  overflow-hidden">
        {terminalIds.map((id) => {
          const isActive = id === activeTerminalId;
          return (
            <div
              key={id}
              ref={(el) => {
                if (el) terminalRefs.current.set(id, el);
              }}
              className={cn(
                "absolute inset-0 h-full w-full p-1",
                isActive ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              style={{
                display: isActive ? "block" : "none", // Explicit display control
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
