// src/app/layout.tsx
import "./globals.css";
import { WebSocketProvider } from "@/contexts/WebSocketContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WebSocketProvider>{children}</WebSocketProvider>
      </body>
    </html>
  );
}
