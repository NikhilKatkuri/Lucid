using Lucid.Domain.Enums;

namespace Lucid.Application.Common.Interfaces;

public interface IAuditService
{
    Task RecordAsync(AuditAction action, string resourceType, string? resourceId, AuditResult result, string? reason = null, CancellationToken ct = default);
}
