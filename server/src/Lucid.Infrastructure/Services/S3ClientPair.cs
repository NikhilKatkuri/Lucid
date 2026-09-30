using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Lucid.Infrastructure.Options;

namespace Lucid.Infrastructure.Services;

public sealed class S3ClientPair : IDisposable
{
    public IAmazonS3 Storage { get; }
    public IAmazonS3 Presigner { get; }

    public S3ClientPair(S3Options options)
    {
        Storage = CreateClient(options, options.Endpoint);
        Presigner = options.PublicEndpoint is { Length: > 0 }
            ? CreateClient(options, options.PublicEndpoint)
            : Storage;
    }

    private static IAmazonS3 CreateClient(S3Options options, string? endpoint)
    {
        var config = new AmazonS3Config { RegionEndpoint = RegionEndpoint.GetBySystemName(options.Region) };
        if (!string.IsNullOrWhiteSpace(endpoint))
        {
            config.ServiceURL = endpoint;
            config.ForcePathStyle = true;
        }

        AWSCredentials? credentials = !string.IsNullOrWhiteSpace(options.AccessKey) && !string.IsNullOrWhiteSpace(options.SecretKey)
            ? new BasicAWSCredentials(options.AccessKey, options.SecretKey)
            : null;
        return credentials is null ? new AmazonS3Client(config) : new AmazonS3Client(credentials, config);
    }

    public void Dispose()
    {
        Storage.Dispose();
        if (!ReferenceEquals(Presigner, Storage)) Presigner.Dispose();
    }
}
