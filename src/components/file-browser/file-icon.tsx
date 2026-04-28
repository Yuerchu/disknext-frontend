import {
  Folder, File, FileImage, FileVideo, FileAudio, FileText, FileCode,
  FileArchive, FileJson, FileTerminal, FileType, FileKey, FileCog,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EXT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  // Images
  jpg: FileImage, jpeg: FileImage, png: FileImage, gif: FileImage,
  bmp: FileImage, webp: FileImage, svg: FileImage, ico: FileImage,
  tiff: FileImage, tif: FileImage, avif: FileImage, heic: FileImage,
  heif: FileImage, raw: FileImage, psd: FileImage, ai: FileImage,

  // Video
  mp4: FileVideo, mkv: FileVideo, avi: FileVideo, mov: FileVideo,
  wmv: FileVideo, flv: FileVideo, webm: FileVideo, m4v: FileVideo,
  mpg: FileVideo, mpeg: FileVideo, "3gp": FileVideo,

  // Audio
  mp3: FileAudio, wav: FileAudio, flac: FileAudio, aac: FileAudio,
  ogg: FileAudio, wma: FileAudio, m4a: FileAudio, opus: FileAudio,
  ape: FileAudio, alac: FileAudio, mid: FileAudio, midi: FileAudio,

  // Documents
  pdf: FileText, doc: FileText, docx: FileText, rtf: FileText,
  txt: FileText, md: FileText, markdown: FileText, log: FileText,
  epub: FileText, mobi: FileText,

  // Spreadsheets
  xls: FileSpreadsheet, xlsx: FileSpreadsheet, csv: FileSpreadsheet,
  ods: FileSpreadsheet, tsv: FileSpreadsheet,

  // Archives
  zip: FileArchive, rar: FileArchive, "7z": FileArchive,
  tar: FileArchive, gz: FileArchive, bz2: FileArchive,
  xz: FileArchive, zst: FileArchive, lz4: FileArchive,

  // Code
  js: FileCode, jsx: FileCode, ts: FileCode, tsx: FileCode,
  py: FileCode, java: FileCode, c: FileCode, cpp: FileCode,
  h: FileCode, hpp: FileCode, cs: FileCode, go: FileCode,
  rs: FileCode, rb: FileCode, php: FileCode, swift: FileCode,
  kt: FileCode, scala: FileCode, r: FileCode, lua: FileCode,
  dart: FileCode, vue: FileCode, svelte: FileCode, astro: FileCode,
  html: FileCode, htm: FileCode, css: FileCode, scss: FileCode,
  less: FileCode, sql: FileCode, graphql: FileCode, proto: FileCode,
  xml: FileCode, wasm: FileCode,

  // JSON
  json: FileJson, jsonc: FileJson, json5: FileJson,

  // Config
  yaml: FileCog, yml: FileCog, toml: FileCog, ini: FileCog,
  env: FileCog, conf: FileCog, cfg: FileCog, properties: FileCog,

  // Shell
  sh: FileTerminal, bash: FileTerminal, zsh: FileTerminal,
  fish: FileTerminal, ps1: FileTerminal, bat: FileTerminal,
  cmd: FileTerminal,

  // Fonts
  ttf: FileType, otf: FileType, woff: FileType, woff2: FileType,
  eot: FileType,

  // Keys & Certs
  pem: FileKey, crt: FileKey, cer: FileKey, key: FileKey,
  p12: FileKey, pfx: FileKey, jks: FileKey,
};

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot === -1 || dot === 0) return "";
  return name.slice(dot + 1).toLowerCase();
}

interface FileIconProps {
  name: string;
  isFolder: boolean;
  className?: string;
}

export function FileIcon({ name, isFolder, className }: FileIconProps) {
  if (isFolder) {
    return <Folder className={cn("text-primary", className)} />;
  }

  const ext = getExtension(name);
  const Icon = EXT_ICON[ext] ?? File;
  return <Icon className={cn("text-muted-foreground", className)} />;
}
