# Server TODO — Lucid Inventory Backend

> Detailed task breakdown derived from `BACKEND_PROMPT.md`.  
> Status: `[ ]` todo · `[~]` in progress · `[x]` done

## Current status

Phases 1–3 and the core of Phase 4 are implemented and verified end to end
against a live API with MongoDB + Redis running. Phases 5 (S3), 6 (partial),
and 7 (dashboard) are partially done. Phase 8/9 not started.

**Run it**

```powershell
# dependencies (MongoDB + Redis)
docker compose -f server/docker-compose.yml up -d mongo redis

# build + run (must run from the project dir so appsettings.json is found)
dotnet build server/Lucid.sln
cd server\src\Lucid.Api
dotnet exec bin\Debug\net8.0\Lucid.Api.dll
```

- API: <http://localhost:5000>
- Swagger: <http://localhost:5000/swagger>
- Health: <http://localhost:5000/health/live>, `/health/ready`

**On localhost there is no subdomain, so pass the tenant explicitly:**

```powershell
# 1. sign up
$signup = @{ email="demo@lucid.app"; password="Demo@12345"; displayName="Demo" } | ConvertTo-Json
$r = Invoke-RestMethod http://localhost:5000/api/v1/auth/signup -Method Post -ContentType "application/json" -Body $signup
$h = @{ Authorization = "Bearer $($r.data.accessToken)"; "X-Tenant-ID" = "<tenantId from /auth/me>" }
```

`X-Tenant-ID` is a development convenience only — it never grants access on
its own. Membership is always verified, so a foreign tenant id returns 403.

**Largest remaining gaps:** S3 file flow (Phase 5), automated security tests,
audit coverage for CRUD actions, refresh tokens, request validation middleware.

---

## Phase 1 — Foundation

**Stop condition:** API starts, Mongo connects, Redis connects, Swagger works, health endpoints work.

### Solution & Project Structure
- [x] Create solution `Lucid.sln`
- [x] Create `src/Lucid.Api` (ASP.NET Core Web API)
- [x] Create `src/Lucid.Application` (services, DTOs, interfaces)
- [x] Create `src/Lucid.Domain` (entities, enums, value objects)
- [x] Create `src/Lucid.Infrastructure` (Mongo, Redis, S3, repositories)
- [x] Create `tests/Lucid.UnitTests`
- [x] Create `tests/Lucid.IntegrationTests`
- [x] Create `tests/Lucid.SecurityTests`

> All backend code lives under `server/`.

### Program.cs & Middleware Pipeline
- [x] Register MongoDB (`MongoDbContext`)
- [ ] Register Redis (`IConnectionMultiplexer`, `IDatabase`)
- [ ] Register S3 (`IAmazonS3`)
- [x] Configure request pipeline in strict order:
  - [x] Exception handling middleware
  - [x] Request ID middleware
  - [x] Security headers middleware
  - [x] CORS
  - [x] Rate limiting
  - [x] JWT authentication
  - [x] Tenant resolution (`TenantResolutionMiddleware`)
  - [x] Tenant membership authorization
  - [x] Role/permission authorization (`AuthorizePermissionAttribute`)
  - [ ] Validation
  - [x] Controller → Service → Repository

### Options & Configuration
- [ ] `MongoDbOptions` (ConnectionString, DatabaseName)
- [ ] `RedisOptions` (ConnectionString, InstanceName)
- [ ] `S3Options` (Bucket, Region, Endpoint)
- [ ] `JwtOptions` (Issuer, Audience, Key, ExpiryMinutes)
- [ ] `RateLimitOptions` (policies)
- [ ] `TenantOptions` (BaseDomain, ReservedSubdomains)

### Exception Handling & Response Envelope
- [x] Global exception handler middleware (`ExceptionHandlingMiddleware`)
- [x] `ApiException` with status code + error details
- [x] `ApiResponse<T>` envelope (success, message, data, errors, pagination)
- [x] `PagedResult<T>` with page, pageSize, total
- [x] Error classification: 400, 401, 403, 404, 409, 500 mapped
- [x] No internal exception details leaked

### Swagger / OpenAPI
- [x] Add SwaggerGen with JWT bearer support
- [ ] XML comments on all controllers
- [x] Versioning (`/api/v1/`)

### Health Checks
- [x] `GET /health/live` — process running
- [x] `GET /health/ready` — dependency check

### Docker Development Environment
- [ ] `docker-compose.yml` (MongoDB, Redis, LocalStack S3, API)
- [ ] `Dockerfile` for API
- [ ] `.env.example`

### MongoDB Connection
- [ ] Mongo client setup with retry
- [ ] Database bootstrap (create indexes)
- [ ] Multi-document transaction support (replica set)

### Redis Connection
- [ ] Connection multiplexer setup
- [ ] Graceful degradation when Redis unavailable

---

## Phase 2 — Identity

**Stop condition:** User can securely authenticate.

### User Entity
- [ ] `User` model (Id, Email, PasswordHash, DisplayName, IsActive, EmailVerified, CreatedAt, UpdatedAt)
- [ ] MongoDB collection + indexes (Email unique)

### Password Hashing
- [ ] BCrypt or Argon2 password hasher
- [ ] Password strength validation

### Auth Endpoints
- [x] `POST /api/v1/auth/signup`
- [x] `POST /api/v1/auth/signin`
- [x] `POST /api/v1/auth/logout` (jti revocation via `RevokedToken`)
- [ ] `POST /api/v1/auth/refresh`
- [x] `POST /api/v1/auth/forgot-password` (stub)
- [x] `POST /api/v1/auth/reset-password` (stub)
- [x] `GET /api/v1/auth/me` — current user + effective tenant context
- [x] `GET /api/v1/auth/my-orgs` — organizations + tenants for switcher
- [x] `POST /api/v1/auth/switch-tenant` — membership validated before reissue

### JWT
- [ ] Access token generation (sub, email, jti, iat, exp, iss, aud)
- [ ] Token validation parameters
- [ ] JWT bearer authentication handler

### Authorization Infrastructure
- [ ] `AuthorizePermission` attribute
- [ ] Permission enum/constants
- [ ] Role→Permission mapping

---

## Phase 3 — Tenant Security

**Stop condition:** ACME user cannot access GLOBEX. **This is the most important checkpoint.**

### Organization Entity
- [ ] `Organization` model (Id, Name, Slug, OwnerUserId, Plan, CreatedAt, UpdatedAt)
- [ ] MongoDB collection + indexes (Slug unique)

### Tenant Entity
- [ ] `Tenant` model (Id, OrganizationId, ParentTenantId, Name, Slug, Type, IsActive, CreatedAt, UpdatedAt)
- [ ] `ParentTenantId` null for org main tenant
- [ ] Reject deeper hierarchy (max depth = 1)
- [ ] MongoDB collection + indexes (OrganizationId + Slug, OrganizationId)

### Membership Entities
- [ ] `OrganizationMembership` (Id, OrganizationId, UserId, Role, CreatedAt)
- [ ] `TenantMembership` (Id, TenantId, UserId, Role, CreatedAt)
- [ ] Indexes: TenantId + UserId, UserId + TenantId

### Tenant Resolution
- [x] `TenantResolver` — extract subdomain from host header
- [x] Resolve tenant by slug (or guid via `X-Tenant-ID`)
- [x] Verify tenant exists and is active
- [x] `X-Tenant-ID` header support (dev only, never grants access alone)
- [x] Fail closed: unknown tenant → 404, no membership → 403 + audit event

### TenantContext
- [x] `ITenantContext` — request-scoped (TenantId, OrganizationId, UserId, Role)
- [x] `TenantResolutionMiddleware` — resolves and populates context
- [x] Tenant membership validation
- [x] Effective role resolution

### Role-Based Authorization
- [x] Org roles: `OrgAdmin`, `Member`
- [x] Tenant roles: `Manager`, `Staff`, `Viewer`
- [x] Permission mapping (`RolePermissions`):
  - [x] Viewer: read inventory, read files
  - [x] Staff: + create/update products, adjust stock
  - [x] Manager: + archive products, manage tenant files, org reports
  - [ ] OrgAdmin: manage tenants, manage members, cross-tenant ops

### Tenant-Scoped Repository
- [ ] `ITenantScopedRepository<T>` base interface
- [ ] Repository requires tenant context before querying
- [ ] Tenant Guard — prevents unscoped queries
- [ ] All tenant-owned entities carry `TenantId`

### Tenant Isolation Tests (Security Tests — MANDATORY)
> Verified manually against a live API (results below). Still to be encoded as
> automated xUnit tests in `tests/Lucid.SecurityTests`.
- [x] Tenant A cannot read Tenant B products → 404
- [x] Tenant A cannot update Tenant B products → 404
- [x] Tenant A cannot delete Tenant B products → 404
- [ ] Tenant A cannot access Tenant B files
- [x] Forged `X-Tenant-ID` for a real foreign tenant → 403
- [ ] Unauthorized subdomain is rejected (403)
- [x] Guessed IDs do not reveal tenant resources (404, not 403)
- [ ] Cache keys are tenant-scoped
- [x] Audit events contain tenant context

---

## Phase 4 — Inventory

**Stop condition:** Inventory works correctly inside one tenant.

### Product Entity
- [ ] `Product` model (Id, TenantId, Sku, Name, Category, Quantity, ReorderLevel, Price, ImageKey, Version, IsArchived, CreatedAt, UpdatedAt)
- [ ] MongoDB collection + indexes (TenantId + SKU UNIQUE, TenantId + Name, TenantId + IsArchived, TenantId + UpdatedAt)

### Product CRUD Endpoints
- [x] `POST /api/v1/inventory/products` — create
- [x] `GET /api/v1/inventory/products` — list (paginated, searchable, filterable)
- [x] `GET /api/v1/inventory/products/{id}` — get by ID
- [x] `PUT /api/v1/inventory/products/{id}` — update
- [x] `DELETE /api/v1/inventory/products/{id}` — archive
- [x] `POST /api/v1/inventory/products/{id}/restore` — restore

### SKU Rules
- [x] Unique within tenant (unique index + service check → 409)
- [x] Validation: required, format, length

### Stock Adjustment
- [x] `POST /api/v1/inventory/products/{id}/adjust`
- [x] Atomic: update product quantity + create StockMovement
- [x] Negative stock protection (reject if result < 0)
- [x] `StockMovement` model (append-only)
- [x] `GET /api/v1/inventory/products/{id}/movements` — stock history

### Low Stock Calculation
- [ ] `Quantity == 0` → `OUT_OF_STOCK`
- [ ] `Quantity <= ReorderLevel` → `LOW_STOCK`
- [ ] Otherwise → `IN_STOCK`

### Pagination
- [x] All list endpoints paginated
- [ ] Max page size: 100 (server-enforced)
- [x] `PagedResult<T>` envelope

### Search & Filtering
- [x] `search` (name/SKU)
- [x] `category`
- [x] `stockStatus` (in, low, out) — via `$expr` for field-to-field compare
- [x] `isArchived`
- [x] `sortBy`, `sortDirection`
- [x] All filtering server-side

### Optimistic Concurrency
- [x] Product `Version` field
- [x] Client sends version in update
- [x] Mismatch → 409 Conflict

---

## Phase 5 — Files

**Stop condition:** ACME cannot access GLOBEX files.

### S3 Configuration
- [ ] `IAmazonS3` client setup
- [ ] Bucket: private, block public access, SSE enabled
- [ ] Presigned URL generation (short-lived)

### TenantFile Entity
- [ ] `TenantFile` model (Id, TenantId, EntityId, S3Key, FileName, ContentType, Size, Status, CreatedByUserId, CreatedAt)
- [ ] Indexes: TenantId + EntityId, TenantId + CreatedAt

### File Endpoints
- [ ] `POST /api/v1/files/presign` — generate presigned PUT URL
- [ ] `POST /api/v1/files/complete` — verify object, create TenantFile record
- [ ] `GET /api/v1/files/{id}/download` — generate short-lived GET URL
- [ ] `GET /api/v1/files` — list files (paginated)

### File Security
- [ ] Backend generates S3 key: `orgs/{orgId}/tenants/{tenantId}/products/{productId}/{fileId}`
- [ ] Validate MIME type
- [ ] Validate file size
- [ ] Validate quota
- [ ] Tenant ownership verification before download URL
- [ ] User must never obtain file URL from S3 key alone

---

## Phase 6 — Audit + Security Center

**Stop condition:** A judge can see a real blocked attack.

### AuditEvent Entity
- [ ] `AuditEvent` model (Id, OrganizationId, TenantId, UserId, Action, ResourceType, ResourceId, Result, Reason, IpAddress, UserAgent, RequestId, CreatedAt)
- [ ] Indexes: TenantId + CreatedAt, OrganizationId + CreatedAt, UserId + CreatedAt
- [ ] Append-only

### Audit Middleware / Service
- [x] `IAuditService` — record security events
- [x] Blocked cross-tenant attempts recorded by `TenantResolutionMiddleware`
- [ ] Automatic logging for:
  - [ ] `LOGIN`, `LOGIN_FAILED`
  - [ ] `TENANT_SWITCH`
  - [ ] `PRODUCT_CREATE`, `PRODUCT_UPDATE`, `PRODUCT_ARCHIVE`
  - [ ] `STOCK_ADJUST`
  - [ ] `FILE_UPLOAD`, `FILE_DOWNLOAD`
  - [ ] `MEMBER_INVITE`, `MEMBER_REMOVE`, `ROLE_CHANGE`
  - [x] `ACCESS_DENIED`, `CROSS_TENANT_ATTEMPT`
  - [x] `LOGOUT`

### Security Events API
- [x] `GET /api/v1/security/events` — security event timeline (paginated, `orgWide` option)
- [ ] `GET /api/v1/security/events/{id}` — event detail

### Cross-Tenant Isolation Simulator
- [x] `POST /api/v1/security/simulations/cross-tenant` (dev/demo only)
- [x] Performs genuine authorization attempt using same pipeline
- [x] Records event
- [x] Returns `{ blocked, status, reason }`

---

## Phase 7 — Dashboard

**Stop condition:** The application looks like a complete product.

### Dashboard Endpoints
- [x] `GET /api/v1/reports/dashboard` — tenant dashboard
  - [x] `totalProducts`, `totalStock`, `lowStockProducts`, `outOfStockProducts`
  - [x] `inventoryValue`, `recentMovements`
  - [x] All calculations respect current tenant
- [x] `GET /api/v1/reports/organization` — org-wide (Manager+ currently)
  - [ ] Restrict to OrgAdmin only
  - [x] Explicit tenant allow-list via membership, no `IgnoreTenantFilter()`

---

## Phase 8 — P1 Enhancements

**Only after P0 is stable and Phases 1-7 are complete.**

### Tenant Switcher
- [ ] `POST /api/v1/auth/switch-tenant` — switch active tenant context
- [ ] Membership validation for target tenant
- [ ] New tenant context established

### Stock Transfer Workflow
- [ ] `Transfer` entity (Id, OrganizationId, SourceTenantId, DestinationTenantId, ProductId, Quantity, Status, ...)
- [ ] Both tenants must belong to same organization
- [ ] Flow: PENDING → APPROVED → COMPLETED
- [ ] Atomic execution: decrement source, increment dest, create both movements
- [ ] Endpoints: create, list, approve, reject, get

### Redis Caching
- [ ] Cache keys include tenant identity: `tenant:{tenantId}:...`
- [ ] Dashboard cache
- [ ] Product list cache (with filter hash)
- [ ] Tenant members cache
- [ ] Explicit TTL on every cached object
- [ ] Graceful degradation when Redis unavailable

### Low-Stock Alerts
- [ ] `LowStockWorker` background job
- [ ] Scan products below reorder level
- [ ] Notify appropriate tenant users

### Queued Notifications
- [ ] `EmailWorker` background job
- [ ] Retry with exponential backoff
- [ ] Idempotency, failure logging, status tracking

### Export Jobs
- [ ] `ExportWorker` background job
- [ ] Async export generation
- [ ] Status tracking

### Background Workers
- [ ] `BackgroundService` or hosted service
- [ ] Graceful shutdown
- [ ] Retry, exponential backoff, idempotency, failure logging

---

## Phase 9 — Enterprise Enhancements

**Only if time remains after Phases 1-8.**

- [ ] 2FA (TOTP)
- [ ] Google OIDC
- [ ] Microsoft OIDC
- [ ] Refresh-token reuse detection
- [ ] Advanced S3 malware scanning
- [ ] KMS per-tenant encryption
- [ ] Advanced reports
- [ ] Trend engine
- [ ] Distributed locks
- [ ] Advanced observability
- [ ] Change streams
- [ ] Field-level encryption
- [ ] Disposable-email database refresh
- [ ] Advanced quota accounting

---

## Cross-Cutting Concerns

### Rate Limiting
- [ ] Named policies: `default`, `auth`, `forgotPassword`, `refreshToken`, `createTenant`, `action`, `upload`
- [ ] Stricter limits for: login, password reset, OTP, refresh, file upload, tenant creation
- [ ] Partition by IP / UserId / TenantId depending on endpoint

### Validation
- [ ] Request body validation (FluentValidation or DataAnnotations)
- [ ] Query parameter validation
- [ ] Route parameter validation
- [ ] Header validation
- [ ] File metadata validation
- [ ] Pagination validation
- [ ] Sorting validation
- [ ] Tenant identifier validation

### API Documentation (READMEs)
- [ ] `docs/AUTH.README.md`
- [ ] `docs/TENANTS.README.md`
- [ ] `docs/INVENTORY.README.md`
- [ ] `docs/FILES.README.md`
- [ ] `docs/MEMBERS.README.md`
- [ ] `docs/REPORTS.README.md`
- [ ] `docs/AUDIT.README.md`

### Testing Pyramid
- **Unit Tests:** Stock calculation, stock status, role permissions, tenant resolution, SKU validation, pagination, DTO validation, transfer state transitions
- **Integration Tests:** Login, tenant resolution, product CRUD, stock adjustment, S3 flow, Redis, audit
- **Security Tests:** (see Phase 3 checklist — all mandatory)
- **Concurrency Tests:** Concurrent stock adjustment, concurrent product update, duplicate SKU creation

---

## Anti-Overengineering Rule

**MUST NOT introduce unless a concrete requirement appears:**
- Microservices, Kubernetes, Kafka, RabbitMQ, GraphQL, CQRS, Event sourcing, Service mesh, gRPC, separate auth service, separate inventory service, separate tenant service, AI service, Vector database, Elasticsearch

The backend is a **MODULAR MONOLITH** with strong module boundaries.
