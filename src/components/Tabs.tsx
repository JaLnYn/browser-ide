import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  path: string;
  isDirty?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export function Tabs({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
}: TabsProps) {
  if (tabs.length === 0) {
    return null;
  }

  const getFileName = (path: string) => {
    return path.split("/").pop() || path;
  };

  return <>
    {/* Horizontal scroll container with fixed height */}
    <div className="spread gap jstart tab-root">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn("spread", activeTabId === tab.id && "bg-accent")}
        >
          <button
            className="flex h-full items-center gap-2 px-4 py-2"
            onClick={() => onTabSelect(tab.id)}
          >
            <span className="max-w-[160px] truncate text-sm">
              {getFileName(tab.path)}
              {tab.isDirty == true && "*"}
            </span>
          </button>
          <button
            className="cross-button"
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            title="Close tab"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  </>;
}
