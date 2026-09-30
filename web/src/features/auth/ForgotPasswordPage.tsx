import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Button, TextField, useSnackbar } from '../../shared/components'
import { Icon } from '../../shared/components'
import { requestPasswordReset } from './api'
import { forgotPasswordSchema } from './schemas'
import type { ForgotPasswordInput } from './schemas'
import './auth.css'

export function ForgotPasswordPage() {
  const { show } = useSnackbar()
  const [sentTo, setSentTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordInput) => {
    try {
      await requestPasswordReset(values.email)
      setSentTo(values.email)
      show('Reset link sent', { variant: 'success' })
    } catch (error) {
      show(
        error instanceof Error ? error.message : 'Unable to send the reset link.',
        { variant: 'error' },
      )
    }
  }

  if (sentTo) {
    return (
      <section className="auth-card" aria-labelledby="reset-sent-title">
        <div className="auth-success">
          <span className="auth-success__icon" aria-hidden="true">
            <Icon name="mark_email_read" size={28} />
          </span>
          <h1 id="reset-sent-title" className="t-headline-sm">
            Check your inbox
          </h1>
          <p className="auth-card__subtitle">
            We sent a password reset link to <strong>{sentTo}</strong>. The link
            expires in 30 minutes.
          </p>
        </div>
        <Link to="/login" className="btn btn--filled btn--lg btn--full state-layer">
          <span className="btn__label">Back to sign in</span>
        </Link>
        <Button
          variant="text"
          fullWidth
          onClick={() => setSentTo(null)}
        >
          Send to a different email
        </Button>
      </section>
    )
  }

  return (
    <section className="auth-card" aria-labelledby="forgot-title">
      <div className="auth-card__head">
        <h1 id="forgot-title" className="t-headline-md">
          Reset your password
        </h1>
        <p className="auth-card__subtitle">
          Enter your email and we&apos;ll send you a reset link.
        </p>
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
        <Button type="submit" variant="filled" fullWidth large loading={isSubmitting}>
          Send reset link
        </Button>
      </form>

      <Link to="/login" className="btn btn--text btn--full state-layer">
        <span className="btn__label">Back to sign in</span>
      </Link>
    </section>
  )
}
