import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Banner, Button, Icon, useSnackbar } from '../../shared/components'
import { useAuth } from './AuthProvider'
import { DEMO_CODE } from './api'
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

  const stateEmail = (location.state as OtpLocationState | null)?.email

  // Request a (mock) code when the screen opens.
  useEffect(() => {
    void requestCode(stateEmail ?? undefined)
  }, [requestCode, stateEmail])

  // Already signed in (e.g. back-navigation) → leave the auth flow.
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
      show('Code verified', { variant: 'success' })
      navigate('/choose-tenant', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.')
      setDigits(emptyOtp())
    } finally {
      setVerifying(false)
    }
  }

  const resend = async () => {
    await requestCode(stateEmail ?? undefined)
    show('Code sent', { variant: 'success' })
    setDigits(emptyOtp())
  }

  const destination = stateEmail ?? pendingEmail

  return (
    <section className="auth-card auth-card--otp" aria-labelledby="otp-title">
      <div className="auth-card__head">
        <span className="auth-card__badge" aria-hidden="true">
          <Icon name="sms" size={24} />
        </span>
        <h1 id="otp-title" className="t-headline-md">
          Sign in with a one-time code
        </h1>
        <p className="auth-card__subtitle">
          Enter the code sent to {destination ?? 'your email'}.
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
        Verify
      </Button>

      <p className="auth-resend">
        Didn&apos;t receive the code?{' '}
        <button type="button" className="auth-link-button" onClick={() => void resend()}>
          Resend code
        </button>
      </p>

      <p className="auth-hint">
        <Icon name="info" size={16} />
        Demo code: <span className="t-mono">{DEMO_CODE}</span>
      </p>

      <p className="auth-card__footer">
        <Link to="/login">Use password instead</Link>
        <span className="auth-card__dot" aria-hidden="true">
          ·
        </span>
        <Link to="/login/mfa">Use authenticator app instead</Link>
      </p>
    </section>
  )
}
