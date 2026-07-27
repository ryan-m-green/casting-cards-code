using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Configuration;

namespace CastLibrary.Adapter.Operators;

public class AudioFileStorageOperator(IFileStorageConfiguration config) : IAudioFileStorageOperator
{
    private readonly IAmazonS3 _s3Client = new AmazonS3Client(
        config.AccessKey,
        config.SecretKey,
        new AmazonS3Config
        {
            ServiceURL = config.Endpoint,
            ForcePathStyle = true,
            AuthenticationRegion = config.Region
        });

    private readonly string _bucketName = config.BucketName;
    private readonly string _publicUrl = config.PublicUrl;

    public async Task SaveAsync(string key, Stream content, string contentType)
    {
        var s3Key = $"audio/{key}";

        var putRequest = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = s3Key,
            InputStream = content,
            CannedACL = S3CannedACL.PublicRead,
            ContentType = contentType
        };

        await _s3Client.PutObjectAsync(putRequest);
    }

    public async Task DeleteAsync(string key)
    {
        if (string.IsNullOrEmpty(key))
            return;

        var s3Key = $"audio/{key}";
        var deleteRequest = new DeleteObjectRequest
        {
            BucketName = _bucketName,
            Key = s3Key
        };

        await _s3Client.DeleteObjectAsync(deleteRequest);
    }

    public string GetPublicUrl(string key)
    {
        if (string.IsNullOrEmpty(key))
            return null;

        var s3Key = $"audio/{key}";
        var baseUrl = _publicUrl.TrimEnd('/');
        // Remove /images/ prefix if present since we're serving audio files
        baseUrl = baseUrl.Replace("/images", "");
        return $"{baseUrl}/{s3Key}";
    }
}
