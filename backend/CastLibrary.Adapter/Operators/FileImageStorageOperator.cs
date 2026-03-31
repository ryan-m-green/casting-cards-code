using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using CastLibrary.Adapter.ImageConversion;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Configuration;

namespace CastLibrary.Adapter.Operators;

public class FileImageStorageOperator(IFileStorageConfiguration config, IImageConverter imageConverter) : IImageStorageOperator
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
        var pngImage = await imageConverter.ConvertToPng(content);
        var s3Key = $"images/{key}";

        var putRequest = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = s3Key,
            InputStream = pngImage,
            CannedACL = S3CannedACL.PublicRead,
            ContentType = "image/png"
        };

        await _s3Client.PutObjectAsync(putRequest);
    }

    public async Task DeleteAsync(string key)
    {
        if (string.IsNullOrEmpty(key))
            return;

        var s3Key = $"images/{key}";
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

        var s3Key = $"images/{key}";
        return $"{_publicUrl.TrimEnd('/')}/{s3Key}";
    }

    public async Task<byte[]?> ReadAsync(string key)
    {
        if (string.IsNullOrEmpty(key))
            return null;

        var s3Key = $"images/{key}";

        try
        {
            var getRequest = new GetObjectRequest
            {
                BucketName = _bucketName,
                Key = s3Key
            };

            using var response = await _s3Client.GetObjectAsync(getRequest);
            using var memoryStream = new MemoryStream();
            await response.ResponseStream.CopyToAsync(memoryStream);
            return memoryStream.ToArray();
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }
}
