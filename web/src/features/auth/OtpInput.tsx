import { useEffect, useRef } from 'react'
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react'
import './auth.css'

export interface OtpInputProps {
  /** Fixed-length array of digits (empty string = empty box). */
  digits: string[]
  onDigitsChange: (next: string[]) => void
  length?: number
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
  label?: string
}

/**
 * Accessible 6-digit code input: per-box inputs, auto-advance,
 * Backspace/arrow navigation, and full-code paste support.
 */
export function OtpInput({
  digits,
  onDigitsChange,
  length = 6,
  disabled,
  invalid,
  autoFocus,
  label = 'One-time code',
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  const focusBox = (index: number) => refs.current[index]?.focus()

  const handleChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const char = event.target.value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    onDigitsChange(next)
    if (char && index < length - 1) focusBox(index + 1)
  }

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        onDigitsChange(next)
      } else if (index > 0) {
        event.preventDefault()
        const next = [...digits]
        next[index - 1] = ''
        onDigitsChange(next)
        focusBox(index - 1)
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusBox(index - 1)
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      focusBox(index + 1)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const text = event.clipboardData.getData('text').replace(/\D/g, '')
    if (!text) return
    const next = [...digits]
    for (let i = 0; i < length; i += 1) {
      next[i] = text[i] ?? ''
    }
    onDigitsChange(next)
    focusBox(Math.min(text.length, length) - 1)
  }

  return (
    <div
      className="otp"
      role="group"
      aria-label={label}
      aria-invalid={invalid || undefined}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element
          }}
          className="otp__digit"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          value={digit}
          disabled={disabled}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
        />
      ))}
    </div>
  )
}

export function emptyOtp(length = 6): string[] {
  return Array.from({ length }, () => '')
}
