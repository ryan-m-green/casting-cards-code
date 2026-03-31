using CastLibrary.Logic.Commands.City;
using CastLibrary.Logic.Queries.City;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/cities")]
[Authorize]
public class CitiesController(
    IGetCityDetailQueryHandler getCityDetailQueryHandler,
    IGetCityLibraryQueryHandler getCityLibraryQuery,
    ICreateCityCommandHandler createCityCommand,
    IUpdateCityCommandHandler updateCityCommand,
    IUploadCityImageCommandHandler uploadCityImageCommand,
    IDeleteCityCommandHandler deleteCityCommand,
    ICityWebMapper mapper,
    IUserRetriever userRetriever) : ControllerBase
{

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = userRetriever.GetUserId(User);
        var cities = await getCityLibraryQuery.HandleAsync(userId);
        var response = cities.Select(mapper.ToResponse).ToList();

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var city = await getCityDetailQueryHandler.HandleAsync(id);
        if (city is null)
        {
            return NotFound();
        }

        var response = mapper.ToResponse(city);
        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCityRequest request)
    {
        var validator = new CreateCityRequestValidator();
        var validationResult = validator.Validate(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }
        var userId = userRetriever.GetUserId(User);
        var city = await createCityCommand.HandleAsync(new CreateCityCommand(userId, request));
        var response = mapper.ToResponse(city);

        return CreatedAtAction(nameof(GetById), new { id = city.Id }, response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateCityRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var city = await updateCityCommand.HandleAsync(new UpdateCityCommand(id, request, userId));
        if (city is null)
        {
            return NotFound();
        }

        var response = mapper.ToResponse(city);
        return Ok(response);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = userRetriever.GetUserId(User);
        var success = await deleteCityCommand.HandleAsync(new DeleteCityCommand(id, userId));
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
        var (success, _) = await uploadCityImageCommand.HandleAsync(
            new UploadCityImageCommand(id, userId, file.OpenReadStream(), file.ContentType));

        if (!success)
        {
            return NotFound();
        }

        var city = await getCityDetailQueryHandler.HandleAsync(id);
        var response = new { imageUrl = mapper.ToResponse(city!).ImageUrl };

        return Ok(response);
    }
}
