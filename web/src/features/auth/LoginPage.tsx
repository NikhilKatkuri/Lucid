import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Banner, Button, Checkbox, Icon, IconButton, TextField, useSnackbar } from '../../shared/components'
import { useAuth } from './AuthProvider'
import { loginSchema } from './schemas'
import type { LoginInput } from './schemas'
import { GoogleMark, MicrosoftMark } from './SsoIcons'
import './auth.css'
import { env } from '../../shared/config/env'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { show } = useSnackbar()
  const [serverError, setServerError] = useState<string | null>(null)
  const [reveal, setReveal] = useState(false)
  const [ssoPending, setSsoPending] = useState<'google' | 'microsoft' | null>(null)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  })

  const onSubmit = async (values: LoginInput) => {
    setServerError(null)
    try {
      await login(values.email, values.password)
      navigate('/choose-tenant', { replace: true })
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Unable to sign in. Please try again.',
      )
    }
  }

  const handleSso = async (provider: 'google' | 'microsoft') => {
    setServerError(null)
    setSsoPending(provider)
    try {
      await login('demo@acme.com', 'demo1234')
      show(
        `${provider === 'google' ? 'Google' : 'Microsoft'} sign-in is mocked in this demo`,
      )
      navigate('/choose-tenant', { replace: true })
    } catch {
      setServerError('SSO sign-in failed. Please try the form below.')
    } finally {
      setSsoPending(null)
    }
  }

  const goToOtp = () => {
    const email = getValues('email')
    navigate('/login/otp', { state: email ? { email } : undefined })
  }

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="auth-card__head">
        <h1 id="login-title" className="t-headline-md">
          Welcome back
        </h1>
        <p className="auth-card__subtitle">Sign in to your workspace</p>
      </div>

      {serverError && (
        <Banner tone="error" onDismiss={() => setServerError(null)}>
          {serverError}
        </Banner>
      )}

      {env.VITE_USE_MOCK && <div className="auth-sso">
        <Button
          variant="outlined"
          fullWidth
          large
          loading={ssoPending === 'google'}
          disabled={ssoPending !== null}
          startIcon={<GoogleMark />}
          onClick={() => void handleSso('google')}
        >
          Continue with Google
        </Button>
        <Button
          variant="outlined"
          fullWidth
          large
          loading={ssoPending === 'microsoft'}
          disabled={ssoPending !== null}
          startIcon={<MicrosoftMark />}
          onClick={() => void handleSso('microsoft')}
        >
          Continue with Microsoft
        </Button>
      </div>}

      <div className="auth-divider" aria-hidden="true">
        <span className="auth-divider__line" />
        <span className="auth-divider__text">or</span>
        <span className="auth-divider__line" />
      </div>

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          startIcon="mail"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type={reveal ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your password"
          startIcon="lock"
          error={errors.password?.message}
          endAdornment={
            <IconButton
              label={reveal ? 'Hide password' : 'Show password'}
              size={20}
              onClick={() => setReveal((value) => !value)}
            >
              {reveal ? 'visibility_off' : 'visibility'}
            </IconButton>
          }
          {...register('password')}
        />

        <div className="auth-row">
          <Checkbox label="Remember me" defaultChecked {...register('remember')} />
          <Link to="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="filled" fullWidth large loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      {env.VITE_USE_MOCK && <Button variant="text" fullWidth onClick={goToOtp}>Use a one-time code instead</Button>}

      <p className="auth-hint">
        <Icon name="info" size={16} />
        Demo mode — any email with a 6+ character password works.
      </p>

      <p className="auth-card__footer">
        Don&apos;t have an account? <Link to="/register">Create account</Link>
      </p>
    </section>
  )
}
