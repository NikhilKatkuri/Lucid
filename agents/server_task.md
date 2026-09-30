# Server Task — Lucid Inventory Backend

## Mission

Build a **correct, secure, tenant-isolated, demonstrable, and testable** ASP.NET Core backend for the Lucid multi-tenant inventory management system. The backend is a **modular monolith** using MongoDB, Redis, and S3.

## Architecture

```
React/Vite  →  HTTPS/JSON  →  ASP.NET Core (modular monolith)
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                 MongoDB         Redis            S3
              (tenant data)   (cache/jobs)    (private files)
```

**Request pipeline (strict order):**
```
Request ID → Security Headers → CORS → Rate Limiting → JWT Auth
→ Tenant Resolution → Tenant Membership Authz → Role/Permission Authz
→ Validation → Controller → Application Service → Tenant-Scoped Repository → MongoDB
```

## Technology Stack

| Layer | Choice |
|---|---|
| Framework | ASP.NET Core (modular monolith) |
| Database | MongoDB (authoritative) |
| Cache | Redis (cache, rate limiting, job status — NOT a second source of truth) |
| Storage | S3 (private, presigned URLs, tenant-scoped keys) |
| Auth | JWT access tokens (sub, email, jti, iat, exp, iss, aud) |
| Docs | Swagger/OpenAPI |

## Non-Negotiable Rules

1. **TenantId (GUID v7) is the only canonical tenant identifier.** Subdomain is only a resolver.
2. **No controller bypasses the service layer.** No service queries MongoDB directly.
3. **No repository performs an unscoped tenant query** for tenant-owned data.
4. **StockMovement is append-only.** Stock changes require a movement record.
5. **No negative stock.** Atomic adjustment + movement creation.
6. **SKU unique per tenant.** Unique index on (TenantId, SKU).
7. **Fail closed.** Unknown tenant → 404. Known tenant + no membership → 403.
8. **No P3 features** (microservices, K8s, Kafka, GraphQL, CQRS, etc.).
9. **MongoDB only.** Do NOT mix EF Core + MongoDB.
10. **Cache keys MUST contain tenant identity** where tenant data is involved.

## Priority Model

- **P0 (Mandatory):** Auth, tenant resolution, tenant authz, tenant isolation, org→tenant hierarchy, inventory CRUD, stock adjustment, stock movement ledger, subdomain access, role-based authz, S3 file flow, audit logging, validation, error handling, rate limiting, concurrency protection, DB indexes, health checks, Docker dev env, tenant-isolation tests, OpenAPI docs.
- **P1 (Core Differentiators):** Tenant switcher, security dashboard, cross-tenant attack simulator, security event timeline, inventory analytics, low-stock alerts, optimistic concurrency, stock transfer workflow, queued notifications, export jobs, Redis caching, background workers.
- **P2 (Enterprise):** 2FA, OIDC, refresh-token reuse detection, malware scanning, KMS, advanced reports, trend engine, distributed locks, etc.
- **P3 (Do NOT build):** Microservices, K8s, CQRS, event sourcing, GraphQL, Kafka, service mesh, multi-region, DB-per-tenant, AI/LLM, complex workflows.

**If P0 is incomplete, P1/P2 work MUST stop.**

## Build Order (Strict)

| Phase | Name | Stop Condition |
|---|---|---|
| 1 | Foundation | API starts, Mongo connects, Redis connects, Swagger works, health endpoints work |
| 2 | Identity | User can securely authenticate |
| 3 | Tenant Security | ACME user cannot access GLOBEX |
| 4 | Inventory | Inventory works correctly inside one tenant |
| 5 | Files | ACME cannot access GLOBEX files |
| 6 | Audit + Security Center | A judge can see a real blocked attack |
| 7 | Dashboard | The application looks like a complete product |
| 8 | P1 Enhancements | Transfers, Redis caching, workers, email, exports |
| 9 | Enterprise | 2FA, OIDC, KMS, etc. (only if time remains) |

## Definition of Core Backend Completion

The backend is **CORE COMPLETE** only when this demo works from a clean environment:

1. User signs in
2. User enters ACME workspace
3. `acme.lucid.app` resolves ACME
4. Dashboard loads ACME data
5. User creates product
6. Product image uploads through S3
7. Stock is adjusted
8. Stock movement is recorded
9. Audit event is recorded
10. User switches to another authorized tenant
11. Browser navigates to new subdomain
12. New tenant data loads
13. Cross-tenant access is attempted
14. Request is blocked
15. Security event is recorded
16. Automated isolation test passes

## Key Data Models

- **User** — Id, Email, PasswordHash, DisplayName, IsActive, EmailVerified, CreatedAt, UpdatedAt
- **Organization** — Id, Name, Slug, OwnerUserId, Plan, CreatedAt, UpdatedAt
- **Tenant** — Id, OrganizationId, ParentTenantId, Name, Slug, Type, IsActive, CreatedAt, UpdatedAt
- **OrganizationMembership** — Id, OrganizationId, UserId, Role, CreatedAt
- **TenantMembership** — Id, TenantId, UserId, Role, CreatedAt
- **Product** — Id, TenantId, Sku, Name, Category, Quantity, ReorderLevel, Price, ImageKey, Version, IsArchived, CreatedAt, UpdatedAt
- **StockMovement** — Id, TenantId, ProductId, Type, QuantityDelta, BeforeQuantity, AfterQuantity, Reason, ReferenceId, PerformedByUserId, CreatedAt (append-only)
- **TenantFile** — Id, TenantId, EntityId, S3Key, FileName, ContentType, Size, Status, CreatedByUserId, CreatedAt
- **AuditEvent** — Id, OrganizationId, TenantId, UserId, Action, ResourceType, ResourceId, Result, Reason, IpAddress, UserAgent, RequestId, CreatedAt

## Required DB Indexes

```
Tenant:             OrganizationId + Slug, OrganizationId
TenantMembership:   TenantId + UserId, UserId + TenantId
Product:            TenantId + SKU UNIQUE, TenantId + Name, TenantId + IsArchived, TenantId + UpdatedAt
StockMovement:      TenantId + ProductId + CreatedAt, TenantId + CreatedAt
TenantFile:         TenantId + EntityId, TenantId + CreatedAt
AuditEvent:         TenantId + CreatedAt, OrganizationId + CreatedAt, UserId + CreatedAt
```

## API Response Envelope

```json
// Success
{ "success": true, "message": "...", "data": {} }

// Failure
{ "success": false, "message": "...", "errors": [] }

// Validation
{ "success": false, "message": "Validation failed", "errors": [{ "field": "sku", "message": "SKU is required" }] }

// Pagination
{ "success": true, "message": "...", "data": [], "pagination": { "page": 1, "pageSize": 20, "total": 184 } }
```

## Source Documents

- `BACKEND_PROMPT.md` — Full backend implementation contract (2068 lines)
- `DESIGN.md` — UI/UX design system
- `FRONTEND_PROMT.md` — Frontend requirements
- `FileTree.md` — Repository structure
