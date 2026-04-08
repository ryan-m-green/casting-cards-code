using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using System.Text.RegularExpressions;

namespace CastLibrary.Logic.Queries.Library;

public interface IExportLibraryQueryHandler
{
    Task<LibraryExportPackage> HandleAsync(Guid dmUserId);
}

public class ExportLibraryQueryHandler(
    ICastReadRepository castReadRepository,
    ILocationReadRepository locationReadRepository,
    ISublocationReadRepository sublocationReadRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator) : IExportLibraryQueryHandler
{
    public async Task<LibraryExportPackage> HandleAsync(Guid dmUserId)
    {
        var casts = await castReadRepository.GetAllByDmAsync(dmUserId);
        var locations = await locationReadRepository.GetAllByDmAsync(dmUserId);
        var sublocations = await sublocationReadRepository.GetAllByDmAsync(dmUserId);

        var package = new LibraryExportPackage();
        var usedFilenames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var cast in casts)
        {
            var imageFileName = await TryReadImageAsync(
                imageKeyCreator.Create(dmUserId, cast.Id, EntityType.Cast),
                "cast", cast.Name, usedFilenames, package.Images);

            package.Bundle.Casts.Add(new CastCard
            {
                Name = cast.Name,
                Pronouns = cast.Pronouns,
                Race = cast.Race,
                Role = cast.Role,
                Age = cast.Age,
                Alignment = cast.Alignment,
                Posture = cast.Posture,
                Speed = cast.Speed,
                VoicePlacement = cast.VoicePlacement,
                Description = cast.Description,
                PublicDescription = cast.PublicDescription,
                ImageFileName = imageFileName,
            });
        }

        foreach (var Location in locations)
        {
            var imageFileName = await TryReadImageAsync(
                imageKeyCreator.Create(dmUserId, Location.Id, EntityType.Location),
                "Location", Location.Name, usedFilenames, package.Images);

            package.Bundle.Locations.Add(new LocationCard
            {
                Name = Location.Name,
                Classification = Location.Classification,
                Size = Location.Size,
                Condition = Location.Condition,
                Geography = Location.Geography,
                Architecture = Location.Architecture,
                Climate = Location.Climate,
                Religion = Location.Religion,
                Vibe = Location.Vibe,
                Languages = Location.Languages,
                Description = Location.Description,
                ImageFileName = imageFileName,
            });
        }

        foreach (var sublocation in sublocations)
        {
            var imageFileName = await TryReadImageAsync(
                imageKeyCreator.Create(dmUserId, sublocation.Id, EntityType.Sublocation),
                "subloc", sublocation.Name, usedFilenames, package.Images);

            package.Bundle.Sublocations.Add(new SublocationCard
            {
                Name = sublocation.Name,
                Description = sublocation.Description,
                ImageFileName = imageFileName,
                ShopItems = sublocation.ShopItems.Select(s => new ShopItemCard
                {
                    Name = s.Name,
                    Price = s.Price,
                    Description = s.Description,
                }).ToList(),
            });
        }

        return package;
    }

    private async Task<string> TryReadImageAsync(string key, string prefix, string entityName,
        HashSet<string> usedFilenames, Dictionary<string, byte[]> images)
    {
        var bytes = await imageStorage.ReadAsync(key);
        if (bytes is null) return null;

        var filename = BuildUniqueFilename(prefix, entityName, usedFilenames);
        usedFilenames.Add(filename);
        images[filename] = bytes;
        return filename;
    }

    private static string BuildUniqueFilename(string prefix, string name, HashSet<string> used)
    {
        var slug = Regex.Replace(name.ToLowerInvariant().Replace(" ", "_"), @"[^a-z0-9_]", "");
        if (string.IsNullOrEmpty(slug)) slug = "unnamed";

        var candidate = $"{prefix}_{slug}.png";
        if (!used.Contains(candidate)) return candidate;

        var i = 2;
        while (used.Contains($"{prefix}_{slug}_{i}.png")) i++;
        return $"{prefix}_{slug}_{i}.png";
    }
}



