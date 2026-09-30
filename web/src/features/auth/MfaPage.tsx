import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Banner, Button, Icon, useSnackbar } from '../../shared/components'
import { useAuth } from './AuthProvider'
import { DEMO_CODE } from './api'
import { OtpInput, emptyOtp } from './OtpInput'
import './auth.css'

/**
 * MFA challenge (TOTP / authenticator). Mocked now; the same
 * verifyCode contract will map to `POST /auth/login/mfa` later.
 */
export function MfaPage() {
  const { verifyCode, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { show } = useSnackbar()
  const [digits, setDigits] = useState<string[]>(() => emptyOtp())
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

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
      show('Identity verified', { variant: 'success' })
      navigate('/choose-tenant', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.')
      setDigits(emptyOtp())
    } finally {
      setVerifying(false)
    }
  }

  return (
    <section className="auth-card auth-card--otp" aria-labelledby="mfa-title">
      <div className="auth-card__head">
        <span className="auth-card__badge" aria-hidden="true">
          <Icon name="shield" size={24} />
        </span>
        <h1 id="mfa-title" className="t-headline-md">
          Verify your identity
        </h1>
        <p className="auth-card__subtitle">
          Enter your six-digit authentication code.
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
        label="Authentication code"
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

      <p className="auth-hint">
        <Icon name="info" size={16} />
        Demo code: <span className="t-mono">{DEMO_CODE}</span>
      </p>

      <Button variant="text" fullWidth onClick={() => navigate('/login/otp')}>
        Use email code instead
      </Button>

      <p className="auth-card__footer">
        <Link to="/login">Back to sign in</Link>
      </p>
    </section>
  )
}
