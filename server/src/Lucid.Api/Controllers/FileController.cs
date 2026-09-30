using Lucid.Api.Authorization;
using Lucid.Application.Common;
using Lucid.Application.Common.Interfaces;
using Lucid.Application.Dtos.Files;
using Lucid.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lucid.Api.Controllers;

[ApiController]
[Route("api/v1/files")]
[Authorize]
public class FileController : ControllerBase
{
    private readonly IFileService _fileService;

    public FileController(IFileService fileService)
    {
        _fileService = fileService;
    }

    [HttpPost("presign")]
    [AuthorizePermission(Permission.FileUpload)]
    public async Task<ActionResult<ApiResponse<PresignResponse>>> PresignUpload([FromBody] PresignUploadRequest request, CancellationToken ct)
    {
        var result = await _fileService.PresignUploadAsync(request, ct);
        return Ok(ApiResponse<PresignResponse>.Ok(result, "Presigned URL generated"));
    }

    [HttpPost("complete")]
    [AuthorizePermission(Permission.FileUpload)]
    public async Task<ActionResult<ApiResponse<FileResponse>>> CompleteUpload([FromBody] CompleteUploadRequest request, CancellationToken ct)
    {
        var result = await _fileService.CompleteUploadAsync(request, ct);
        return Ok(ApiResponse<FileResponse>.Ok(result, "File upload completed"));
    }

    [HttpGet("{id}/download")]
    [AuthorizePermission(Permission.FileDownload)]
    public async Task<ActionResult<ApiResponse<DownloadUrlResponse>>> GetDownloadUrl(string id, CancellationToken ct)
    {
        var result = await _fileService.GetDownloadUrlAsync(id, ct);
        return Ok(ApiResponse<DownloadUrlResponse>.Ok(result));
    }

    [HttpGet]
    [AuthorizePermission(Permission.FileRead)]
    public async Task<ActionResult<ApiResponse<List<FileResponse>>>> ListFiles([FromQuery] string entityId, CancellationToken ct)
    {
        var result = await _fileService.ListAsync(entityId, ct);
        return Ok(ApiResponse<List<FileResponse>>.Ok(result));
    }
}
