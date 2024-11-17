export interface FileMetadata {
  size: number;
  is_directory: boolean;
  is_symlink: boolean;
  created_at?: number;
  modified_at?: number;
  readonly: boolean;
}
export interface EditorTab {
  path: string;
  content: string;
  language: string;
  isDirty?: boolean;
}
export type ModificationType =
  | "Content"
  | "Metadata"
  | "Name"
  | "Other"
  | "Create"
  | "Remove";

export interface FileNode {
  name: string;
  path: string;
  is_directory: boolean;
  size: number;
  children?: FileNode[];
  is_loaded: boolean;
}

export interface FileEvent {
  Created?: {
    path: string;
    timestamp_ms: number;
    metadata: FileMetadata;
  };
  Modified?: {
    path: string;
    timestamp_ms: number;
    modification_type: ModificationType;
    new_metadata: FileMetadata;
  };
  Deleted?: {
    path: string;
    timestamp_ms: number;
  };
}

export interface ServerMessage {
  DirectoryContent?: {
    path: string;
    content: FileNode[];
  };
  FileSystemEvents?: {
    events: FileEvent[];
  };
  DocumentContent?: {
    path: string;
    content: string;
    metadata: DocumentMetadata;
  };
  Error?: {
    message: string;
  };
}

export interface DocumentMetadata {
  size: number;
  is_directory: boolean;
  is_symlink: boolean;
  created_at?: number;
  modified_at?: number;
  readonly: boolean;
  file_type: "Text" | "Binary" | "SymLink" | "Unknown";
  encoding: {
    encoding: string;
    confidence: number;
  };
  line_ending: "CRLF" | "LF" | "Mixed";
}

export interface TerminalSize {
  cols: number;
  rows: number;
}

export interface TerminalOptions {
  id?: string;
  size: TerminalSize;
}

export interface Terminal {
  id: string;
  size: TerminalSize;
}
