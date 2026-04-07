using CastLibrary.Logic.Commands.Sublocation;
using CastLibrary.Logic.Queries.Sublocation;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/sublocations")]
[Authorize]
public class SublocationsController(
    IGetSublocationDetailQueryHandler getSublocationDetailQueryHandler,
    IGetSublocationLibraryQueryHandler getSublocationLibraryQuery,
    ICreateSublocationCommandHandler createSublocationCommand,
    IUpdateSublocationCommandHandler updateSublocationCommand,
    IUploadSublocationImageCommandHandler uploadSublocationImageCommand,
    IDeleteSublocationCommandHandler deleteSublocationCommand,
    ISublocationWebMapper mapper,
    IUserRetriever userRetriever) : ControllerBase
{

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = userRetriever.GetUserId(User);
        var sublocations = await getSublocationLibraryQuery.HandleAsync(userId);
        var response = sublocations.Select(mapper.ToResponse).ToList();

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var sublocation = await getSublocationDetailQueryHandler.HandleAsync(id);
        if (sublocation is null)
        {
            return NotFound();
        }

        var response = mapper.ToResponse(sublocation);
        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSublocationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Name is required.");
        }
        var userId = userRetriever.GetUserId(User);
        var sublocation = await createSublocationCommand.HandleAsync(new CreateSublocationCommand(userId, request));
        var response = mapper.ToResponse(sublocation);

        return CreatedAtAction(nameof(GetById), new { id = sublocation.Id }, response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateSublocationRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var sublocation = await updateSublocationCommand.HandleAsync(new UpdateSublocationCommand(id, request, userId));
        if (sublocation is null)
        {
            return NotFound();
        }

        var response = mapper.ToResponse(sublocation);
        return Ok(response);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = userRetriever.GetUserId(User);
        var success = await deleteSublocationCommand.HandleAsync(new DeleteSublocationCommand(id, userId));

        return success ? NoContent() : NotFound();
    }

    [HttpPost("{id}/image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(Guid id, IFormFile file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest("No file provided.");
        }

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
        {
            return BadRequest("Only JPEG, PNG, and WebP images are supported.");
        }

        if (file.Length > 5 * 1024 * 1024)
        {
            return BadRequest("File size must not exceed 5 MB.");
        }
        var userId = userRetriever.GetUserId(User);

        var (success, _) = await uploadSublocationImageCommand.HandleAsync(
            new UploadSublocationImageCommand(id, userId, file.OpenReadStream(), file.ContentType));

        if (!success)
        {
            return NotFound();
        }

        var sublocation = await getSublocationDetailQueryHandler.HandleAsync(id);
        var response = new { imageUrl = mapper.ToResponse(sublocation!).ImageUrl };

        return Ok(response);
    }
}
