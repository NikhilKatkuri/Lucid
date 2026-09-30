import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Banner, Button, Checkbox, IconButton, TextField, useSnackbar } from '../../shared/components'
import { useAuth } from './AuthProvider'
import { loginSchema } from './schemas'
import type { LoginInput } from './schemas'
import './auth.css'
import { env } from '../../shared/config/env'

export function LoginPage() {
  const { login, requestCode } = useAuth()
  const navigate = useNavigate()
  const { show } = useSnackbar()
  const [serverError, setServerError] = useState<string | null>(null)
  const [reveal, setReveal] = useState(false)
  const [mode, setMode] = useState<'password' | 'otp'>('password')
  const [otpSending, setOtpSending] = useState(false)

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

  const handleSendOtp = async () => {
    const email = getValues('email')
    if (!email || !email.includes('@')) {
      setServerError('Please enter a valid email address to send a code.')
      return
    }
    setServerError(null)
    setOtpSending(true)
    try {
      await requestCode(email)
      show('One-time code sent to your email', { variant: 'success' })
      navigate('/login/otp', { state: { email } })
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Failed to send code. Try again.',
      )
    } finally {
      setOtpSending(false)
    }
  }

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="auth-card__head">
        <h1 id="login-title" className="t-headline-md">
          Welcome back
        </h1>
        <p className="auth-card__subtitle">Sign in to your workspace</p>
      </div>

      <div className="auth-tabs" role="tablist">
        {env.VITE_USE_MOCK && <button
          type="button"
          role="tab"
          aria-selected={mode === 'password'}
          className={`auth-tab ${mode === 'password' ? 'auth-tab--active' : ''}`}
          onClick={() => setMode('password')}
        >
          Password
        </button>}
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'otp'}
          className={`auth-tab ${mode === 'otp' ? 'auth-tab--active' : ''}`}
          onClick={() => setMode('otp')}
        >
          One-Time Code (OTP)
        </button>
      </div>

      {serverError && (
        <Banner tone="error" onDismiss={() => setServerError(null)}>
          {serverError}
        </Banner>
      )}

      {mode === 'password' ? (
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
      ) : (
        <div className="auth-form">
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            startIcon="mail"
            error={errors.email?.message}
            {...register('email')}
          />

          <p className="auth-card__subtitle" style={{ textAlign: 'left', margin: '4px 0 8px' }}>
            We will send a 6-digit verification code to your email.
          </p>

          <Button
            variant="filled"
            fullWidth
            large
            loading={otpSending}
            onClick={() => void handleSendOtp()}
          >
            Send One-Time Code
          </Button>
        </div>
      )}

      <p className="auth-card__footer">
        Don&apos;t have an account? <Link to="/register">Create account</Link>
      </p>
    </section>
  )
}
