using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IPasswordResetTokenEntityMapper
{
    PasswordResetTokenDomain ToDomain(PasswordResetTokenEntity entity);
}
public class PasswordResetTokenEntityMapper : IPasswordResetTokenEntityMapper
{
    public PasswordResetTokenDomain ToDomain(PasswordResetTokenEntity entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        TokenHash = entity.TokenHash,
        ExpiresAt = entity.ExpiresAt,
        UsedAt = entity.UsedAt,
    };
}
