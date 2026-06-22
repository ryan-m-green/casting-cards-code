using CastLibrary.Logic.Commands.Faction;
using CastLibrary.Logic.Queries.Faction;
using CastLibrary.Logic.Services;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Exceptions;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/factions")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class FactionsController(
    IGetFactionLibraryQueryHandler getFactionLibraryQuery,
    IGetFactionDetailQueryHandler getFactionDetailQuery,
    ICreateFactionCommandHandler createFactionCommand,
    IUpdateFactionCommandHandler updateFactionCommand,
    IUploadFactionImageCommandHandler uploadFactionImageCommand,
    IDeleteFactionCommandHandler deleteFactionCommand,
    IFactionWebMapper mapper,
    IUserRetriever userRetriever,
    IFileValidationService fileValidationService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        var factions = await getFactionLibraryQuery.HandleAsync(dmUserId);
        return Ok(factions.Select(mapper.ToResponse).ToList());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var faction = await getFactionDetailQuery.HandleAsync(id);
        if (faction is null) return NotFound();
        return Ok(mapper.ToResponse(faction));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFactionRequest request)
    {
        var validator = new CreateFactionRequestValidator();
        var result = validator.Validate(request);
        if (!result.IsValid)
            return BadRequest(result.Errors.Select(e => e.ErrorMessage).ToList());

        var dmUserId = userRetriever.GetDmUserId(User);
        
        try
        {
            var faction = await createFactionCommand.HandleAsync(new CreateFactionCommand(dmUserId, request));
            return CreatedAtAction(nameof(GetById), new { id = faction.FactionId }, mapper.ToResponse(faction));
        }
        catch (LimitExceededException ex)
        {
            return StatusCode(403, ex.Message);
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateFactionRequest request)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        var faction = await updateFactionCommand.HandleAsync(new UpdateFactionCommand(id, dmUserId, request));
        if (faction is null) return NotFound();
        return Ok(mapper.ToResponse(faction));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var dmUserId = userRetriever.GetDmUserId(User);
        var success = await deleteFactionCommand.HandleAsync(new DeleteFactionCommand(id, dmUserId));
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

        var dmUserId = userRetriever.GetDmUserId(User);
        var (success, _) = await uploadFactionImageCommand.HandleAsync(
            new UploadFactionImageCommand(id, dmUserId, file.OpenReadStream(), validationResult.DetectedContentType));

        if (!success) return NotFound();

        var faction = await getFactionDetailQuery.HandleAsync(id);
        return Ok(new { imageUrl = mapper.ToResponse(faction!).ImageUrl });
    }
}
