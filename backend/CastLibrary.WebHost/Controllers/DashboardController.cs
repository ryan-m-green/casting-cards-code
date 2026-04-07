using CastLibrary.Logic.Commands.Library;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Queries.Cast;
using CastLibrary.Logic.Queries.City;
using CastLibrary.Logic.Queries.Library;
using CastLibrary.Logic.Queries.Sublocation;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IO.Compression;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController(
    IGetCampaignLibraryQueryHandler getCampaignLibraryQuery,
    IGetCityLibraryQueryHandler getCityLibraryQuery,
    IGetSublocationLibraryQueryHandler getLocationLibraryQuery,
    IGetCastLibraryQueryHandler getCastLibraryQuery,
    IImportLibraryCommandHandler importLibraryCommand,
    IExportLibraryQueryHandler exportLibraryQuery,
    ICampaignWebMapper campaignMapper,
    IUserRetriever userRetriever) : ControllerBase
{

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var userId = userRetriever.GetUserId(User);
        var campaigns = await getCampaignLibraryQuery.HandleAsync(userId);
        var cities = await getCityLibraryQuery.HandleAsync(userId);
        var locations = await getLocationLibraryQuery.HandleAsync(userId);
        var casts = await getCastLibraryQuery.HandleAsync(userId);
        var active = campaigns.FirstOrDefault(c => c.Status == Shared.Enums.CampaignStatus.Active);

        var response = new DashboardStatsResponse
        {
            CampaignCount = campaigns.Count,
            CityCount = cities.Count,
            SublocationCount = locations.Count,
            CastCount = casts.Count,
            ActiveCampaign = active is null ? null : campaignMapper.ToListResponse(active),
        };

        return Ok(response);
    }

    [HttpGet("import-template")]
    public IActionResult GetImportTemplate()
    {
        var route = ControllerContext.ActionDescriptor.AttributeRouteInfo?.Template ?? "";
        var target = HttpContext.Request.Path.Value ?? "";
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "";

        var template = new LibraryBundle
        {
            Casts =
            [
                new CastCard
                {
                    Name = "Aldric Vane",
                    Pronouns = "he/him",
                    Race = "Human",
                    Role = "Merchant",
                    Age = "45",
                    Alignment = "Neutral Good",
                    Posture = "Slouched",
                    Speed = "Slow",
                    VoicePlacement = ["Low", "Raspy"],
                    Description = "Private DM notes about this Cast.",
                    PublicDescription = "What the players see and know.",
                    ImageFileName = "cast_aldric_vane.png",
                },
            ],
            Cities =
            [
                new CityCard
                {
                    Name = "Ironhaven",
                    Classification = "City",
                    Size = "Large",
                    Condition = "Weathered",
                    Geography = "Coastal",
                    Architecture = "Gothic",
                    Climate = "Temperate",
                    Religion = "The Old Gods",
                    Vibe = "Gritty",
                    Languages = "Common, Dwarvish",
                    Description = "A port city known for its iron trade.",
                    ImageFileName = "city_ironhaven.png",
                },
            ],
            Sublocations =
            [
                new SublocationCard
                {
                    Name = "The Rusty Flagon",
                    Description = "A dimly lit tavern on the docks.",
                    ImageFileName = "loc_rusty_flagon.png",
                    ShopItems =
                    [
                        new ShopItemCard { Name = "Ale", Price = "2cp", Description = "Warm and flat." },
                        new ShopItemCard { Name = "Stew", Price = "4cp", Description = "Mystery meat." },
                    ],
                },
            ],
        };

        var json    = JsonSerializer.Serialize(template, JsonOptions);
        var readme  = BuildTemplateReadme();
        var zipBytes = BuildTemplateZip(json, readme);

        return File(zipBytes, "application/zip", "library-import-template.zip");
    }

    [HttpPost("import")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Import([FromForm] IFormFile zipFile)
    {
        if (zipFile is null || zipFile.Length == 0)
            return BadRequest("No ZIP file provided.");

        LibraryBundle bundle;
        var imageStreams = new Dictionary<string, Stream>(StringComparer.OrdinalIgnoreCase);

        try
        {
            await using var zipStream = zipFile.OpenReadStream();
            using var ms = new MemoryStream();
            await zipStream.CopyToAsync(ms);
            ms.Position = 0;
            using var archive = new ZipArchive(ms, ZipArchiveMode.Read, leaveOpen: false);

            var jsonEntry = archive.GetEntry("library.json")
                ?? throw new InvalidOperationException("library.json not found in ZIP.");

            await using (var jsonStream = jsonEntry.Open())
            {
                bundle = await JsonSerializer.DeserializeAsync<LibraryBundle>(jsonStream, JsonOptions)
                         ?? throw new InvalidOperationException("library.json is empty or invalid.");
            }

            foreach (var entry in archive.Entries)
            {
                if (!entry.FullName.StartsWith("images/", StringComparison.OrdinalIgnoreCase)) continue;
                if (string.IsNullOrEmpty(entry.Name)) continue;

                var mems = new MemoryStream();
                await using (var entryStream = entry.Open())
                    await entryStream.CopyToAsync(mems);
                mems.Position = 0;
                imageStreams[entry.Name] = mems;
            }
        }
        catch (Exception ex)
        {
            return BadRequest($"Invalid ZIP: {ex.Message}");
        }

        var userId = userRetriever.GetUserId(User);
        var result = await importLibraryCommand.HandleAsync(new ImportLibraryCommand(bundle, imageStreams, userId));

        return Ok(result);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var userId = userRetriever.GetUserId(User);
        var package = await exportLibraryQuery.HandleAsync(userId);

        var json  = JsonSerializer.Serialize(package.Bundle, JsonOptions);
        var zipBytes = BuildZip(json, package.Images);
        var filename = $"library-export-{DateTime.UtcNow:yyyy-MM-dd}.zip";

        return File(zipBytes, "application/zip", filename);
    }

    private static byte[] BuildZip(string json, Dictionary<string, byte[]> images)
    {
        using var ms  = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            var jsonEntry = zip.CreateEntry("library.json", CompressionLevel.Optimal);
            using (var s = jsonEntry.Open())
                s.Write(Encoding.UTF8.GetBytes(json));

            foreach (var (filename, bytes) in images)
            {
                var imgEntry = zip.CreateEntry($"images/{filename}", CompressionLevel.Optimal);
                using var s  = imgEntry.Open();
                s.Write(bytes);
            }
        }
        return ms.ToArray();
    }

    private static byte[] BuildTemplateZip(string json, string readme)
    {
        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            var jsonEntry = zip.CreateEntry("library.json", CompressionLevel.Optimal);
            using (var s = jsonEntry.Open())
                s.Write(Encoding.UTF8.GetBytes(json));

            var readmeEntry = zip.CreateEntry("readme.txt", CompressionLevel.Optimal);
            using (var s = readmeEntry.Open())
                s.Write(Encoding.UTF8.GetBytes(readme));

            // Placeholder file so the images/ folder is visible in the ZIP
            var imgEntry = zip.CreateEntry("images/place_images_here.txt", CompressionLevel.Optimal);
            using (var s = imgEntry.Open())
                s.Write(Encoding.UTF8.GetBytes("Place your image files in this folder."));
        }
        return ms.ToArray();
    }

    private static string BuildTemplateReadme() =>
        """
        Cast LIBRARY — IMPORT PACKAGE README
        =====================================

        PACKAGE STRUCTURE
        -----------------
        library-import-template.zip
        ├── library.json        ← All Cast, City, and Sublocation data
        ├── images/             ← Place image files here
        │   ├── cast_aldric_vane.png
        │   ├── city_ironhaven.png
        │   └── loc_rusty_flagon.png
        └── readme.txt          ← This file

        HOW TO LINK IMAGES TO CARDS
        ----------------------------
        Each card object in library.json has an optional "imageFileName" field.
        Set this to the filename of the image you place in the images/ folder.

        Example — Cast card in library.json:
          {
            "name": "Aldric Vane",
            "imageFileName": "cast_aldric_vane.png"   <-- must match the image filename
          }

        The corresponding image file must be uploaded alongside the JSON bundle
        when importing. Images can be JPG, PNG, or WebP, but will be converted to png.

        If "imageFileName" is null or omitted, the card is created without an image.
        If an image file is named in the JSON but not included in the upload, the
        card is still created — the missing image is silently ignored.
        If an image cannot be converted (corrupted file, unsupported format), the
        card is still created and the failure is listed in the import summary.

        DUPLICATE NAMES
        ---------------
        If a card name already exists in your library, the imported card will be
        automatically renamed with a numeric suffix:
          "Aldric Vane"   →  already exists  →  saved as "Aldric Vane - 2"
          "Aldric Vane"   →  both exist      →  saved as "Aldric Vane - 3"

        EXPORT FORMAT
        -------------
        The Export package produced by the DM Dashboard is identical to this
        import format. You can export, edit library.json, and re-import.

        IMAGE NAMING CONVENTIONS (recommended)
        ----------------------------------------
          Casts:      cast_<name>.png       e.g. cast_aldric_vane.png
          Cities:    city_<name>.png      e.g. city_ironhaven.png
          Sublocations: loc_<name>.png       e.g. loc_rusty_flagon.png
        """;
}
