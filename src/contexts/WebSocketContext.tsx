// src/contexts/WebSocketContext.tsx
"use client";

import React, { createContext, useContext, ReactNode, useEffect } from "react";
import useWebSocket from "react-use-websocket";

const WebSocketContext = createContext<ReturnType<typeof useWebSocket> | null>(
  null
);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsInstance = useWebSocket("ws://localhost:8080", {
    retryOnError: true,
    onOpen: () => {
      console.log("[WebSocket] Connection opened");
    },
    onClose: () => {
      console.log("[WebSocket] Connection closed");
    },
    shouldReconnect: (event) => {
      console.log("[WebSocket] Attempting to reconnect, closeEvent:", event);
      return true;
    },
    reconnectAttempts: 5,
    reconnectInterval: 1000,
    // Add options to prevent infinite connecting state
    share: false,
    filter: () => true,
  });

  useEffect(() => {
    if (wsInstance.readyState === 0) {
      // CONNECTING
      const timeout = setTimeout(() => {
        if (wsInstance.readyState === 0) {
          console.error("[WebSocket] Connection timeout");
          // Force a reconnection by closing
          wsInstance.getWebSocket()?.close();
        }
      }, 5000); // 5 second timeout

      return () => clearTimeout(timeout);
    }
  }, [wsInstance.readyState]);
  // console.log("WebSocket readyState:", wsInstance.readyState);
  // console.log("WebSocket instance:", wsInstance);

  return (
    <WebSocketContext.Provider value={wsInstance}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider"
    );
  }
  return context;
};
