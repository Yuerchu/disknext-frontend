import type { AxiosError } from 'axios'

type ApiDetail = unknown

export interface NormalizedApiError {
  status: number | undefined
  detail: ApiDetail
  code?: string | number | null
  traceId?: string
  message: string
  retryable: boolean
}

const RETRYABLE_STATUSES = new Set([408, 409, 423, 425, 429, 500, 502, 503, 504])

export { RETRYABLE_STATUSES }

function getErrorText(detail: ApiDetail): string | undefined {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: unknown } | undefined
    if (first?.msg && typeof first.msg === 'string') return first.msg
    return detail.map((entry) => {
      if (!entry) return ''
      if (typeof entry === 'string') return entry
      if (typeof entry === 'object' && 'msg' in entry && typeof (entry as { msg?: unknown }).msg === 'string') {
        return (entry as { msg: string }).msg
      }
      return ''
    }).filter(Boolean).join('; ')
  }
  if (detail && typeof detail === 'object') {
    const detailObj = detail as { message?: unknown; msg?: unknown; detail?: unknown }
    if (typeof detailObj.message === 'string') return detailObj.message
    if (typeof detailObj.msg === 'string') return detailObj.msg
    if (typeof detailObj.detail === 'string') return detailObj.detail
  }
  return undefined
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  const axiosError = error as AxiosError<{ detail?: unknown }>
  const status = axiosError?.response?.status
  const data = axiosError?.response?.data
  const detail = (data && typeof data === 'object' && 'detail' in data)
    ? (data as { detail?: unknown }).detail
    : data
  const fallback = axiosError?.message || 'Request failed'
  const network = !axiosError?.response && !!axiosError
  const errorMessage = getErrorText(detail)
  const message = errorMessage || (network ? 'Network error' : fallback)
  const code = (data && typeof data === 'object' && 'code' in data)
    ? (data as { code?: string | number | null }).code
    : undefined
  const traceId = (data && typeof data === 'object' && 'trace_id' in data)
    ? String((data as { trace_id?: unknown }).trace_id ?? '')
    : undefined
  return {
    status,
    detail,
    code,
    traceId,
    message,
    retryable: status === undefined || RETRYABLE_STATUSES.has(status),
  }
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
  statusMessages: Record<number, string> = {}
): string {
  const normalized = normalizeApiError(error)
  if (normalized.status && statusMessages[normalized.status]) {
    return statusMessages[normalized.status]
  }
  return normalized.message || fallbackMessage
}
