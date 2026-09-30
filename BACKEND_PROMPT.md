# 13. CORE BACKEND REQUIREMENTS — STRICT IMPLEMENTATION SCOPE

This section defines the **actual backend implementation contract** for the hackathon.

The objective is not to build every enterprise feature listed above. The objective is to build a backend that is:

1. Correct
2. Secure
3. Tenant-isolated
4. Demonstrable
5. Testable
6. Extensible
7. Stable under concurrent requests

The implementation MUST prioritize **tenant isolation and inventory correctness** over secondary enterprise features.

---

## 13.1 Priority Model

Every backend feature MUST belong to one of these priorities.

### P0 — Mandatory / Cannot Be Skipped

These features are required for the working product and demo.

```text
Authentication
Tenant resolution
Tenant authorization
Tenant isolation
Organization → Tenant hierarchy
Inventory CRUD
Stock adjustment
Stock movement ledger
Subdomain-based tenant access
Role-based authorization
S3 file upload/download flow
Audit logging
Validation
Error handling
Rate limiting
Concurrency protection
Database indexes
Health checks
Docker development environment
Automated tenant-isolation tests
OpenAPI documentation
```

### P1 — Core Differentiators

These features go beyond the minimum problem statement and should be implemented if P0 is stable.

```text
Tenant switcher
Tenant security dashboard
Cross-tenant attack simulator
Security event timeline
Inventory analytics
Low-stock alerts
Optimistic concurrency
Stock transfer workflow
Queued notifications
Export jobs
Redis caching
Background workers
```

### P2 — Enterprise Enhancements

Implement only after P0 and P1 are working.

```text
2FA
Google OIDC
Microsoft OIDC
Refresh-token reuse detection
Advanced S3 malware scanning
KMS per-tenant encryption
Advanced reports
Trend engine
Distributed locks
Advanced observability
Change streams
Field-level encryption
Disposable-email database refresh
Advanced quota accounting
```

### P3 — Do Not Build During the Core Hackathon Sprint

These features add complexity without materially improving the primary demonstration.

```text
Microservices
Kubernetes
CQRS
Event sourcing
GraphQL
Kafka
Service mesh
Multi-region deployment
Database-per-tenant infrastructure
AI/LLM features
Complex workflow engines
Real-time collaboration
Custom identity provider
Complex billing system
```

If P0 is incomplete, **P1/P2 work MUST stop**.

---

# 13.2 Core Backend Architecture

The backend MUST follow this request flow:

```text
HTTP Request
     │
     ▼
Request ID
     │
     ▼
Security Headers
     │
     ▼
CORS
     │
     ▼
Rate Limiting
     │
     ▼
JWT Authentication
     │
     ▼
Tenant Resolution
     │
     ▼
Tenant Membership Authorization
     │
     ▼
Role / Permission Authorization
     │
     ▼
Validation
     │
     ▼
Controller
     │
     ▼
Application Service
     │
     ▼
Tenant-Scoped Repository
     │
     ▼
MongoDB
```

No controller may bypass the service layer.

No service may directly query MongoDB collections.

No repository may perform an unscoped tenant query for tenant-owned data.

---

# 13.3 Canonical Tenant Identity

There MUST be exactly one canonical tenant identifier.

```text
TenantId = GUID v7
```

The subdomain is only a **tenant resolver**, not a second tenant identity.

Example:

```text
acme.lucid.app
      │
      ▼
TenantResolver
      │
      ▼
Tenant.Slug = "acme"
      │
      ▼
TenantId = 019...
```

The database MUST use:

```text
TenantId
```

as the authoritative identifier.

Do NOT create:

```text
tenantId
subdomainTenantId
organizationTenantId
```

as separate identities.

---

# 13.4 Organization → Tenant Model

The hierarchy is strictly:

```text
Organization
    │
    ├── Tenant
    │
    ├── Tenant
    │
    └── Tenant
```

Maximum tenant hierarchy depth:

```text
1
```

Example:

```text
ACME Corporation
│
├── Hyderabad Warehouse
├── Bengaluru Store
└── Chennai Store
```

NOT:

```text
ACME
└── Hyderabad
    └── Store 42
        └── Department A
```

The backend MUST reject deeper hierarchy creation.

---

# 13.5 Minimum Core Data Model

The following entities constitute the minimum backend domain.

### User

```text
Id
Email
PasswordHash
DisplayName
IsActive
EmailVerified
CreatedAt
UpdatedAt
```

### Organization

```text
Id
Name
Slug
OwnerUserId
Plan
CreatedAt
UpdatedAt
```

### Tenant

```text
Id
OrganizationId
ParentTenantId
Name
Slug
Type
IsActive
CreatedAt
UpdatedAt
```

`ParentTenantId` MUST be null for the organization’s main tenant.

### OrganizationMembership

```text
Id
OrganizationId
UserId
Role
CreatedAt
```

### TenantMembership

```text
Id
TenantId
UserId
Role
CreatedAt
```

### Product

```text
Id
TenantId
Sku
Name
Category
Quantity
ReorderLevel
Price
ImageKey
Version
IsArchived
CreatedAt
UpdatedAt
```

### StockMovement

```text
Id
TenantId
ProductId
Type
QuantityDelta
BeforeQuantity
AfterQuantity
Reason
ReferenceId
PerformedByUserId
CreatedAt
```

StockMovement MUST be append-only.

### TenantFile

```text
Id
TenantId
EntityId
S3Key
FileName
ContentType
Size
Status
CreatedByUserId
CreatedAt
```

### AuditEvent

```text
Id
OrganizationId
TenantId
UserId
Action
ResourceType
ResourceId
Result
Reason
IpAddress
UserAgent
RequestId
CreatedAt
```

---

# 13.6 Tenant-Owned Entity Rule

Every tenant-owned entity MUST contain:

```text
TenantId
```

Examples:

```text
Product
StockMovement
TenantFile
AuditEvent
```

A repository MUST require tenant context before querying these entities.

Invalid:

```text
GetProduct(productId)
```

Preferred:

```text
GetProduct(tenantId, productId)
```

or:

```text
repository created with CurrentTenant
GetProduct(productId)
```

where the repository itself guarantees tenant scoping.

The implementation MUST make accidental unscoped access difficult.

---

# 13.7 Subdomain Resolution

The production frontend uses:

```text
https://{tenantSlug}.lucid.app
```

Examples:

```text
https://acme.lucid.app
https://globex.lucid.app
https://acme-hyderabad.lucid.app
```

The backend MUST:

1. Extract host/subdomain.
2. Resolve the tenant by slug.
3. Verify the tenant exists and is active.
4. Read authenticated user identity.
5. Verify user membership.
6. Resolve the user's effective role.
7. Create the request-scoped TenantContext.
8. Continue only when all checks succeed.

Failure MUST fail closed.

Example:

```text
Unknown tenant
      ↓
404 / tenant-not-found
```

Known tenant but unauthorized user:

```text
Valid tenant
      +
No membership
      ↓
403 Forbidden
```

---

# 13.8 Header-Based Development Support

The API MAY support:

```text
X-Tenant-ID
```

for local development and API testing.

However:

```text
X-Tenant-ID
```

MUST NEVER grant access by itself.

The actual authorization flow is:

```text
JWT User
   +
Requested Tenant
   +
Membership
   ↓
Authorized TenantContext
```

A forged header MUST result in:

```text
403 Forbidden
```

when the user does not belong to that tenant.

---

# 13.9 JWT Design

The access token MUST identify the user.

Recommended claims:

```text
sub
email
jti
iat
exp
iss
aud
```

Tenant context MUST NOT be blindly trusted from the JWT.

The requested tenant comes from:

```text
Subdomain
```

and is then validated against membership.

For tenant switching:

```text
User
 ↓
Request target tenant
 ↓
Membership validation
 ↓
Issue/establish new tenant context
```

Never trust a frontend-only tenant ID.

---

# 13.10 Role Model

Minimum roles:

### Organization

```text
OrgAdmin
Member
```

### Tenant

```text
Manager
Staff
Viewer
```

Permissions should map approximately to:

```text
Viewer
    read inventory
    read files

Staff
    Viewer permissions
    create/update products
    adjust stock

Manager
    Staff permissions
    archive products
    manage tenant files
    initiate transfers

OrgAdmin
    manage tenants
    manage members
    organization reports
    cross-tenant organization operations
```

The frontend MUST NOT be treated as the authorization mechanism.

The backend MUST enforce permissions.

---

# 13.11 Inventory Core Operations

The minimum inventory API MUST support:

```text
Create Product
Get Product
List Products
Update Product
Archive Product
Restore Product
Adjust Stock
Get Stock History
```

Recommended routes:

```text
POST   /api/v1/inventory/products
GET    /api/v1/inventory/products
GET    /api/v1/inventory/products/{id}
PUT    /api/v1/inventory/products/{id}
DELETE /api/v1/inventory/products/{id}

POST   /api/v1/inventory/products/{id}/adjust
GET    /api/v1/inventory/products/{id}/movements
POST   /api/v1/inventory/products/{id}/restore
```

---

# 13.12 Stock Adjustment Rule

Stock MUST NOT be modified without creating a movement record.

Example:

```text
Current stock = 20

Adjustment = +5

Product:
20 → 25

StockMovement:
before = 20
delta  = +5
after  = 25
```

The operation MUST be atomic.

Invalid:

```text
Update Product Quantity
```

without:

```text
Create StockMovement
```

---

# 13.13 Negative Stock Protection

The backend MUST reject an adjustment that results in:

```text
quantity < 0
```

Example:

```text
Current = 5
Request = -8

Result:
400 / 409
```

The database update and movement creation MUST behave atomically.

---

# 13.14 Optimistic Concurrency

Product updates MUST support version checking.

Example:

```text
Product version = 7
```

Client sends:

```text
version = 7
```

Another request changes it:

```text
version = 8
```

Original request attempts update:

```text
version = 7
```

Backend returns:

```text
409 Conflict
```

This prevents silent lost updates.

---

# 13.15 SKU Rules

SKU MUST be unique within a tenant.

Therefore:

```text
ACME + SKU-001
```

and:

```text
GLOBEX + SKU-001
```

are valid.

But:

```text
ACME + SKU-001
ACME + SKU-001
```

is invalid.

Required unique index:

```text
(TenantId, SKU)
```

---

# 13.16 Required Database Indexes

At minimum:

```text
Tenant:
    OrganizationId + Slug
    OrganizationId

TenantMembership:
    TenantId + UserId
    UserId + TenantId

Product:
    TenantId + SKU UNIQUE
    TenantId + Name
    TenantId + IsArchived
    TenantId + UpdatedAt

StockMovement:
    TenantId + ProductId + CreatedAt
    TenantId + CreatedAt

TenantFile:
    TenantId + EntityId
    TenantId + CreatedAt

AuditEvent:
    TenantId + CreatedAt
    OrganizationId + CreatedAt
    UserId + CreatedAt
```

Indexes MUST be designed around tenant-first access patterns.

---

# 13.17 S3 File Security

The frontend MUST never decide the S3 object key.

The backend generates:

```text
orgs/{organizationId}/tenants/{tenantId}/products/{productId}/{fileId}
```

Example:

```text
orgs/ORG-123/tenants/TENANT-456/products/PRODUCT-789/file-001.jpg
```

Required flow:

```text
Frontend
   │
   │ POST /files/presign
   ▼
Backend
   │
   ├── authenticate
   ├── resolve tenant
   ├── authorize
   ├── validate MIME
   ├── validate size
   ├── validate quota
   └── generate S3 key
   │
   ▼
Presigned PUT URL
   │
   ▼
Frontend → S3
   │
   ▼
POST /files/complete
   │
   ▼
Backend verifies object
```

S3 bucket MUST:

```text
Private
Block Public Access
Server-side encryption enabled
Short-lived presigned URLs
Tenant-scoped object keys
```

---

# 13.18 File Access Rule

A user must never obtain a file URL merely because they know its S3 key.

The backend MUST verify:

```text
Authenticated user
      ↓
Tenant membership
      ↓
TenantFile.TenantId
      ↓
Requested file
      ↓
Generate short-lived GET URL
```

---

# 13.19 Audit Requirements

The backend MUST audit security-sensitive operations.

At minimum:

```text
LOGIN
LOGIN_FAILED
TENANT_SWITCH
PRODUCT_CREATE
PRODUCT_UPDATE
PRODUCT_ARCHIVE
STOCK_ADJUST
FILE_UPLOAD
FILE_DOWNLOAD
MEMBER_INVITE
MEMBER_REMOVE
ROLE_CHANGE
ACCESS_DENIED
CROSS_TENANT_ATTEMPT
```

Every security event should contain:

```text
RequestId
UserId
TenantId
OrganizationId
Action
Resource
Result
Timestamp
IP
UserAgent
Reason
```

The audit log is append-only.

---

# 13.20 Cross-Tenant Protection

The backend MUST explicitly defend against:

### Attack 1 — ID guessing

```text
GET /products/{globexProductId}
```

from ACME.

Expected:

```text
404 Not Found
```

The system should not reveal whether the object belongs to another tenant.

---

### Attack 2 — Forged tenant header

```text
X-Tenant-ID: globex
```

while authenticated only for ACME.

Expected:

```text
403 Forbidden
```

---

### Attack 3 — Forged subdomain

```text
globex.lucid.app
```

without Globex membership.

Expected:

```text
403 Forbidden
```

---

### Attack 4 — Cross-tenant update

ACME user attempts:

```text
PUT /products/{globexProductId}
```

Expected:

```text
404 / denied
```

and an audit event.

---

### Attack 5 — Cross-tenant file access

ACME user requests a Globex file.

Expected:

```text
403 / denied
```

and an audit event.

---

# 13.21 Security Event Flow

A denied request MUST follow:

```text
Request
   ↓
Authentication
   ↓
Tenant resolution
   ↓
Authorization
   ↓
DENIED
   ↓
AuditEvent
   ↓
Standard API response
```

The frontend security dashboard can then display:

```text
Cross-tenant access attempt
       ↓
BLOCKED
       ↓
Audit recorded
```

This is the primary security demonstration.

---

# 13.22 Cross-Tenant Isolation Simulator

The backend SHOULD expose a development/demo-only endpoint:

```text
POST /api/v1/security/simulations/cross-tenant
```

It must never bypass real security controls.

It should perform a genuine authorization attempt using the same authorization pipeline as a normal request.

Example:

```text
Current Tenant:
ACME

Target Tenant:
GLOBEX

Operation:
READ_PRODUCT
```

Result:

```text
{
    blocked: true,
    status: 403,
    reason: "User is not authorized for target tenant"
}
```

The event MUST be recorded.

This allows the frontend to demonstrate actual tenant isolation rather than a fake animation.

---

# 13.23 Dashboard APIs

Minimum:

```text
GET /api/v1/reports/dashboard
```

Response should contain:

```text
totalProducts
totalStock
lowStockProducts
outOfStockProducts
inventoryValue
recentMovements
```

All calculations MUST respect the current tenant.

Organization-wide dashboard:

```text
GET /api/v1/reports/organization
```

is allowed only for:

```text
OrgAdmin
```

and MUST use an explicit allow-list of tenant IDs.

There MUST NOT be a generic:

```text
IgnoreTenantFilter()
```

style escape hatch.

---

# 13.24 Low Stock

Each product contains:

```text
Quantity
ReorderLevel
```

Status:

```text
Quantity == 0
    → OUT_OF_STOCK

Quantity <= ReorderLevel
    → LOW_STOCK

otherwise
    → IN_STOCK
```

Low-stock detection MAY enqueue:

```text
LowStockJob
```

which can notify the appropriate tenant users.

---

# 13.25 API Response Contract

All responses MUST follow the same envelope.

Success:

```text
{
  "success": true,
  "message": "Product created successfully",
  "data": {}
}
```

Failure:

```text
{
  "success": false,
  "message": "Access denied",
  "errors": []
}
```

Validation:

```text
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "sku",
      "message": "SKU is required"
    }
  ]
}
```

Pagination:

```text
{
  "success": true,
  "message": "Products retrieved",
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 184
  }
}
```

The frontend MUST never need to understand multiple response formats.

---

# 13.26 Pagination

All potentially large list endpoints MUST paginate.

Examples:

```text
GET /inventory/products?page=1&pageSize=20
GET /audit?page=1&pageSize=50
GET /files?page=1&pageSize=30
GET /stock-movements?page=1&pageSize=50
```

Maximum server-enforced page size:

```text
100
```

The client MUST NOT be able to request unlimited records.

---

# 13.27 Search / Filtering

Inventory list MUST support:

```text
search
category
stockStatus
isArchived
sortBy
sortDirection
page
pageSize
```

Example:

```text
GET /api/v1/inventory/products
    ?search=keyboard
    &stockStatus=low
    &page=1
    &pageSize=20
```

Filtering MUST occur server-side.

---

# 13.28 Rate Limiting

Required named policies:

```text
default
auth
forgotPassword
refreshToken
createTenant
action
upload
```

High-risk operations MUST have stricter limits.

At minimum:

```text
login
password reset
OTP
refresh
file upload
tenant creation
```

Rate limiting SHOULD be partitioned by:

```text
IP
UserId
TenantId
```

depending on the endpoint.

---

# 13.29 Validation

Every external input MUST be validated.

Validation applies to:

```text
Request body
Query parameters
Route parameters
Headers
File metadata
Pagination
Sorting
Tenant identifiers
```

No endpoint may be intentionally left without validation.

---

# 13.30 Error Classification

The backend MUST distinguish:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
413 Payload Too Large
422 Validation Error
429 Too Many Requests
500 Internal Server Error
```

Internal exception details MUST NOT be returned to the client in production.

---

# 13.31 Health Endpoints

Required:

```text
GET /health/live
GET /health/ready
```

Liveness:

```text
API process is running
```

Readiness verifies dependencies:

```text
MongoDB
Redis
S3 configuration
```

The API should not report ready if critical dependencies are unavailable.

---

# 13.32 Background Jobs

The first required worker jobs should be:

```text
LowStockWorker
EmailWorker
ExportWorker
FileScanWorker
```

Do not build every worker before the synchronous product works.

Worker requirements:

```text
Retry
Exponential backoff
Idempotency
Failure logging
Status tracking
Graceful shutdown
```

---

# 13.33 Redis Usage

Redis MUST NOT become a second source of truth.

MongoDB remains authoritative.

Redis is for:

```text
Cache
Rate limiting
Job status
Distributed coordination
Short-lived tenant lookup
```

If Redis becomes unavailable, functionality that does not fundamentally require Redis should degrade gracefully.

---

# 13.34 Caching Rules

Cache keys MUST contain tenant identity where tenant data is involved.

Correct:

```text
tenant:{tenantId}:dashboard
tenant:{tenantId}:products:{page}:{filterHash}
tenant:{tenantId}:members
```

Incorrect:

```text
dashboard
products
members
```

Tenant-less cache keys risk cross-tenant data leakage.

Every cached tenant object MUST have an explicit TTL.

---

# 13.35 Concurrency Requirements

The backend MUST safely handle concurrent:

```text
stock adjustments
product updates
transfers
```

For example:

```text
Stock = 10

Request A: -7
Request B: -7
```

The backend MUST NOT allow:

```text
10 → 3
10 → 3
```

resulting in an invalid effective stock state.

The operation must use appropriate atomic/concurrency controls.

---

# 13.36 Transfer Core

Transfers are P1.

Flow:

```text
Tenant A
   │
   │ request transfer
   ▼
PENDING
   │
   │ manager approval
   ▼
APPROVED
   │
   │ worker / transaction
   ▼
COMPLETED
```

Both tenants MUST:

```text
belong to same organization
```

Execution MUST atomically:

```text
decrement source
increment destination
create source movement
create destination movement
```

---

# 13.37 Frontend Contract Requirements

The backend MUST expose enough information for the frontend to display:

```text
Current tenant
Tenant name
Tenant slug
Organization
Current user
Effective role
Available tenants
Permissions
```

Recommended:

```text
GET /api/v1/auth/me
GET /api/v1/auth/my-orgs
```

`me` should expose the current effective tenant context.

---

# 13.38 API Documentation

Every P0 module MUST have documentation:

```text
AUTH.README.md
TENANTS.README.md
INVENTORY.README.md
FILES.README.md
MEMBERS.README.md
REPORTS.README.md
AUDIT.README.md
```

Each document MUST include:

```text
Purpose
Authentication requirements
Tenant requirements
Routes
Request examples
Response examples
Error cases
Authorization rules
```

Swagger/OpenAPI remains the executable API contract.

---

# 13.39 Testing Pyramid

### Unit Tests

Test:

```text
Stock calculation
Stock status
Role permissions
Tenant resolution
SKU validation
Pagination
DTO validation
Transfer state transitions
```

### Integration Tests

Test:

```text
Login
Tenant resolution
Product CRUD
Stock adjustment
S3 flow
Redis
Audit
```

### Security Tests

These are mandatory.

```text
Tenant A cannot read Tenant B
Tenant A cannot update Tenant B
Tenant A cannot delete Tenant B
Tenant A cannot access Tenant B files
Forged tenant header is rejected
Unauthorized subdomain is rejected
Guessed IDs do not reveal tenant resources
Cache keys are tenant-scoped
Audit events contain tenant context
```

### Concurrency Tests

At minimum:

```text
Concurrent stock adjustment
Concurrent product update
Duplicate SKU creation
```

---

# 13.40 Definition of Core Backend Completion

The backend is considered **CORE COMPLETE** only when the following demo works from a clean environment:

```text
1. User signs in
        ↓
2. User enters ACME workspace
        ↓
3. acme.lucid.app resolves ACME
        ↓
4. Dashboard loads ACME data
        ↓
5. User creates product
        ↓
6. Product image uploads through S3
        ↓
7. Stock is adjusted
        ↓
8. Stock movement is recorded
        ↓
9. Audit event is recorded
        ↓
10. User switches to another authorized tenant
        ↓
11. Browser navigates to new subdomain
        ↓
12. New tenant data loads
        ↓
13. Cross-tenant access is attempted
        ↓
14. Request is blocked
        ↓
15. Security event is recorded
        ↓
16. Automated isolation test passes
```

---

# 13.41 Strict Build Order

The team MUST implement in this exact order unless a dependency requires otherwise.

## Phase 1 — Foundation

```text
Solution
Program.cs
Options
Exception handling
Response envelope
Request ID
Swagger
Health checks
Docker Compose
Mongo connection
Redis connection
```

STOP CONDITION:

```text
API starts
Mongo connects
Redis connects
Swagger works
Health endpoints work
```

---

## Phase 2 — Identity

```text
User
Password hashing
Sign-up
Sign-in
JWT access token
Current user
Authorization
```

STOP CONDITION:

```text
User can securely authenticate.
```

Do NOT implement Google/Microsoft login yet.

---

## Phase 3 — Tenant Security

```text
Organization
Tenant
Membership
TenantResolver
TenantContext
Subdomain resolution
X-Tenant-ID development resolver
Role authorization
Tenant-scoped repository
Tenant isolation tests
```

STOP CONDITION:

```text
ACME user cannot access GLOBEX.
```

This is the most important checkpoint.

---

## Phase 4 — Inventory

```text
Product
Product CRUD
SKU uniqueness
Stock adjustment
Stock movement
Low-stock calculation
Pagination
Search
Filtering
Optimistic concurrency
```

STOP CONDITION:

```text
Inventory works correctly inside one tenant.
```

---

## Phase 5 — Files

```text
S3 configuration
Presign
Upload
Complete
Metadata
Download URL
Tenant ownership validation
```

STOP CONDITION:

```text
ACME cannot access GLOBEX files.
```

---

## Phase 6 — Audit + Security Center

```text
AuditEvent
Access denied logging
Tenant switch logging
Cross-tenant attempt logging
Security events API
Isolation simulation
```

STOP CONDITION:

```text
A judge can see a real blocked attack.
```

---

## Phase 7 — Dashboard

```text
Tenant dashboard
Inventory KPIs
Low-stock products
Recent movements
Security events
```

STOP CONDITION:

```text
The application looks like a complete product.
```

---

## Phase 8 — P1 Enhancements

Only now:

```text
Transfers
Redis caching
Low-stock workers
Email
Exports
Advanced analytics
Tenant management UI
```

---

## Phase 9 — Enterprise Enhancements

Only if time remains:

```text
2FA
OIDC
Advanced refresh-token security
KMS
Malware scanning
Advanced observability
Trend engine
```

---

# 13.42 Strict Anti-Overengineering Rule

The following MUST NOT be introduced unless a concrete requirement appears:

```text
Microservices
Kubernetes
Kafka
RabbitMQ
GraphQL
CQRS
Event sourcing
Service mesh
gRPC
Separate authentication service
Separate inventory service
Separate tenant service
AI service
Vector database
Elasticsearch
```

The backend is a:

```text
MODULAR MONOLITH
```

with strong module boundaries.

The architecture should be:

```text
                 ASP.NET CORE
                      │
             ┌────────┴────────┐
             │                 │
         Security          Business
             │                 │
       ┌─────┴─────┐     ┌─────┴─────┐
       │           │     │           │
      Auth       Tenant Inventory    Files
                   │
              Organization
                   │
                Members
```

---

# 13.43 Critical Architectural Correction — Database Choice

The project MUST choose one primary persistence strategy.

### Recommended for this design

```text
ASP.NET Core
      │
      ▼
MongoDB.Driver
      │
      ▼
MongoDB
```

Do NOT simultaneously build:

```text
MongoDB
+
EF Core
+
MongoDB EF provider
```

unless there is a concrete reason.

The current problem statement does not require EF Core.

If MongoDB is retained, tenant isolation MUST rely on:

```text
TenantResolutionMiddleware
        +
TenantContext
        +
Tenant-aware repositories
        +
MongoDB indexes
        +
authorization
        +
Tenant Guard
        +
security tests
```

The `EF Core global query filter` requirement in the existing document should therefore be removed/replaced if MongoDB is the final database.

If the team instead chooses PostgreSQL, then use:

```text
ASP.NET Core
      │
      ▼
EF Core
      │
      ▼
PostgreSQL
```

and then:

```text
Global Query Filters
Save Interceptors
PostgreSQL transactions
```

become appropriate.

**Do not mix the two architectures.**

---

# 13.44 Final Hackathon Backend Target

The final backend should communicate this architecture:

```text
                 ┌──────────────────────┐
                 │      React/Vite      │
                 └──────────┬───────────┘
                            │
                       HTTPS / JSON
                            │
                            ▼
                 ┌──────────────────────┐
                 │     ASP.NET Core     │
                 │                      │
                 │ JWT Authentication   │
                 │ Tenant Resolution    │
                 │ Authorization        │
                 │ Validation           │
                 │ Rate Limiting        │
                 └──────────┬───────────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
          MongoDB         Redis           S3
             │              │              │
             │              │              │
       Tenant data      Cache/jobs     Private files
             │
             ▼
      Tenant isolation
             │
             ▼
       Audit + Security
```

The **core engineering story** is:

```text
SUBDOMAIN
    ↓
TENANT RESOLUTION
    ↓
MEMBERSHIP AUTHORIZATION
    ↓
TENANT CONTEXT
    ↓
TENANT-SCOPED REPOSITORY
    ↓
DATABASE
    ↓
AUDIT
```

That is the part that should receive the majority of the team's engineering time.

**If you have limited hackathon time, a smaller system with this chain genuinely enforced and tested is substantially more valuable than implementing 2FA, OIDC, KMS, trend engines, and ten background workers while tenant isolation remains unproven.**
