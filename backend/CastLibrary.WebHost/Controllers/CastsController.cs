using CastLibrary.Logic.Commands.Cast;
using CastLibrary.Logic.Queries.Cast;
using CastLibrary.Logic.Services;
using CastLibrary.Logic.Validators;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Exceptions;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/cast")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CastController(
    IGetCastLibraryQueryHandler getCastLibraryQuery,
    IGetCastDetailQueryHandler getCastDetailQuery,
    ICreateCastCommandHandler createCastCommand,
    IUpdateCastCommandHandler updateCastCommand,
    IUploadCastImageCommandHandler uploadCastImageCommand,
    IDeleteCastCommandHandler deleteCastCommand,
    ICastWebMapper mapper, 
    IUserRetriever userRetriever,
    IFileValidationService fileValidationService,
    ILogger<CastController> logger) : ControllerBase
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
        logger.LogInformation("POST /api/cast - Request received");
        
        // Log XSRF token headers for debugging
        var xsrfToken = Request.Headers["X-XSRF-TOKEN"].FirstOrDefault();
        var cookieToken = Request.Cookies["XSRF-TOKEN"];
        logger.LogInformation("POST /api/cast - XSRF headers - Header: {XsrfToken}, Cookie: {CookieToken}", 
            xsrfToken ?? "NULL", cookieToken ?? "NULL");
        
        // Log request body details
        if (request == null)
        {
            logger.LogError("POST /api/cast - Request body is null");
            return BadRequest("Request body cannot be null");
        }
        
        logger.LogInformation("POST /api/cast - Request payload: Name='{Name}', Race='{Race}', Role='{Role}', Age='{Age}', Alignment='{Alignment}'", 
            request.Name, request.Race, request.Role, request.Age, request.Alignment);

        var validator = new CreateCastRequestValidator();
        var validationResult = validator.Validate(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            logger.LogError("POST /api/cast - Validation failed. Errors: {Errors}", string.Join(", ", errors));
            logger.LogError("POST /api/cast - Request payload that failed validation: Name='{Name}', Race='{Race}', Role='{Role}', Age='{Age}', Alignment='{Alignment}'", 
                request.Name, request.Race, request.Role, request.Age, request.Alignment);
            return BadRequest(errors);
        }
        
        // Log user retrieval
        ClaimsPrincipal user = User;
        if (user == null)
        {
            logger.LogError("POST /api/cast - User principal is null");
            return Unauthorized("User not authenticated");
        }
        
        logger.LogInformation("POST /api/cast - User authenticated, retrieving DM user ID");
        
        try
        {
            var dmUserId = userRetriever.GetDmUserId(User);
            logger.LogInformation("POST /api/cast - DM User ID retrieved: {UserId}", dmUserId);
            
            if (dmUserId == Guid.Empty)
            {
                logger.LogError("POST /api/cast - DM User ID is empty");
                return BadRequest("Invalid user ID");
            }
            
            logger.LogInformation("POST /api/cast - Creating cast command for user {UserId}", dmUserId);
            var cast = await createCastCommand.HandleAsync(new CreateCastCommand(dmUserId, request));
            
            if (cast == null)
            {
                logger.LogError("POST /api/cast - CreateCastCommand returned null");
                return StatusCode(500, "Failed to create cast");
            }
            
            logger.LogInformation("POST /api/cast - Cast created successfully with ID: {CastId}", cast.Id);
            var response = mapper.ToResponse(cast);

            return CreatedAtAction(nameof(GetById), new { id = cast.Id }, response);
        }
        catch (LimitExceededException ex)
        {
            logger.LogWarning("POST /api/cast - Cast creation limit exceeded for user: {Message}", ex.Message);
            return StatusCode(403, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "POST /api/cast - Unexpected error during cast creation");
            return StatusCode(500, "Internal server error during cast creation");
        }
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
        var validationResult = await fileValidationService.ValidateFileAsync(file, 20 * 1024 * 1024, 
            new[] { "image/jpeg", "image/png", "image/webp" });

        if (!validationResult.IsValid)
            return BadRequest(validationResult.ErrorMessage);
        var dmUserId = userRetriever.GetDmUserId(User);
        var (success, imageUrl) = await uploadCastImageCommand.HandleAsync(
            new UploadCastImageCommand(id, dmUserId, file.OpenReadStream(), validationResult.DetectedContentType));

        if (!success)
        {
            return NotFound();
        }

        return Ok(new { imageUrl });
    }
}
