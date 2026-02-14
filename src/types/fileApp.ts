export type FileAppType = 'builtin' | 'iframe' | 'wopi'

export interface FileAppSummary {
  id: string
  name: string
  app_key: string
  type: FileAppType
  icon: string | null
  description: string | null
  iframe_url_template: string | null
  wopi_editor_url_template: string | null
}

export interface FileViewersResponse {
  viewers: FileAppSummary[]
  default_viewer_id: string | null
}

export interface DownloadTokenResponse {
  access_token: string
  expires_in: number
}

export interface WopiSessionResponse {
  wopi_src: string
  access_token: string
  access_token_ttl: number
  editor_url: string
}

export interface UserFileAppDefaultResponse {
  id: string
  extension: string
  app: FileAppSummary
}

export interface TextContentResponse {
  content: string
  hash: string
  size: number
}

export interface PatchContentRequest {
  patch: string
  base_hash: string
}

export interface PatchContentResponse {
  new_hash: string
  new_size: number
}
