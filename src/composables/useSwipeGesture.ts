import type { Ref } from 'vue'

export interface UseSwipeGestureOptions {
  /** Minimum distance (px) to trigger a swipe. Default: 50 */
  threshold?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  /** Optional ref; when value > 1, swipe detection is disabled (e.g. zoomed image) */
  disabled?: Ref<boolean>
}

export function useSwipeGesture(
  target: Ref<HTMLElement | null>,
  options: UseSwipeGestureOptions,
) {
  const threshold = options.threshold ?? 50
  const LOCK_DISTANCE = 10

  let startX = 0
  let startY = 0
  let locked: 'horizontal' | 'vertical' | null = null
  let pointerId: number | null = null

  function onPointerDown(e: PointerEvent) {
    if (options.disabled?.value) return
    // Only track primary pointer (touch finger or left mouse button)
    if (!e.isPrimary) return
    startX = e.clientX
    startY = e.clientY
    locked = null
    pointerId = e.pointerId
  }

  function onPointerMove(e: PointerEvent) {
    if (pointerId === null || e.pointerId !== pointerId) return
    if (locked) return
    const dx = Math.abs(e.clientX - startX)
    const dy = Math.abs(e.clientY - startY)
    if (dx > LOCK_DISTANCE || dy > LOCK_DISTANCE) {
      locked = dx >= dy ? 'horizontal' : 'vertical'
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (pointerId === null || e.pointerId !== pointerId) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    pointerId = null

    if (locked === 'horizontal') {
      if (Math.abs(dx) >= threshold) {
        if (dx < 0) options.onSwipeLeft?.()
        else options.onSwipeRight?.()
      }
    } else if (locked === 'vertical') {
      if (Math.abs(dy) >= threshold) {
        if (dy < 0) options.onSwipeUp?.()
        else options.onSwipeDown?.()
      }
    }
    locked = null
  }

  function onPointerCancel() {
    pointerId = null
    locked = null
  }

  onMounted(() => {
    const el = target.value
    if (!el) return
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)
  })

  onBeforeUnmount(() => {
    const el = target.value
    if (!el) return
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerCancel)
  })
}
