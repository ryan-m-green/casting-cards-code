using Microsoft.Extensions.Configuration;

namespace CastLibrary.Shared.Configuration
{
    public interface IFileStorageConfiguration
    {
        string AccessKey { get; }
        string SecretKey { get; }
        string BucketName { get; }
        string Region { get; }
        string Endpoint { get; }
        string PublicUrl { get; }
    }
    public class FileStorageConfiguration : IFileStorageConfiguration
    {
        public FileStorageConfiguration(IConfiguration configuration)
        {
            AccessKey = configuration["ImageStorage:S3:AccessKey"] ?? throw new InvalidOperationException("AccessKey not configured");
            SecretKey = configuration["ImageStorage:S3:SecretKey"] ?? throw new InvalidOperationException("SecretKey not configured");
            BucketName = configuration["ImageStorage:S3:BucketName"] ?? throw new InvalidOperationException("BucketName not configured");
            Region = configuration["ImageStorage:S3:Region"] ?? throw new InvalidOperationException("Region not configured");
            Endpoint = configuration["ImageStorage:S3:Endpoint"] ?? throw new InvalidOperationException("Endpoint not configured");
            PublicUrl = configuration["ImageStorage:S3:PublicUrl"] ?? throw new InvalidOperationException("PublicUrl not configured");
        }

        public string AccessKey { get; }
        public string SecretKey { get; }
        public string BucketName { get; }
        public string Region { get; }
        public string Endpoint { get; }
        public string PublicUrl { get; }
    }
}
