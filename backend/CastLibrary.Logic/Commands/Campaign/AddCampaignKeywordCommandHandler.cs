using CastLibrary.Repository.Repositories.Insert;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IAddCampaignKeywordCommandHandler
{
    Task<string> HandleAsync(AddCampaignKeywordCommand command);
}

public class AddCampaignKeywordCommandHandler(
    ICampaignKeywordInsertRepository campaignKeywordInsertRepository) : IAddCampaignKeywordCommandHandler
{
    public async Task<string> HandleAsync(AddCampaignKeywordCommand command)
    {
        var normalized = (command.Keyword ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized.Length == 0) return string.Empty;

        await campaignKeywordInsertRepository.MergeKeywordsAsync(command.DmUserId, command.CardType, [normalized]);
        return normalized;
    }
}

public class AddCampaignKeywordCommand
{
    public AddCampaignKeywordCommand(Guid dmUserId, string cardType, string keyword)
    {
        DmUserId = dmUserId;
        CardType = cardType;
        Keyword = keyword;
    }

    public Guid DmUserId { get; }
    public string CardType { get; }
    public string Keyword { get; }
}
