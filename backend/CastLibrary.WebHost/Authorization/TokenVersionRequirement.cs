using Microsoft.AspNetCore.Authorization;

namespace CastLibrary.WebHost.Authorization;

public class TokenVersionRequirement : IAuthorizationRequirement
{
    public TokenVersionRequirement() { }
}
