using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace CastLibrary.Repository.Services;

public interface IKeywordExtractionService
{
    string[] ExtractSessionKeywords(int sessionNumber, string title, string alternateTitle, DateTime startTime);
    Task<string[]> ExtractChronicleKeywordsAsync(string title, string body, string todSliceName, List<LinkedEntityTrigger> linkedEntities);
}

public class KeywordExtractionService : IKeywordExtractionService
{
    private readonly IPlayerCardReadRepository playerCardRepository;
    private readonly ICampaignLocationInstanceReadRepository campaignLocationInstanceRepository;
    private readonly ICampaignSublocationInstanceReadRepository campaignSublocationInstanceRepository;
    private readonly ICampaignCastInstanceReadRepository campaignCastInstanceRepository;
    private readonly ICampaignFactionInstanceReadRepository campaignFactionInstanceRepository;
    private readonly ConcurrentDictionary<string, byte> _stopWords;
    private readonly Dictionary<string, Func<LinkedEntityTrigger, KeywordsHeap, Task>> _entityKeywordStrategies;
    private readonly ILogger<KeywordExtractionService> _logger;

    public KeywordExtractionService(
        IPlayerCardReadRepository playerCardRepository,
        ICampaignLocationInstanceReadRepository campaignLocationInstanceRepository,
        ICampaignSublocationInstanceReadRepository campaignSublocationInstanceRepository,
        ICampaignCastInstanceReadRepository campaignCastInstanceRepository,
        ICampaignFactionInstanceReadRepository campaignFactionInstanceRepository,
        ICastcardsConfigurationReadRepository configurationRepository,
        ILogger<KeywordExtractionService> logger)
    {
        this.playerCardRepository = playerCardRepository;
        this.campaignLocationInstanceRepository = campaignLocationInstanceRepository;
        this.campaignSublocationInstanceRepository = campaignSublocationInstanceRepository;
        this.campaignCastInstanceRepository = campaignCastInstanceRepository;
        this.campaignFactionInstanceRepository = campaignFactionInstanceRepository;
        _logger = logger;

        var stopWords = Array.Empty<string>();
        try
        {
            var stopWordsConfig = configurationRepository.GetConfigurationAsync<StopWordsDomain>(CastCardsConfigurationKeys.StopWords)
                .GetAwaiter().GetResult();
            stopWords = stopWordsConfig?.Words ?? Array.Empty<string>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load stop words configuration");
        }

        _stopWords = new ConcurrentDictionary<string, byte>(
            stopWords.ToDictionary(k => k, _ => (byte)0),
            StringComparer.OrdinalIgnoreCase);

        _entityKeywordStrategies = new Dictionary<string, Func<LinkedEntityTrigger, KeywordsHeap, Task>>(StringComparer.OrdinalIgnoreCase)
        {
            { EntityType.Location.GetDescription(), (entity, keywords) => ExtractLocationKeywordsAsync(entity, keywords) },
            { EntityType.Sublocation.GetDescription(), (entity, keywords) => ExtractSublocationKeywordsAsync(entity, keywords) },
            { EntityType.Cast.GetDescription(), (entity, keywords) => ExtractCastKeywordsAsync(entity, keywords) },
            { EntityType.Faction.GetDescription(), (entity, keywords) => ExtractFactionKeywordsAsync(entity, keywords) },
            { EntityType.PlayerCard.GetDescription(), (entity, keywords) => ExtractPlayerKeywordsAsync(entity, keywords) },
            { EntityType.TimeOfDay.GetDescription(), (entity, keywords) => ExtractGenericEntityKeywordsAsync(entity, keywords) },
            { EntityType.CampaignHandout.GetDescription(), (entity, keywords) => ExtractGenericEntityKeywordsAsync(entity, keywords) }
        };
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

    public async Task<string[]> ExtractChronicleKeywordsAsync(string title, string body, string todSliceName, List<LinkedEntityTrigger> linkedEntities)
    {
        // Pre-allocate capacity based on expected keyword count
        var keywords = new KeywordsHeap(50);

        AddTokenized(title, keywords);

        AddTokenized(body, keywords);

        AddTokenized(todSliceName, keywords);

        await ExtractLinkedEntityKeywordsAsync(linkedEntities, keywords);

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

    private async Task ExtractLinkedEntityKeywordsAsync(List<LinkedEntityTrigger> linkedEntities, KeywordsHeap keywords)
    {
        try
        {
            if (linkedEntities == null) return;

            // Group entities by type for parallel processing
            var entityTasks = new List<Task>();

            foreach (var entity in linkedEntities)
            {
                if (_entityKeywordStrategies.TryGetValue(entity.EntityType.ToLowerInvariant(), out var strategy))
                {
                    entityTasks.Add(strategy(entity, keywords));
                }
            }

            // Execute all tasks in parallel
            await Task.WhenAll(entityTasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to extract linked entity keywords");
        }
    }

    private async Task ExtractGenericEntityKeywordsAsync(LinkedEntityTrigger entity, KeywordsHeap keywords)
    {
        if (string.IsNullOrEmpty(entity.EntityName)) return;

        keywords.Add(entity.EntityType);
        if (entity.EntityType.ToLower() != entity.EntityName.ToLower())
            keywords.Add(entity.EntityName);

        await Task.CompletedTask;
    }

    private async Task ExtractLocationKeywordsAsync(LinkedEntityTrigger entity, KeywordsHeap keywords)
    {
        var entityId = entity.EntityId;
        if (!Guid.TryParse(entityId, out var id)) return;

        var location = await campaignLocationInstanceRepository.GetByIdAsync(id);
        if (location == null) return;

        AddTokenized(location.Classification, keywords);
        AddTokenized(location.Name, keywords);
        AddTokenized(location.Description, keywords);
        AddTokenized("location", keywords);
    }

    private async Task ExtractSublocationKeywordsAsync(LinkedEntityTrigger entity, KeywordsHeap keywords)
    {
        var entityId = entity.EntityId;
        if (!Guid.TryParse(entityId, out var id)) return;

        var sublocation = await campaignSublocationInstanceRepository.GetByIdAsync(id);
        if (sublocation == null) return;

        AddTokenized(sublocation.Name, keywords);
        AddTokenized(sublocation.Description, keywords);
    }

    private async Task ExtractCastKeywordsAsync(LinkedEntityTrigger entity, KeywordsHeap keywords)
    {
        var entityId = entity.EntityId;
        if (!Guid.TryParse(entityId, out var id))
            return;
        var cast = await campaignCastInstanceRepository.GetByIdAsync(id);
        if (cast == null) return;

        AddTokenized(cast.Race, keywords);
        AddTokenized(cast.Role, keywords);
        AddTokenized(cast.Name, keywords);
        AddTokenized(cast.PublicDescription, keywords);
    }

    private async Task ExtractFactionKeywordsAsync(LinkedEntityTrigger entity, KeywordsHeap keywords)
    {
        var entityId = entity.EntityId;
        if (!Guid.TryParse(entityId, out var id))
            return;

        var faction = await campaignFactionInstanceRepository.GetByIdAsync(id);
        if (faction == null) return;

        AddTokenized(faction.Type, keywords);
        AddTokenized(faction.Name, keywords);
        AddTokenized(faction.Description, keywords);
    }

    private async Task ExtractPlayerKeywordsAsync(LinkedEntityTrigger entity, KeywordsHeap keywords)
    {
        var entityId = entity.EntityId;
        if (!Guid.TryParse(entityId, out var id))
            return;

        var player = await playerCardRepository.GetByPlayerUserIdAsync(id);
        if (player == null) return;

        AddTokenized(player.Race, keywords);
        AddTokenized(player.Class, keywords);
        AddTokenized(player.Name, keywords);
    }
}