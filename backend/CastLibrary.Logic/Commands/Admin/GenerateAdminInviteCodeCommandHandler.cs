using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Admin;

public interface IGenerateAdminInviteCodeCommandHandler
{
    Task<AdminInviteCodeDomain> HandleAsync();
}

public class GenerateAdminInviteCodeCommandHandler(
    IAdminInviteCodeUpdateRepository updateRepository) : IGenerateAdminInviteCodeCommandHandler
{
    private static string GenerateCode()
    {
        var parts = Guid.NewGuid().ToString().Split('-');
        return $"{parts[1]}-{parts[2]}-{parts[3]}".ToUpper();
    }

    public async Task<AdminInviteCodeDomain> HandleAsync()
    {
        var domain = new AdminInviteCodeDomain
        {
            Id = Guid.NewGuid(),
            Code = GenerateCode(),
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            CreatedAt = DateTime.UtcNow,
        };

        await updateRepository.UpsertAsync(domain);
        return domain;
    }
}
