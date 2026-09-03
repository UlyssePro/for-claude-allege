import { FileNode } from './FileExplorer';

// Language maps for display and Monaco
export const LANGUAGE_MAP: Record<string, string> = {
  '.html': 'HTML',
  '.css': 'CSS',
  '.js': 'JavaScript',
  '.jsx': 'JSX',
  '.ts': 'TypeScript',
  '.tsx': 'TSX',
  '.py': 'Python',
  '.php': 'PHP',
  '.txt': 'PlainText',
  '.md': 'Markdown',
  '.json': 'JSON',
};

export const MONACO_LANGUAGE_MAP: Record<string, string> = {
  '.html': 'html',
  '.css': 'css',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.php': 'php',
  '.txt': 'plaintext',
  '.md': 'markdown',
  '.json': 'json',
};

/**
 * Get language label for display
 */
export function getLanguage(fileName: string): string {
  const ext = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '';
  return LANGUAGE_MAP[ext] || 'Code';
}

/**
 * Get language identifier for Monaco Editor
 */
export function getMonacoLanguage(fileName: string): string {
  const ext = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '';
  return MONACO_LANGUAGE_MAP[ext] || 'plaintext';
}

/**
 * Get file extension (including the dot)
 */
export function getFileExtension(fileName: string): string {
  const normalized = fileName.toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === 0) return '';
  return normalized.slice(dotIndex);
}

/**
 * Get appropriate file icon component
 */
export function getFileIcon(fileName: string) {
  const ext = getFileExtension(fileName).toLowerCase();
  // We'll import icons lazily in the component to avoid bundling issues
  // This function now returns the extension string for icon mapping in components
  return ext;
}

/**
 * Get parent path of a given path
 */
export function getParentPath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '/');
  const parts = normalized.split('/').filter(Boolean);
  parts.pop();
  return parts.length === 0 ? '' : '/' + parts.join('/');
}

/**
 * Flatten folder nodes (excluding files) for folder operations
 */
export function flattenFolders(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  const walk = (items: FileNode[]) => {
    for (const node of items) {
      if (node.type === 'folder') {
        result.push(node);
        if (node.children) walk(node.children);
      }
    }
  };
  walk(nodes);
  return result;
}

/**
 * Check if a path is in the local paths set
 */
export function isLocalPath(path: string, localPathsRef: { current: Set<string> }): boolean {
  return localPathsRef.current.has(path);
}

/**
 * Find a directory handle for a given path in the file system access API
 */
export async function findDirectoryHandleForPath(
  path: string,
  directoryHandlesRef: { current: Map<string, FileSystemDirectoryHandle> },
): Promise<FileSystemDirectoryHandle | undefined> {
  const parts = path.split('/').filter(Boolean);
  let current = parts.join('/');
  while (current) {
    const handle = directoryHandlesRef.current.get('/' + current);
    if (handle) return handle;
    current = current.includes('/')
      ? current.slice(0, current.lastIndexOf('/'))
      : '';
  }
  return undefined;
}

/**
 * Merge trees from database and local files, preserving local additions
 */
export function mergeTrees(dbFiles: FileNode[], localFiles: FileNode[]): FileNode[] {
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

/**
 * Build a tree structure from flat file array
 */
export function buildTree(flatFiles: any[]): FileNode[] {
  const map = new Map<string, FileNode>();
  const roots: FileNode[] = [];

  flatFiles.forEach((file) => {
    const node: FileNode = {
      name: file.name,
      path: file.path,
      type: file.type || (file.isFolder ? 'folder' : 'file'),
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
}

/**
 * Find a node by its path in a tree
 */
export function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Remove a node (file or folder) from the tree by path
 */
export function removeNode(nodes: FileNode[], path: string): FileNode[] {
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

/**
 * Rename a node in the tree
 */
export function renameNode(
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

/**
 * Add a new node to the tree under a parent path
 */
export function addNode(
  nodes: FileNode[],
  parentPath: string,
  newNode: FileNode,
): FileNode[] {
  return nodes.map((node) => {
    if (node.path === parentPath && node.type === 'folder') {
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