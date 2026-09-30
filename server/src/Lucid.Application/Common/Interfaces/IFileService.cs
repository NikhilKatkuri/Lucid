using Lucid.Application.Dtos.Files;

namespace Lucid.Application.Common.Interfaces;

public interface IFileService
{
    Task<PresignResponse> PresignUploadAsync(PresignUploadRequest request, CancellationToken ct = default);
    Task<FileResponse> CompleteUploadAsync(CompleteUploadRequest request, CancellationToken ct = default);
    Task<DownloadUrlResponse> GetDownloadUrlAsync(string fileId, CancellationToken ct = default);
    Task<List<FileResponse>> ListAsync(string entityId, CancellationToken ct = default);
}
