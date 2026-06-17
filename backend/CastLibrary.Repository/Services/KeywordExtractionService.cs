using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using System.Collections.Concurrent;

namespace CastLibrary.Repository.Services;

public interface IKeywordExtractionService
{
    string[] ExtractSessionKeywords(int sessionNumber, string title, string alternateTitle, DateTime startTime);
    Task<string[]> ExtractChronicleKeywordsAsync(string title, string body, string todSliceName, string linkedEntitiesJson);
}

public class KeywordExtractionService : IKeywordExtractionService
{
    private readonly ILocationReadRepository locationRepository;
    private readonly ISublocationReadRepository sublocationRepository;
    private readonly ICastReadRepository castRepository;
    private readonly IFactionReadRepository factionRepository;
    private readonly IPlayerCardReadRepository playerCardRepository;
    private readonly ICampaignLocationInstanceReadRepository campaignLocationInstanceRepository;
    private readonly ICampaignSublocationInstanceReadRepository campaignSublocationInstanceRepository;
    private readonly ICampaignCastInstanceReadRepository campaignCastInstanceRepository;
    private readonly ICampaignFactionInstanceReadRepository campaignFactionInstanceRepository;
    private readonly ConcurrentDictionary<string, byte> _stopWords;

    public KeywordExtractionService(
        ILocationReadRepository locationRepository,
        ISublocationReadRepository sublocationRepository,
        ICastReadRepository castRepository,
        IFactionReadRepository factionRepository,
        IPlayerCardReadRepository playerCardRepository,
        ICampaignLocationInstanceReadRepository campaignLocationInstanceRepository,
        ICampaignSublocationInstanceReadRepository campaignSublocationInstanceRepository,
        ICampaignCastInstanceReadRepository campaignCastInstanceRepository,
        ICampaignFactionInstanceReadRepository campaignFactionInstanceRepository,
        ICastcardsConfigurationReadRepository configurationRepository)
    {
        this.locationRepository = locationRepository;
        this.sublocationRepository = sublocationRepository;
        this.castRepository = castRepository;
        this.factionRepository = factionRepository;
        this.playerCardRepository = playerCardRepository;
        this.campaignLocationInstanceRepository = campaignLocationInstanceRepository;
        this.campaignSublocationInstanceRepository = campaignSublocationInstanceRepository;
        this.campaignCastInstanceRepository = campaignCastInstanceRepository;
        this.campaignFactionInstanceRepository = campaignFactionInstanceRepository;

        string[] stopWords = Array.Empty<string>();
        try
        {
            var stopWordsConfig = configurationRepository.GetConfigurationAsync<StopWordsDomain>(CastCardsConfigurationKeys.StopWords)
                .GetAwaiter().GetResult();
            stopWords = stopWordsConfig?.Words ?? Array.Empty<string>();
        }
        catch (Exception ex)
        {
        }

        _stopWords = new ConcurrentDictionary<string, byte>(
            stopWords.ToDictionary(k => k, _ => (byte)0),
            StringComparer.OrdinalIgnoreCase);
    }

    public class KeywordsHeap : ConcurrentDictionary<string, byte>
    {
        public KeywordsHeap(int capacity)
            : base(concurrencyLevel: Environment.ProcessorCount,
                   capacity: capacity,
                   comparer: StringComparer.OrdinalIgnoreCase)
        { }

        public bool TryAdd(string key)
        {
            return base.TryAdd(key, 0);
        }

        public bool Add(string key)
        {
            return TryAdd(key);
        }
        public new string[] ToArray()
        {
            return Keys.ToArray();
        }
    }

    public string[] ExtractSessionKeywords(int sessionNumber, string title, string alternateTitle, DateTime startTime)
    {
        // Pre-allocate capacity based on expected keyword count
        var keywords = new KeywordsHeap(20);

        keywords.Add(sessionNumber.ToString());

        AddTokenized(title, keywords);

        AddTokenized(alternateTitle, keywords);

        keywords.Add(startTime.ToString("yyyy-MM-dd"));
        keywords.Add(startTime.ToString("MMMM"));
        keywords.Add(startTime.Year.ToString());

        return keywords.ToArray();
    }

    public async Task<string[]> ExtractChronicleKeywordsAsync(string title, string body, string todSliceName, string linkedEntitiesJson)
    {
        // Pre-allocate capacity based on expected keyword count
        var keywords = new KeywordsHeap(50);

        AddTokenized(title, keywords);

        AddTokenized(body, keywords);

        AddTokenized(todSliceName, keywords);

        await ExtractLinkedEntityKeywordsAsync(linkedEntitiesJson, keywords);

        return keywords.ToArray();
    }

    // Manual tokenization instead of Regex.Split for better performance
    private void AddTokenized(string text, KeywordsHeap keywords)
    {
        if (string.IsNullOrEmpty(text)) return;

        var length = text.Length;
        var wordStart = -1;

        for (var i = 0; i < length; i++)
        {
            var c = text[i];
            var isWordChar = char.IsLetterOrDigit(c);

            if (isWordChar && wordStart < 0)
            {
                wordStart = i;
            }
            else if (!isWordChar && wordStart >= 0)
            {
                var word = text.Substring(wordStart, i - wordStart).ToLowerInvariant();
                if (word.Length >= 2 && !_stopWords.ContainsKey(word))
                {
                    keywords.Add(word);
                }
                wordStart = -1;
            }
        }

        // Handle last word if string ends with word character
        if (wordStart >= 0)
        {
            var word = text.Substring(wordStart, length - wordStart).ToLowerInvariant();
            if (word.Length >= 2 && !_stopWords.ContainsKey(word))
            {
                keywords.Add(word);
            }
        }
    }

    private async Task ExtractLinkedEntityKeywordsAsync(string linkedEntitiesJson, KeywordsHeap keywords)
    {
        try
        {
            if (string.IsNullOrEmpty(linkedEntitiesJson) || linkedEntitiesJson == "[]") return;

            var linkedEntities = System.Text.Json.JsonSerializer.Deserialize<List<LinkedEntityTrigger>>(linkedEntitiesJson);
            if (linkedEntities == null) return;

            // Group entities by type for parallel processing
            var entityTasks = new List<Task>();

            foreach (var entity in linkedEntities)
            {
                if (string.IsNullOrEmpty(entity.EntityType) || string.IsNullOrEmpty(entity.EntityId))
                    continue;

                keywords.Add(entity.EntityType.ToLowerInvariant());

                var entityType = entity.EntityType.ToLowerInvariant();
                switch (entityType)
                {
                    case "location":
                        entityTasks.Add(ExtractLocationKeywordsAsync(entity.EntityId, keywords));
                        break;
                    case "sublocation":
                        entityTasks.Add(ExtractSublocationKeywordsAsync(entity.EntityId, keywords));
                        break;
                    case "cast":
                        entityTasks.Add(ExtractCastKeywordsAsync(entity.EntityId, keywords));
                        break;
                    case "faction":
                        entityTasks.Add(ExtractFactionKeywordsAsync(entity.EntityId, keywords));
                        break;
                    case "player":
                        entityTasks.Add(ExtractPlayerKeywordsAsync(entity.EntityId, keywords));
                        break;
                    case "time-of-day":
                        keywords.Add(entity.EntityName.ToLowerInvariant());
                        break;
                }
            }

            // Execute all tasks in parallel
            await Task.WhenAll(entityTasks);
        }
        catch(Exception ex)
        {
            // Silently fail on JSON parse errors
        }
    }

    private async Task ExtractLocationKeywordsAsync(string entityId, KeywordsHeap keywords)
    {
        if (!Guid.TryParse(entityId, out var id)) return;

        var location = await campaignLocationInstanceRepository.GetByIdAsync(id);
        if (location == null) return;

        AddTokenized(location.Classification, keywords);
        AddTokenized(location.Name, keywords);
        AddTokenized(location.Description, keywords);
    }

    private async Task ExtractSublocationKeywordsAsync(string entityId, KeywordsHeap keywords)
    {
        if (!Guid.TryParse(entityId, out var id)) return;

        var sublocation = await campaignSublocationInstanceRepository.GetByIdAsync(id);
        if (sublocation == null) return;

        AddTokenized(sublocation.Name, keywords);
        AddTokenized(sublocation.Description, keywords);
    }

    private async Task ExtractCastKeywordsAsync(string entityId, KeywordsHeap keywords)
    {
        if (!Guid.TryParse(entityId, out var id))
            return;
        var cast = await campaignCastInstanceRepository.GetByIdAsync(id);
        if (cast == null) return;

        AddTokenized(cast.Race, keywords);
        AddTokenized(cast.Role, keywords);
        AddTokenized(cast.Name, keywords);
        AddTokenized(cast.PublicDescription, keywords);
    }

    private async Task ExtractFactionKeywordsAsync(string entityId, KeywordsHeap keywords)
    {
        if (!Guid.TryParse(entityId, out var id))
            return;

        var faction = await campaignFactionInstanceRepository.GetByIdAsync(id);
        if (faction == null) return;

        AddTokenized(faction.Type, keywords);
        AddTokenized(faction.Name, keywords);
        AddTokenized(faction.Description, keywords);
    }

    private async Task ExtractPlayerKeywordsAsync(string entityId, KeywordsHeap keywords)
    {
        if (!Guid.TryParse(entityId, out var id))
            return;

        var player = await playerCardRepository.GetByPlayerUserIdAsync(id);
        if (player == null) return;

        AddTokenized(player.Race, keywords);
        AddTokenized(player.Class, keywords);
        AddTokenized(player.Name, keywords);
    }
}