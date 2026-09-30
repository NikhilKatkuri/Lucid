import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().default('http://localhost:5000/api/v1'),
  VITE_USE_MOCK: z.string().transform((val) => val === 'true').default('false'),
  VITE_ENABLE_PASSWORD_LOGIN: z.string().transform((val) => val === 'true').default('true'),
  VITE_ENABLE_GOOGLE_LOGIN: z.string().transform((val) => val === 'true').default('false'),
  VITE_ENABLE_MICROSOFT_LOGIN: z.string().transform((val) => val === 'true').default('false'),
  VITE_UPLOAD_MAX_MB: z.string().transform((val) => Number(val) || 10).default('10'),
  VITE_UPLOAD_ALLOWED_TYPES: z.string().default('image/jpeg,image/png,image/webp,application/pdf'),
  VITE_UPLOAD_MAX_CONCURRENT: z.string().transform((val) => Number(val) || 3).default('3'),
  VITE_S3_PUBLIC_REGION: z.string().default('ap-south-1'),
  VITE_APP_NAME: z.string().default('INVENTORY'),
  VITE_ACCESS_TOKEN_REFRESH_SKEW_SEC: z.string().transform((val) => Number(val) || 30).default('30'),
  VITE_PAGE_SIZE_DEFAULT: z.string().transform((val) => Number(val) || 25).default('25'),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format())
}

export const env = parsed.success ? parsed.data : {
  VITE_API_URL: 'http://localhost:5000/api/v1',
  VITE_USE_MOCK: false,
  VITE_ENABLE_PASSWORD_LOGIN: true,
  VITE_ENABLE_GOOGLE_LOGIN: false,
  VITE_ENABLE_MICROSOFT_LOGIN: false,
  VITE_UPLOAD_MAX_MB: 10,
  VITE_UPLOAD_ALLOWED_TYPES: 'image/jpeg,image/png,image/webp,application/pdf',
  VITE_UPLOAD_MAX_CONCURRENT: 3,
  VITE_S3_PUBLIC_REGION: 'ap-south-1',
  VITE_APP_NAME: 'INVENTORY',
  VITE_ACCESS_TOKEN_REFRESH_SKEW_SEC: 30,
  VITE_PAGE_SIZE_DEFAULT: 25,
}
