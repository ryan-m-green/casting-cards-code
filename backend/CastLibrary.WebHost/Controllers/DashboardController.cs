using CastLibrary.Logic.Commands.Library;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Queries.Cast;
using CastLibrary.Logic.Queries.Library;
using CastLibrary.Logic.Queries.Location;
using CastLibrary.Logic.Queries.Sublocation;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController(
    IGetCampaignLibraryQueryHandler getCampaignLibraryQuery,
    IGetLocationLibraryQueryHandler getLocationLibraryQuery,
    IGetSublocationLibraryQueryHandler getSublocationLibraryQuery,
    IGetCastLibraryQueryHandler getCastLibraryQuery, 
    IExportLibraryQueryHandler exportLibraryQuery,
    ICampaignWebMapper campaignMapper,
    IUserRetriever userRetriever,
    IGetImportTemplateQueryHandler getImportTemplateQueryHandler,
    IZipArchiveMapper zipArchiveMapper,
    IZipLibraryImportCommandHandler zipLibraryImportCommandHandler) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var userId = userRetriever.GetUserId(User);
        var campaigns = await getCampaignLibraryQuery.HandleAsync(userId);
        var locations = await getLocationLibraryQuery.HandleAsync(userId);
        var sublocations = await getSublocationLibraryQuery.HandleAsync(userId);
        var casts = await getCastLibraryQuery.HandleAsync(userId);
        var active = campaigns.FirstOrDefault(c => c.Status == Shared.Enums.CampaignStatus.Active);

        var response = new DashboardStatsResponse
        {
            CampaignCount = campaigns.Count,
            LocationCount = locations.Count,
            SublocationCount = sublocations.Count,
            CastCount = casts.Count,
            ActiveCampaign = active is null ? null : campaignMapper.ToListResponse(active),
        };

        return Ok(response);
    }

    [HttpGet("import-template")]
    public async Task<IActionResult> GetImportTemplate()
    {
        var zipBytes = await getImportTemplateQueryHandler.HandleAsync();

        return File(zipBytes, "application/zip", "library-import-template.zip");
    }

    [HttpPost("import")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Import([FromForm] IFormFile zipFile)
    {
        if (zipFile is null || zipFile.Length == 0)
            return BadRequest("No ZIP file provided.");
        try
        {
            var archive = await zipArchiveMapper.MapAsync(zipFile);

            var result = await zipLibraryImportCommandHandler
                .HandleAsync(new ZipLibraryImportCommand(userRetriever.GetUserId(User), archive));
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest($"Invalid ZIP: {ex.Message}");
        }        
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var userId = userRetriever.GetUserId(User);
        var zipBytes = await exportLibraryQuery.HandleAsync(userId);

        var filename = $"library-export-{DateTime.UtcNow:yyyy-MM-dd}.zip";

        return File(zipBytes, "application/zip", filename);
    }
}