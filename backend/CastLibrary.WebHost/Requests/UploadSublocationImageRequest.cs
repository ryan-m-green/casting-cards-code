using Microsoft.AspNetCore.Http;

namespace CastLibrary.WebHost.Requests;

public class UploadSublocationImageRequest
{
    public IFormFile File { get; set; }
    public Guid SourceSublocationId { get; set; }
}
