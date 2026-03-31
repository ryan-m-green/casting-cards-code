using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers
{
    public interface IAdminInviteCodeEntityMapper
    {
        AdminInviteCodeDomain ToDomain(AdminInviteCodeEntity entity);
    }

    public class AdminInviteCodeEntityMapper : IAdminInviteCodeEntityMapper
    {
        public AdminInviteCodeDomain ToDomain(AdminInviteCodeEntity entity)
        {
            return new AdminInviteCodeDomain
            {
                Id = entity.Id,
                Code = entity.Code,
                ExpiresAt = entity.ExpiresAt,
                CreatedAt = entity.CreatedAt,
            };
        }
    }
}
