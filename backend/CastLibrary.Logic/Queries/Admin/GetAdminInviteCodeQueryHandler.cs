using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Admin;

public interface IGetAdminInviteCodeQueryHandler
{
    Task<AdminInviteCodeDomain?> HandleAsync();
}

public class GetAdminInviteCodeQueryHandler(
    IAdminInviteCodeReadRepository readRepository) : IGetAdminInviteCodeQueryHandler
{
    public async Task<AdminInviteCodeDomain?> HandleAsync()
    {
        var code = await readRepository.GetCurrentAsync();
        if (code is null) return null;
        if (code.ExpiresAt <= DateTime.UtcNow) return null;
        return code;
    }
}
