import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Banner, Button, TextField, useSnackbar } from '../../shared/components'
import { useAuth } from './AuthProvider'
import { registerSchema } from './schemas'
import type { RegisterInput } from './schemas'
import './auth.css'

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const { show } = useSnackbar()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      organizationName: '',
    },
  })

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null)
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        organizationName: values.organizationName || undefined,
      })
      show('Account created', { variant: 'success' })
      navigate('/choose-tenant', { replace: true })
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Unable to create the account.',
      )
    }
  }

  return (
    <section className="auth-card" aria-labelledby="register-title">
      <div className="auth-card__head">
        <h1 id="register-title" className="t-headline-md">
          Create your account
        </h1>
        <p className="auth-card__subtitle">
          Set up your account to manage inventory across your organization.
        </p>
      </div>

      {serverError && (
        <Banner tone="error" onDismiss={() => setServerError(null)}>
          {serverError}
        </Banner>
      )}

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Full name"
          autoComplete="name"
          placeholder="Aditi Sharma"
          startIcon="person"
          error={errors.name?.message}
          {...register('name')}
        />
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
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          startIcon="lock"
          helperText="Use 8+ characters with at least one number."
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          startIcon="lock_reset"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <TextField
          label="Organization name (optional)"
          autoComplete="organization"
          placeholder="ACME Retail Group"
          startIcon="domain"
          error={errors.organizationName?.message}
          {...register('organizationName')}
        />

        <Button type="submit" variant="filled" fullWidth large loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="auth-card__footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </section>
  )
}
