import { ref, onUnmounted, type Ref } from 'vue'

interface DragDropItem {
  id: string
  name: string
  type: 'file' | 'folder'
}

interface DragDropOptions {
  enabled: Ref<boolean>
  containerRef: Ref<HTMLElement | null>
  getSelectedItems: () => DragDropItem[]
  isItemSelected: (id: string) => boolean
  getItemAtIndex: (index: number) => DragDropItem | undefined
  tbodySelector: string
  itemSelector: string
  onDrop: (srcIds: string[], dstId: string, dstName: string) => Promise<void>
  onBreadcrumbDrop?: (srcIds: string[], path: string) => Promise<void>
}

const DRAG_THRESHOLD = 5

type State = 'IDLE' | 'ARMED' | 'DRAGGING'

function getScrollParent(el: HTMLElement): HTMLElement {
  let parent = el.parentElement
  while (parent) {
    const { overflowY } = getComputedStyle(parent)
    if (overflowY === 'auto' || overflowY === 'scroll') return parent
    parent = parent.parentElement
  }
  return document.documentElement
}

export function useFileDragDrop(options: DragDropOptions) {
  const isDragging = ref(false)
  const dragItems = ref<DragDropItem[]>([])
  const dropTargetId = ref<string | null>(null)
  const dropBreadcrumbPath = ref<string | null>(null)
  const previewPos = ref({ x: 0, y: 0 })

  let state: State = 'IDLE'
  let mouseDownX = 0
  let mouseDownY = 0
  let scrollParent: HTMLElement | null = null
  let savedCursor = ''
  let savedUserSelect = ''

  function getItemElements(): NodeListOf<Element> | null {
    const container = options.containerRef.value
    if (!container) return null
    return container.querySelectorAll(options.tbodySelector + ' > ' + options.itemSelector)
  }

  function getIndexFromElement(el: Element): number {
    const items = getItemElements()
    if (!items) return -1
    return Array.from(items).indexOf(el)
  }

  function findItemElement(target: HTMLElement): Element | null {
    return target.closest(options.itemSelector)
  }

  function shouldSkipAreaSelection(target: HTMLElement): boolean {
    if (!options.enabled.value) return false
    const itemEl = findItemElement(target)
    if (!itemEl) return false
    const index = getIndexFromElement(itemEl)
    if (index === -1) return false
    const item = options.getItemAtIndex(index)
    if (!item) return false
    return options.isItemSelected(item.id)
  }

  function findDropTarget(clientX: number, clientY: number): DragDropItem | null {
    const el = document.elementFromPoint(clientX, clientY)
    if (!el) return null
    const itemEl = el.closest(options.itemSelector)
    if (!itemEl) return null

    // Must be inside our container
    const container = options.containerRef.value
    if (!container || !container.contains(itemEl)) return null

    const index = getIndexFromElement(itemEl)
    if (index === -1) return null
    const item = options.getItemAtIndex(index)
    if (!item) return null

    // Only folders that are NOT selected can be drop targets
    if (item.type !== 'folder') return null
    if (options.isItemSelected(item.id)) return null

    return item
  }

  function findBreadcrumbTarget(clientX: number, clientY: number): string | null {
    if (!options.onBreadcrumbDrop) return null
    const el = document.elementFromPoint(clientX, clientY)
    if (!el) return null
    const dropEl = el.closest('[data-drop-path]') as HTMLElement | null
    if (!dropEl) return null
    return dropEl.dataset.dropPath ?? null
  }

  function startDragging() {
    state = 'DRAGGING'
    isDragging.value = true
    dragItems.value = options.getSelectedItems()

    savedCursor = document.body.style.cursor
    savedUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'

    const container = options.containerRef.value
    if (container) {
      scrollParent = getScrollParent(container)
    }
  }

  function cleanup() {
    state = 'IDLE'
    isDragging.value = false
    dragItems.value = []
    dropTargetId.value = null
    dropBreadcrumbPath.value = null
    scrollParent = null

    document.body.style.cursor = savedCursor
    document.body.style.userSelect = savedUserSelect
    savedCursor = ''
    savedUserSelect = ''

    document.removeEventListener('mousemove', onDocumentMouseMove)
    document.removeEventListener('mouseup', onDocumentMouseUp)
    document.removeEventListener('keydown', onKeyDown)
  }

  function onDocumentMouseMove(e: MouseEvent) {
    if (!(e.buttons & 1)) {
      cleanup()
      return
    }

    if (state === 'ARMED') {
      const dx = e.clientX - mouseDownX
      const dy = e.clientY - mouseDownY
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return
      startDragging()
    }

    if (state !== 'DRAGGING') return

    // Update preview position (offset so it doesn't cover cursor)
    previewPos.value = { x: e.clientX + 12, y: e.clientY + 12 }

    // Find drop target under cursor (file list folder or breadcrumb)
    const target = findDropTarget(e.clientX, e.clientY)
    const breadcrumbTarget = !target ? findBreadcrumbTarget(e.clientX, e.clientY) : null

    dropTargetId.value = target?.id ?? null
    dropBreadcrumbPath.value = breadcrumbTarget

    // Update cursor based on drop target validity
    const hasTarget = target || breadcrumbTarget !== null
    document.body.style.cursor = hasTarget ? 'grabbing' : 'no-drop'

    // Auto-scroll near edges
    const scrollEl = scrollParent || options.containerRef.value
    if (scrollEl) {
      const scrollRect = scrollEl.getBoundingClientRect()
      const scrollMargin = scrollRect.height * 0.1
      const distanceFromBottom = scrollRect.bottom - e.clientY
      const distanceFromTop = e.clientY - scrollRect.top

      if (distanceFromBottom < scrollMargin) {
        scrollEl.scrollTop += 10
      } else if (distanceFromTop < scrollMargin) {
        scrollEl.scrollTop -= 10
      }
    }
  }

  async function onDocumentMouseUp() {
    if (state === 'DRAGGING' && dropTargetId.value) {
      const srcIds = dragItems.value.map(item => item.id)
      const dstId = dropTargetId.value
      const dstItem = findDropTargetItem(dstId)
      const dstName = dstItem?.name ?? ''
      cleanup()
      await options.onDrop(srcIds, dstId, dstName)
    } else if (state === 'DRAGGING' && dropBreadcrumbPath.value !== null && options.onBreadcrumbDrop) {
      const srcIds = dragItems.value.map(item => item.id)
      const path = dropBreadcrumbPath.value
      cleanup()
      await options.onBreadcrumbDrop(srcIds, path)
    } else {
      cleanup()
    }
  }

  function findDropTargetItem(id: string): DragDropItem | null {
    const items = getItemElements()
    if (!items) return null
    for (let i = 0; i < items.length; i++) {
      const item = options.getItemAtIndex(i)
      if (item && item.id === id) return item
    }
    return null
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cleanup()
    }
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0 || !options.enabled.value) return
    if (state !== 'IDLE') return

    const target = e.target as HTMLElement
    // Don't interfere with interactive elements
    if (target.closest('button, a, input, [role="checkbox"], [role="menuitem"]')) return

    const itemEl = findItemElement(target)
    if (!itemEl) return

    const container = options.containerRef.value
    if (!container || !container.contains(itemEl)) return

    const index = getIndexFromElement(itemEl)
    if (index === -1) return

    const item = options.getItemAtIndex(index)
    if (!item) return

    // Only start drag if clicking on an already selected item
    if (!options.isItemSelected(item.id)) return

    state = 'ARMED'
    mouseDownX = e.clientX
    mouseDownY = e.clientY

    document.addEventListener('mousemove', onDocumentMouseMove)
    document.addEventListener('mouseup', onDocumentMouseUp)
    document.addEventListener('keydown', onKeyDown)
  }

  onUnmounted(() => {
    if (state !== 'IDLE') {
      cleanup()
    }
  })

  return {
    isDragging,
    dragItems,
    dropTargetId,
    dropBreadcrumbPath,
    previewPos,
    shouldSkipAreaSelection,
    onMouseDown
  }
}
