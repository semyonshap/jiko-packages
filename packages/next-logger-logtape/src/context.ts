interface DispatchContext {
  isDispatching: () => boolean
  run: <T>(fn: () => T) => T
}

function createDispatchContext(): DispatchContext {
  const isEdge = process.env.NEXT_RUNTIME === 'edge'

  if (isEdge) {
    let isInside = false
    return {
      isDispatching: () => isInside,
      run: <T>(fn: () => T): T => {
        if (isInside) {
          return fn()
        }
        isInside = true
        try {
          return fn()
        } finally {
          isInside = false
        }
      },
    }
  } else {
    const { AsyncLocalStorage } = require('node:async_hooks') as typeof import('node:async_hooks')
    const storage = new AsyncLocalStorage<true>()

    return {
      isDispatching: () => storage.getStore() === true,
      run: <T>(fn: () => T): T => storage.run(true, fn),
    }
  }
}

export const dispatchContext: DispatchContext = createDispatchContext()
