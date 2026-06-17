using System.Security.Claims;
using CastLibrary.Repository.Repositories.Read;
using Microsoft.AspNetCore.Authorization;

namespace CastLibrary.WebHost.Authorization;

public class TokenVersionAuthorizationHandler : AuthorizationHandler<TokenVersionRequirement>
{
    private readonly IUserReadRepository _userReadRepository;

    public TokenVersionAuthorizationHandler(IUserReadRepository userReadRepository)
    {
        _userReadRepository = userReadRepository;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, TokenVersionRequirement requirement)
    {
        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            context.Fail();
            return;
        }

        var tokenVersionClaim = context.User.FindFirst("tokenVersion");
        if (tokenVersionClaim == null || !int.TryParse(tokenVersionClaim.Value, out var tokenVersion))
        {
            context.Fail();
            return;
        }

        var user = await _userReadRepository.GetByIdAsync(userId);
        if (user == null)
        {
            context.Fail();
            return;
        }

        if (user.TokenVersion != tokenVersion)
        {
            context.Fail();
            return;
        }

        context.Succeed(requirement);
    }
}
