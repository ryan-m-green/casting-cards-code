using CastLibrary.Logic.Commands.Cast;
using CastLibrary.Logic.Queries.Cast;
using CastLibrary.Logic.Validators;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/cast")]
[Authorize]
public class CastController(
    IGetCastLibraryQueryHandler getCastLibraryQuery,
    IGetCastDetailQueryHandler getCastDetailQuery,
    ICreateCastCommandHandler createCastCommand,
    IUpdateCastCommandHandler updateCastCommand,
    IUploadCastImageCommandHandler uploadCastImageCommand,
    IDeleteCastCommandHandler deleteCastCommand,
    ICastWebMapper mapper, 
    IUserRetriever userRetriever) : ControllerBase
{

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        var cast = await getCastLibraryQuery.HandleAsync(dmUserId);
        var response = cast.Select(mapper.ToResponse).ToList();

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var cast = await getCastDetailQuery.HandleAsync(id);
        if (cast is null)
        {
            return NotFound();
        }

        var response = mapper.ToResponse(cast);
        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCastRequest request)
    {
        var validator = new CreateCastRequestValidator();
        var validationResult = validator.Validate(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }
        var dmUserId = userRetriever.GetDmUserId(User);
        var cast = await createCastCommand.HandleAsync(new CreateCastCommand(dmUserId, request));
        var response = mapper.ToResponse(cast);

        return CreatedAtAction(nameof(GetById), new { id = cast.Id }, response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateCastRequest request)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        var cast = await updateCastCommand.HandleAsync(new UpdateCastCommand(id, request, dmUserId));
        if (cast is null)
        {
            return NotFound();
        }

        var response = mapper.ToResponse(cast);
        return Ok(response);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        var success = await deleteCastCommand.HandleAsync(new DeleteCastCommand(id, dmUserId));
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
        var dmUserId = userRetriever.GetDmUserId(User);
        var (success, _) = await uploadCastImageCommand.HandleAsync(
            new UploadCastImageCommand(id, dmUserId, file.OpenReadStream(), file.ContentType));

        if (!success)
        {
            return NotFound();
        }

        var cast = await getCastDetailQuery.HandleAsync(id);
        var response = new { imageUrl = mapper.ToResponse(cast!).ImageUrl };

        return Ok(response);
    }
}
