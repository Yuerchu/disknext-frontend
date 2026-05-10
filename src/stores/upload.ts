import { create } from "zustand";
import { file, resolveErrorMessage } from "@/api";

export type UploadTaskStatus = "pending" | "uploading" | "complete" | "error" | "cancelled";

export interface UploadTask {
  id: string;
  fileName: string;
  fileSize: number;
  parentId: string;
  status: UploadTaskStatus;
  sessionId: string | null;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number;
  progress: number;
  speed: number;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  lastProgressAt: number | null;
  lastProgressBytes: number;
}

interface UploadState {
  tasks: UploadTask[];
  panelOpen: boolean;
  panelMinimized: boolean;
  concurrency: number;
  activeCount: number;

  addFiles: (files: File[], parentId: string) => void;
  cancelTask: (taskId: string) => void;
  retryTask: (taskId: string) => void;
  removeTask: (taskId: string) => void;
  clearCompleted: () => void;
  setPanelOpen: (open: boolean) => void;
  setPanelMinimized: (minimized: boolean) => void;
}

const fileMap = new Map<string, File>();
const abortMap = new Map<string, AbortController>();
let onUploadComplete: (() => void) | null = null;

export function setOnUploadComplete(cb: (() => void) | null) {
  onUploadComplete = cb;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function processQueue() {
  const state = useUploadStore.getState();
  const { tasks, concurrency, activeCount } = state;
  const available = concurrency - activeCount;
  if (available <= 0) return;
  const pending = tasks.filter((t) => t.status === "pending");
  for (const task of pending.slice(0, available)) {
    startUpload(task.id);
  }
}

async function startUpload(taskId: string) {
  const f = fileMap.get(taskId);
  if (!f) return;

  const abort = new AbortController();
  abortMap.set(taskId, abort);

  useUploadStore.setState((s) => ({
    tasks: s.tasks.map((t) =>
      t.id === taskId ? { ...t, status: "uploading" as const, startedAt: Date.now(), error: null } : t,
    ),
    activeCount: s.activeCount + 1,
  }));

  try {
    const task = useUploadStore.getState().tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (abort.signal.aborted) throw new DOMException("Aborted", "AbortError");

    const session = await file.createUploadSession({
      file_name: task.fileName,
      file_size: task.fileSize,
      parent_id: task.parentId,
    });

    if (abort.signal.aborted) throw new DOMException("Aborted", "AbortError");

    useUploadStore.setState((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, sessionId: session.id, chunkSize: session.chunk_size, totalChunks: session.total_chunks, uploadedChunks: session.uploaded_chunks }
          : t,
      ),
    }));

    const { chunk_size, total_chunks } = session;

    for (let i = 0; i < total_chunks; i++) {
      if (abort.signal.aborted) throw new DOMException("Aborted", "AbortError");

      const start = i * chunk_size;
      const end = Math.min(start + chunk_size, f.size);
      const blob = f.slice(start, end);
      const result = await file.uploadChunk(session.id, i, blob, session.upload_url);
      const now = Date.now();

      useUploadStore.setState((s) => {
        const prev = s.tasks.find((t) => t.id === taskId);
        if (!prev) return s;
        const uploaded = result.uploaded_chunks;
        const progress = total_chunks > 0 ? Math.round((uploaded / total_chunks) * 100) : 0;
        const elapsed = prev.lastProgressAt ? (now - prev.lastProgressAt) / 1000 : 0;
        const speed = elapsed > 0 ? (end - start) / elapsed : prev.speed;
        return {
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, uploadedChunks: uploaded, progress, speed, lastProgressAt: now, lastProgressBytes: end } : t,
          ),
        };
      });

      if (result.is_complete) break;
    }

    useUploadStore.setState((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, status: "complete" as const, progress: 100, completedAt: Date.now(), speed: 0 } : t,
      ),
      activeCount: s.activeCount - 1,
    }));
    onUploadComplete?.();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      const task = useUploadStore.getState().tasks.find((t) => t.id === taskId);
      if (task?.sessionId) {
        file.deleteUploadSession(task.sessionId).catch(() => {});
      }
      useUploadStore.setState((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, status: "cancelled" as const, speed: 0 } : t,
        ),
        activeCount: s.activeCount - 1,
      }));
    } else {
      useUploadStore.setState((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, status: "error" as const, error: resolveErrorMessage(err), speed: 0 } : t,
        ),
        activeCount: s.activeCount - 1,
      }));
    }
  } finally {
    abortMap.delete(taskId);
    processQueue();
  }
}

export const useUploadStore = create<UploadState>()((set, get) => ({
  tasks: [],
  panelOpen: false,
  panelMinimized: false,
  concurrency: 3,
  activeCount: 0,

  addFiles: (files, parentId) => {
    const newTasks: UploadTask[] = files.map((f) => {
      const id = generateId();
      fileMap.set(id, f);
      return {
        id, fileName: f.name, fileSize: f.size, parentId,
        status: "pending", sessionId: null, chunkSize: 0,
        totalChunks: 0, uploadedChunks: 0, progress: 0, speed: 0,
        error: null, startedAt: null, completedAt: null,
        lastProgressAt: null, lastProgressBytes: 0,
      };
    });
    set((s) => ({ tasks: [...newTasks, ...s.tasks], panelOpen: true, panelMinimized: false }));
    setTimeout(processQueue, 0);
  },

  cancelTask: (taskId) => {
    abortMap.get(taskId)?.abort();
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId && (t.status === "pending" || t.status === "uploading")
          ? { ...t, status: "cancelled", speed: 0 } : t,
      ),
    }));
  },

  retryTask: (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task || (task.status !== "error" && task.status !== "cancelled")) return;
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: "pending" as const, progress: 0, uploadedChunks: 0, speed: 0, error: null, startedAt: null, completedAt: null, lastProgressAt: null, lastProgressBytes: 0 }
          : t,
      ),
    }));
    setTimeout(processQueue, 0);
  },

  removeTask: (taskId) => {
    abortMap.get(taskId)?.abort();
    fileMap.delete(taskId);
    abortMap.delete(taskId);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }));
  },

  clearCompleted: () => {
    for (const t of get().tasks.filter((t) => t.status === "complete" || t.status === "cancelled")) {
      fileMap.delete(t.id);
    }
    set((s) => ({ tasks: s.tasks.filter((t) => t.status !== "complete" && t.status !== "cancelled") }));
  },

  setPanelOpen: (open) => set({ panelOpen: open }),
  setPanelMinimized: (minimized) => set({ panelMinimized: minimized }),
}));
