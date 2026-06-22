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

    public async Task<byte[]> ReadAsync(string key)
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

    public async Task<List<(string key, long size)>> ListAllImagesWithSizesAsync()
    {
        var imageKeys = new List<(string key, long size)>();
        var continuationToken = string.Empty;

        try
        {
            do
            {
                var listRequest = new ListObjectsV2Request
                {
                    BucketName = _bucketName,
                    Prefix = "images/",
                    ContinuationToken = string.IsNullOrEmpty(continuationToken) ? null : continuationToken
                };

                Console.WriteLine($"Listing with prefix: {listRequest.Prefix}");
                var listResponse = await _s3Client.ListObjectsV2Async(listRequest);
                Console.WriteLine($"List response received. KeyCount: {listResponse.KeyCount}");

                if (listResponse.S3Objects?.Any() == true)
                {
                    foreach (var obj in listResponse.S3Objects)
                    {
                        // Remove "images/" prefix to return just the key
                        var key = obj.Key.StartsWith("images/") ? obj.Key["images/".Length..] : obj.Key;
                        var size = obj.Size ?? 0;
                        imageKeys.Add((key, size));
                    }
                }

                continuationToken = listResponse.NextContinuationToken;
            } while (!string.IsNullOrEmpty(continuationToken));
        }
        catch (AmazonS3Exception ex)
        {
            Console.WriteLine($"S3 Error: {ex.Message}");
            Console.WriteLine($"StatusCode: {ex.StatusCode}");
            Console.WriteLine($"ErrorCode: {ex.ErrorCode}");
            Console.WriteLine($"RequestId: {ex.RequestId}");

            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                Console.WriteLine($"Inner Exception Type: {ex.InnerException.GetType().Name}");
            }

            throw;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"General Error: {ex.Message}");
            Console.WriteLine($"Exception Type: {ex.GetType().Name}");

            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            }

            throw;
        }

        return imageKeys;
    }

    public async Task DeleteUserDirectoryAsync(Guid userId)
    {
        var userDirectoryPrefix = $"images/{userId}/";

        try
        {
            // List all objects with the user's directory prefix
            var listRequest = new ListObjectsV2Request
            {
                BucketName = _bucketName,
                Prefix = userDirectoryPrefix
            };

            var listResponse = await _s3Client.ListObjectsV2Async(listRequest);

            // Delete all objects in the user's directory
            if (listResponse.S3Objects?.Any() == true)
            {
                var deleteRequest = new DeleteObjectsRequest
                {
                    BucketName = _bucketName,
                    Objects = listResponse.S3Objects.Select(o => new KeyVersion { Key = o.Key }).ToList()
                };

                await _s3Client.DeleteObjectsAsync(deleteRequest);
            }
        }
        catch (AmazonS3Exception)
        {
            // Log but don't throw - allow database deletion to proceed
        }
    }

    public async Task<List<string>> ListAllImagesAsync()
    {
        var imageKeys = new List<string>();
        var continuationToken = string.Empty;

        try
        {
            Console.WriteLine($"Attempting to list objects from bucket: {_bucketName}");
            Console.WriteLine($"Endpoint configured in S3 client");

            do
            {
                var listRequest = new ListObjectsV2Request
                {
                    BucketName = _bucketName,
                    Prefix = "images/",
                    ContinuationToken = string.IsNullOrEmpty(continuationToken) ? null : continuationToken
                };

                Console.WriteLine($"Listing with prefix: {listRequest.Prefix}");
                var listResponse = await _s3Client.ListObjectsV2Async(listRequest);
                Console.WriteLine($"List response received. KeyCount: {listResponse.KeyCount}");

                if (listResponse.S3Objects?.Any() == true)
                {
                    foreach (var obj in listResponse.S3Objects)
                    {
                        // Remove "images/" prefix to return just the key
                        var key = obj.Key.StartsWith("images/") ? obj.Key["images/".Length..] : obj.Key;
                        imageKeys.Add(key);
                    }
                }

                continuationToken = listResponse.NextContinuationToken;
            } while (!string.IsNullOrEmpty(continuationToken));
        }
        catch (AmazonS3Exception ex)
        {
            Console.WriteLine($"S3 Error: {ex.Message}");
            Console.WriteLine($"StatusCode: {ex.StatusCode}");
            Console.WriteLine($"ErrorCode: {ex.ErrorCode}");
            Console.WriteLine($"RequestId: {ex.RequestId}");
            
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                Console.WriteLine($"Inner Exception Type: {ex.InnerException.GetType().Name}");
            }
            
            throw;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"General Error: {ex.Message}");
            Console.WriteLine($"Exception Type: {ex.GetType().Name}");
            
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            }
            
            throw;
        }

        return imageKeys;
    }
}
