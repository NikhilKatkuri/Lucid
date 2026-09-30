import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

type ParamValue = string | number | undefined | null

export function useUrlState(key: string): [string, (value: ParamValue) => void]
export function useUrlState(key: string, defaultValue: string): [string, (value: ParamValue) => void]
export function useUrlState(
  key: string,
  defaultValue?: string,
): [string, (value: ParamValue) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const value = searchParams.get(key) ?? defaultValue ?? ''

  const setValue = useCallback(
    (newValue: ParamValue) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (newValue === undefined || newValue === null || newValue === '' || newValue === defaultValue) {
          next.delete(key)
        } else {
          next.set(key, String(newValue))
        }
        return next
      }, { replace: true })
    },
    [key, defaultValue, setSearchParams],
  )

  return [value, setValue]
}
