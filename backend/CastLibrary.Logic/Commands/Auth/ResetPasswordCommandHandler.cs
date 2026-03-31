using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;
using System.Security.Cryptography;
using System.Text;

namespace CastLibrary.Logic.Commands.Auth;

public interface IResetPasswordCommandHandler
{
    Task<(bool Success, string Error)> HandleAsync(ResetPasswordCommand command);
}
public class ResetPasswordCommandHandler(
    IPasswordResetTokenReadRepository tokenReadRepository,
    IPasswordResetTokenUpdateRepository tokenUpdateRepository,
    IUserUpdateRepository userUpdateRepository,
    IPasswordHashingService passwordHashingService) : IResetPasswordCommandHandler
{
    private const string InvalidMessage = "Invalid or expired reset link.";

    public async Task<(bool Success, string Error)> HandleAsync(ResetPasswordCommand command)
    {
        var hash  = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(command.Request.Token))).ToLower();
        var token = await tokenReadRepository.GetByTokenHashAsync(hash);

        if (token is null || token.ExpiresAt < DateTime.UtcNow || token.UsedAt is not null)
            return (false, InvalidMessage);

        var newHash = passwordHashingService.Hash(command.Request.NewPassword);
        await userUpdateRepository.UpdatePasswordAsync(token.UserId, newHash);
        await tokenUpdateRepository.MarkUsedAsync(token.Id);

        return (true, null);
    }
}

public class ResetPasswordCommand
{
    public ResetPasswordCommand(ResetPasswordRequest request)
    {
        Request = request;
    }

    public ResetPasswordRequest Request { get; }
}
