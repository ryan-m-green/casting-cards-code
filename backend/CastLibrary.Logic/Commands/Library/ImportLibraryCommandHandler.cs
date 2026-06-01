using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

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
    IFactionReadRepository factionReadRepository,
    IFactionInsertRepository factionInsertRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator,
    ILogger<IImportLibraryCommandHandler> logger) : IImportLibraryCommandHandler
{
    public async Task<ImportLibraryResponse> HandleAsync(ImportLibraryCommand command)
    {
        var existingCastNames = (await castReadRepository.GetAllByDmAsync(command.DmUserId))
                                    .Select(n => n.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var existingLocationNames = (await locationRepository.GetAllByDmAsync(command.DmUserId))
                                    .Select(c => c.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var existingSublocationNames = (await sublocationReadRepository.GetAllByDmAsync(command.DmUserId))
                                    .Select(l => l.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var existingFactionNames = (await factionReadRepository.GetAllByDmAsync(command.DmUserId))
                                    .Select(l => l.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var castDuplicateCardManager = new DuplicateCardManager(existingCastNames);
        var sublocationDuplicateCardManager = new DuplicateCardManager(existingSublocationNames);
        var locationDuplicateCardManager = new DuplicateCardManager(existingLocationNames);
        var factionDuplicateCardManager = new DuplicateCardManager(existingFactionNames);

        var concurrentImages = new ConcurrentDictionary<string, Stream>(command.Images);

        var castTask = ImportCastCards(command.DmUserId, concurrentImages, castDuplicateCardManager, command.Bundle.Casts);
        var sublocationTask = ImportSublocationCards(command.DmUserId, concurrentImages, sublocationDuplicateCardManager, command.Bundle.Sublocations);
        var locationTask = ImportLocationCards(command.DmUserId, concurrentImages, locationDuplicateCardManager, command.Bundle.Locations);
        var factionTask = ImportFactionCards(command.DmUserId, factionDuplicateCardManager, command.Bundle.Factions);

        var taskList = new List<Task<ImportRecord>>() { castTask, sublocationTask, locationTask, factionTask };

        await Task.WhenAll(taskList);

        var response = new ImportLibraryResponse
        {
            CastsImported = castTask.Result.NumberImported,
            CastsSkipped = castTask.Result.NumberSkipped,
            SublocationsImported = sublocationTask.Result.NumberImported,
            SublocationsSkipped = sublocationTask.Result.NumberSkipped,
            LocationsImported = locationTask.Result.NumberImported,
            LocationsSkipped = locationTask.Result.NumberSkipped,
            FactionsImported = factionTask.Result.NumberImported,
            FactionsSkipped = factionTask.Result.NumberSkipped,
            Failures = castTask.Result.Failures
                        .Concat(sublocationTask.Result.Failures)
                        .Concat(locationTask.Result.Failures)
                        .ToList()
        };

        return response;
    }

    private async Task<ImportRecord> ImportFactionCards(
        Guid dmUserId,
        DuplicateCardManager duplicateCardManager,
        List<FactionCard> factions)
    {
        var failures = new ConcurrentBag<ImportFailure>();
        var skippedCount = 0;
        var importedCount = 0;

        await Parallel.ForEachAsync(factions, new ParallelOptions { MaxDegreeOfParallelism = 4 }, async (card, _) =>
        {
            if (duplicateCardManager.IsDuplicate(card.Name))
            {
                Interlocked.Increment(ref skippedCount);
                return;
            }
            try
            {
                var domain = new FactionDomain
                {
                    FactionId = Guid.NewGuid(),
                    Description = card.Description,
                    Hidden = card.Hidden,
                    Influence = card.Influence,
                    Name = card.Name,
                    Perception = card.Perception,
                    Type = card.FactionType,
                    DmNotes = string.Empty,
                    DmUserId = dmUserId,
                    ImageUrl = string.Empty,
                    SymbolPath = card.SymbolPath,
                    CreatedAt = DateTime.UtcNow
                };
                await factionInsertRepository.InsertAsync(domain);
                if (!duplicateCardManager.TryRegisterCard(card.Name))
                {
                    throw new Exception("Duplicate card detected during registration");
                }
                Interlocked.Increment(ref importedCount);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, $"Failed to import sublocation card '{card.Name}': {ex.Message}");
                failures.Add(new ImportFailure
                {
                    CardType = "Sublocation",
                    Name = card.Name,
                    Reason = $"Failed to import"
                });
                
            }
        });
        var response = new ImportRecord()
        {
            NumberImported = importedCount,
            NumberSkipped = skippedCount,
            Failures = failures.ToList()
        };

        return response;
    }

    private async Task<ImportRecord> ImportSublocationCards(
        Guid dmUserId,
        ConcurrentDictionary<string, Stream> images,
        DuplicateCardManager duplicateCardManager,
        List<SublocationCard> sublocations)
    {

        var failures = new ConcurrentBag<ImportFailure>();
        var skippedCount = 0;
        var importedCount = 0;

        await Parallel.ForEachAsync(sublocations, new ParallelOptions { MaxDegreeOfParallelism = 4 }, async (card, _) =>
        {
            if (duplicateCardManager.IsDuplicate(card.Name))
            {
                Interlocked.Increment(ref skippedCount);
                return;
            }
            try
            {
                var domain = new SublocationDomain
                {
                    Id = Guid.NewGuid(),
                    DmUserId = dmUserId,
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
                if (!duplicateCardManager.TryRegisterCard(card.Name))
                {
                    throw new Exception("Duplicate card detected during registration");
                }
                Interlocked.Increment(ref importedCount);

                await TrySaveImageAsync(card.ImageFileName, images, domain.Id, dmUserId,
                    EntityType.Sublocation, card.Name, "Sublocation", failures);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, $"Failed to import sublocation card '{card.Name}': {ex.Message}");
                failures.Add(new ImportFailure
                {
                    CardType = "Sublocation",
                    Name = card.Name,
                    Reason = $"Failed to import"
                });
            }
        });

        var response = new ImportRecord()
        {
            NumberImported = importedCount,
            NumberSkipped = skippedCount,
            Failures = failures.ToList()
        };

        return response;
    }

    private async Task<ImportRecord> ImportLocationCards(
        Guid dmUserId,
        ConcurrentDictionary<string, Stream> images,
        DuplicateCardManager duplicateCardManager,
        List<LocationCard> locations)
    {
        var failures = new ConcurrentBag<ImportFailure>();
        var skippedCount = 0;
        var importedCount = 0;

        await Parallel.ForEachAsync(locations, new ParallelOptions { MaxDegreeOfParallelism = 4 }, async (card, _) =>
        {
            if (duplicateCardManager.IsDuplicate(card.Name))
            {
                Interlocked.Increment(ref skippedCount);
                return;
            }
            try
            {
                var domain = new LocationDomain
                {
                    Id = Guid.NewGuid(),
                    DmUserId = dmUserId,
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
                if (!duplicateCardManager.TryRegisterCard(card.Name))
                {
                    throw new Exception("Duplicate card detected during registration");
                }
                Interlocked.Increment(ref importedCount);

                await TrySaveImageAsync(card.ImageFileName, images, domain.Id, dmUserId,
                    EntityType.Location, card.Name, "Location", failures);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, $"Failed to import location card '{card.Name}': {ex.Message}");
                failures.Add(new ImportFailure
                {
                    CardType = "Location",
                    Name = card.Name,
                    Reason = $"Failed to import"
                });
            }
        });

        var response = new ImportRecord()
        {
            NumberImported = importedCount,
            NumberSkipped = skippedCount,
            Failures = failures.ToList()
        };

        return response;
    }

    private async Task<ImportRecord> ImportCastCards(
        Guid dmUserId,
        ConcurrentDictionary<string, Stream> images,
        DuplicateCardManager duplicateCardManager,
        List<CastCard> casts)
    {
        var failures = new ConcurrentBag<ImportFailure>();
        var skippedCount = 0;
        var importedCount = 0;

        await Parallel.ForEachAsync(casts, new ParallelOptions { MaxDegreeOfParallelism = 4 }, async (card, _) =>
        {
            if (duplicateCardManager.IsDuplicate(card.Name))
            {
                Interlocked.Increment(ref skippedCount);
                return;
            }
            try
            {
                var domain = new CastDomain
                {
                    Id = Guid.NewGuid(),
                    DmUserId = dmUserId,
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

                if (!duplicateCardManager.TryRegisterCard(card.Name))
                {
                    throw new Exception("Duplicate card detected during registration");
                }

                Interlocked.Increment(ref importedCount);

                await TrySaveImageAsync(card.ImageFileName, images, domain.Id, dmUserId,
                    EntityType.Cast, card.Name, "Cast", failures);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, $"Failed to import cast card '{card.Name}': {ex.Message}");
                failures.Add(new ImportFailure
                {
                    CardType = "Cast",
                    Name = card.Name,
                    Reason = $"Failed to import"
                });
            }
        });

        var response = new ImportRecord()
        {
            NumberImported = importedCount,
            NumberSkipped = skippedCount,
            Failures = failures.ToList()
        };

        return response;
    }

    private async Task TrySaveImageAsync(string imageFileName, ConcurrentDictionary<string, Stream> images,
        Guid entityId, Guid dmUserId, EntityType entityType, string cardName, string cardType,
        ConcurrentBag<ImportFailure> failures)
    {
        if (string.IsNullOrEmpty(imageFileName) || !images.TryGetValue(imageFileName, out var stream))
            return;

        var key = imageKeyCreator.Create(dmUserId, Guid.Empty, entityId, entityType);
        try
        {
            await imageStorage.SaveAsync(key, stream, "image/png");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"Failed to save image for {cardType} card '{cardName}' with key '{key}': {ex.Message}");
            failures.Add(new ImportFailure
            {
                CardType = cardType,
                Name = cardName,
                Reason = $"Failed to convert image '{imageFileName}'"
            });
        }
    }

    internal class DuplicateCardManager
    {
        private readonly ConcurrentDictionary<string, byte> _existingCardNames;
        private readonly ConcurrentDictionary<string, byte> _incomingCardNames;

        public DuplicateCardManager(HashSet<string> existingCardNames)
        {
            var dictionaryConversion = existingCardNames.ToDictionary(name => name, _ => (byte)0, StringComparer.OrdinalIgnoreCase);
           
            _existingCardNames = new ConcurrentDictionary<string, byte>(dictionaryConversion, StringComparer.OrdinalIgnoreCase);
            _incomingCardNames = new ConcurrentDictionary<string, byte>(StringComparer.OrdinalIgnoreCase);
        }

        public bool TryRegisterCard(string name)
        {
            return _incomingCardNames.TryAdd(name, 0);
        }

        public bool IsDuplicate(string name)
        {
            return _existingCardNames.ContainsKey(name) || _incomingCardNames.ContainsKey(name);
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


