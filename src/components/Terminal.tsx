// src/components/Terminal.tsx
import React, { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { useTerminal } from "@/hooks/useTerminal";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

import "@xterm/xterm/css/xterm.css";

interface TerminalTabProps {
  id: string;
  index: number;
  active: boolean;
  onClick: () => void;
  onClose: () => void;
}

function TerminalTab({
  id,
  index,
  active,
  onClick,
  onClose,
}: TerminalTabProps) {
  return (
    <div
      className={cn(
        "group relative flex h-8 items-center border-r border-border hover:bg-accent/50",
        active && "bg-accent"
      )}
    >
      <button onClick={onClick} className="px-3">
        Terminal {index + 1}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="invisible absolute right-1 rounded-sm p-1 hover:bg-background/80 group-hover:visible"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function TerminalPanel() {
  const [activeTerminalId, setActiveTerminalId] = React.useState<string | null>(
    null
  );
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const initialized = useRef(false);
  const { terminals, createTerminal, closeTerminal } = useTerminal();

  const terminalIds = Array.from(terminals.keys());

  // Update active terminal if current one is closed
  //   useEffect(() => {
  //     if (activeTerminalId && !terminals.has(activeTerminalId)) {
  //       setActiveTerminalId(terminalIds[0] || null);
  //     }
  //   }, [terminals, activeTerminalId, terminalIds]);

  const handleCreateTerminal = async () => {
    const id = await createTerminal();
    if (id) {
      setActiveTerminalId(id);
    }
  };

  const handleCloseTerminal = async (id: string) => {
    await closeTerminal(id);
    if (activeTerminalId === id) {
      const remainingIds = terminalIds.filter((tId) => tId !== id);
      setActiveTerminalId(remainingIds[0] || null);
    }
  };

  useEffect(() => {
    terminalIds.forEach((id) => {
      const terminal = terminals.get(id);
      const container = terminalRefs.current.get(id);

      if (container && terminal && !container.hasChildNodes()) {
        terminal.open(container);

        // Add resize handling in a separate setTimeout
        setTimeout(() => {
          const { width, height } = container.getBoundingClientRect();
          const cols = Math.floor(width / 9);
          const rows = Math.floor(height / 20);
          terminal.resize(Math.max(cols, 10), Math.max(rows, 2));
        }, 0);
      }
    });
  }, [terminals, terminalIds]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 items-center border-b border-border bg-background">
        <div className="flex-1 flex overflow-x-auto">
          {terminalIds.map((id, index) => (
            <TerminalTab
              key={`terminal-tab-${id}`}
              id={id}
              index={index}
              active={id === activeTerminalId}
              onClick={() => setActiveTerminalId(id)}
              onClose={() => handleCloseTerminal(id)}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCreateTerminal}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative flex-1 min-h-0 bg-black">
        {terminalIds.map((id) => (
          <div
            key={`terminal-container-${id}`}
            ref={(el) => {
              if (el) terminalRefs.current.set(id, el);
            }}
            className={cn(
              "absolute inset-0 p-2",
              id === activeTerminalId ? "visible" : "hidden"
            )}
          />
        ))}
      </div>
    </div>
  );
}
