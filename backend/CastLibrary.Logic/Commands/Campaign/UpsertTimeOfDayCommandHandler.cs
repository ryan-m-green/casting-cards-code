using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpsertTimeOfDayCommandHandler
{
    Task<TimeOfDayDomain> HandleAsync(UpsertTimeOfDayCommand command);
}

public class UpsertTimeOfDayCommandHandler(
    ITimeOfDayWriteRepository writeRepository) : IUpsertTimeOfDayCommandHandler
{
    public Task<TimeOfDayDomain> HandleAsync(UpsertTimeOfDayCommand command)
    {
        var domain = new TimeOfDayDomain
        {
            CampaignId            = command.CampaignId,
            DayLengthHours        = command.Request.DayLengthHours,
            CursorPositionPercent = 0,
            Slices = command.Request.Slices.Select((s, i) => new TimeOfDaySliceDomain
            {
                CampaignId    = command.CampaignId,
                Label         = s.Label,
                Color         = s.Color,
                DurationHours = s.DurationHours,
                SortOrder     = i,
                DmNotes       = s.DmNotes,
                PlayerNotes   = s.PlayerNotes,
            }).ToList(),
        };

        return writeRepository.UpsertAsync(domain);
    }
}

public class UpsertTimeOfDayCommand(Guid campaignId, UpsertTimeOfDayRequest request)
{
    public Guid CampaignId { get; } = campaignId;
    public UpsertTimeOfDayRequest Request { get; } = request;
}
