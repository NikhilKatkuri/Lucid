# Lucid Server API

ASP.NET Core 8 Web API for Lucid's multi-tenant inventory application. It uses MongoDB for users, organizations, tenants, products, stock movements, files, and audit events. Product images are uploaded from the browser directly to S3 using short-lived presigned POST data issued by the API.

## Run locally

### With Docker Compose

From this directory, create a `.env` file with a strong JWT key and (optionally) a MongoDB URI:

```env
JWT_SIGNING_KEY=replace-with-a-random-secret-at-least-32-characters
# Optional. Without this, Compose uses its local Mongo replica set.
# MONGODB_URI=mongodb://mongo:27017/?replicaSet=rs0
```

Start the API and its local dependencies:

```bash
docker compose up --build
```

The API listens at `http://localhost:5000`; Swagger is available at `http://localhost:5000/swagger` in Development. Compose starts MongoDB, Redis, and LocalStack S3. The LocalStack startup script creates the `lucid-files` bucket and configures local browser CORS.

### Run the API without Compose

Install the .NET 8 SDK and MongoDB, set the configuration below, then run:

```bash
dotnet run --project src/Lucid.Api
```

Swagger is only enabled when `ASPNETCORE_ENVIRONMENT=Development`.

## Configuration

ASP.NET Core supports environment variables using double underscores for nested settings.

| Variable                          | Purpose                                                                    | Default / local value                                                                      |
| --------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `ASPNETCORE_ENVIRONMENT`          | Controls Development-only Swagger and dev route                            | `Development` in Compose                                                                   |
| `ASPNETCORE_URLS`                 | Listening URL when running outside Compose                                 | Set as needed; Compose maps host port 5000 to container port 8080                          |
| `MongoDb__ConnectionString`       | MongoDB connection                                                         | `mongodb://localhost:27017` locally; Compose uses `MONGODB_URI` or its replica-set default |
| `MongoDb__DatabaseName`           | Database name                                                              | `lucid`                                                                                    |
| `Jwt__Key`                        | JWT signing secret                                                         | Must be set; use a strong secret outside local development                                 |
| `Jwt__Issuer` / `Jwt__Audience`   | JWT validation values                                                      | `lucid` / `lucid`                                                                          |
| `Jwt__ExpiryMinutes`              | Token lifetime setting                                                     | `60` minutes                                                                               |
| `S3__Bucket`                      | Image bucket                                                               | `lucid-files`                                                                              |
| `S3__Region`                      | AWS region                                                                 | `us-east-1`                                                                                |
| `S3__Endpoint`                    | Optional S3-compatible endpoint for API-side operations                    | `http://localstack:4566` in Compose                                                        |
| `S3__PublicEndpoint`              | Optional endpoint embedded in URLs opened by the browser                   | `http://localhost:4566` in Compose                                                         |
| `S3__AccessKey` / `S3__SecretKey` | Explicit S3-compatible credentials; omit in AWS when using an API IAM role | `test` / `test` in Compose                                                                 |
| `S3__MaxImageBytes`               | Maximum image upload size                                                  | 2 MiB                                                                                      |
| `Cors__AllowedOrigins__0`         | Allowed browser origin                                                     | Defaults include localhost ports 3000 and 5173                                             |

For AWS S3 permissions and bucket CORS setup, see [S3_SETUP.md](S3_SETUP.md). Never put AWS credentials in frontend environment variables.

## API conventions

Base path: `/api/v1`. Successful API responses use this envelope:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "errors": [],
  "pagination": null
}
```

Error responses generally have `success: false`, `message`, and `errors`. Product list responses also include `pagination` with `page`, `pageSize`, `total`, and `totalPages`. ASP.NET model validation may use the framework's ProblemDetails response format.

Except for health and anonymous auth routes, send a bearer access token:

```http
Authorization: Bearer <accessToken>
```

For local development, send the active tenant ID on tenant-scoped routes:

```http
X-Tenant-ID: <tenantId>
```

The tenant ID must match the `tenantId` claim in the token, and the user must have membership in that tenant. Get tenant IDs from `GET /api/v1/auth/me`. In production, tenant subdomains can resolve the tenant instead. A missing tenant returns 404; an unauthorized tenant returns 403.

## Endpoints

All JSON request bodies use `Content-Type: application/json`, except the direct S3 form upload described below.

### Auth — `/api/v1/auth`

| Method and path         | Auth   | Description                                                                                                                                                    |
| ----------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /signup`          | Public | Create account, organization, default tenant, membership, and access token. Body: `{ "email", "password", "displayName" }`. Password must be 8–128 characters. |
| `POST /signin`          | Public | Sign in. Body: `{ "email", "password" }`. Returns a bearer access token and user.                                                                              |
| `GET /me`               | Bearer | Return current user, active tenant, and available tenants.                                                                                                     |
| `GET /my-orgs`          | Bearer | Return tenant memberships with organization names and roles.                                                                                                   |
| `POST /switch-tenant`   | Bearer | Issue a token for a tenant the user belongs to. Body: `{ "tenantId" }`. Use the returned token with the matching `X-Tenant-ID`.                                |
| `POST /logout`          | Bearer | Revoke the presented token. Client should also discard it.                                                                                                     |
| `POST /forgot-password` | Public | Currently returns `501 Not Implemented`; password reset email flow is not configured.                                                                          |
| `POST /reset-password`  | Public | Currently returns `501 Not Implemented`; password reset flow is not configured.                                                                                |

Sign-up example:

```bash
curl -X POST http://localhost:5000/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"DemoPassword123","displayName":"Demo User"}'
```

### Demo data

Start the API and run the seed script from the repository root to create the
shared demo account, two tenants, 100 products covering all inventory
categories and stock states, and sample stock movements:

```powershell
.\server\seed-demo.ps1
```

Demo login: `demo@example.com` / `DemoPassword123`.

### Inventory — `/api/v1/inventory`

All routes require authentication and tenant context. Product endpoints return product documents. Each tenant has isolated products and a unique SKU namespace.

| Method and path                | Permission       | Description                                                                                                                                             |
| ------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /products`               | `ProductCreate`  | Create product. Body fields: `sku`, `name`, `category`, `quantity`, `reorderLevel`, `price`.                                                            |
| `GET /products`                | `ProductRead`    | Search/list products. Query: `search`, `category`, `stockStatus`, `isArchived`, `sortBy`, `sortDirection`, `page` (default 1), `pageSize` (default 20). |
| `GET /products/{id}`           | `ProductRead`    | Read a product.                                                                                                                                         |
| `PUT /products/{id}`           | `ProductUpdate`  | Update `name`, `category`, `reorderLevel`, `price`, and optimistic concurrency `version`.                                                               |
| `DELETE /products/{id}`        | `ProductArchive` | Archive a product (soft delete).                                                                                                                        |
| `POST /products/{id}/restore`  | `ProductUpdate`  | Restore an archived product.                                                                                                                            |
| `POST /products/{id}/adjust`   | `StockAdjust`    | Adjust stock with a non-zero signed `quantityDelta`, plus `reason` and optional `note`. Decreases that would make stock negative are rejected.          |
| `GET /products/{id}/movements` | `ProductRead`    | List stock movements for one product.                                                                                                                   |
| `GET /movements`               | `ProductRead`    | List stock movements for the active tenant.                                                                                                             |

Create product example:

```json
{
  "sku": "DEMO-001",
  "name": "Desk Lamp",
  "category": "Electronics",
  "quantity": 12,
  "reorderLevel": 3,
  "price": 24.99
}
```

Stock adjustment example:

```json
{
  "quantityDelta": -2,
  "reason": "Damaged stock",
  "note": "Removed during stock count"
}
```

### Files and product images — `/api/v1/files`

The API authorizes the upload and creates a tenant-scoped object key. The browser sends the file directly to the returned S3 URL; the file bytes do not pass through the API. Supported formats are JPEG, PNG, and WebP, up to 2 MiB by default.

| Method and path              | Permission     | Description                                                                                                                                                                                            |
| ---------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /presign`              | `FileUpload`   | Request upload policy. Body: `{ "fileName", "contentType", "size", "entityId" }`, where `entityId` is an active product ID. Returns `uploadUrl`, S3 form `fields`, `fileId`, `s3Key`, and `expiresAt`. |
| `POST /complete`             | `FileUpload`   | Verify the uploaded object's size, content type, and image signature, then attach it to the product. Body: `{ "fileId" }`.                                                                             |
| `GET /{id}/download`         | `FileDownload` | Return a short-lived `downloadUrl` for an uploaded file.                                                                                                                                               |
| `GET /?entityId={productId}` | `FileRead`     | List uploaded files associated with a product.                                                                                                                                                         |

Browser upload sequence:

1. Call `POST /files/presign` with bearer and tenant headers.
2. Create `FormData`, append every returned `fields` entry, then append the image as `file`.
3. `POST` the form to `uploadUrl` directly, without API bearer headers.
4. Call `POST /files/complete` with the returned `fileId`.
5. Fetch the product to read its `imageKey`; call `GET /files/{imageKey}/download` to obtain a temporary display URL.

The configured S3 bucket must allow browser CORS from the frontend origin. Local Compose configures localhost origins; see [S3_SETUP.md](S3_SETUP.md) for AWS setup.

### Reports — `/api/v1/reports`

| Method and path     | Auth / permission                      | Description                                                                                     |
| ------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /dashboard`    | Bearer + `ReportRead`                  | Dashboard totals, inventory value, low-stock items, and recent movements for the active tenant. |
| `GET /organization` | Bearer + organization admin membership | Aggregate dashboard across the active organization’s tenants.                                   |

### Security and audit — `/api/v1/security`

| Method and path                                | Auth                                          | Description                                                                                                    |
| ---------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `GET /events?page=1&pageSize=50&orgWide=false` | Bearer + tenant Manager or organization admin | Paginated audit events. `pageSize` is limited to 1–100. `orgWide=true` requires organization admin membership. |
| `POST /simulations/cross-tenant`               | Bearer + tenant Manager or organization admin | Simulate an access decision and record the attempt. Body: `{ "targetTenantId", "operation" }`.                 |

### Development helper — `/api/v1/dev`

`POST /tenants` is only available when the API environment is Development and the caller is an organization admin. It creates a sibling tenant and makes the caller a Manager. Body: `{ "name", "slug", "type" }` (`type` defaults to `Store`).

### Health

| Method and path     | Description                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /health/live`  | Liveness endpoint.                                                                                        |
| `GET /health/ready` | Readiness endpoint. Currently uses the registered health checks and does not probe MongoDB, Redis, or S3. |

## Roles and permissions

Tenant membership roles are `Manager`, `Staff`, and `Viewer`. Endpoint permissions are enforced by the API's role-to-permission map. Organization-wide reports and audit views additionally check `OrganizationMembership` for `OrgAdmin`. Tenant access is checked on each tenant-scoped request; supplying a tenant header by itself does not grant access.

## Project layout

```text
src/Lucid.Api             HTTP controllers, middleware, authentication, configuration
src/Lucid.Application     DTOs and service interfaces
src/Lucid.Domain          Entities and enums
src/Lucid.Infrastructure MongoDB, S3, and service implementations
tests/                    Unit, integration, and security test projects
```

## Current API limitations

- No refresh-token endpoint, 2FA, or external sign-in endpoints.
- Password reset endpoints return 501 until email/reset-token support is implemented.
- Redis options are present, but the API's current rate limiter is in-memory and not distributed.
- Readiness health checks do not test dependency connectivity.
- Stock movement list routes currently return lists without paging.
