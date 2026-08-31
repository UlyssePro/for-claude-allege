"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileCode2,
  FolderOpen,
  Play,
  Save,
  ChevronRight,
  Plus,
  Trash2,
  FileText,
  Palette,
  Folder,
  FilePlus,
  FolderPlus,
  ExternalLink,
  X,
  Terminal,
  Copy,
  Scissors,
  Clipboard,
  Star,
  Clock,
  Search,
  Type,
  Contrast,
  WrapText,
  ZoomIn,
  ZoomOut,
  MoreVertical,
  Maximize,
  Minimize,
} from "lucide-react";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import type * as MonacoTypes from "monaco-editor";
import { useAuth } from "@/hooks/use-auth";
import { normalizeRole } from "@/lib/role";
import { useEditorSettings } from "@/components/code-ide/useEditorSettings";
import { useFileHistory } from "@/components/code-ide/useFileHistory";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  VscFileCode,
  VscFileText,
  VscFilePdf,
  VscFileMedia,
  VscFileZip,
} from "react-icons/vsc";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  parentPath?: string | null;
  content?: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  ".html": "HTML",
  ".css": "CSS",
  ".js": "JavaScript",
  ".jsx": "JSX",
  ".ts": "TypeScript",
  ".tsx": "TSX",
  ".py": "Python",
  ".php": "PHP",
  ".txt": "PlainText",
  ".md": "Markdown",
  ".json": "JSON",
};

const MONACO_LANGUAGE_MAP: Record<string, string> = {
  ".html": "html",
  ".css": "css",
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".php": "php",
  ".txt": "plaintext",
  ".md": "markdown",
  ".json": "json",
};

function getLanguage(fileName: string): string {
  const ext = fileName.includes(".") ? "." + fileName.split(".").pop() : "";
  return LANGUAGE_MAP[ext] || "Code";
}

function getMonacoLanguage(fileName: string): string {
  const ext = fileName.includes(".") ? "." + fileName.split(".").pop() : "";
  return MONACO_LANGUAGE_MAP[ext] || "plaintext";
}

function getFileExtension(fileName: string): string {
  const normalized = fileName.toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === 0) return "";
  return normalized.slice(dotIndex);
}

function getFileIcon(fileName: string) {
  const ext = getFileExtension(fileName).toLowerCase();
  const iconMap: Record<string, any> = {
    ".html": VscFileCode,
    ".css": VscFileCode,
    ".scss": VscFileCode,
    ".sass": VscFileCode,
    ".less": VscFileCode,
    ".jsx": VscFileCode,
    ".tsx": VscFileCode,
    ".php": VscFileCode,
    ".xml": VscFileCode,
    ".dockerfile": VscFileCode,
    ".js": VscFileText,
    ".mjs": VscFileText,
    ".cjs": VscFileText,
    ".ts": VscFileText,
    ".mts": VscFileText,
    ".cts": VscFileText,
    ".py": VscFileText,
    ".pyw": VscFileText,
    ".json": VscFileText,
    ".jsonc": VscFileText,
    ".md": VscFileText,
    ".txt": VscFileText,
    ".csv": VscFileText,
    ".yml": VscFileText,
    ".yaml": VscFileText,
    ".toml": VscFileText,
    ".ini": VscFileText,
    ".env": VscFileText,
    ".gitignore": VscFileText,
    ".makefile": VscFileText,
    ".sql": VscFileText,
    ".sh": VscFileText,
    ".bash": VscFileText,
    ".zsh": VscFileText,
    ".fish": VscFileText,
    ".bat": VscFileText,
    ".ps1": VscFileText,
    ".rb": VscFileText,
    ".go": VscFileText,
    ".rs": VscFileText,
    ".java": VscFileText,
    ".kt": VscFileText,
    ".swift": VscFileText,
    ".c": VscFileText,
    ".cpp": VscFileText,
    ".h": VscFileText,
    ".hpp": VscFileText,
    ".mp3": VscFileMedia,
    ".mp4": VscFileMedia,
    ".wav": VscFileMedia,
    ".pdf": VscFilePdf,
    ".zip": VscFileZip,
    ".tar": VscFileZip,
    ".gz": VscFileZip,
    ".rar": VscFileZip,
    ".7z": VscFileZip,
    ".png": VscFileCode,
    ".jpg": VscFileCode,
    ".jpeg": VscFileCode,
    ".gif": VscFileCode,
    ".svg": VscFileCode,
    ".ico": VscFileCode,
    ".webp": VscFileCode,
  };
  const Icon = iconMap[ext] || VscFileCode;
  return <Icon className="h-4 w-4" style={{ color: "#a4a3ac" }} />;
}

function getParentPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "/");
  const parts = normalized.split("/").filter(Boolean);
  parts.pop();
  return parts.length === 0 ? "" : "/" + parts.join("/");
}

function flattenFolders(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  const walk = (items: FileNode[]) => {
    for (const node of items) {
      if (node.type === "folder") {
        result.push(node);
        if (node.children) walk(node.children);
      }
    }
  };
  walk(nodes);
  return result;
}

function isLocalPath(
  path: string,
  localPathsRef: { current: Set<string> },
): boolean {
  return localPathsRef.current.has(path);
}

async function findDirectoryHandleForPath(
  path: string,
  directoryHandlesRef: { current: Map<string, FileSystemDirectoryHandle> },
): Promise<FileSystemDirectoryHandle | undefined> {
  const parts = path.split("/").filter(Boolean);
  let current = parts.join("/");
  while (current) {
    const handle = directoryHandlesRef.current.get("/" + current);
    if (handle) return handle;
    current = current.includes("/")
      ? current.slice(0, current.lastIndexOf("/"))
      : "";
  }
  return undefined;
}

function mergeTrees(dbFiles: FileNode[], localFiles: FileNode[]): FileNode[] {
  const map = new Map<string, FileNode>();

  for (const file of dbFiles) {
    map.set(file.path, {
      ...file,
      children: file.children ? [...file.children] : [],
    });
  }

  for (const file of localFiles) {
    map.set(file.path, {
      ...file,
      children: file.children ? [...file.children] : [],
    });
  }

  const roots: FileNode[] = [];
  const visited = new Set<string>();

  for (const file of [...dbFiles, ...localFiles]) {
    if (visited.has(file.path)) continue;
    visited.add(file.path);

    const node = map.get(file.path)!;
    if (file.parentPath && map.has(file.parentPath)) {
      const parent = map.get(file.parentPath)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function CodeIDE() {
  const { user, loading: authLoading } = useAuth();
  const [dbFiles, setDbFiles] = useState<FileNode[]>([]);
  const [localFiles, setLocalFiles] = useState<FileNode[]>([]);
  const [localPaths, setLocalPaths] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [fileName, setFileName] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [newFileName, setNewFileName] = useState("");
  const [newFileParent, setNewFileParent] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(
    null,
  );
  const [color, setColor] = useState("#1488fc");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [folderInputKey, setFolderInputKey] = useState(0);
  const [directoryHandles, setDirectoryHandles] = useState<
    Map<string, FileSystemDirectoryHandle>
  >(new Map());
  const directoryHandlesRef = useRef(directoryHandles);
  directoryHandlesRef.current = directoryHandles;
  const ideContainerRef = useRef<HTMLDivElement>(null);

  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved",
  );
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(
    null,
  );

  const [explorerSearch, setExplorerSearch] = useState("");
  const [clipboard, setClipboard] = useState<{
    type: "copy" | "cut";
    path: string;
  } | null>(null);
  const { favorites, recentFiles, toggleFavorite, addToRecentFiles } =
    useFileHistory();
  const {
    wordWrap,
    fontSize,
    editorTheme,
    cursorPosition,
    setCursorPosition,
    toggleWordWrap,
    decreaseFontSize,
    increaseFontSize,
    toggleEditorTheme,
  } = useEditorSettings();
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [switcherQuery, setSwitcherQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
  } | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCodingModal, setShowCodingModal] = useState(false);
  const [codings, setCodings] = useState<
    {
      id: string;
      languageId: string;
      name?: string;
      type?: string;
      element: string;
      explication: string;
    }[]
  >([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>("");
  const [languages, setLanguages] = useState<
    { id: string; label: string; code: string }[]
  >([]);
  const [newCodingName, setNewCodingName] = useState("");
  const [newCodingType, setNewCodingType] = useState("code");
  const [newCodingElement, setNewCodingElement] = useState("");
  const [newCodingExplanation, setNewCodingExplanation] = useState("");
  const pendingPathUpdateRef = useRef<{
    oldPath: string;
    newPath: string;
  } | null>(null);

  const editorRef = { current: null as any };
  const localPathsRef = useRef(localPaths);
  localPathsRef.current = localPaths;
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  const insertColorAtCursor = (hex: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const position = editor.getPosition();
    if (!position) return;
    editor.executeEdits("color-insert", [
      {
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column,
          endColumn: position.column,
        } as any,
        text: hex,
        forceMoveMarkers: true,
      },
    ]);
    editor.focus();
    setColorPickerOpen(false);
  };

  const findNodeByPath = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const files = useMemo(
    () => mergeTrees(dbFiles, localFiles),
    [dbFiles, localFiles],
  );
  const filesRef = useRef(files);
  filesRef.current = files;

  const allFiles = useMemo(() => {
    const result: { path: string; name: string }[] = [];
    const walk = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === "file") {
          result.push({ path: node.path, name: node.name });
        }
        if (node.children) walk(node.children);
      }
    };
    walk(files);
    return result;
  }, [files]);

  const filteredSwitcherFiles = useMemo(() => {
    if (!switcherQuery.trim()) return allFiles;
    const lower = switcherQuery.toLowerCase();
    return allFiles.filter((f) => f.name.toLowerCase().includes(lower));
  }, [allFiles, switcherQuery]);

  const allFolders = useMemo(() => flattenFolders(files), [files]);

  const loadDbFiles = async (
    overrideOwnerId?: string,
    overrideClasseId?: string | null,
  ) => {
    try {
      const ownerId = overrideOwnerId || user?.id;
      let classeId = overrideClasseId;

      if (!classeId && user?.role === "eleve") {
        try {
          const meRes = await fetch("/api/eleve/me", {
            credentials: "include",
          });
          if (meRes.ok) {
            const data = await meRes.json();
            classeId = data.classe?.id || data.classe?.usualClasseId || null;
          }
        } catch {
          // ignore
        }
      }

      const params = new URLSearchParams();
      if (classeId) params.set("classeId", classeId);
      if (ownerId) params.set("ownerId", ownerId);

      const res = await fetch(`/api/code?${params.toString()}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const dbFiles = data.files || [];
        setDbFiles(buildTree(dbFiles));
      }
    } catch (error) {
      console.error("Failed to load DB files:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadDbFiles(user.id);
  }, [user, authLoading]);

  useEffect(() => {
    if (!pendingPathUpdateRef.current) return;
    const { oldPath, newPath } = pendingPathUpdateRef.current;
    pendingPathUpdateRef.current = null;
    setOpenTabs((prev) => prev.map((tab) => (tab === oldPath ? newPath : tab)));
    setActiveTab(newPath);
    if (activeTab === oldPath || activeTab === newPath) {
      // keep selectedPath unchanged to preserve editor content during transition
    }
  }, [dbFiles]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const fileRow = target.closest("[data-file-path]");
      if (fileRow) {
        e.preventDefault();
        const path = fileRow.getAttribute("data-file-path") || "";
        setContextMenu({ x: e.clientX, y: e.clientY, path });
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-menu-trigger]")) return;
      if (target.closest("[data-menu-path]")) return;
      setContextMenu(null);
      setOpenMenuPath(null);
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!activeTab || saveStatus !== "unsaved") return;
    const timeout = window.setTimeout(() => {
      handleSave();
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [activeTab, saveStatus]);

  useEffect(() => {
    if (!showCodingModal) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [langRes, codingRes] = await Promise.all([
          fetch("/api/languages", { credentials: "include" }),
          fetch("/api/codings", { credentials: "include" }),
        ]);

        if (!cancelled) {
          if (langRes.ok) {
            const langData = await langRes.json();
            const langs = langData.languages || [];
            setLanguages(langs);
            if (!selectedLanguageId && langs.length > 0) {
              setSelectedLanguageId(langs[0].id);
            }
          }

          if (codingRes.ok) {
            const codingData = await codingRes.json();
            setCodings(codingData.codings || []);
          }
        }
      } catch (error) {
        console.error("Failed to load coding data:", error);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [showCodingModal, selectedLanguageId]);

  const handleAddCoding = async () => {
    if (!selectedLanguageId || !newCodingElement || !newCodingExplanation) {
      toast.error("Langage, élément et explication requis");
      return;
    }

    try {
      const res = await fetch("/api/codings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          languageId: selectedLanguageId,
          name: newCodingName || null,
          type: newCodingType,
          element: newCodingElement,
          explication: newCodingExplanation,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCodings((prev) => [...prev, data.coding]);
        setNewCodingName("");
        setNewCodingType("code");
        setNewCodingElement("");
        setNewCodingExplanation("");
        toast.success("Élément ajouté");
      } else {
        const error = await res.json();
        toast.error(error.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Failed to add coding:", error);
      toast.error("Erreur lors de l'ajout");
    }
  };

  const buildTree = (flatFiles: any[]): FileNode[] => {
    const map = new Map<string, FileNode>();
    const roots: FileNode[] = [];

    flatFiles.forEach((file) => {
      const node: FileNode = {
        name: file.name,
        path: file.path,
        type: file.type || (file.isFolder ? "folder" : "file"),
        children: [],
        ...(file.content !== undefined ? { content: file.content } : {}),
      };
      if (file.parentPath) {
        node.parentPath = file.parentPath;
      }
      map.set(file.path, node);
    });

    flatFiles.forEach((file) => {
      const node = map.get(file.path)!;
      if (file.parentPath && map.has(file.parentPath)) {
        const parent = map.get(file.parentPath)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const handleCloseTab = useCallback(
    (path: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setOpenTabs((prev) => {
        const next = prev.filter((tab) => tab !== path);
        if (activeTab === path) {
          const newActive = next[next.length - 1] || null;
          setActiveTab(newActive);
          if (newActive) {
            const node = findNodeByPath(filesRef.current, newActive);
            if (node && node.type === "file") {
              setSelectedPath(newActive);
            }
          } else {
            setSelectedPath(null);
          }
        }
        return next;
      });
    },
    [activeTab],
  );

  const initTerminal = useCallback(async () => {
    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "__init__", cwd: process.cwd }),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTerminalSessionId(data.sessionId);
      }
    } catch (error) {
      console.error("Failed to init terminal:", error);
    }
  }, []);

  const sendTerminalCommand = useCallback(
    async (command: string) => {
      if (!terminalSessionId) return;
      try {
        await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command, sessionId: terminalSessionId }),
          credentials: "include",
        });
      } catch (error) {
        console.error("Failed to send terminal command:", error);
      }
    },
    [terminalSessionId],
  );

  const closeTerminal = useCallback(async () => {
    if (!terminalSessionId) return;
    try {
      await fetch(`/api/terminal?sessionId=${terminalSessionId}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to close terminal:", error);
    } finally {
      setTerminalSessionId(null);
      setTerminalOpen(false);
    }
  }, [terminalSessionId]);

  useEffect(() => {
    if (!terminalOpen) return;
    let terminal: XTerm | null = null;
    let fitAddon: FitAddon | null = null;
    let disposed = false;

    const init = async () => {
      if (!terminalContainerRef.current || disposed) return;
      const container = terminalContainerRef.current;
      terminal = new XTerm({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        theme: {
          background: "#0d0d0f",
          foreground: "#f9f6f9",
          cursor: "#1488fc",
          black: "#0d0d0f",
          red: "#ff0000",
          green: "#00ff00",
          yellow: "#ffff00",
          blue: "#1488fc",
          magenta: "#ff00ff",
          cyan: "#00ffff",
          white: "#f9f6f9",
          brightBlack: "#2c2c30",
          brightRed: "#ff6600",
          brightGreen: "#00ff00",
          brightYellow: "#ffff00",
          brightBlue: "#1488fc",
          brightMagenta: "#ff00ff",
          brightCyan: "#00ffff",
          brightWhite: "#ffffff",
        },
      });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(container);
      fitAddon.fit();

      if (!terminalSessionId) {
        await initTerminal();
      }

      terminal.onData((data) => {
        sendTerminalCommand(data);
      });

      const handleResize = () => {
        fitAddon?.fit();
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    };

    const cleanupPromise = init();

    return () => {
      disposed = true;
      cleanupPromise
        .then((cleanup) => {
          cleanup?.();
        })
        .catch(() => {});
      if (terminal) {
        terminal.dispose();
      }
    };
  }, [terminalOpen, terminalSessionId, initTerminal, sendTerminalCommand]);

  const filterNodesBySearch = useCallback(
    (nodes: FileNode[], query: string): FileNode[] => {
      if (!query.trim()) return nodes;
      const lower = query.toLowerCase();
      const result: FileNode[] = [];

      for (const node of nodes) {
        if (node.name.toLowerCase().includes(lower)) {
          result.push(node);
        } else if (node.children) {
          const filteredChildren = filterNodesBySearch(node.children, query);
          if (filteredChildren.length > 0) {
            result.push({ ...node, children: filteredChildren });
          }
        }
      }
      return result;
    },
    [],
  );

  const handleCopy = useCallback((path: string) => {
    setClipboard({ type: "copy", path });
    toast.success("Copié");
  }, []);

  const handleCut = useCallback((path: string) => {
    setClipboard({ type: "cut", path });
    toast.success("Couper");
  }, []);

  const getFileTemplate = useCallback((fileName: string): string => {
    const ext = getFileExtension(fileName);
    const templates: Record<string, string> = {
      ".html": `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>`,
      ".css": `/* Styles */
body {
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 0;
}`,
      ".js": `// Script principal
function main() {
  // code ici
}

main();`,
      ".py": `# Script principal
def main():
    # code ici
    pass

if __name__ == "__main__":
    main()`,
      ".php": `<?php
// Script principal
function main() {
    // code ici
}

main();
?>`,
    };
    return templates[ext] || "";
  }, []);

  const selectedFile = useMemo(() => {
    if (!selectedPath) return null;
    const found = findNodeByPath(filesRef.current, selectedPath);
    if (found && found.type === "file") return found;
    return null;
  }, [selectedPath]);

  useEffect(() => {
    if (!selectedPath) return;
    setSaveStatus("saved");
  }, [selectedPath]);

  useEffect(() => {
    if (!selectedFile || saveStatus === "saved") return;
    setSaveStatus("unsaved");
  }, [content, selectedFile, saveStatus]);

  useEffect(() => {
    if (!selectedPath) return;
    const found = findNodeByPath(filesRef.current, selectedPath);
    if (!found || found.type !== "file") return;
    setFileName(found.name);

    let cancelled = false;
    const loadContent = async () => {
      try {
        if (isLocalPath(found.path, localPathsRef)) {
          const local = findNodeByPath(filesRef.current, found.path);
          setContent(local?.children ? "" : (local as any)?.content || "");
          return;
        }

        const res = await fetch(
          `/api/code?path=${encodeURIComponent(found.path)}`,
          {
            credentials: "include",
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.file) {
            setContent(data.file.content || "");
          }
        } else if (res.status === 404) {
          setContent("");
        } else {
          console.error(
            "Failed to load file content:",
            res.status,
            await res.text(),
          );
        }
      } catch (error) {
        console.error("Failed to load file content:", error);
        if (!cancelled) {
          setContent("");
        }
      }
    };

    loadContent();
    return () => {
      cancelled = true;
    };
  }, [selectedPath, localFiles]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleFileClick = (file: FileNode) => {
    if (file.type === "folder") {
      toggleFolder(file.path);
      setSelectedFolderPath(file.path);
    } else {
      setIsLoadingFile(true);
      setSelectedPath(file.path);
      setActiveTab(file.path);
      setOpenTabs((prev) => {
        if (prev.includes(file.path)) return prev;
        return [...prev, file.path];
      });
      addToRecentFiles(file.path);
      setTimeout(() => setIsLoadingFile(false), 300);
    }
  };

  const handleCreateFile = async (parentPath: string, name: string) => {
    if (!name.trim()) {
      toast.error("Nom de fichier requis");
      return;
    }
    const normalizedParent =
      parentPath === "/"
        ? ""
        : parentPath.replace(/\\/g, "/").replace(/^\/+/, "/");
    const newPath = normalizedParent + "/" + name.trim();
    const templateContent = getFileTemplate(name.trim());

    if (isLocalPath(parentPath, localPathsRef)) {
      const newNode: FileNode = {
        name: name.trim(),
        path: newPath,
        type: "file",
        parentPath,
        content: templateContent,
      };
      setLocalFiles((prev) => addNode(prev, parentPath, newNode));
      setLocalPaths((prev) => new Set(prev).add(newPath));
      setExpandedFolders((prev) => new Set(prev).add(parentPath));
      setOpenTabs((prev) => {
        if (prev.includes(newPath)) return prev;
        return [...prev, newPath];
      });
      setActiveTab(newPath);
      setSelectedPath(newPath);
      setDialogOpen(false);
      setNewFileName("");
      setNewFileParent(null);

      const dirHandle = await findDirectoryHandleForPath(
        parentPath,
        directoryHandlesRef,
      );
      if (dirHandle) {
        try {
          const fileHandle = await dirHandle.getFileHandle(name.trim(), {
            create: true,
          });
          const writable = await fileHandle.createWritable();
          await writable.write(templateContent);
          await writable.close();
          toast.success("Fichier créé localement");
        } catch (error) {
          console.error("Create local file error:", error);
          toast.success("Fichier créé localement (en mémoire)");
        }
      } else {
        toast.success("Fichier créé localement");
      }
      return;
    }
    try {
      const res = await fetch("/api/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          path: newPath,
          content: templateContent,
          isFolder: false,
          parentPath,
        }),
      });

      if (res.ok) {
        await loadDbFiles();
        setExpandedFolders((prev) => new Set(prev).add(parentPath));
        setOpenTabs((prev) => {
          if (prev.includes(newPath)) return prev;
          return [...prev, newPath];
        });
        setActiveTab(newPath);
        setSelectedPath(newPath);
        setDialogOpen(false);
        setNewFileName("");
        setNewFileParent(null);
        toast.success("Fichier créé");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erreur lors de la création");
      }
    } catch (error) {
      console.error("Create file error:", error);
      toast.error("Erreur lors de la création");
    }
  };

  const handleCreateFolder = async (parentPath: string, name: string) => {
    if (!name.trim()) {
      toast.error("Nom de dossier requis");
      return;
    }
    const normalizedParent =
      parentPath === "/"
        ? ""
        : parentPath.replace(/\\/g, "/").replace(/^\/+/, "/");
    const newPath = normalizedParent + "/" + name.trim();

    if (isLocalPath(parentPath, localPathsRef)) {
      const newNode: FileNode = {
        name: name.trim(),
        path: newPath,
        type: "folder",
        parentPath,
      };
      setLocalFiles((prev) => addNode(prev, parentPath, newNode));
      setLocalPaths((prev) => new Set(prev).add(newPath));
      setExpandedFolders((prev) => new Set(prev).add(parentPath));
      setFolderDialogOpen(false);
      setNewFolderName("");
      setNewFolderParent(null);

      const dirHandle = await findDirectoryHandleForPath(
        parentPath,
        directoryHandlesRef,
      );
      if (dirHandle) {
        try {
          await dirHandle.getDirectoryHandle(name.trim(), { create: true });
          toast.success("Dossier créé localement");
        } catch (error) {
          console.error("Create local folder error:", error);
          toast.success("Dossier créé localement (en mémoire)");
        }
      } else {
        toast.success("Dossier créé localement");
      }
      return;
    }

    try {
      const res = await fetch("/api/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          path: newPath,
          content: "",
          isFolder: true,
          parentPath,
        }),
      });

      if (res.ok) {
        await loadDbFiles();
        setExpandedFolders((prev) => new Set(prev).add(parentPath));
        setFolderDialogOpen(false);
        setNewFolderName("");
        setNewFolderParent(null);
        toast.success("Dossier créé");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erreur lors de la création du dossier");
      }
    } catch (error) {
      console.error("Create folder error:", error);
      toast.error("Erreur lors de la création du dossier");
    }
  };

  const handleDelete = async (path: string) => {
    const node = findNodeByPath(files, path);
    if (!node) return;

    if (isLocalPath(path, localPathsRef)) {
      setLocalFiles((prev) => removeNode(prev, path));
      setLocalPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      if (selectedPath === path) {
        setSelectedPath(null);
        setSelectedFolderPath(null);
        setFileName("");
        setContent("");
      }
      setOpenTabs((prev) => prev.filter((tab) => tab !== path));
      setActiveTab((prev) => (prev === path ? null : prev));
      toast.success("Élément supprimé localement");

      const dirHandle = await findDirectoryHandleForPath(
        getParentPath(path),
        directoryHandlesRef,
      );
      if (dirHandle) {
        try {
          const parts = path.split("/").filter(Boolean);
          const name = parts.pop()!;
          const parentHandle =
            parts.length > 0
              ? await findDirectoryHandleForPath(
                  "/" + parts.join("/"),
                  directoryHandlesRef,
                )
              : dirHandle;
          if (parentHandle && name) {
            await parentHandle.removeEntry(name);
          }
        } catch (error) {
          console.error("Delete local file error:", error);
        }
      }
      return;
    }

    try {
      const pathsToDelete = [path];
      if (node.type === "folder" && node.children) {
        const collectPaths = (nodes: FileNode[]) => {
          for (const child of nodes) {
            pathsToDelete.push(child.path);
            if (child.type === "folder" && child.children) {
              collectPaths(child.children);
            }
          }
        };
        collectPaths(node.children);
      }

      await Promise.all(
        pathsToDelete.map((p) =>
          fetch(`/api/code?path=${encodeURIComponent(p)}`, {
            method: "DELETE",
            credentials: "include",
          }),
        ),
      );

      const wasSelected =
        selectedPath === path || pathsToDelete.includes(selectedPath || "");
      await loadDbFiles();
      if (wasSelected) {
        setSelectedPath(null);
        setSelectedFolderPath(null);
        setFileName("");
        setContent("");
      }
      setOpenTabs((prev) => prev.filter((tab) => !pathsToDelete.includes(tab)));
      setActiveTab((prev) => {
        if (!prev || pathsToDelete.includes(prev)) return null;
        return prev;
      });
      toast.success("Élément supprimé");
    } catch (error) {
      console.error("Delete file error:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handlePaste = useCallback(
    async (parentPath: string) => {
      if (!clipboard) return;
      const sourceNode = findNodeByPath(filesRef.current, clipboard.path);
      if (!sourceNode) return;

      if (sourceNode.type === "file") {
        await handleCreateFile(parentPath, sourceNode.name);
        if (clipboard.type === "cut") {
          await handleDelete(clipboard.path);
          setClipboard(null);
        }
      } else {
        await handleCreateFolder(parentPath, sourceNode.name);
        if (clipboard.type === "cut") {
          await handleDelete(clipboard.path);
          setClipboard(null);
        }
      }
    },
    [clipboard, handleCreateFile, handleCreateFolder, handleDelete],
  );

  const handleDuplicate = useCallback(
    async (path: string) => {
      const node = findNodeByPath(filesRef.current, path);
      if (!node) return;
      const parentPath = getParentPath(path);
      const newName = node.name + " (copie)";
      if (node.type === "file") {
        await handleCreateFile(parentPath, newName);
      } else {
        await handleCreateFolder(parentPath, newName);
      }
    },
    [handleCreateFile, handleCreateFolder],
  );

  const handleRename = async (path: string) => {
    if (!editingName.trim()) {
      setEditingPath(null);
      return;
    }
    const newPath = path.replace(/[^/]+$/, editingName.trim());

    if (isLocalPath(path, localPathsRef)) {
      setLocalFiles((prev) =>
        renameNode(prev, path, editingName.trim(), newPath),
      );
      setLocalPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        next.add(newPath);
        return next;
      });
      if (selectedPath === path) {
        setSelectedPath(newPath);
        setFileName(editingName.trim());
      }
      setEditingPath(null);
      setEditingName("");
      toast.success("Élément renommé localement");

      const dirHandle = await findDirectoryHandleForPath(
        getParentPath(path),
        directoryHandlesRef,
      );
      if (dirHandle) {
        try {
          const parts = path.split("/").filter(Boolean);
          const oldName = parts.pop()!;
          const parentHandle =
            parts.length > 0
              ? await findDirectoryHandleForPath(
                  "/" + parts.join("/"),
                  directoryHandlesRef,
                )
              : dirHandle;
          if (parentHandle && oldName && oldName !== editingName.trim()) {
            const fileHandle = await parentHandle.getFileHandle(oldName);
            const writable = await fileHandle.createWritable();
            await writable.close();
            await parentHandle.removeEntry(oldName);
            await parentHandle.getFileHandle(editingName.trim(), {
              create: true,
            });
          }
        } catch (error) {
          console.error("Rename local file error:", error);
        }
      }
      return;
    }

    try {
      const res = await fetch("/api/code", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ path, name: editingName.trim() }),
      });

      if (res.ok) {
        await loadDbFiles();
        if (selectedPath === path) {
          setSelectedPath(newPath);
          setFileName(editingName.trim());
        }
        setEditingPath(null);
        setEditingName("");
        toast.success("Élément renommé");
      } else {
        toast.error("Erreur lors du renommage");
      }
    } catch (error) {
      console.error("Rename file error:", error);
      toast.error("Erreur lors du renommage");
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !fileName) return;
    setIsSaving(true);
    setSaveStatus("saving");
    const previousContent = content;
    try {
      if (isLocalPath(selectedFile.path, localPathsRef)) {
        const res = await fetch("/api/code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: fileName,
            path: selectedFile.path,
            content,
            isFolder: false,
            parentPath: getParentPath(selectedFile.path),
          }),
        });

        if (res.ok) {
          await loadDbFiles();
          setLocalFiles((prev) => removeNode(prev, selectedFile.path));
          setLocalPaths((prev) => {
            const next = new Set(prev);
            next.delete(selectedFile.path);
            return next;
          });
          const newPath = selectedFile.path.replace(/[^/]+$/, fileName);
          setOpenTabs((prev) =>
            prev.map((tab) => (tab === selectedFile.path ? newPath : tab)),
          );
          pendingPathUpdateRef.current = {
            oldPath: selectedFile.path,
            newPath,
          };
          setSaveStatus("saved");
          toast.success("Fichier enregistré dans la base");
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "Erreur lors de l'enregistrement");
          setSaveStatus("unsaved");
        }
        return;
      }

      const res = await fetch("/api/code", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          path: selectedFile.path,
          name: fileName,
          content,
        }),
      });

      if (res.ok) {
        await loadDbFiles();
        const newPath = selectedFile.path.replace(/[^/]+$/, fileName);
        setOpenTabs((prev) =>
          prev.map((tab) => (tab === selectedFile.path ? newPath : tab)),
        );
        pendingPathUpdateRef.current = { oldPath: selectedFile.path, newPath };
        setSaveStatus("saved");
        toast.success("Fichier enregistré");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erreur lors de l'enregistrement");
        setSaveStatus("unsaved");
      }
    } catch (error) {
      console.error("Save file error:", error);
      toast.error("Erreur lors de l'enregistrement");
      setSaveStatus("unsaved");
      setContent(previousContent);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === "p") {
        e.preventDefault();
        setQuickSwitcherOpen((prev) => !prev);
        setSwitcherQuery("");
      }

      if (modifier && e.key === "s") {
        e.preventDefault();
        if (selectedFile) handleSave();
      }

      if (modifier && e.key === "n") {
        e.preventDefault();
        const firstRoot = files[0];
        const parent =
          selectedFolderPath ||
          (firstRoot?.type === "folder" ? firstRoot.path : "/");
        setNewFileParent(parent);
        setDialogOpen(true);
      }

      if (modifier && e.key === "w") {
        e.preventDefault();
        if (activeTab)
          handleCloseTab(activeTab, {
            stopPropagation: () => {},
          } as React.MouseEvent);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    user,
    authLoading,
    selectedFile,
    handleSave,
    files,
    selectedFolderPath,
    activeTab,
    handleCloseTab,
  ]);

  const handleRun = async () => {
    if (!selectedFile) return;
    setIsRunning(true);
    setOutput("");
    try {
      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: content,
          language: getLanguage(fileName),
          fileName: selectedFile.name,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOutput(data.output);
        toast.success("Exécution terminée");
      } else {
        setOutput(data.output || "Erreur");
        toast.error("Erreur lors de l'exécution");
      }
    } catch (error) {
      console.error("Run error:", error);
      setOutput("Erreur lors de l'exécution");
      toast.error("Erreur lors de l'exécution");
    } finally {
      setIsRunning(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile || !fileName) return;
    setIsPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/code/preview/full?path=${encodeURIComponent(selectedFile.path)}`,
        {
          credentials: "include",
        },
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 1000 * 60);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Impossible de prévisualiser le fichier");
      }
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Impossible de prévisualiser le fichier");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const isSelected = selectedPath === node.path;
      const paddingLeft = depth * 16 + 8;

      return (
        <div key={node.path} data-file-path={node.path}>
          <div
            className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors group ${
              isSelected
                ? "bg-[#1488fc]/10 text-[#1488fc]"
                : "text-[#a4a3ac] hover:bg-[#171719/0.6] hover:text-[#f9f6f9]"
            }`}
            style={{ paddingLeft }}
            onClick={() => handleFileClick(node)}
          >
            {node.type === "folder" ? (
              <>
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
                <FolderOpen className="h-4 w-4 text-[#1488fc]" />
              </>
            ) : (
              <>
                <span className="w-3" />
                {getFileIcon(node.name)}
              </>
            )}
            {isLocalPath(node.path, localPathsRef) && (
              <span
                className="h-2 w-2 rounded-full bg-[#1488fc]"
                title="Local"
              />
            )}
            {editingPath === node.path ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleRename(node.path)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(node.path);
                  if (e.key === "Escape") {
                    setEditingPath(null);
                    setEditingName("");
                  }
                }}
                className="h-6 text-xs"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm truncate flex-1">{node.name}</span>
            )}
            {!editingPath && (
              <div className="relative ml-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  data-menu-trigger
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuPath((prev) =>
                      prev === node.path ? null : node.path,
                    );
                  }}
                  title="Actions"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
                {openMenuPath === node.path && (
                  <div
                    data-menu-path
                    className="absolute right-0 top-full mt-1 z-50 w-40 rounded-md border border-[#2c2c30] bg-[#0d0d0f] py-1 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#f9f6f9] hover:bg-[#1488fc]/10"
                      onClick={() => {
                        setEditingPath(node.path);
                        setEditingName(node.name);
                        setOpenMenuPath(null);
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Renommer
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#f9f6f9] hover:bg-[#1488fc]/10"
                      onClick={() => {
                        handleCopy(node.path);
                        setOpenMenuPath(null);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copier
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#f9f6f9] hover:bg-[#1488fc]/10"
                      onClick={() => {
                        handleCut(node.path);
                        setOpenMenuPath(null);
                      }}
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      Couper
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#f9f6f9] hover:bg-[#1488fc]/10"
                      onClick={() => {
                        handleDuplicate(node.path);
                        setOpenMenuPath(null);
                      }}
                    >
                      <Clipboard className="h-3.5 w-3.5" />
                      Dupliquer
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[rgb(239_68_68)] hover:bg-[#1488fc]/10"
                      onClick={() => {
                        handleDelete(node.path);
                        setOpenMenuPath(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {node.type === "folder" && isExpanded && node.children && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      ref={ideContainerRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-[#0d0d0f] flex gap-4 p-4"
          : "h-[calc(100vh-8rem)] flex gap-4"
      }
    >
      <Card className="w-64 flex-shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-[#1488fc]" />
              Explorateur
            </CardTitle>
            <div className="flex items-center gap-1">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={files.length === 0}
                    onClick={() => {
                      const parent =
                        selectedFolderPath ||
                        (files[0]?.type === "folder" ? files[0].path : "/");
                      setNewFileParent(parent);
                    }}
                    title="Nouveau fichier"
                  >
                    <FilePlus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Nouveau fichier</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-4">
                    <Input
                      placeholder="Nom du fichier"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateFile(newFileParent || "/", newFileName);
                        }
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setDialogOpen(false);
                          setNewFileName("");
                          setNewFileParent(null);
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleCreateFile(newFileParent || "/", newFileName)
                        }
                      >
                        Créer
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog
                open={folderDialogOpen}
                onOpenChange={setFolderDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      const parent =
                        selectedFolderPath ||
                        (files[0]?.type === "folder" ? files[0].path : "/");
                      setNewFolderParent(parent);
                    }}
                    title="Nouveau dossier"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Nouveau dossier</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-4">
                    <Input
                      placeholder="Nom du dossier"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateFolder(
                            newFolderParent || "/",
                            newFolderName,
                          );
                        }
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setFolderDialogOpen(false);
                          setNewFolderName("");
                          setNewFolderParent(null);
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleCreateFolder(
                            newFolderParent || "/",
                            newFolderName,
                          )
                        }
                      >
                        Créer
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {clipboard && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    const firstRoot = files[0];
                    const parentPath =
                      firstRoot?.type === "folder" ? firstRoot.path : "/";
                    handlePaste(parentPath);
                  }}
                  title="Coller"
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <Input
            placeholder="Rechercher..."
            value={explorerSearch}
            onChange={(e) => setExplorerSearch(e.target.value)}
            className="h-8 mt-2 text-xs"
          />
        </CardHeader>
        <div className="border-b border-[#2c2c30]" />
        <style>
          {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #0d0d0f;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #2c2c30;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #3c3c40;
          }
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #2c2c30 #0d0d0f;
          }
        `}{" "}
        </style>
        <CardContent
          className="flex-1 overflow-auto p-2 custom-scrollbar space-y-3"
          onClick={() => setOpenMenuPath(null)}
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-xs text-[#a4a3ac]">Chargement...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Folder className="h-8 w-8 text-[#2c2c30] mb-2" />
              <p className="text-xs text-[#a4a3ac] mb-3">Aucun dossier</p>
            </div>
          ) : (
            <div className="space-y-1">
              {renderTree(filterNodesBySearch(files, explorerSearch))}
            </div>
          )}
          {favorites.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-[#a4a3ac] mb-1 px-1">
                Favoris
              </p>
              <div className="space-y-1">
                {favorites.map((path) => {
                  const node = findNodeByPath(files, path);
                  if (!node || node.type !== "file") return null;
                  return (
                    <div
                      key={path}
                      className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-xs text-[#a4a3ac] hover:text-[#f9f6f9] hover:bg-[#171719/0.6]"
                      onClick={() => handleFileClick(node)}
                    >
                      <FileCode2 className="h-3 w-3" />
                      <span className="truncate flex-1">{node.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(path);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {recentFiles.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-[#a4a3ac] mb-1 px-1">
                Récents
              </p>
              <div className="space-y-1">
                {recentFiles.map((path) => {
                  const node = findNodeByPath(files, path);
                  if (!node || node.type !== "file") return null;
                  return (
                    <div
                      key={path}
                      className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-xs text-[#a4a3ac] hover:text-[#f9f6f9] hover:bg-[#171719/0.6]"
                      onClick={() => handleFileClick(node)}
                    >
                      <FileCode2 className="h-3 w-3" />
                      <span className="truncate flex-1">{node.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-0 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <FileCode2 className="h-4 w-4 text-[#1488fc]" />
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="h-8 w-[100px] px-2 text-[13px] font-medium border-none bg-transparent focus-visible:ring-0"
              />
              {fileName && (
                <Badge variant="secondary">{getLanguage(fileName)}</Badge>
              )}
              {selectedFile && (
                <div className="flex items-center text-[11px] text-[#a4a3ac]">
                  {saveStatus === "saved"
                    ? "Enregistré"
                    : saveStatus === "saving"
                      ? "Enregistrement..."
                      : ""}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={handleRun}
                disabled={!selectedFile || isRunning}
                title="Exécuter"
              >
                <Play className="h-4 w-4" />
              </Button>
              {fileName.toLowerCase().endsWith(".html") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={handlePreview}
                  disabled={!selectedFile || isPreviewLoading}
                  title="Preview"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setColorPickerOpen((prev) => !prev)}
                  disabled={!selectedFile}
                  style={{ color }}
                  title="Couleur"
                >
                  <Palette className="h-4 w-4" />
                </Button>
                {colorPickerOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-[#2c2c30] bg-[#0d0d0f] p-3 shadow-xl">
                    <div className="grid grid-cols-6 gap-2">
                      {[
                        "#ff0000",
                        "#00ff00",
                        "#0000ff",
                        "#ffff00",
                        "#ff00ff",
                        "#00ffff",
                        "#ffffff",
                        "#808080",
                        "#000000",
                        "#ff6600",
                        "#6600ff",
                        "#0066ff",
                      ].map((preset) => (
                        <button
                          key={preset}
                          className="h-6 w-6 rounded border border-[#2c2c30]"
                          style={{ backgroundColor: preset }}
                          onClick={() => insertColorAtCursor(preset)}
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-8 w-8 cursor-pointer rounded border border-[#2c2c30] bg-transparent p-0"
                      />
                      <Input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => insertColorAtCursor(color)}
                      >
                        Insérer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={handleSave}
                disabled={!selectedFile || isSaving}
                title="Enregistrer"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setTerminalOpen((prev) => !prev)}
                title="Terminal"
              >
                <Terminal className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={toggleWordWrap}
                title="Word wrap"
              >
                <WrapText className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={decreaseFontSize}
                title="Zoom -"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={increaseFontSize}
                title="Zoom +"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={toggleEditorTheme}
                title="Thème"
              >
                <Contrast className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setIsFullscreen((prev) => !prev)}
                title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
              {/* <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setShowCodingModal(true)}
                title="Aide codage"
              >
                <Type className="h-4 w-4" />
              </Button> */}
            </div>
          </div>
        </CardHeader>
        {openTabs.length > 0 && (
          <div className="flex items-center border-b border-[#2c2c30] bg-[#0d0d0f]">
            {openTabs.map((tabPath) => {
              const tabFile = findNodeByPath(filesRef.current, tabPath);
              const isActive = activeTab === tabPath;
              return (
                <div
                  key={tabPath}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer border-r border-[#2c2c30] ${
                    isActive
                      ? "bg-[#171719] text-[#f9f6f9]"
                      : "text-[#a4a3ac] hover:text-[#f9f6f9]"
                  }`}
                  onClick={() => {
                    setActiveTab(tabPath);
                    setSelectedPath(tabPath);
                  }}
                >
                  <span className="truncate max-w-[120px]">{tabPath}</span>
                  <X
                    className="h-3 w-3"
                    onClick={(e) => handleCloseTab(tabPath, e)}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div className="border-b border-[#2c2c30]" />
        <CardContent className="flex-1 overflow-hidden p-0">
          {selectedFile ? (
            <div className="h-full flex flex-col">
              {/* <div className="flex items-center gap-2 px-4 py-2 bg-[#171719] border-b border-[#2c2c30] text-xs text-[#a4a3ac]">
                <span>{selectedFile.path}</span>
                <span className="ml-auto">{getFileExtension(fileName)}</span>
              </div> */}
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={getMonacoLanguage(fileName)}
                  value={content}
                  onChange={(value) => setContent(value || "")}
                  theme={editorTheme}
                  onMount={(
                    editor: MonacoTypes.editor.IStandaloneCodeEditor,
                    monaco: typeof MonacoTypes,
                  ) => {
                    editorRef.current = editor;
                    try {
                      const languages = [
                        "html",
                        "css",
                        "javascript",
                        "typescript",
                        "jsx",
                        "tsx",
                        "python",
                        "php",
                      ] as const;
                      const baseSuggestions: MonacoTypes.languages.CompletionItem[] =
                        [
                          {
                            label: "lorem",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText:
                              "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ${1:Lorem} ${2:ipsum}.",
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Générer du texte Lorem Ipsum",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "html-skeleton",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              "<!DOCTYPE html>",
                              '<html lang="fr">',
                              "<head>",
                              '  <meta charset="UTF-8" />',
                              "  <title>${1:Document}</title>",
                              "</head>",
                              "<body>",
                              "",
                              "</body>",
                              "</html>",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Squelette HTML minimal",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "html5",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              "<!DOCTYPE html>",
                              '<html lang="fr">',
                              "<head>",
                              '  <meta charset="UTF-8" />',
                              '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
                              "  <title>${1:Document}</title>",
                              "</head>",
                              "<body>",
                              "  ${2:<!-- content -->}",
                              "</body>",
                              "</html>",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Structure HTML5 de base",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "doctype",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: "<!DOCTYPE html>",
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Déclaration DOCTYPE HTML5",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "react-component",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              "import React from 'react';",
                              "",
                              "export default function ${1:ComponentName}() {",
                              "  return (",
                              '    <div className="${2:className}">',
                              "      ${3:<!-- content -->}",
                              "    </div>",
                              "  );",
                              "}",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Composant React fonctionnel",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "tsx-component",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              "import React from 'react';",
                              "",
                              "interface ${1:ComponentName}Props {",
                              "  ${2:/* props */}",
                              "}",
                              "",
                              "export default function ${1:ComponentName}({ ${3:...props} }: ${1:ComponentName}Props) {",
                              "  return (",
                              '    <div className="${4:className}">',
                              "      ${5:<!-- content -->}",
                              "    </div>",
                              "  );",
                              "}",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Composant React TypeScript",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "css-reset",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              "*, *::before, *::after {",
                              "  box-sizing: border-box;",
                              "  margin: 0;",
                              "  padding: 0;",
                              "}",
                              "",
                              "body {",
                              "  font-family: system-ui, sans-serif;",
                              "  line-height: 1.5;",
                              "}",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Reset CSS simple",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "js-main",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              "function main() {",
                              "  ${1:// code}",
                              "}",
                              "",
                              "main();",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Structure JavaScript simple",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "python-main",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              "def main():",
                              "    ${1:# code}",
                              "",
                              "",
                              'if __name__ == "__main__":',
                              "    main()",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Structure Python simple",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "php-main",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              "<?php",
                              "",
                              "${1:// code}",
                              "",
                              "?>",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Structure PHP simple",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                        ];

                      languages.forEach((language) => {
                        const registered = (monaco.languages as any)
                          .registerCompletionItemProvider;
                        if (typeof registered === "function") {
                          registered(language, {
                            triggerCharacters: ["."],
                            provideCompletionItems: () => ({
                              suggestions: baseSuggestions,
                            }),
                          });
                        }
                      });

                      const htmlTagSuggestions: MonacoTypes.languages.CompletionItem[] =
                        [
                          {
                            label: "input",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText:
                              '<input type="${1:text}" name="${2:name}" id="${3:id}" />',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Balise input",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "select",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              '<select name="${1:name}" id="${2:id}">',
                              '  <option value="${3:1}">${4:Option 1}</option>',
                              '  <option value="${5:2}">${6:Option 2}</option>',
                              "</select>",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Balise select",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "img",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: '<img src="${1:src}" alt="${2:alt}" />',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Balise image",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "link",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText:
                              '<link rel="${1:stylesheet}" href="${2:style.css}" />',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Balise link",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "form",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              '<form action="${1:#}" method="${2:post}">',
                              "  ${3:<!-- form fields -->}",
                              "</form>",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Balise form",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "div",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText:
                              '<div class="${1:class}">\n  ${2:<!-- content -->}\n</div>',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Balise div",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "span",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText:
                              '<span class="${1:class}">${2:text}</span>',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Balise span",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "a",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: '<a href="${1:url}">${2:link}</a>',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Balise lien",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "button",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText:
                              '<button type="${1:button}">${2:Click}</button>',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Balise button",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "textarea",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText:
                              '<textarea name="${1:name}" id="${2:id}" rows="${3:4}"></textarea>',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Balise textarea",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "table",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              "<table>",
                              "  <thead>",
                              "    <tr><th>${1:Header}</th></tr>",
                              "  </thead>",
                              "  <tbody>",
                              "    <tr><td>${2:Data}</td></tr>",
                              "  </tbody>",
                              "</table>",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Tableau HTML",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "ul",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              "<ul>",
                              "  <li>${1:Item 1}</li>",
                              "  <li>${2:Item 2}</li>",
                              "  <li>${3:Item 3}</li>",
                              "</ul>",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Liste non ordonnée",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "ol",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              "<ol>",
                              "  <li>${1:Item 1}</li>",
                              "  <li>${2:Item 2}</li>",
                              "  <li>${3:Item 3}</li>",
                              "</ol>",
                            ].join("\n"),
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Liste ordonnée",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "h1",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: "<h1>${1:Title}</h1>",
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Titre principal",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "p",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: "<p>${1:Text}</p>",
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Paragraphe",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "br",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: "<br />",
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Retour à la ligne",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "hr",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: "<hr />",
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Ligne horizontale",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "script",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText:
                              '<script src="${1:script.js}"></script>',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Balise script",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "meta",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText:
                              '<meta name="${1:name}" content="${2:content}" />',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Balise meta",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "title",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: "<title>${1:Title}</title>",
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Titre de la page",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "label",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText:
                              '<label for="${1:id}">${2:Label}</label>',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Label de formulaire",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                        ];

                      const htmlAttributeSuggestions: MonacoTypes.languages.CompletionItem[] =
                        [
                          {
                            label: "src",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'src="${1:url}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "URL source",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "href",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'href="${1:url}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "URL lien",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "alt",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'alt="${1:description}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Texte alternatif",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "class",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'class="${1:className}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Classe CSS",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "id",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'id="${1:id}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Identifiant unique",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "type",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'type="${1:type}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Type d'input",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "name",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'name="${1:name}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Nom du champ",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "value",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'value="${1:value}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Valeur",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "placeholder",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'placeholder="${1:placeholder}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Texte placeholder",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "rel",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'rel="${1:stylesheet}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Relation de lien",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "charset",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'charset="${1:UTF-8}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Encodage",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "lang",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'lang="${1:fr}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Langue",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                          {
                            label: "data-*",
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: 'data-${1:key}="${2:value}"',
                            insertTextRules:
                              monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                            documentation: "Attribut data",
                            range: {
                              startLineNumber: 1,
                              endLineNumber: 1,
                              startColumn: 1,
                              endColumn: 1,
                            } as any,
                          },
                        ];

                      const htmlProvider = (monaco.languages as any)
                        .registerCompletionItemProvider;
                      if (typeof htmlProvider === "function") {
                        htmlProvider("html", {
                          triggerCharacters: ["<", " ", "/"],
                          provideCompletionItems: (
                            model: MonacoTypes.editor.ITextModel,
                            position: MonacoTypes.Position,
                          ) => {
                            const word = model.getWordUntilPosition(position);
                            const range: MonacoTypes.IRange = {
                              startLineNumber: position.lineNumber,
                              endLineNumber: position.lineNumber,
                              startColumn: word.startColumn,
                              endColumn: word.endColumn,
                            };

                            const suggestions: MonacoTypes.languages.CompletionItem[] =
                              [];

                            const textBefore = model.getValueInRange({
                              startLineNumber: position.lineNumber,
                              startColumn: 1,
                              endLineNumber: position.lineNumber,
                              endColumn: position.column,
                            });

                            if (
                              textBefore.trim().endsWith("<") ||
                              textBefore.trim().endsWith("</")
                            ) {
                              suggestions.push(
                                ...htmlTagSuggestions.map((item) => ({
                                  ...item,
                                  range,
                                })),
                              );
                            } else if (
                              textBefore.includes("<") &&
                              !textBefore.includes(">")
                            ) {
                              suggestions.push(
                                ...htmlAttributeSuggestions.map((item) => ({
                                  ...item,
                                  range,
                                })),
                              );
                            } else {
                              suggestions.push(
                                ...htmlTagSuggestions.map((item) => ({
                                  ...item,
                                  range,
                                })),
                              );
                            }

                            return { suggestions };
                          },
                        });
                      }
                    } catch {
                      // HTML completion provider is best-effort
                    }

                    if ((monaco.languages as any).typescript) {
                      (
                        monaco.languages as any
                      ).typescript.typescriptDefaults.setCompilerOptions({
                        jsx: (monaco.languages as any).typescript.JsxEmit.React,
                        reactNamespace: "React",
                        allowNonTsExtensions: true,
                        allowJs: true,
                        esModuleInterop: true,
                      });
                    }

                    editor.onDidChangeCursorPosition((e) => {
                      setCursorPosition({
                        line: e.position.lineNumber,
                        column: e.position.column,
                      });
                    });
                  }}
                  options={{
                    readOnly: false,
                    fontSize,
                    fontFamily:
                      "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: wordWrap ? "on" : "off",
                    lineNumbers: "on",
                    renderWhitespace: "selection",
                    guides: {
                      indentation: true,
                      bracketPairs: true,
                    },
                    bracketPairColorization: { enabled: true },
                    padding: { top: 12 },
                    autoClosingBrackets: "always",
                    autoClosingQuotes: "always",
                    autoIndent: "full",
                    formatOnPaste: true,
                    folding: true,
                    foldingStrategy: "indentation",
                    showFoldingControls: "always",
                    snippetSuggestions: "top",
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    matchBrackets: "always",
                    autoSurround: "languageDefined",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileCode2 className="h-12 w-12 text-[#2c2c30] mx-auto mb-4" />
                <p className="text-sm text-[#a4a3ac] mb-2">
                  {selectedFolderPath
                    ? "Sélectionnez un fichier pour le visualiser"
                    : "Sélectionnez ou créez un dossier pour commencer"}
                </p>
                <p className="text-xs text-[#2c2c30]">
                  Ctrl+P pour rechercher • Ctrl+N pour créer
                </p>
              </div>
            </div>
          )}
        </CardContent>
        {output && (
          <>
            <div className="border-b border-[#2c2c30]" />
            <CardContent className="p-0">
              <div className="p-4 bg-[#171719] border-t border-[#2c2c30]">
                <p className="text-xs font-medium text-[#a4a3ac] mb-2">
                  Sortie
                </p>
                <pre className="text-xs text-[#f9f6f9] font-mono whitespace-pre-wrap">
                  {output}
                </pre>
              </div>
            </CardContent>
          </>
        )}
        {terminalOpen && (
          <>
            <div className="border-b border-[#2c2c30]" />
            <div className="h-64 bg-[#0d0d0f] border-t border-[#2c2c30] flex flex-col">
              <div className="flex items-center justify-between px-3 py-1 border-b border-[#2c2c30]">
                <span className="text-xs text-[#a4a3ac]">Terminal</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={closeTerminal}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div
                id="terminal-container"
                ref={terminalContainerRef}
                className="flex-1 p-2"
              />
            </div>
          </>
        )}
        {selectedFile && (
          <div className="flex items-center justify-between border-t border-[#2c2c30] bg-[#0d0d0f] px-3 py-1 text-[11px] text-[#a4a3ac]">
            <div className="flex items-center gap-3">
              <span>
                Ln {cursorPosition.line}, Col {cursorPosition.column}
              </span>
              <span>{getLanguage(fileName)}</span>
              <span>UTF-8</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{wordWrap ? "Wrap" : "No wrap"}</span>
              <span>{fontSize}px</span>
              <span>{editorTheme === "vs-dark" ? "Dark" : "Light"}</span>
            </div>
          </div>
        )}
      </Card>
      {quickSwitcherOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50"
          onClick={() => setQuickSwitcherOpen(false)}
        >
          <div
            className="w-[500px] max-h-[400px] overflow-auto rounded-lg border border-[#2c2c30] bg-[#0d0d0f] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              placeholder="Rechercher un fichier..."
              value={switcherQuery}
              onChange={(e) => setSwitcherQuery(e.target.value)}
              className="h-10 border-none border-b border-[#2c2c30] rounded-none"
              autoFocus
            />
            <div className="p-2 space-y-1">
              {filteredSwitcherFiles.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-[#1488fc]/10 text-sm text-[#f9f6f9]"
                  onClick={() => {
                    const node = findNodeByPath(filesRef.current, file.path);
                    if (node) handleFileClick(node);
                    setQuickSwitcherOpen(false);
                    setSwitcherQuery("");
                  }}
                >
                  <FileCode2 className="h-4 w-4 text-[#a4a3ac]" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-xs text-[#a4a3ac] ml-auto">
                    {file.path}
                  </span>
                </div>
              ))}
              {filteredSwitcherFiles.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-[#a4a3ac]">
                  Aucun fichier trouvé
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showCodingModal && (
        <div className="fixed inset-0 z-[60] bg-[#0d0d0f] flex flex-col">
          <div className="flex items-center justify-between border-b border-[#2c2c30] px-4 py-2">
            <div className="flex items-center gap-3">
              <Type className="h-4 w-4 text-[#1488fc]" />
              <span className="text-sm font-medium text-[#f9f6f9]">
                Aide codage
              </span>
              <select
                value={selectedLanguageId}
                onChange={(e) => setSelectedLanguageId(e.target.value)}
                className="h-8 rounded border border-[#2c2c30] bg-[#0d0d0f] px-2 text-xs text-[#f9f6f9]"
              >
                <option value="">-- Langage --</option>
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setShowCodingModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4 custom-scrollbar">
            {!selectedLanguageId ? (
              <div className="flex items-center justify-center h-full text-xs text-[#a4a3ac]">
                Sélectionnez un langage pour voir les éléments de codage
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Bloc 1: Ajout (réservé aux profs) */}
                {normalizeRole(user?.role ?? null) === "prof" && (
                  <div className="rounded-lg border border-[#2c2c30] bg-[#171719] p-4">
                    <h3 className="text-xs font-medium text-[#1488fc] mb-3">
                      Ajouter un élément
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[10px] text-[#a4a3ac]">
                          Nom
                        </Label>
                        <Input
                          value={newCodingName}
                          onChange={(e) => setNewCodingName(e.target.value)}
                          placeholder="Ex: Bouton"
                          className="h-8 mt-1 bg-[#0d0d0f] border-[#2c2c30] text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-[#a4a3ac]">
                          Type
                        </Label>
                        <select
                          value={newCodingType}
                          onChange={(e) => setNewCodingType(e.target.value)}
                          className="h-8 mt-1 w-full rounded border border-[#2c2c30] bg-[#0d0d0f] px-2 text-xs text-[#f9f6f9]"
                        >
                          <option value="code">Code</option>
                          <option value="html">HTML</option>
                          <option value="icon">Icône</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-[#a4a3ac]">
                          Élément
                        </Label>
                        <Input
                          value={newCodingElement}
                          onChange={(e) => setNewCodingElement(e.target.value)}
                          placeholder={
                            newCodingType === "html"
                              ? "<input>"
                              : newCodingType === "icon"
                                ? "<File />"
                                : ".class { }"
                          }
                          className="h-8 mt-1 bg-[#0d0d0f] border-[#2c2c30] text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-[#a4a3ac]">
                          Explication
                        </Label>
                        <textarea
                          value={newCodingExplanation}
                          onChange={(e) =>
                            setNewCodingExplanation(e.target.value)
                          }
                          placeholder="Explication de l'élément..."
                          className="mt-1 w-full rounded border border-[#2c2c30] bg-[#0d0d0f] p-2 text-xs text-[#f9f6f9]"
                          rows={3}
                        />
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={handleAddCoding}
                      >
                        Ajouter
                      </Button>
                    </div>
                  </div>
                )}

                {/* Bloc 2: Aperçu */}
                <div className="rounded-lg border border-[#2c2c30] bg-[#171719] p-4">
                  <h3 className="text-xs font-medium text-[#1488fc] mb-3">
                    Aperçu
                  </h3>
                  <div className="space-y-3">
                    {codings
                      .filter((c) => c.languageId === selectedLanguageId)
                      .map((coding) => (
                        <div
                          key={coding.id}
                          className="rounded border border-[#2c2c30] bg-[#0d0d0f] p-3"
                        >
                          <p className="text-[10px] text-[#a4a3ac] mb-1">
                            {coding.name || coding.element}
                          </p>
                          {coding.type === "html" ? (
                            <div
                              className="text-xs text-[#f9f6f9]"
                              dangerouslySetInnerHTML={{
                                __html: coding.element,
                              }}
                            />
                          ) : coding.type === "icon" ? (
                            <p className="text-xs text-[#f9f6f9] font-mono">
                              {coding.element}
                            </p>
                          ) : (
                            <pre className="text-xs text-[#f9f6f9] whitespace-pre-wrap font-mono">
                              {coding.element}
                            </pre>
                          )}
                        </div>
                      ))}
                    {codings.filter((c) => c.languageId === selectedLanguageId)
                      .length === 0 && (
                      <p className="text-xs text-[#a4a3ac] text-center py-4">
                        Aucun élément pour ce langage
                      </p>
                    )}
                  </div>
                </div>

                {/* Bloc 3: Explication */}
                <div className="rounded-lg border border-[#2c2c30] bg-[#171719] p-4">
                  <h3 className="text-xs font-medium text-[#1488fc] mb-3">
                    Explication
                  </h3>
                  <div className="space-y-3">
                    {codings
                      .filter((c) => c.languageId === selectedLanguageId)
                      .map((coding) => (
                        <div
                          key={coding.id}
                          className="rounded border border-[#2c2c30] bg-[#0d0d0f] p-3"
                        >
                          <p className="text-xs font-medium text-[#f9f6f9] mb-1">
                            {coding.name || coding.element}
                          </p>
                          <p className="text-xs text-[#a4a3ac] whitespace-pre-wrap">
                            {coding.explication}
                          </p>
                        </div>
                      ))}
                    {codings.filter((c) => c.languageId === selectedLanguageId)
                      .length === 0 && (
                      <p className="text-xs text-[#a4a3ac] text-center py-4">
                        Aucune explication disponible
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {contextMenu && (
        <div
          className="fixed z-50 w-48 rounded-md border border-[#2c2c30] bg-[#0d0d0f] py-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#f9f6f9] hover:bg-[#1488fc]/10"
            onClick={() => {
              setSelectedPath(contextMenu.path);
              setActiveTab(contextMenu.path);
              setOpenTabs((prev) => {
                if (prev.includes(contextMenu.path)) return prev;
                return [...prev, contextMenu.path];
              });
              setContextMenu(null);
            }}
          >
            <FileText className="h-3.5 w-3.5" />
            Ouvrir
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#f9f6f9] hover:bg-[#1488fc]/10"
            onClick={() => {
              handleCopy(contextMenu.path);
              setContextMenu(null);
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Copier
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#f9f6f9] hover:bg-[#1488fc]/10"
            onClick={() => {
              handleCut(contextMenu.path);
              setContextMenu(null);
            }}
          >
            <Scissors className="h-3.5 w-3.5" />
            Couper
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#f9f6f9] hover:bg-[#1488fc]/10"
            onClick={() => {
              handleDuplicate(contextMenu.path);
              setContextMenu(null);
            }}
          >
            <Clipboard className="h-3.5 w-3.5" />
            Dupliquer
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[rgb(239_68_68)] hover:bg-[#1488fc]/10"
            onClick={() => {
              handleDelete(contextMenu.path);
              setContextMenu(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

function removeNode(nodes: FileNode[], path: string): FileNode[] {
  return nodes
    .filter((node) => node.path !== path)
    .map((node) => {
      if (node.children) {
        return {
          ...node,
          children: removeNode(node.children, path),
        };
      }
      return node;
    });
}

function renameNode(
  nodes: FileNode[],
  path: string,
  newName: string,
  newPath: string,
): FileNode[] {
  return nodes.map((node) => {
    if (node.path === path) {
      return {
        ...node,
        name: newName,
        path: newPath,
        children: node.children,
      };
    }
    if (node.children) {
      return {
        ...node,
        children: renameNode(node.children, path, newName, newPath),
      };
    }
    return node;
  });
}

function addNode(
  nodes: FileNode[],
  parentPath: string,
  newNode: FileNode,
): FileNode[] {
  return nodes.map((node) => {
    if (node.path === parentPath && node.type === "folder") {
      return {
        ...node,
        children: [...(node.children || []), newNode],
      };
    }
    if (node.children) {
      return {
        ...node,
        children: addNode(node.children, parentPath, newNode),
      };
    }
    return node;
  });
}
