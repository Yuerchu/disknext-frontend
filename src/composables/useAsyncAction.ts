import { ref } from 'vue'

export function useAsyncAction() {
  const runningActions = ref(new Set<string>())

  const isRunning = (action: string): boolean => runningActions.value.has(action)

  async function run<T>(action: string, task: () => Promise<T>): Promise<T | undefined> {
    if (isRunning(action)) {
      return undefined
    }

    runningActions.value = new Set(runningActions.value).add(action)

    try {
      return await task()
    } finally {
      const next = new Set(runningActions.value)
      next.delete(action)
      runningActions.value = next
    }
  }

  return {
    run,
    isRunning,
  }
}
