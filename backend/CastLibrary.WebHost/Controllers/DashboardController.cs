using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Queries.Cast;
using CastLibrary.Logic.Queries.Faction;
using CastLibrary.Logic.Queries.Location;
using CastLibrary.Logic.Queries.Soundtrack;
using CastLibrary.Logic.Queries.Sublocation;
using CastLibrary.Shared.Enums;
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
    IGetPlayerCampaignLibraryQueryHandler getPlayerLibraryQuery,
    IGetLocationLibraryQueryHandler getLocationLibraryQuery,
    IGetSublocationLibraryQueryHandler getSublocationLibraryQuery,
    IGetCastLibraryQueryHandler getCastLibraryQuery,
    IGetFactionLibraryQueryHandler getFactionLibraryQuery,
    IGetSoundtracksQueryHandler getSoundtracksQuery,
    ICampaignWebMapper campaignMapper,
    IUserRetriever userRetriever) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var userId = userRetriever.GetUserId(User);
        var campaigns = await getCampaignLibraryQuery.HandleAsync(userId);
        var locations = await getLocationLibraryQuery.HandleAsync(userId);
        var sublocations = await getSublocationLibraryQuery.HandleAsync(userId);
        var casts = await getCastLibraryQuery.HandleAsync(userId);
        var factions = await getFactionLibraryQuery.HandleAsync(userId);
        var soundtracks = await getSoundtracksQuery.HandleAsync(new GetSoundtracksQuery(userId));
        var active = campaigns.Where(o => o.Status == CampaignStatus.Active && o.LastAccessedAt.HasValue)
            .OrderByDescending(o => o.LastAccessedAt).FirstOrDefault();
        
        if (active == null)
        {
            active = campaigns.Where(o => o.Status == CampaignStatus.Active).OrderByDescending(o => o.CreatedAt).FirstOrDefault();
        }

        // The campaign this DM plays in — joined through another DM's invite code — that saw the
        // most recent activity. `GetAllByPlayerAsync` returns only the caller's `campaign_players`
        // rows, and `last_accessed_at` is stamped whenever the campaign is opened, so ordering by
        // it (falling back to creation) puts the freshest table they play at on top.
        var joinedCampaigns = await getPlayerLibraryQuery.HandleAsync(userId);
        var lastPlayed = joinedCampaigns
            .OrderByDescending(o => o.LastAccessedAt ?? o.CreatedAt)
            .FirstOrDefault();

        var response = new DashboardStatsResponse
        {
            CampaignCount = campaigns.Count,
            LocationCount = locations.Count,
            SublocationCount = sublocations.Count,
            CastCount = casts.Count,
            FactionCount = factions.Count,
            SoundtrackCount = soundtracks.Count,
            ActiveCampaign = active is null ? null : campaignMapper.ToListResponse(active),
            LastPlayedCampaign = lastPlayed is null ? null : campaignMapper.ToListResponse(lastPlayed),
        };

        return Ok(response);
    }

    // [HttpGet("import-template")]
    // public async Task<IActionResult> GetImportTemplate()
    // {
    //     var zipBytes = await getImportTemplateQueryHandler.HandleAsync();

    //     return File(zipBytes, "application/zip", "library-import-template.zip");
    // }

    // [HttpPost("import")]
    // [Consumes("multipart/form-data")]
    // [DisableRequestSizeLimit]
    // [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue)]
    // public async Task<IActionResult> Import([FromForm] IFormFile zipFile)
    // {
    //     if (zipFile is null || zipFile.Length == 0)
    //         return BadRequest("No ZIP file provided.");
    //     try
    //     {
    //         var archive = await zipArchiveMapper.MapAsync(zipFile);

    //         var result = await zipLibraryImportCommandHandler
    //             .HandleAsync(new ZipLibraryImportCommand(userRetriever.GetUserId(User), archive));
    //         return Ok(result);
    //     }
    //     catch (Exception ex)
    //     {
    //         return BadRequest($"Invalid ZIP: {ex.Message}");
    //     }        
    // }

    // [HttpGet("export")]
    // public async Task<IActionResult> Export()
    // {
    //     var userId = userRetriever.GetUserId(User);
    //     var zipBytes = await exportLibraryQuery.HandleAsync(userId);

    //     var filename = $"library-export-{DateTime.UtcNow:yyyy-MM-dd}.zip";

    //     return File(zipBytes, "application/zip", filename);
    // }
}
