using Microsoft.AspNetCore.Http;

namespace CastLibrary.WebHost.Requests;

public class UploadLocationImageRequest
{
    public IFormFile File { get; set; }
    public Guid SourceLocationId { get; set; }
}
