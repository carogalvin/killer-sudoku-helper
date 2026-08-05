import { useCallback, useEffect, useState } from 'react'

const STORAGE_PREFIX = 'killer-sudoku:'

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    // Corrupt or unreadable entry (e.g. private mode) — fall back rather than crash.
    return fallback
  }
}

/**
 * Drop-in replacement for the Spark `useKV` hook, backed by localStorage.
 * Values persist per browser/device and stay in sync across open tabs.
 */
export function useKV<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStored(key, defaultValue))

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
    } catch {
      // Storage full or blocked — keep the in-memory value usable.
    }
  }, [key, value])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_PREFIX + key) return
      setValue(readStored(key, defaultValue))
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const setStoredValue = useCallback<React.Dispatch<React.SetStateAction<T>>>(
    next => setValue(next),
    []
  )

  return [value, setStoredValue]
}
