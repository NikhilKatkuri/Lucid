using Amazon.S3.Model;
using Amazon.S3;
using Lucid.Application.Common;
using Lucid.Application.Common.Interfaces;
using Lucid.Application.Dtos.Files;
using Lucid.Domain.Entities;
using Lucid.Domain.Enums;
using Lucid.Infrastructure.Data;
using Lucid.Infrastructure.Options;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Lucid.Infrastructure.Services;

public class FileService : IFileService
{
    private static readonly HashSet<string> ImageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp"
    };

    private readonly MongoDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly S3ClientPair _s3;
    private readonly S3Options _options;

    public FileService(MongoDbContext dbContext, ITenantContext tenantContext, S3ClientPair s3, IOptions<S3Options> options)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _s3 = s3;
        _options = options.Value;
    }

    public async Task<PresignResponse> PresignUploadAsync(PresignUploadRequest request, CancellationToken ct = default)
    {
        ValidateImage(request.ContentType, request.Size);
        var product = await _dbContext.GetCollection<Product>("products")
            .Find(p => p.Id == request.EntityId && p.TenantId == _tenantContext.TenantId && !p.IsArchived)
            .FirstOrDefaultAsync(ct);
        if (product == null) throw ApiException.NotFound("Product not found");

        var collection = _dbContext.GetCollection<TenantFile>("tenantFiles");
        var fileId = Guid.NewGuid().ToString("N");
        var extension = request.ContentType.ToLowerInvariant() switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            _ => ".webp"
        };
        var s3Key = $"orgs/{_tenantContext.OrganizationId}/tenants/{_tenantContext.TenantId}/products/{product.Id}/{fileId}{extension}";
        var expiresAt = DateTime.UtcNow.AddMinutes(10);
        var file = new TenantFile
        {
            Id = fileId, TenantId = _tenantContext.TenantId, EntityId = product.Id,
            S3Key = s3Key, FileName = Path.GetFileName(request.FileName),
            ContentType = request.ContentType, Size = request.Size, Status = FileStatus.Pending,
            CreatedByUserId = _tenantContext.UserId
        };
        await collection.InsertOneAsync(file, cancellationToken: ct);

        var post = await _s3.Presigner.CreatePresignedPostAsync(new CreatePresignedPostRequest
        {
            BucketName = _options.Bucket,
            Key = s3Key,
            Expires = expiresAt,
            Fields = new Dictionary<string, string> { ["Content-Type"] = request.ContentType },
            Conditions = new List<S3PostCondition>
            {
                S3PostCondition.ExactMatch("Content-Type", request.ContentType),
                S3PostCondition.ContentLengthRange(1, _options.MaxImageBytes)
            }
        });
        return new PresignResponse { UploadUrl = post.Url, Fields = post.Fields, FileId = fileId, S3Key = s3Key, ExpiresAt = expiresAt };
    }

    public async Task<FileResponse> CompleteUploadAsync(CompleteUploadRequest request, CancellationToken ct = default)
    {
        var collection = _dbContext.GetCollection<TenantFile>("tenantFiles");
        var file = await collection.Find(f => f.Id == request.FileId && f.TenantId == _tenantContext.TenantId)
            .FirstOrDefaultAsync(ct);
        if (file == null) throw new InvalidOperationException("File not found");
        if (file.Status == FileStatus.Uploaded) return ToResponse(file);
        if (file.Status != FileStatus.Pending) throw ApiException.BadRequest("File upload is not pending");

        var product = await _dbContext.GetCollection<Product>("products")
            .Find(p => p.Id == file.EntityId && p.TenantId == _tenantContext.TenantId && !p.IsArchived)
            .FirstOrDefaultAsync(ct);
        if (product == null) throw new InvalidOperationException("Product not found");

        var metadata = await _s3.Storage.GetObjectMetadataAsync(_options.Bucket, file.S3Key, ct);
        if (metadata.ContentLength != file.Size ||
            !string.Equals(metadata.Headers.ContentType, file.ContentType, StringComparison.OrdinalIgnoreCase))
        {
            await _s3.Storage.DeleteObjectAsync(_options.Bucket, file.S3Key, ct);
            throw ApiException.BadRequest("Uploaded image metadata does not match the request");
        }
        ValidateImage(metadata.Headers.ContentType, metadata.ContentLength);
        if (!await HasValidImageSignatureAsync(file.S3Key, file.ContentType, ct))
        {
            await _s3.Storage.DeleteObjectAsync(_options.Bucket, file.S3Key, ct);
            throw ApiException.BadRequest("Uploaded file contents are not a supported image");
        }

        file.Status = FileStatus.Uploaded;
        await collection.ReplaceOneAsync(f => f.Id == file.Id && f.TenantId == _tenantContext.TenantId && f.Status == FileStatus.Pending,
            file, cancellationToken: ct);
        await _dbContext.GetCollection<Product>("products").UpdateOneAsync(
            p => p.Id == product.Id && p.TenantId == _tenantContext.TenantId,
            Builders<Product>.Update.Set(p => p.ImageKey, file.Id).Set(p => p.UpdatedAt, DateTime.UtcNow),
            cancellationToken: ct);
        return ToResponse(file);
    }

    public async Task<DownloadUrlResponse> GetDownloadUrlAsync(string fileId, CancellationToken ct = default)
    {
        var file = await _dbContext.GetCollection<TenantFile>("tenantFiles")
            .Find(f => f.Id == fileId && f.TenantId == _tenantContext.TenantId && f.Status == FileStatus.Uploaded)
            .FirstOrDefaultAsync(ct);
        if (file == null) throw new InvalidOperationException("File not found");

        var expiresAt = DateTime.UtcNow.AddMinutes(10);
        var url = _s3.Presigner.GetPreSignedURL(new GetPreSignedUrlRequest
        {
            BucketName = _options.Bucket,
            Key = file.S3Key,
            Verb = HttpVerb.GET,
            Expires = expiresAt
        });
        return new DownloadUrlResponse { DownloadUrl = url, ExpiresAt = expiresAt };
    }

    public async Task<List<FileResponse>> ListAsync(string entityId, CancellationToken ct = default)
    {
        var productExists = await _dbContext.GetCollection<Product>("products")
            .Find(p => p.Id == entityId && p.TenantId == _tenantContext.TenantId)
            .AnyAsync(ct);
        if (!productExists) throw new InvalidOperationException("Product not found");

        var files = await _dbContext.GetCollection<TenantFile>("tenantFiles")
            .Find(f => f.EntityId == entityId && f.TenantId == _tenantContext.TenantId && f.Status == FileStatus.Uploaded)
            .SortByDescending(f => f.CreatedAt).ToListAsync(ct);
        return files.Select(ToResponse).ToList();
    }

    private void ValidateImage(string contentType, long size)
    {
        if (!ImageTypes.Contains(contentType))
            throw ApiException.BadRequest("Only JPEG, PNG, and WebP images are allowed");
        if (size <= 0 || size > _options.MaxImageBytes)
            throw ApiException.BadRequest($"Image must be between 1 byte and {_options.MaxImageBytes} bytes");
    }

    private async Task<bool> HasValidImageSignatureAsync(string key, string contentType, CancellationToken ct)
    {
        using var response = await _s3.Storage.GetObjectAsync(_options.Bucket, key, ct);
        var header = new byte[12];
        var count = 0;
        while (count < header.Length)
        {
            var read = await response.ResponseStream.ReadAsync(header.AsMemory(count, header.Length - count), ct);
            if (read == 0) break;
            count += read;
        }

        return contentType.ToLowerInvariant() switch
        {
            "image/jpeg" => count >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            "image/png" => count >= 8 && header.AsSpan(0, 8).SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            "image/webp" => count >= 12 && header.AsSpan(0, 4).SequenceEqual("RIFF"u8) && header.AsSpan(8, 4).SequenceEqual("WEBP"u8),
            _ => false
        };
    }

    private static FileResponse ToResponse(TenantFile file) => new()
    {
        Id = file.Id, EntityId = file.EntityId, FileName = file.FileName,
        ContentType = file.ContentType, Size = file.Size, Status = file.Status.ToString(), CreatedAt = file.CreatedAt
    };
}
