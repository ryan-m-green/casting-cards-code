using Microsoft.AspNetCore.Http;

namespace CastLibrary.WebHost.Requests;

public class UploadCastImageRequest
{
    public IFormFile File { get; set; }
    public Guid SourceCastId { get; set; }
}
