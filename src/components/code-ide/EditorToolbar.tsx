"use client";

import { useState } from "react";
import { CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface EditorToolbarProps {
  fileName: string;
  setFileName: (name: string) => void;
  selectedPath: string | null;
  activeTab: string | null;
  setActiveTab: (path: string | null) => void;
  openTabs: string[];
  setOpenTabs: (paths: string[]) => void;
  wordWrap: boolean;
  setWordWrap: (wrap: boolean) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  editorTheme: string;
  setEditorTheme: (theme: string) => void;
  cursorPosition: { line: number; column: number };
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  output: string;
  setOutput: (output: string) => void;
  isPreviewLoading: boolean;
  setIsPreviewLoading: (loading: boolean) => void;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  showCodingModal: boolean;
  setShowCodingModal: (show: boolean) => void;
  saveStatus: "saved" | "saving" | "unsaved";
  setSaveStatus: (status: "saved" | "saving" | "unsaved") => void;
  selectedFile: {
    path: string;
    name: string;
    type: "file" | "folder";
  } | null;
  handleRun: () => Promise<void>;
  handlePreview: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleCloseTab: (path: string, event: React.MouseEvent) => void;
  handleFileClick: (file: {
    path: string;
    name: string;
    type: "file" | "folder";
  }) => void;
  insertColorAtCursor: (hex: string) => void;
}

export function EditorToolbar(props: EditorToolbarProps) {
  const {
    fileName,
    setFileName,
    selectedPath,
    activeTab,
    setActiveTab,
    openTabs,
    setOpenTabs,
    wordWrap,
    setWordWrap,
    fontSize,
    setFontSize,
    editorTheme,
    setEditorTheme,
    cursorPosition,
    isSaving,
    setIsSaving,
    isRunning,
    setIsRunning,
    output,
    setOutput,
    isPreviewLoading,
    setIsPreviewLoading,
    isFullscreen,
    setIsFullscreen,
    showCodingModal,
    setShowCodingModal,
    saveStatus,
    setSaveStatus,
    selectedFile,
    handleRun,
    handlePreview,
    handleSave,
    handleCloseTab,
    handleFileClick,
    insertColorAtCursor,
  } = props;

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [color, setColor] = useState("#1488fc");
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleColorPickerChange = (hex: string) => {
    setColor(hex);
    insertColorAtCursor(hex);
    setColorPickerOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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
              <Badge variant="secondary">{fileName.split('.').pop()?.toUpperCase() || 'FILE'}</Badge>
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
                        onClick={() => handleColorPickerChange(preset)}
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
                      onClick={() => handleColorPickerChange(color)}
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
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setShowCodingModal(true)}
              title="Aide codage"
            >
              <Type className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {openTabs.length > 0 && (
        <div className="flex items-center border-b border-[#2c2c30] bg-[#0d0d0f]">
          {openTabs.map((tabPath) => {
            const tabFile = openTabs.find(path => path === tabPath); // Simplified lookup
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
                  // In a real implementation, we'd find the file and call handleFileClick
                }}
              >
                <span className="truncate max-w-[120px]">
                  {tabPath}
                </span>
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
      {selectedFile && (
        <div className="flex items-center justify-between border-t border-[#2c2c30] bg-[#0d0d0f] px-3 py-1 text-[11px] text-[#a4a3ac]">
          <div className="flex items-center gap-3">
            <span>
              Ln {cursorPosition.line}, Col {cursorPosition.column}
            </span>
            <span>{fileName.split('.').pop()?.toUpperCase() || 'FILE'}</span>
            <span>UTF-8</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{wordWrap ? "Wrap" : "No wrap"}</span>
            <span>{fontSize}px</span>
            <span>{editorTheme === "vs-dark" ? "Dark" : "Light"}</span>
          </div>
        </div>
      )}
    </div>
  );
}