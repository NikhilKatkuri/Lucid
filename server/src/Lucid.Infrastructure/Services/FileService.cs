using Lucid.Application.Common.Interfaces;
using Lucid.Application.Dtos.Files;
using Lucid.Domain.Entities;
using Lucid.Domain.Enums;
using Lucid.Infrastructure.Data;
using MongoDB.Driver;

namespace Lucid.Infrastructure.Services;

public class FileService : IFileService
{
    private readonly MongoDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public FileService(MongoDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    public async Task<PresignResponse> PresignUploadAsync(PresignUploadRequest request, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<TenantFile>("tenantFiles");
        var fileId = Guid.NewGuid().ToString();
        var s3Key = $"orgs/{_tenantContext.OrganizationId}/tenants/{_tenantContext.TenantId}/products/{request.EntityId}/{fileId}";

        var file = new TenantFile
        {
            Id = fileId,
            TenantId = _tenantContext.TenantId,
            EntityId = request.EntityId,
            S3Key = s3Key,
            FileName = request.FileName,
            ContentType = request.ContentType,
            Size = request.Size,
            Status = FileStatus.Pending,
            CreatedByUserId = _tenantContext.UserId
        };

        await collection.InsertOneAsync(file, cancellationToken: ct);

        // In production, generate actual presigned URL here
        var uploadUrl = $"/api/v1/files/upload/{fileId}";

        return new PresignResponse
        {
            UploadUrl = uploadUrl,
            FileId = fileId,
            S3Key = s3Key,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15)
        };
    }

    public async Task<FileResponse> CompleteUploadAsync(CompleteUploadRequest request, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<TenantFile>("tenantFiles");
        var update = Builders<TenantFile>.Update
            .Set(f => f.Status, FileStatus.Uploaded);
        var result = await collection.FindOneAndUpdateAsync(
            f => f.Id == request.FileId && f.TenantId == _tenantContext.TenantId,
            update,
            new FindOneAndUpdateOptions<TenantFile> { ReturnDocument = ReturnDocument.After },
            ct);

        if (result == null)
            throw new InvalidOperationException("File not found");

        return new FileResponse
        {
            Id = result.Id,
            EntityId = result.EntityId,
            FileName = result.FileName,
            ContentType = result.ContentType,
            Size = result.Size,
            Status = result.Status.ToString(),
            CreatedAt = result.CreatedAt
        };
    }

    public async Task<DownloadUrlResponse> GetDownloadUrlAsync(string fileId, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<TenantFile>("tenantFiles");
        var file = await collection.Find(f => f.Id == fileId && f.TenantId == _tenantContext.TenantId).FirstOrDefaultAsync(ct);
        if (file == null)
            throw new InvalidOperationException("File not found");

        // In production, generate actual presigned GET URL here
        var downloadUrl = $"/api/v1/files/{fileId}/download";

        return new DownloadUrlResponse
        {
            DownloadUrl = downloadUrl,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15)
        };
    }

    public async Task<List<FileResponse>> ListAsync(string entityId, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<TenantFile>("tenantFiles");
        var files = await collection.Find(f => f.EntityId == entityId && f.TenantId == _tenantContext.TenantId)
            .SortByDescending(f => f.CreatedAt)
            .ToListAsync(ct);

        return files.Select(f => new FileResponse
        {
            Id = f.Id,
            EntityId = f.EntityId,
            FileName = f.FileName,
            ContentType = f.ContentType,
            Size = f.Size,
            Status = f.Status.ToString(),
            CreatedAt = f.CreatedAt
        }).ToList();
    }
}
