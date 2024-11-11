import React from "react";
import {
  ChevronDown,
  ChevronRight,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  children?: React.ReactNode;
  className?: string;
}

interface FileTreeNodeProps {
  label: string;
  icon?: React.ReactNode;
  isFolder?: boolean;
  expanded?: boolean;
  selected?: boolean;
  children?: React.ReactNode;
  onToggle?: () => void;
  onClick?: () => void;
  className?: string;
  depth?: number;
}

export function FileTree({ children, className }: FileTreeProps) {
  return (
    <div className={cn("select-none text-sm ft-root spread column astart", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            depth: 0,
            ...child.props,
          });
        }
        return child;
      })}
    </div>
  );
}

export function FileTreeNode({
  label,
  icon,
  isFolder,
  expanded,
  selected,
  children,
  onToggle,
  onClick,
  className,
  depth = 0,
}: FileTreeNodeProps) {
  // Calculate indentation based on depth
  const indentation = depth * 12; // 12px per level

  return (
    <div className="relative file-tree">
      <div
        className={cn(
          "flex items-center py-1 px-2 hover:bg-accent/50 cursor-pointer relative group",
          selected && "bg-accent",
          isFolder && "font-medium",
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        style={{ paddingLeft: `${indentation}px` }}
      >
        {/* Hover effect line */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="spread small-gap jstart">
          {isFolder && (
            <span
              className="w-4 h-4 flex items-center justify-center cursor-pointer hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onToggle?.();
              }}
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 transition-transform" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 transition-transform" />
              )}
            </span>
          )}

          <span className="w-4 h-4 flex items-center justify-center ml-1">
            {icon ||
              (isFolder ? (
                expanded ? (
                  <FolderOpenIcon className="h-4 w-4 text-primary" />
                ) : (
                  <FolderIcon className="h-4 w-4 text-primary" />
                )
              ) : (
                <FileIcon className="h-4 w-4 text-muted-foreground" />
              ))}
          </span>

          <span className="ml-1.5 truncate">{label}</span>
        </div>
      </div>

      {expanded && children && (
        <div className="relative">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, {
                depth: depth + 1,
                ...child.props,
              });
            }
            return child;
          })}
        </div>
      )}
    </div>
  );
}

export default FileTree;
