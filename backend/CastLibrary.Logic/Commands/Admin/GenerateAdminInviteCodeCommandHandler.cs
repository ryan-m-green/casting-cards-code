using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Admin;

public interface IGenerateAdminInviteCodeCommandHandler
{
    Task<AdminInviteCodeDomain> HandleAsync();
}

public class GenerateAdminInviteCodeCommandHandler(
    IAdminInviteCodeUpdateRepository updateRepository,
    ISystemValuesService systemValuesService) : IGenerateAdminInviteCodeCommandHandler
{
    private string GenerateCode()
    {
        var parts = systemValuesService.GetNewGuid().ToString().Split('-');
        return $"{parts[1]}-{parts[2]}-{parts[3]}".ToUpper();
    }

    public async Task<AdminInviteCodeDomain> HandleAsync()
    {
        var domain = new AdminInviteCodeDomain
        {
            Id = systemValuesService.GetNewGuid(),
            Code = GenerateCode(),
            ExpiresAt = systemValuesService.GetUTCNow(24),
            CreatedAt = systemValuesService.GetUTCNow(),
        };

        await updateRepository.UpsertAsync(domain);
        return domain;
    }
}
