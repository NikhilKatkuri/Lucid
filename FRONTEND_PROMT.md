# FRONTEND_PROMT.md: Build the Frontend (React) for the Multi-Tenant Inventory Platform

> Give this whole file to your AI coding agent (Claude Code, Cursor, etc.) together with `DESIGN.md`.
> Build in the **phases** listed at the end, and stop after each phase for review.

---

## 0. Role and goal

You are a senior React engineer. Build the complete frontend for a **multi-tenant inventory management system**. The backend is ASP.NET Core with MongoDB. Your job is only `web/`.

- An **Organization** has many **sub-accounts**, and each sub-account is a **tenant**.
- The UI must be **fully dynamic**: all data comes from the API, nothing hard-coded. No fake rows in components.
- The UI must follow **`DESIGN.md`** (Material 3, clean and simple, Google Sans, `--sys-*` color tokens). Copy the token block from `DESIGN.md` into `src/theme/tokens.css` unchanged.
- Files upload **directly to S3 with presigned URLs**. Configuration comes from `.env`.

## 1. Tech stack (fixed)

| Concern      | Choice                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Build        | Vite + React 18 + TypeScript (strict)                                                                      |
| Routing      | React Router v6 (data router)                                                                              |
| Server state | TanStack Query v5                                                                                          |
| Forms        | React Hook Form + Zod                                                                                      |
| HTTP         | Axios                                                                                                      |
| UI           | Custom components styled with CSS variables (`--sys-*`); Material Symbols Outlined icons. No heavy UI kit. |
| Charts       | Recharts (colored from the accent tokens)                                                                  |
| Tests        | Vitest + Testing Library; Playwright for e2e                                                               |
| Mocking      | MSW (Mock Service Worker) for dev without a backend                                                        |
| Lint/format  | ESLint + Prettier                                                                                          |

## 2. Environment variables

Create `web/.env.example` (and read it through one typed module, `src/shared/config/env.ts`, validated with Zod at startup; fail loudly if invalid):

```dotenv
# API
VITE_API_URL=http://localhost:5000/api
VITE_USE_MOCK=false                # true = MSW mock backend, no server needed

# Auth providers (public client IDs only)
VITE_GOOGLE_CLIENT_ID=
VITE_MICROSOFT_CLIENT_ID=
VITE_MICROSOFT_TENANT=common
VITE_ENABLE_PASSWORD_LOGIN=true
VITE_ENABLE_GOOGLE_LOGIN=true
VITE_ENABLE_MICROSOFT_LOGIN=true

# Uploads (S3 through presigned URLs)
VITE_UPLOAD_MAX_MB=10
VITE_UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp,application/pdf
VITE_UPLOAD_MAX_CONCURRENT=3
VITE_S3_PUBLIC_REGION=ap-south-1   # informational only, shown in the admin/about screen

# App
VITE_APP_NAME=Inventory
VITE_ACCESS_TOKEN_REFRESH_SKEW_SEC=30
VITE_PAGE_SIZE_DEFAULT=25
```

**Hard rule:** the frontend must **never** contain AWS access keys, secret keys, or bucket credentials, and none may be read from `VITE_*` variables (they are bundled into public JavaScript). The browser only receives a **short-lived presigned URL** from the API. AWS credentials, the bucket name, and the KMS key live in the **server's** `.env`. Add a short comment about this in `.env.example`.

## 3. Folder structure (follow exactly)

```
web/
├── package.json  vite.config.ts  tsconfig.json  index.html  .env.example
├── public/
└── src/
    ├── main.tsx
    ├── app/
    │   ├── App.tsx
    │   ├── router.tsx
    │   ├── providers.tsx                 # Query, Auth, Tenant, Snackbar providers
    │   └── layouts/{AppShell,AuthLayout}.tsx
    ├── theme/
    │   ├── tokens.css                    # ALL --sys-* variables from DESIGN.md
    │   ├── typography.css                # Google Sans + type scale + tabular nums
    │   ├── shape-elevation.css
    │   └── base.css                      # reset, focus ring, state layers
    ├── features/
    │   ├── auth/        (AuthProvider, LoginPage, MfaChallenge, SsoButtons, api.ts, hooks.ts)
    │   ├── tenant/      (TenantProvider, TenantSwitcher, ChooseTenantPage, api.ts, tenantChannel.ts)
    │   ├── dashboard/   (DashboardPage, KpiCard, LowStockCard, RecentMovements, AllLocationsChart)
    │   ├── inventory/   (InventoryPage, ProductTable, ProductFilters, StatusChip, ProductSheet, StockAdjustDialog, api.ts, hooks.ts, types.ts, schema.ts)
    │   ├── transfers/   (TransfersPage, NewTransferDialog, api.ts, hooks.ts)
    │   ├── movements/   (MovementsPage, api.ts)
    │   ├── files/       (FilesPage, FileUploader, UploadQueue, useUpload.ts, api.ts)
    │   ├── members/     (MembersPage, InviteDialog, api.ts)
    │   └── settings/    (SettingsPage)
    ├── shared/
    │   ├── config/env.ts
    │   ├── api/{http.ts, queryClient.ts, queryKeys.ts, errors.ts}
    │   ├── components/  (Button, IconButton, TextField, Select, Checkbox, Chip, Card, Dialog, SideSheet, DataTable, Pagination, SearchBar, Snackbar, EmptyState, Skeleton, Banner, Tabs, Avatar, Menu, ProgressBar)
    │   ├── guards/      (RequireAuth, RequireTenant, RequireRole)
    │   ├── hooks/       (useDebounce, usePermission, useMediaQuery, useUrlState)
    │   ├── utils/       (format.ts, mask.ts, cn.ts)
    │   └── types/
    ├── mocks/           (handlers.ts, db.ts, browser.ts)   # MSW, used when VITE_USE_MOCK=true
    └── tests/           (setup.ts, e2e/)
```

Rules:

- Features never import from other features; shared code goes in `shared/`. `shared/` never imports from `features/`.
- All server data goes through TanStack Query hooks in each feature's `hooks.ts`. Components never call Axios directly.
- Every query key is built in `shared/api/queryKeys.ts` and **must include `tenantId`** (`['inventory', tenantId, filters]`).

## 4. Design implementation

Implement `DESIGN.md` faithfully:

- Colors only through `var(--sys-*)`. No raw hex in components.
- Font: `var(--font-brand)` (Google Sans with fallbacks); SKUs and IDs use `var(--font-mono)`; numbers use `tabular-nums`.
- App shell: 64px top app bar (menu button, app name, **TenantSwitcher**, search, notifications, avatar menu), navigation rail or drawer by breakpoint, and content area on `surface-container-low`.
- Breakpoints: compact < 600 (bottom nav, cards instead of table), medium 600-839 (rail), expanded 840-1199 (rail), large ≥ 1200 (drawer 280px, content max 1440px).
- Status chips: In stock = success, Low = warning, Out = error, Pending transfer = info, Archived = grey. Always icon + text, never color alone.
- Tenant badge colors come from the accent palette (`blue, purple, cyan, orange, pink, green`), chosen by a stable hash of the tenant ID.
- Loading = skeletons. Empty = icon, one sentence, one button. Errors = `error-container` banner with retry. Success = snackbar with Undo where possible.
- Respect `prefers-reduced-motion`. All controls are keyboard accessible with a visible focus ring, dialogs trap focus, and touch targets are at least 48px.

## 5. Authentication (multi-auth) and session

**Methods:** email + password, Google (OIDC), Microsoft (OIDC), MFA (TOTP or email OTP), and "use a one-time code instead". Show only the methods enabled by the env flags.

**Two-step session model:**

1. Login by any method returns an **identity token** (user only, no tenant), or `{ mfaRequired: true, mfaToken }`.
2. `GET /me/orgs` returns the organizations and sub-accounts the user can access.
3. The user picks a sub-account, and `POST /auth/switch-tenant { tenantId }` returns a **tenant-scoped access token**.
4. Every API call sends `Authorization: Bearer <token>` and `X-Tenant-Id: <tenantId>`.

**Token handling:**

- Access token is kept **in memory only** (never localStorage/sessionStorage).
- Refresh token is an httpOnly cookie (`withCredentials: true`); `POST /auth/refresh` restores the session on page load and shortly before expiry (`VITE_ACCESS_TOKEN_REFRESH_SKEW_SEC`).
- Axios response interceptor: on 401, refresh once (a single shared in-flight promise), retry the request, else log out. On 403 with a tenant error, clear the tenant and route to the picker with a snackbar.
- `BroadcastChannel('inventory-auth')` syncs **logout** and **tenant switch** across tabs.
- Step-up MFA: if the API returns `403` with `code: "STEP_UP_REQUIRED"`, open the MFA dialog and retry the action on success (used for viewing supplier cost and creating sub-accounts).

## 6. Tenant context and switching

- `TenantProvider` holds `{ orgs, activeOrg, activeTenant, mode: 'tenant' | 'all-locations' }`.
- **TenantSwitcher** (top bar): a full-radius button on `surface-container` showing a colored dot, organization name ▸ sub-account name. The menu is grouped by organization with one row per sub-account and a checkmark on the current one. OrgAdmins also get **All locations** (read-only consolidated view, with a `secondary-container` banner).
- On switch: call `switch-tenant`, replace the token, call `queryClient.clear()`, reset URL filters, show a brief progress bar, and post `TENANT_SWITCHED` on the BroadcastChannel. No stale rows may ever appear.
- The active tenant is persisted only as a hint (`lastTenantId` in localStorage); the token remains the source of truth, and it is re-validated on load.
- Routes: `/login`, `/choose-tenant`, and everything else under `RequireAuth` + `RequireTenant`. Role-gated routes (`/reports`, `/members`, `/settings/org`) use `RequireRole`.
- UI hides actions the role cannot perform, but never treats that as security; handle 403 and 404 from the API gracefully. A record outside the tenant returns **404**, and the UI shows the normal "not found" state.

## 7. API contract (typed in `types.ts`; mock every endpoint in MSW)

Errors use RFC 7807 ProblemDetails: `{ type, title, status, detail, code?, errors?: Record<string,string[]> }`. Map `errors` onto form fields.

| Area      | Endpoint                                                                                                                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth      | `POST /auth/login`, `POST /auth/login/mfa`, `POST /auth/external/{provider}`, `POST /auth/refresh`, `POST /auth/logout`                                                                                                    |
| Me        | `GET /me`, `GET /me/orgs` → `[{ orgId, name, tenants: [{ tenantId, name, slug, type, role }] }]`                                                                                                                           |
| Switch    | `POST /auth/switch-tenant` → `{ accessToken, expiresIn, tenant, role }`                                                                                                                                                    |
| Products  | `GET /products?search&category&status&sort&page&pageSize` → `{ items, total, page, pageSize }`; `GET/POST/PUT/DELETE /products/{id}`; `POST /products/{id}/adjust { delta, reason, note }`; `GET /products/{id}/movements` |
| Transfers | `GET /transfers?direction&status`, `POST /transfers`, `POST /transfers/{id}/approve`, `POST /transfers/{id}/reject`                                                                                                        |
| Dashboard | `GET /dashboard`, `GET /org/dashboard` (OrgAdmin)                                                                                                                                                                          |
| Files     | `POST /files/presign`, `POST /files/{id}/complete`, `GET /files?productId&purpose`, `GET /files/{id}/download-url`, `DELETE /files/{id}`                                                                                   |
| Members   | `GET /members`, `POST /members/invite`, `PUT /members/{id}/role`, `DELETE /members/{id}`                                                                                                                                   |

Use optimistic concurrency: `Product` carries `version`; send it on `PUT`, and on `409` show "Someone else changed this. Reload?".

## 8. Dynamic behavior requirements

- **Lists** (inventory, transfers, movements, files, members): server-side search (300ms debounce), filter, sort, and pagination. Filter, sort, and page state lives in the **URL query string** (`useUrlState`) so views are shareable and survive refresh.
- **Forms** are Zod-schema driven (`schema.ts`), with inline errors, disabled submit while pending, and server field errors mapped back.
- **Mutations** invalidate only the relevant tenant-scoped keys. Stock adjustment and archive are optimistic with rollback and an Undo snackbar.
- **Status** (in stock, low, out) is computed from `quantity` and `reorderLevel` by one shared function, `getStockStatus()`, used by chips, KPIs, and filters.
- **Dashboard** KPIs, low-stock list, recent movements, and the all-locations chart are all fetched, never computed from placeholder data.
- **Permissions:** `usePermission('product.edit')` maps the role matrix (Staff, Manager, OrgAdmin) to UI capabilities from one table in `shared/hooks/usePermission.ts`.
- **Realtime (optional, behind a flag):** SignalR connection on the active tenant only; on `stock.changed` invalidate the inventory queries. Disconnect and reconnect on tenant switch.
- **Supplier cost** is shown masked (`••••`) until revealed; revealing may require step-up MFA.

## 9. S3 uploads (presigned, direct from browser)

Build `features/files` around one hook, `useUpload`, and two components, `FileUploader` and `UploadQueue`.

**Flow (per file):**

1. **Validate on the client** with values from env: size ≤ `VITE_UPLOAD_MAX_MB`, MIME type ∈ `VITE_UPLOAD_ALLOWED_TYPES`. Show an inline error for rejected files. (The server re-validates; this is only UX.)
2. `POST /files/presign` with `{ fileName, contentType, size, purpose: 'product-image' | 'document', productId? }`. The server returns `{ fileId, uploadUrl, method: 'PUT', headers, expiresAt }`. **The client never chooses or sends an S3 key or path**; the server builds the tenant-prefixed key.
3. **Upload straight to S3** with `XMLHttpRequest` (for progress events) using exactly the returned `method` and `headers`. Do **not** send the app's `Authorization` header to S3.
4. `POST /files/{fileId}/complete`, then invalidate `['files', tenantId, ...]` and, for product images, the product query.
5. Display files with `GET /files/{id}/download-url` (short-lived presigned GET). Cache the URL only until `expiresAt`, then refetch. Never store presigned URLs long term.

**Behavior:**

- Drag-and-drop zone plus a browse button; image preview thumbnails before upload.
- Concurrency limit `VITE_UPLOAD_MAX_CONCURRENT`; per-file progress bar, cancel (`xhr.abort()`), retry on failure, and clear-completed.
- If the presigned URL has expired (403 from S3 or `expiresAt` passed), request a new one once and retry.
- Switching tenant **cancels all in-flight uploads** and clears the queue, with a confirmation dialog if uploads are running.
- Product image slot in `ProductSheet` uses the same hook (single file, images only), with replace and remove.
- Show storage usage for the tenant if `GET /files` returns it (progress bar vs plan limit).
- **Mock mode:** in MSW, `/files/presign` returns a fake `uploadUrl` that MSW also intercepts, so upload UI and progress work without S3. Add a note in the README on how to test against LocalStack (`http://localhost:4566`).
- **CORS reminder** (put in README): the S3 bucket needs a CORS rule allowing `PUT` and `GET` from the web origin with the `Content-Type` header.

## 10. Screens to build

1. **Login**: 400px card; SSO buttons, password form, OTP link; MFA step with a 6-digit input.
2. **Choose sub-account**: organization sections, each sub-account a card with colored avatar, type chip, and role chip.
3. **Dashboard**: 4 KPI cards, low-stock list with Reorder button, recent movements, and (OrgAdmin all-locations) stacked bar by sub-account.
4. **Inventory**: KPI strip, search, category and status filters, sortable table (SKU, Name+thumbnail, Category, Qty, Status, Price, row menu), bulk select, export CSV, and Add product. Compact layout uses cards.
5. **Product sheet**: Details, Movements, and Files tabs with image upload, masked supplier cost, and version-conflict handling.
6. **Stock adjust dialog**: +/- segmented control, quantity, reason, note.
7. **Transfers**: Incoming, Outgoing, and History tabs, approve and reject, and a new-transfer dialog (destination limited to the same organization).
8. **Movements**: paginated append-only ledger with filters.
9. **Files**: tenant file library with upload queue.
10. **Members**: user table, role chips, invite dialog, MFA indicator.
11. **404 / 403 / error boundary** pages.

## 11. Quality bar and tests

- TypeScript `strict`, no `any`; ESLint clean.
- Vitest unit tests: `getStockStatus`, `usePermission`, `queryKeys` (always include tenant), `env.ts` validation, upload validation.
- Component tests: `TenantSwitcher` clears cache on switch, `ProductTable` renders status chips, `FileUploader` rejects oversized and wrong-type files.
- Playwright e2e (against MSW or the real API): login, pick tenant A, see A's products, switch to B, see only B's products with no flash of A's data, upload an image with progress, and log out in one tab logs out the other.
- Accessibility: axe checks on the login, inventory, and dialog screens.
- Lighthouse: accessibility ≥ 95.

## 12. Deliverables

- Complete `web/` project that runs with `npm i && npm run dev`, and works with `VITE_USE_MOCK=true` and no backend.
- `web/README.md`: setup, env table, mock mode, S3/LocalStack and CORS notes, folder map, and how to add a new feature.
- `.env.example` exactly as in section 2.

## 13. Build phases (stop and report after each)

| Phase | Scope                                                                               |
| ----- | ----------------------------------------------------------------------------------- |
| 1     | Vite + TS scaffold, tokens and typography, shared components, env module, MSW setup |
| 2     | Auth: login, MFA, SSO buttons, token handling, refresh, cross-tab logout            |
| 3     | Tenant: providers, switcher, choose-tenant page, guards, cache clearing             |
| 4     | Inventory list and product sheet: URL state, forms, mutations, permissions          |
| 5     | Stock adjust, movements, dashboard, transfers                                       |
| 6     | S3 uploads: `useUpload`, uploader UI, product image slot, files library             |
| 7     | Members, settings, all-locations dashboard, realtime flag                           |
| 8     | Tests, accessibility pass, README, polish                                           |

## 14. Do not

- Do not hard-code data, tenant IDs, or URLs; everything comes from env or the API.
- Do not store tokens in localStorage or sessionStorage.
- Do not put AWS credentials or bucket secrets anywhere in `web/`.
- Do not build S3 keys or paths on the client.
- Do not use raw hex colors; use `--sys-*` tokens only.
- Do not fetch inside components; use the feature hooks.
- Do not share a query key across tenants.
