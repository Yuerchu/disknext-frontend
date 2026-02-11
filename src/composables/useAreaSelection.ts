import { onUnmounted, watch, type Ref } from 'vue'

interface Coordinates {
  x: number
  y: number
}

interface Candidate extends Coordinates {
  index: number
  bottom: number
  right: number
}

interface DrawArea {
  start: Coordinates | null
  end: Coordinates | null
  ctrlKey: boolean
  metaKey: boolean
}

const DRAG_THRESHOLD = 5 // pixels

function binarySearchTop(list: Candidate[][], target: number): number {
  let start = 0
  let end = list.length - 1
  while (start <= end) {
    const mid = Math.floor((start + end) / 2)
    if (list[mid][0].y < target) start = mid + 1
    else end = mid - 1
  }
  return end
}

function binarySearchBottom(list: Candidate[][], target: number): number {
  let start = 0
  let end = list.length - 1
  while (start <= end) {
    const mid = Math.floor((start + end) / 2)
    if (list[mid][0].y <= target) start = mid + 1
    else end = mid - 1
  }
  return end
}

function drawSelectionBox(box: HTMLElement, start: Coordinates, end: Coordinates): void {
  if (end.x > start.x) {
    box.style.left = start.x + 'px'
    box.style.width = (end.x - start.x) + 'px'
  } else {
    box.style.left = end.x + 'px'
    box.style.width = (start.x - end.x) + 'px'
  }
  if (end.y > start.y) {
    box.style.top = start.y + 'px'
    box.style.height = (end.y - start.y) + 'px'
  } else {
    box.style.top = end.y + 'px'
    box.style.height = (start.y - end.y) + 'px'
  }
}

export function useAreaSelection(
  containerRef: Ref<HTMLElement | null>,
  itemCount: Ref<number>,
  options: {
    enabled: Ref<boolean>
    tbodySelector: string
    onSelectionChange: (indices: number[], ctrlKey: boolean, metaKey: boolean) => void
  }
) {
  const boxNode = document.createElement('div')
  boxNode.style.position = 'fixed'
  boxNode.style.borderRadius = '2px'
  boxNode.style.pointerEvents = 'none'
  boxNode.style.background = 'color-mix(in srgb, var(--ui-primary) 15%, transparent)'
  boxNode.style.boxShadow = 'inset 0 0 0 2px color-mix(in srgb, var(--ui-primary) 40%, transparent)'
  boxNode.style.zIndex = '50'

  let mouseDown = false
  let dragging = false // true only after exceeding threshold
  let selectCandidates: Candidate[][] = []
  let elementsCache: string | null = null
  let rafId: number | null = null
  let mouseDownClientX = 0
  let mouseDownClientY = 0

  const drawArea: DrawArea = {
    start: null,
    end: null,
    ctrlKey: false,
    metaKey: false
  }

  function getPosition(container: HTMLElement, clientX: number, clientY: number): Coordinates {
    const box = container.getBoundingClientRect()
    return {
      x: container.scrollLeft + clientX - box.left,
      y: container.scrollTop + clientY - box.top
    }
  }

  function getDrawPosition(container: HTMLElement, containerBox: DOMRect, cord: Coordinates): Coordinates {
    return {
      x: Math.min(Math.max(cord.x - container.scrollLeft + containerBox.left, containerBox.left), containerBox.right),
      y: Math.min(Math.max(cord.y - container.scrollTop + containerBox.top, containerBox.top), containerBox.bottom)
    }
  }

  function updateCandidates(container: HTMLElement) {
    const rows: Candidate[][] = []
    const containerBox = container.getBoundingClientRect()
    const scrollTop = container.scrollTop

    const elements = container.querySelectorAll(options.tbodySelector + ' > tr')
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement
      const rect = el.getBoundingClientRect()
      const y = scrollTop + rect.y - containerBox.y
      const candidate: Candidate = {
        index: i,
        x: rect.x - containerBox.x,
        y,
        bottom: scrollTop + rect.bottom - containerBox.y,
        right: rect.right - containerBox.x
      }
      rows.push([candidate])
    }
    selectCandidates = rows
  }

  function processSelection() {
    const { start, end, ctrlKey, metaKey } = drawArea
    const container = containerRef.value
    if (!start || !end || !container) return

    const containerBox = container.getBoundingClientRect()
    drawSelectionBox(
      boxNode,
      getDrawPosition(container, containerBox, start),
      getDrawPosition(container, containerBox, end)
    )

    const startX = Math.min(start.x, end.x)
    const startY = Math.min(start.y, end.y)
    const endX = Math.max(start.x, end.x)
    const endY = Math.max(start.y, end.y)

    const candidates = selectCandidates
    if (candidates.length === 0) return

    const top = Math.max(0, binarySearchTop(candidates, startY))
    const bottom = binarySearchBottom(candidates, endY)

    const activeIndices: number[] = []
    for (let i = top; i <= bottom; i++) {
      const row = candidates[i]
      for (let j = 0; j < row.length; j++) {
        const el = row[j]
        if (!(el.x > endX || el.right < startX || el.y > endY || el.bottom < startY)) {
          if (el.index < itemCount.value) {
            activeIndices.push(el.index)
          }
        }
      }
    }

    const cacheKey = activeIndices.join(',')
    if (elementsCache === cacheKey) return
    elementsCache = cacheKey

    options.onSelectionChange(activeIndices, ctrlKey, metaKey)
  }

  function scheduleSelectionUpdate() {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (dragging) {
        processSelection()
      }
    })
  }

  function startDragging(e: MouseEvent) {
    dragging = true
    elementsCache = null

    const container = containerRef.value
    if (!container) return

    // Use the original mousedown position as start
    const pos = getPosition(container, mouseDownClientX, mouseDownClientY)
    updateCandidates(container)
    drawArea.start = pos
    drawArea.end = getPosition(container, e.clientX, e.clientY)
    drawArea.ctrlKey = e.ctrlKey
    drawArea.metaKey = e.metaKey

    if (!document.body.contains(boxNode)) {
      document.body.appendChild(boxNode)
    }

    processSelection()
  }

  function cleanup() {
    document.body.style.userSelect = ''
    mouseDown = false
    dragging = false
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (document.body.contains(boxNode)) {
      document.body.removeChild(boxNode)
    }
    document.removeEventListener('mouseup', onDocumentMouseUp)
    document.removeEventListener('mousemove', onDocumentMouseMove)
  }

  function onDocumentMouseUp() {
    cleanup()
  }

  function onDocumentMouseMove(e: MouseEvent) {
    // If left button is no longer pressed (e.g. released outside window), stop
    if (!(e.buttons & 1)) {
      cleanup()
      return
    }

    if (!mouseDown || !options.enabled.value) return

    if (!dragging) {
      const dx = e.clientX - mouseDownClientX
      const dy = e.clientY - mouseDownClientY
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return

      startDragging(e)
      return
    }

    document.body.style.userSelect = 'none'
    const container = containerRef.value
    if (!container) return

    const pos = getPosition(container, e.clientX, e.clientY)
    drawArea.end = pos
    drawArea.ctrlKey = e.ctrlKey
    drawArea.metaKey = e.metaKey

    // Auto-scroll near edges
    const containerBox = container.getBoundingClientRect()
    const scrollMargin = containerBox.height * 0.1
    const distanceFromBottom = containerBox.bottom - e.clientY
    const distanceFromTop = e.clientY - containerBox.top

    if (distanceFromBottom < scrollMargin) {
      container.scrollTop += 10
    } else if (distanceFromTop < scrollMargin) {
      container.scrollTop -= 10
    }

    scheduleSelectionUpdate()
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0 || !options.enabled.value) return

    const target = e.target as HTMLElement
    if (target.closest('button, a, input, [role="checkbox"], [role="menuitem"]')) return

    const container = containerRef.value
    if (!container || !container.contains(target)) return

    mouseDown = true
    mouseDownClientX = e.clientX
    mouseDownClientY = e.clientY

    // Listen on document for mouseup/mousemove to catch events outside container
    document.addEventListener('mouseup', onDocumentMouseUp)
    document.addEventListener('mousemove', onDocumentMouseMove)
  }

  // Update candidates when item count changes during drag
  watch(itemCount, () => {
    if (dragging && containerRef.value) {
      updateCandidates(containerRef.value)
      scheduleSelectionUpdate()
    }
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    onMouseDown
  }
}
