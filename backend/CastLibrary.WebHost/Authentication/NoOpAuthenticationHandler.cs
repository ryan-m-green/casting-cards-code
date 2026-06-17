using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace CastLibrary.WebHost.Authentication;

public class NoOpAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly ILogger<NoOpAuthenticationHandler> _logger;

    public NoOpAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder) : base(options, logger, encoder)
    {
        _logger = logger.CreateLogger<NoOpAuthenticationHandler>();
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        _logger.LogInformation($"NoOpAuthenticationHandler invoked for path: {Context.Request.Path}");

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Name, "Webhook"),
            new Claim(ClaimTypes.Role, "Webhook")
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        _logger.LogInformation("NoOpAuthenticationHandler succeeded");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
