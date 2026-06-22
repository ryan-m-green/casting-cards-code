using CastLibrary.Logic.Commands.Location;
using CastLibrary.Logic.Queries.Location;
using CastLibrary.Logic.Services;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Exceptions;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/locations")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class LocationsController(
    IGetLocationDetailQueryHandler getLocationDetailQueryHandler,
    IGetLocationLibraryQueryHandler getLocationLibraryQuery,
    ICreateLocationCommandHandler createLocationCommand,
    IUpdateLocationCommandHandler updateLocationCommand,
    IUploadLocationImageCommandHandler uploadLocationImageCommand,
    IDeleteLocationCommandHandler deleteLocationCommand,
    ILocationWebMapper mapper,
    IUserRetriever userRetriever,
    IFileValidationService fileValidationService) : ControllerBase
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
        var validator = new CreateLocationRequestValidator();
        var validationResult = validator.Validate(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }
        var userId = userRetriever.GetUserId(User);
        
        try
        {
            var Location = await createLocationCommand.HandleAsync(new CreateLocationCommand(userId, request));
            var response = mapper.ToResponse(Location);

            return CreatedAtAction(nameof(GetById), new { id = Location.Id }, response);
        }
        catch (LimitExceededException ex)
        {
            return StatusCode(403, ex.Message);
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateLocationRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var Location = await updateLocationCommand.HandleAsync(new UpdateLocationCommand(id, request, userId));
        if (Location is null)
        {
            return NotFound();
        }

        var response = mapper.ToResponse(Location);
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
        var validationResult = await fileValidationService.ValidateFileAsync(file, 20 * 1024 * 1024, 
            new[] { "image/jpeg", "image/png", "image/webp" });

        if (!validationResult.IsValid)
            return BadRequest(validationResult.ErrorMessage);
        var userId = userRetriever.GetUserId(User);
        var (success, _) = await uploadLocationImageCommand.HandleAsync(
            new UploadLocationImageCommand(id, userId, file.OpenReadStream(), validationResult.DetectedContentType));

        if (!success)
        {
            return NotFound();
        }

        var Location = await getLocationDetailQueryHandler.HandleAsync(id);
        var response = new { imageUrl = mapper.ToResponse(Location!).ImageUrl };

        return Ok(response);
    }
}


