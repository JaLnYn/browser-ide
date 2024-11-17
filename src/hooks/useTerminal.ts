// src/hooks/useTerminal.ts
import { useState, useCallback, useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { useWebSocketWithResponse } from "./useWebSocket";
import { useToast } from "./use-toast";
import { TerminalSize } from "@/types";

const DEFAULT_TERMINAL_OPTIONS = {
  cursorBlink: true,
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  theme: {
    background: "#000000",
    foreground: "#ffffff",
    cursor: "#ffffff",
    selection: "#424242",
  },
  allowTransparency: true,
  scrollback: 1000,
  rows: 24,
  cols: 80,
};

export function useTerminal() {
  const [terminals, setTerminals] = useState<Map<string, XTerm>>(new Map());
  const { lastMessage, sendMessage: rawSendMessage } = useWebSocketContext();
  const { sendMessage } = useWebSocketWithResponse();
  const { toast } = useToast();

  // Keep a ref to access latest terminals in effects
  const terminalsRef = useRef(terminals);
  terminalsRef.current = terminals;

  const createTerminal = useCallback(
    async (size?: TerminalSize) => {
      try {
        const response = await sendMessage(
          JSON.stringify({
            type: "CreateTerminal",
            content: size || {
              cols: DEFAULT_TERMINAL_OPTIONS.cols,
              rows: DEFAULT_TERMINAL_OPTIONS.rows,
            },
          })
        );

        const data = JSON.parse(response);

        if (data.type === "Error") {
          console.log(data.content.message, "==================c");
          throw new Error(data.content.message);
        }

        if (data.type === "TerminalCreated") {
          const terminalId = data.content.terminal_id;
          console.log("terminalId", terminalId);

          // Create new terminal instance
          const terminal = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
              background: "#000000",
              foreground: "#ffffff",
              cursor: "#ffffff",
            },
            rows: 24,
            cols: 80,
            convertEol: true, // Ensure line endings are handled properly
          });

          // Set up data handler
          terminal.onData((input) => {
            console.log("input", input);
            console.log("terminalId", terminalId);
            rawSendMessage(
              JSON.stringify({
                type: "WriteTerminal",
                content: {
                  id: terminalId,
                  data: Array.from(new TextEncoder().encode(input)),
                },
              })
            );
          });

          // Store terminal instance
          setTerminals((prev) => {
            const next = new Map(prev);
            next.set(terminalId, terminal);
            return next;
          });

          return terminalId;
        }

        return null;
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to create terminal",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
        return null;
      }
    },
    [sendMessage, rawSendMessage, toast]
  );

  const resizeTerminal = useCallback(
    async (id: string, size: TerminalSize) => {
      try {
        const terminal = terminalsRef.current.get(id);
        if (!terminal) return;

        await sendMessage(
          JSON.stringify({
            type: "ResizeTerminal",
            content: { id, ...size },
          })
        );

        terminal.resize(size.cols, size.rows);
      } catch (error) {
        console.error("Failed to resize terminal:", error);
      }
    },
    [sendMessage]
  );

  const closeTerminal = useCallback(
    async (id: string) => {
      try {
        await sendMessage(
          JSON.stringify({
            type: "CloseTerminal",
            content: { id },
          })
        );

        const terminal = terminalsRef.current.get(id);
        if (terminal) {
          terminal.dispose();
          setTerminals((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to close terminal",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    [sendMessage, toast]
  );

  // Handle incoming terminal messages
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const data = JSON.parse(lastMessage.data);
      console.log(data);

      switch (data.type) {
        case "TerminalOutput": {
          const terminal = terminalsRef.current.get(data.content.terminal_id);
          if (terminal) {
            const text = new TextDecoder().decode(
              new Uint8Array(data.content.data)
            );
            console.log("text", text);
            terminal.write(text);
          }
          break;
        }
        case "TerminalError": {
          toast({
            variant: "destructive",
            title: "Terminal Error",
            description: data.error,
          });
          break;
        }
      }
    } catch (error) {
      console.error("Failed to process terminal message:", error);
    }
  }, [lastMessage, toast]);

  // Cleanup terminals on unmount
  useEffect(() => {
    return () => {
      terminalsRef.current.forEach((terminal, id) => {
        terminal.dispose();
      });
    };
  }, []);

  return {
    terminals: terminalsRef.current,
    createTerminal,
    closeTerminal,
    resizeTerminal,
  };
}
