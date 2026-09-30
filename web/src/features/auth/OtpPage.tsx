import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Banner, Button, Icon, useSnackbar } from '../../shared/components'
import { useAuth } from './AuthProvider'
import { OtpInput, emptyOtp } from './OtpInput'
import './auth.css'

interface OtpLocationState {
  email?: string
}
export function OtpPage() {
  const { requestCode, verifyCode, pendingEmail, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { show } = useSnackbar()
  const [digits, setDigits] = useState<string[]>(() => emptyOtp())
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [resendTimer, setResendTimer] = useState(30)

  const stateEmail = (location.state as OtpLocationState | null)?.email

  // Countdown for resend button
  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  // Request code on load
  useEffect(() => {
    void requestCode(stateEmail ?? undefined)
  }, [requestCode, stateEmail])

  // Redirect if authenticated
  useEffect(() => {
    if (isAuthenticated) navigate('/choose-tenant', { replace: true })
  }, [isAuthenticated, navigate])

  const code = digits.join('')
  const complete = code.length === 6

  const verify = async () => {
    setError(null)
    setVerifying(true)
    try {
      await verifyCode(code)
      show('Code verified successfully', { variant: 'success' })
      navigate('/choose-tenant', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.')
      setDigits(emptyOtp())
    } finally {
      setVerifying(false)
    }
  }

  const resend = async () => {
    if (resendTimer > 0) return
    await requestCode(stateEmail ?? undefined)
    show('A new code has been sent', { variant: 'success' })
    setDigits(emptyOtp())
    setResendTimer(30)
  }

  const destination = stateEmail ?? pendingEmail

  return (
    <section className="auth-card auth-card--otp" aria-labelledby="otp-title">
      <div className="auth-card__head">
        <span className="auth-card__badge" aria-hidden="true">
          <Icon name="sms" size={24} />
        </span>
        <h1 id="otp-title" className="t-headline-md">
          Enter one-time code
        </h1>
        <p className="auth-card__subtitle">
          We sent a 6-digit code to <strong>{destination ?? 'your email'}</strong>
        </p>
      </div>

      {error && (
        <Banner tone="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      <OtpInput
        digits={digits}
        onDigitsChange={setDigits}
        invalid={Boolean(error)}
        disabled={verifying}
        autoFocus
        label="One-time sign-in code"
      />

      <Button
        variant="filled"
        fullWidth
        large
        disabled={!complete}
        loading={verifying}
        onClick={() => void verify()}
      >
        Verify Code
      </Button>

      <p className="auth-resend">
        Didn&apos;t receive the code?{' '}
        {resendTimer > 0 ? (
          <span className="auth-resend__timer">Resend in {resendTimer}s</span>
        ) : (
          <button type="button" className="auth-link-button" onClick={() => void resend()}>
            Resend code
          </button>
        )}
      </p>

      <p className="auth-card__footer">
        <Link to="/login">Sign in with password instead</Link>
      </p>
    </section>
  )
}
