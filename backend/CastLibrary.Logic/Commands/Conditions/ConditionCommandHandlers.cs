using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Conditions;

public static class ConditionKeywords
{
    public static List<string> Normalise(List<string> keywords) =>
        [.. keywords
            .Select(keyword => keyword.Trim().ToLowerInvariant())
            .Where(keyword => keyword.Length > 0)
            .Distinct()];
}

public interface ICreateConditionCommandHandler
{
    Task<ConditionDomain> HandleAsync(CreateConditionCommand command);
}

public class CreateConditionCommandHandler(
    IConditionInsertRepository insertRepository,
    IConditionLinkInsertRepository linkRepository) : ICreateConditionCommandHandler
{
    public async Task<ConditionDomain> HandleAsync(CreateConditionCommand command)
    {
        var now = DateTime.UtcNow;

        var domain = new ConditionDomain
        {
            Id          = Guid.NewGuid(),
            GmUserId    = command.GmUserId,
            Name        = command.Request.Name.Trim(),
            Consequence = command.Request.Consequence ?? string.Empty,
            Keywords    = ConditionKeywords.Normalise(command.Request.Keywords),
            Color       = (command.Request.Color ?? string.Empty).Trim(),
            CreatedAt   = now,
            UpdatedAt   = now,
        };

        var saved = await insertRepository.InsertAsync(domain);

        // A condition written inside a campaign is linked to it; one written from the GM's
        // library stands on its own until a campaign adds it.
        if (command.CampaignId is Guid campaignId && campaignId != Guid.Empty)
            await linkRepository.InsertAsync(campaignId, saved.Id);

        return saved;
    }
}

public class CreateConditionCommand
{
    public CreateConditionCommand(Guid? campaignId, Guid gmUserId, CreateConditionRequest request)
    {
        CampaignId = campaignId;
        GmUserId   = gmUserId;
        Request    = request;
    }

    public Guid? CampaignId { get; }
    public Guid GmUserId { get; }
    public CreateConditionRequest Request { get; }
}

public interface ILinkConditionsCommandHandler
{
    Task<int> HandleAsync(LinkConditionsCommand command);
}

public class LinkConditionsCommandHandler(
    IConditionLinkInsertRepository linkRepository) : ILinkConditionsCommandHandler
{
    public Task<int> HandleAsync(LinkConditionsCommand command)
        => linkRepository.InsertManyAsync(command.CampaignId, command.GmUserId, command.Request.ConditionIds);
}

public class LinkConditionsCommand
{
    public LinkConditionsCommand(Guid campaignId, Guid gmUserId, LinkConditionsRequest request)
    {
        CampaignId = campaignId;
        GmUserId   = gmUserId;
        Request    = request;
    }

    public Guid CampaignId { get; }
    public Guid GmUserId { get; }
    public LinkConditionsRequest Request { get; }
}

public interface IDeleteConditionCommandHandler
{
    Task<int> HandleAsync(DeleteConditionCommand command);
}

public class DeleteConditionCommandHandler(
    IConditionDeleteRepository deleteRepository) : IDeleteConditionCommandHandler
{
    public Task<int> HandleAsync(DeleteConditionCommand command)
        => deleteRepository.UnlinkAsync(command.CampaignId, command.ConditionId, command.GmUserId);
}

public class DeleteConditionCommand
{
    public DeleteConditionCommand(Guid campaignId, Guid conditionId, Guid gmUserId)
    {
        CampaignId  = campaignId;
        ConditionId = conditionId;
        GmUserId    = gmUserId;
    }

    public Guid CampaignId { get; }
    public Guid ConditionId { get; }
    public Guid GmUserId { get; }
}

public interface IDeleteLibraryConditionCommandHandler
{
    Task<int> HandleAsync(DeleteLibraryConditionCommand command);
}

/// <summary>Deletes a condition from the GM's library outright (used by the Conditions Library page).</summary>
public class DeleteLibraryConditionCommandHandler(
    IConditionDeleteRepository deleteRepository) : IDeleteLibraryConditionCommandHandler
{
    public Task<int> HandleAsync(DeleteLibraryConditionCommand command)
        => deleteRepository.DeleteAsync(command.ConditionId, command.GmUserId);
}

public class DeleteLibraryConditionCommand
{
    public DeleteLibraryConditionCommand(Guid conditionId, Guid gmUserId)
    {
        ConditionId = conditionId;
        GmUserId    = gmUserId;
    }

    public Guid ConditionId { get; }
    public Guid GmUserId { get; }
}

public interface IUpdateConditionCommandHandler
{
    Task<ConditionDomain?> HandleAsync(UpdateConditionCommand command);
}

public class UpdateConditionCommandHandler(
    IConditionUpdateRepository updateRepository) : IUpdateConditionCommandHandler
{
    public Task<ConditionDomain?> HandleAsync(UpdateConditionCommand command)
    {
        var domain = new ConditionDomain
        {
            Id          = command.Id,
            GmUserId    = command.GmUserId,
            Name        = command.Request.Name.Trim(),
            Consequence = command.Request.Consequence ?? string.Empty,
            Keywords    = ConditionKeywords.Normalise(command.Request.Keywords),
            Color       = (command.Request.Color ?? string.Empty).Trim(),
            UpdatedAt   = DateTime.UtcNow,
        };

        return updateRepository.UpdateAsync(domain);
    }
}

public class UpdateConditionCommand
{
    public UpdateConditionCommand(Guid id, Guid gmUserId, UpdateConditionRequest request)
    {
        Id       = id;
        GmUserId = gmUserId;
        Request  = request;
    }

    public Guid Id { get; }
    public Guid GmUserId { get; }
    public UpdateConditionRequest Request { get; }
}

