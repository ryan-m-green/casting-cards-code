using CastLibrary.Logic.Commands.Location;
using CastLibrary.Logic.Queries.Location;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/locations")]
[Authorize]
public class LocationsController(
    IGetLocationDetailQueryHandler getLocationDetailQueryHandler,
    IGetLocationLibraryQueryHandler getLocationLibraryQuery,
    ICreateLocationCommandHandler createLocationCommand,
    IUpdateLocationCommandHandler updateLocationCommand,
    IUploadLocationImageCommandHandler uploadLocationImageCommand,
    IDeleteLocationCommandHandler deleteLocationCommand,
    ILocationWebMapper mapper,
    IUserRetriever userRetriever) : ControllerBase
{

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = userRetriever.GetUserId(User);
        var locations = await getLocationLibraryQuery.HandleAsync(userId);
        var response = locations.Select(mapper.ToResponse).ToList();

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var location = await getLocationDetailQueryHandler.HandleAsync(id);
        if (location is null)
        {
            return NotFound();
        }

        var response = mapper.ToResponse(location);
        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLocationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Name is required.");
        }
        var userId = userRetriever.GetUserId(User);
        var location = await createLocationCommand.HandleAsync(new CreateLocationCommand(userId, request));
        var response = mapper.ToResponse(location);

        return CreatedAtAction(nameof(GetById), new { id = location.Id }, response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateLocationRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var location = await updateLocationCommand.HandleAsync(new UpdateLocationCommand(id, request, userId));
        if (location is null)
        {
            return NotFound();
        }

        var response = mapper.ToResponse(location);
        return Ok(response);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = userRetriever.GetUserId(User);
        var success = await deleteLocationCommand.HandleAsync(new DeleteLocationCommand(id, userId));
        var status = success ? 204 : 404;

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

        var (success, _) = await uploadLocationImageCommand.HandleAsync(
            new UploadLocationImageCommand(id, userId, file.OpenReadStream(), file.ContentType));

        if (!success)
        {
            return NotFound();
        }

        var location = await getLocationDetailQueryHandler.HandleAsync(id);
        var response = new { imageUrl = mapper.ToResponse(location!).ImageUrl };

        return Ok(response);
    }
}
