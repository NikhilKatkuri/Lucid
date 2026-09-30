# INVENTORY — Frontend

Multi-tenant inventory management SaaS frontend built with React 18, Vite, and TypeScript.

## Quick Start

```bash
cd web
npm install
npm run dev
```

App will be available at http://localhost:5173.

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend API base URL |
| `VITE_USE_MOCK` | `true` | Use MSW mock data (no backend needed) |
| `VITE_ENABLE_PASSWORD_LOGIN` | `true` | Show email/password login |
| `VITE_ENABLE_GOOGLE_LOGIN` | `true` | Show Google SSO button |
| `VITE_ENABLE_MICROSOFT_LOGIN` | `true` | Show Microsoft SSO button |
| `VITE_UPLOAD_MAX_MB` | `10` | Max file size for uploads |
| `VITE_UPLOAD_ALLOWED_TYPES` | `image/jpeg,...` | Allowed MIME types |
| `VITE_UPLOAD_MAX_CONCURRENT` | `3` | Parallel upload limit |
| `VITE_APP_NAME` | `INVENTORY` | App display name |

## Mock Mode

With `VITE_USE_MOCK=true` (default), all API calls use in-memory data from `src/mocks/db.ts`. No backend server required.

**Demo credentials:**
- Email: `admin@acme.com`
- Password: `password`
- OTP code: any 6-digit code works in mock mode

## S3 File Uploads

The frontend only receives short-lived presigned URLs from the API — it never stores or generates AWS credentials. The flow is:

1. Client calls `POST /files/presign` → gets `{ fileId, uploadUrl, method: 'PUT', headers, expiresAt }`
2. Client PUT-uploads directly to the returned URL using XMLHttpRequest (for progress events)
3. Client calls `POST /files/{fileId}/complete`

**Security rule:** `VITE_*` variables are bundled into public JavaScript. Never put AWS secrets there.

**LocalStack testing:** Set `VITE_API_URL` to your API pointed at LocalStack (`http://localhost:4566`).

**S3 CORS:** Your bucket needs this rule:
```json
[{
  "AllowedOrigins": ["http://localhost:5173", "https://your-domain.com"],
  "AllowedMethods": ["PUT", "GET"],
  "AllowedHeaders": ["Content-Type"],
  "MaxAgeSeconds": 3600
}]
```

## Folder Map

```
src/
├── app/           # Router, providers, layouts (AppShell, AuthLayout)
├── features/      # Feature modules (auth, tenant, dashboard, inventory, ...)
│   ├── auth/      # Login, Register, MFA, OTP, AuthProvider
│   ├── tenant/    # TenantProvider, ChooseTenantPage
│   ├── dashboard/ # KPI cards, trend chart, recent movements
│   ├── inventory/ # Product table, ProductSheet, StockAdjustDialog
│   ├── transfers/ # Transfer cards with approve/reject
│   ├── movements/ # Movement ledger with filters
│   ├── files/     # Drag-and-drop file upload, file grid
│   ├── members/   # User table, invite dialog
│   └── settings/  # Profile, workspace, security settings
├── shared/        # Cross-feature utilities
│   ├── api/       # queryClient.ts, queryKeys.ts
│   ├── components/ # Button, TextField, Dialog, Avatar, etc.
│   ├── config/    # env.ts (Zod-validated env)
│   ├── hooks/     # useDebounce, usePermission, useUrlState
│   ├── types/     # Shared TypeScript interfaces
│   └── utils/     # format.ts, mask.ts, cn.ts
├── mocks/         # In-memory mock DB (db.ts, tenants.ts)
└── theme/         # CSS design tokens (tokens.css, typography.css, base.css)
```

## Adding a New Feature

1. Create `src/features/<name>/` directory
2. Add `types.ts` for domain types
3. Add `hooks.ts` for TanStack Query hooks (always include `tenantId` in query keys)
4. Build page component and import from `src/app/router.tsx`
5. Add mock handlers in `src/mocks/db.ts`

**Rules:**
- Features never import from other features. Shared code goes in `shared/`
- `shared/` never imports from `features/`
- Always use `queryKeys.*` from `shared/api/queryKeys.ts`
- Use `var(--sys-*)` tokens only — never raw hex colors in components
