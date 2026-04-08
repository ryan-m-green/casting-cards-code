using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Commands.Library;

public interface IImportLibraryCommandHandler
{
    Task<ImportLibraryResponse> HandleAsync(ImportLibraryCommand command);
}

public class ImportLibraryCommandHandler(
    ICastReadRepository castReadRepository,
    ICastInsertRepository castInsertRepository,
    ILocationReadRepository locationRepository,
    ILocationInsertRepository locationInsertRepository,
    ISublocationReadRepository sublocationReadRepository,
    ISublocationInsertRepository sublocationInsertRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator) : IImportLibraryCommandHandler
{
    //TODO: Rewrite this file as it breaks single responsibility principle and is hard to maintain.
    public async Task<ImportLibraryResponse> HandleAsync(ImportLibraryCommand command)
    {
        var response = new ImportLibraryResponse();

        var existingCastNames   = (await castReadRepository.GetAllByDmAsync(command.DmUserId))
                                    .Select(n => n.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var existingLocationNames  = (await locationRepository.GetAllByDmAsync(command.DmUserId))
                                    .Select(c => c.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var existingLocNames   = (await sublocationReadRepository.GetAllByDmAsync(command.DmUserId))
                                    .Select(l => l.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var insertedCastNames  = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var insertedLocationNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var insertedLocNames  = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var card in command.Bundle.Casts)
        {
            try
            {
                var name   = ResolveName(card.Name, existingCastNames, insertedCastNames);
                var domain = new CastDomain
                {
                    Id = Guid.NewGuid(), DmUserId = command.DmUserId, Name = name,
                    Pronouns = card.Pronouns, Race = card.Race, Role = card.Role,
                    Age = card.Age, Alignment = card.Alignment, Posture = card.Posture,
                    Speed = card.Speed, VoicePlacement = card.VoicePlacement,
                    Description = card.Description, PublicDescription = card.PublicDescription,
                    CreatedAt = DateTime.UtcNow,
                };

                await castInsertRepository.InsertAsync(domain);
                insertedCastNames.Add(name);
                response.CastsImported++;

                await TrySaveImageAsync(card.ImageFileName, command.Images, domain.Id, command.DmUserId,
                    EntityType.Cast, name, "Cast", response.Failures);
            }
            catch (Exception ex)
            {
                response.Failures.Add(new ImportFailure
                {
                    CardType = "Cast", Name = card.Name,
                    Reason = $"Failed to import: {ex.Message}"
                });
            }
        }

        foreach (var card in command.Bundle.Locations)
        {
            try
            {
                var name   = ResolveName(card.Name, existingLocationNames, insertedLocationNames);
                var domain = new LocationDomain
                {
                    Id = Guid.NewGuid(), DmUserId = command.DmUserId, Name = name,
                    Classification = card.Classification, Size = card.Size,
                    Condition = card.Condition, Geography = card.Geography,
                    Architecture = card.Architecture, Climate = card.Climate,
                    Religion = card.Religion, Vibe = card.Vibe, Languages = card.Languages,
                    Description = card.Description, CreatedAt = DateTime.UtcNow,
                };

                await locationInsertRepository.InsertAsync(domain);
                insertedLocationNames.Add(name);
                response.LocationsImported++;

                await TrySaveImageAsync(card.ImageFileName, command.Images, domain.Id, command.DmUserId,
                    EntityType.Location, name, "Location", response.Failures);
            }
            catch (Exception ex)
            {
                response.Failures.Add(new ImportFailure
                {
                    CardType = "Location", Name = card.Name,
                    Reason = $"Failed to import: {ex.Message}"
                });
            }
        }

        foreach (var card in command.Bundle.Sublocations)
        {
            try
            {
                var name   = ResolveName(card.Name, existingLocNames, insertedLocNames);
                var domain = new SublocationDomain
                {
                    Id = Guid.NewGuid(), DmUserId = command.DmUserId, Name = name,
                    Description = card.Description, CreatedAt = DateTime.UtcNow,
                    ShopItems = card.ShopItems.Select((item, i) => new ShopItemDomain
                    {
                        Id = Guid.NewGuid(), Name = item.Name,
                        Price = item.Price, Description = item.Description, SortOrder = i,
                    }).ToList(),
                };

                await sublocationInsertRepository.InsertAsync(domain);
                insertedLocNames.Add(name);
                response.SublocationsImported++;

                await TrySaveImageAsync(card.ImageFileName, command.Images, domain.Id, command.DmUserId,
                    EntityType.Sublocation, name, "Sublocation", response.Failures);
            }
            catch (Exception ex)
            {
                response.Failures.Add(new ImportFailure
                {
                    CardType = "Sublocation", Name = card.Name,
                    Reason = $"Failed to import: {ex.Message}"
                });
            }
        }

        return response;
    }

    private async Task TrySaveImageAsync(string? imageFileName, Dictionary<string, Stream> images,
        Guid entityId, Guid dmUserId, EntityType entityType, string cardName, string cardType,
        List<ImportFailure> failures)
    {
        if (string.IsNullOrEmpty(imageFileName) || !images.TryGetValue(imageFileName, out var stream))
            return;

        var key = imageKeyCreator.Create(dmUserId, entityId, entityType);
        try
        {
            await imageStorage.SaveAsync(key, stream, "image/png");
        }
        catch (Exception ex)
        {
            failures.Add(new ImportFailure
            {
                CardType = cardType, Name = cardName,
                Reason = $"Failed to convert image '{imageFileName}': {ex.Message}"
            });
        }
    }

    private static string ResolveName(string raw, HashSet<string> existing, HashSet<string> inserted)
    {
        var allKnown = new HashSet<string>(existing, StringComparer.OrdinalIgnoreCase);
        allKnown.UnionWith(inserted);

        if (!allKnown.Contains(raw)) return raw;

        var suffix = 2;
        while (allKnown.Contains($"{raw} - {suffix}")) suffix++;
        return $"{raw} - {suffix}";
    }
}

public class ImportLibraryCommand
{
    public ImportLibraryCommand(LibraryBundle bundle, Dictionary<string, Stream> images, Guid dmUserId)
    {
        Bundle = bundle;
        Images = images;
        DmUserId = dmUserId;
    }

    public LibraryBundle Bundle { get; }
    public Dictionary<string, Stream> Images { get; }
    public Guid DmUserId { get; }
}


