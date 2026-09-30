using System.Reflection;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Lucid.Api.Middleware;
using Lucid.Application.Common.Interfaces;
using Lucid.Infrastructure.Data;
using Lucid.Infrastructure.Options;
using Lucid.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

// Options
builder.Services.Configure<MongoDbOptions>(builder.Configuration.GetSection(MongoDbOptions.SectionName));
builder.Services.Configure<RedisOptions>(builder.Configuration.GetSection(RedisOptions.SectionName));
builder.Services.Configure<S3Options>(builder.Configuration.GetSection(S3Options.SectionName));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<RateLimitOptions>(builder.Configuration.GetSection(RateLimitOptions.SectionName));
builder.Services.Configure<TenantOptions>(builder.Configuration.GetSection(TenantOptions.SectionName));

// Infrastructure
builder.Services.AddSingleton<MongoDbContext>();
builder.Services.AddSingleton(sp => new S3ClientPair(sp.GetRequiredService<IOptions<S3Options>>().Value));
builder.Services.AddSingleton<IPasswordHasher, PasswordHasher>();
builder.Services.AddSingleton<IJwtService, JwtService>();
builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

// Scoped: depends on the request-scoped ITenantContext and IHttpContextAccessor
builder.Services.AddScoped<IAuditService, AuditService>();

// Tenant context (request scoped, populated by TenantResolutionMiddleware)
builder.Services.AddScoped<ITenantContext, TenantContext>();

// Application Services
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IOrganizationService, OrganizationService>();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IFileService, FileService>();
builder.Services.AddScoped<IReportService, ReportService>();

// JWT Authentication
// Secrets are intentionally blank in appsettings.json and must be supplied via
// environment variables (Jwt__Key) or user-secrets. Validate up front so a
// missing key fails at startup with a clear message instead of surfacing as an
// opaque "key length is zero" on the first authenticated request.
var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
                 ?? new JwtOptions();

if (string.IsNullOrWhiteSpace(jwtOptions.Key) || Encoding.UTF8.GetByteCount(jwtOptions.Key) < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key is missing or shorter than 32 bytes. Provide it without committing it, e.g. " +
        "$env:Jwt__Key = '<at least 32 characters>'  (or: dotnet user-secrets set \"Jwt:Key\" \"<value>\" in " +
        "server/src/Lucid.Api).");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var jti = context.Principal?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
                if (string.IsNullOrWhiteSpace(jti)) { context.Fail("Token identifier missing"); return; }
                var db = context.HttpContext.RequestServices.GetRequiredService<MongoDbContext>();
                var revoked = await db.GetCollection<Lucid.Domain.Entities.RevokedToken>("revokedTokens")
                    .Find(t => t.Jti == jti && t.ExpiresAt > DateTime.UtcNow).AnyAsync(context.HttpContext.RequestAborted);
                if (revoked) context.Fail("Token revoked");
            }
        };
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:3000", "http://localhost:5173" })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Lucid API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddControllers();

// Health checks
builder.Services.AddHealthChecks();

var app = builder.Build();

// Middleware pipeline (strict order)
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<RequestIdMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseCors();
app.UseMiddleware<RateLimitMiddleware>();
app.UseAuthentication();
app.UseMiddleware<TenantResolutionMiddleware>();
app.UseAuthorization();

// Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Health checks
app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

// Controllers
app.MapControllers();

// Create indexes on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<MongoDbContext>();
    await dbContext.CreateIndexesAsync();
}

app.Run();