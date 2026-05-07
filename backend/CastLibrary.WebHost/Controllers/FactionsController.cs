using CastLibrary.Logic.Commands.Faction;
using CastLibrary.Logic.Queries.Faction;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/factions")]
[Authorize]
public class FactionsController(
    IGetFactionLibraryQueryHandler getFactionLibraryQuery,
    IGetFactionDetailQueryHandler getFactionDetailQuery,
    ICreateFactionCommandHandler createFactionCommand,
    IUpdateFactionCommandHandler updateFactionCommand,
    IUploadFactionImageCommandHandler uploadFactionImageCommand,
    IDeleteFactionCommandHandler deleteFactionCommand,
    IFactionWebMapper mapper,
    IUserRetriever userRetriever) : ControllerBase
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
        var faction = await createFactionCommand.HandleAsync(new CreateFactionCommand(dmUserId, request));
        return CreatedAtAction(nameof(GetById), new { id = faction.FactionId }, mapper.ToResponse(faction));
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
        if (file is null || file.Length == 0)
            return BadRequest("No file provided.");

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest("Only JPEG, PNG, and WebP images are supported.");

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest("File size must not exceed 5 MB.");

        var dmUserId = userRetriever.GetDmUserId(User);
        var (success, _) = await uploadFactionImageCommand.HandleAsync(
            new UploadFactionImageCommand(id, dmUserId, file.OpenReadStream(), file.ContentType));

        if (!success) return NotFound();

        var faction = await getFactionDetailQuery.HandleAsync(id);
        return Ok(new { imageUrl = mapper.ToResponse(faction!).ImageUrl });
    }
}
