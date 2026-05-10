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

        var existingCastNames = (await castReadRepository.GetAllByDmAsync(command.DmUserId))
                                    .Select(n => n.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var existingLocationNames = (await locationRepository.GetAllByDmAsync(command.DmUserId))
                                    .Select(c => c.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var existingLocNames = (await sublocationReadRepository.GetAllByDmAsync(command.DmUserId))
                                    .Select(l => l.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var insertedCastNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var insertedLocationNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var insertedLocNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var card in command.Bundle.Casts)
        {
            if (existingCastNames.Contains(card.Name) || insertedCastNames.Contains(card.Name))
            {
                response.CastsSkipped++;
                continue;
            }
            try
            {
                var domain = new CastDomain
                {
                    Id = Guid.NewGuid(),
                    DmUserId = command.DmUserId,
                    Name = card.Name,
                    Pronouns = card.Pronouns,
                    Race = card.Race,
                    Role = card.Role,
                    Age = card.Age,
                    Alignment = card.Alignment,
                    Posture = card.Posture,
                    Speed = card.Speed,
                    VoicePlacement = card.VoicePlacement,
                    Description = card.Description,
                    PublicDescription = card.PublicDescription,
                    CreatedAt = DateTime.UtcNow,
                };

                await castInsertRepository.InsertAsync(domain);
                insertedCastNames.Add(card.Name);
                response.CastsImported++;

                await TrySaveImageAsync(card.ImageFileName, command.Images, domain.Id, command.DmUserId,
                    EntityType.Cast, card.Name, "Cast", response.Failures);
            }
            catch (Exception ex)
            {
                response.Failures.Add(new ImportFailure
                {
                    CardType = "Cast",
                    Name = card.Name,
                    Reason = $"Failed to import: {ex.Message}"
                });
            }
        }

        foreach (var card in command.Bundle.Locations)
        {
            if (existingLocationNames.Contains(card.Name) || insertedLocationNames.Contains(card.Name))
            {
                response.LocationsSkipped++;
                continue;
            }
            try
            {
                var domain = new LocationDomain
                {
                    Id = Guid.NewGuid(),
                    DmUserId = command.DmUserId,
                    Name = card.Name,
                    Classification = card.Classification,
                    Size = card.Size,
                    Condition = card.Condition,
                    Geography = card.Geography,
                    Architecture = card.Architecture,
                    Climate = card.Climate,
                    Religion = card.Religion,
                    Vibe = card.Vibe,
                    Languages = card.Languages,
                    Description = card.Description,
                    CreatedAt = DateTime.UtcNow
                };

                await locationInsertRepository.InsertAsync(domain);
                insertedLocationNames.Add(card.Name);
                response.LocationsImported++;

                await TrySaveImageAsync(card.ImageFileName, command.Images, domain.Id, command.DmUserId,
                    EntityType.Location, card.Name, "Location", response.Failures);
            }
            catch (Exception ex)
            {
                response.Failures.Add(new ImportFailure
                {
                    CardType = "Location",
                    Name = card.Name,
                    Reason = $"Failed to import: {ex.Message}"
                });
            }
        }

        foreach (var card in command.Bundle.Sublocations)
        {
            if (existingLocNames.Contains(card.Name) || insertedLocNames.Contains(card.Name))
            {
                response.SublocationsSkipped++;
                continue;
            }
            try
            {
                var domain = new SublocationDomain
                {
                    Id = Guid.NewGuid(),
                    DmUserId = command.DmUserId,
                    Name = card.Name,
                    Description = card.Description,
                    CreatedAt = DateTime.UtcNow,
                    ShopItems = card.ShopItems.Select((item, i) => new ShopItemDomain
                    {
                        Id = Guid.NewGuid(),
                        Name = item.Name,
                        PriceAmount = item.PriceAmount,
                        PriceCurrencyType = item.PriceCurrencyType,
                        Description = item.Description,
                        SortOrder = i,
                    }).ToList(),
                };

                await sublocationInsertRepository.InsertAsync(domain);
                insertedLocNames.Add(card.Name);
                response.SublocationsImported++;

                await TrySaveImageAsync(card.ImageFileName, command.Images, domain.Id, command.DmUserId,
                    EntityType.Sublocation, card.Name, "Sublocation", response.Failures);
            }
            catch (Exception ex)
            {
                response.Failures.Add(new ImportFailure
                {
                    CardType = "Sublocation",
                    Name = card.Name,
                    Reason = $"Failed to import: {ex.Message}"
                });
            }
        }

        return response;
    }

    private async Task TrySaveImageAsync(string imageFileName, Dictionary<string, Stream> images,
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
                CardType = cardType,
                Name = cardName,
                Reason = $"Failed to convert image '{imageFileName}': {ex.Message}"
            });
        }
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


