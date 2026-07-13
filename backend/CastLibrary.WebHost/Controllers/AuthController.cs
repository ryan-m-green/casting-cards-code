using CastLibrary.Logic.Commands.Auth;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Interfaces;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Infrastructure;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Validators;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    ILoginCommandHandler loginCommand,
    IRegisterUserCommandHandler registerCommand,
    IVerifyEmailCommandHandler verifyEmailCommand,
    IForgotPasswordCommandHandler forgotPasswordCommand,
    IResetPasswordCommandHandler resetPasswordCommand,
    IChangePasswordCommandHandler changePasswordCommand,
    IUpdateDisplayNameCommandHandler updateDisplayNameCommand,
    IUpdateEmailCommandHandler updateEmailCommand,
    IUserRetriever userRetriever,
    IUserReadRepository userReadRepository,
    ISubscriptionReadRepository subscriptionReadRepository,
    IAuditLoggingService auditService,
    IAntiforgery antiforgery,
    IWebHostEnvironment environment,
    IJwtTokenService jwtTokenService,
    ILogger<AuthController> logger) : ControllerBase
{
    private static string GetValidatedCookieDomain() => AntiforgeryHelper.GetValidatedCookieDomain()!;

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await loginCommand.HandleAsync(new LoginCommand(request));
        if (result is null)
        {
            // Log failed login attempt
            await auditService.LogAuthenticationEventAsync(
                Guid.Empty,
                request.Email,
                AuditEventType.LoginFailure,
                "Login attempt failed: Invalid credentials or unverified email",
                GetClientIpAddress(),
                GetUserAgent(),
                isSuccess: false,
                errorMessage: "Invalid email or password, or email not verified");

            return Unauthorized(new { message = "Invalid credentials." });
        }

        // Log successful login
        await auditService.LogAuthenticationEventAsync(
            result.User.Id,
            result.User.Email,
            AuditEventType.LoginSuccess,
            "User logged in successfully",
            GetClientIpAddress(),
            GetUserAgent(),
            isSuccess: true);

        // Set JWT cookie for persistent authentication across redirects
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Domain = GetValidatedCookieDomain(),
            Expires = DateTime.UtcNow.AddHours(4),
            IsEssential = true
        };
        Response.Cookies.Append("casting_cards_token", result.Token, cookieOptions);

        // Generate antiforgery token
        var antiforgeryTokens = antiforgery.GetAndStoreTokens(HttpContext);

        // Use AntiforgeryHelper to set cookie with consistent options
        if (AntiforgeryHelper.ValidateTokensGenerated(antiforgeryTokens, logger))
        {
            AntiforgeryHelper.SetXsrfCookie(Response, antiforgeryTokens.CookieToken!, Request.IsHttps, logger);
        }

        return Ok(new {
            token = result.Token,
            user = result.User,
            bypassPayment = result.BypassPayment,
            xsrfToken = antiforgeryTokens.RequestToken
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var validator = new RegisterRequestValidator();
        var validation = validator.Validate(request);
        if (!validation.IsValid)
        {
            var errors = validation.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        var (successMessage, error) = await registerCommand.HandleAsync(new RegisterCommand(request));
        if (error is not null)
        {
            // Log failed registration attempt
            await auditService.LogAuthenticationEventAsync(
                Guid.Empty,
                request.Email,
                AuditEventType.UserRegistration,
                "User registration failed",
                GetClientIpAddress(),
                GetUserAgent(),
                isSuccess: false,
                errorMessage: error);

            return BadRequest(new List<string> { "Registration failed." });
        }

        // Log successful registration
        await auditService.LogAuthenticationEventAsync(
            Guid.Empty,
            request.Email,
            AuditEventType.UserRegistration,
            "User registered successfully",
            GetClientIpAddress(),
            GetUserAgent(),
            isSuccess: true);

        return Ok(new { message = successMessage });
    }

    [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var validator = new ForgotPasswordRequestValidator();
        var validation = validator.Validate(request);
        if (!validation.IsValid)
        {
            var errors = validation.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        await forgotPasswordCommand.HandleAsync(new ForgotPasswordCommand(request));

        return Ok(new { message = "If that email is registered, a reset link has been sent." });
    }

    [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return BadRequest(new { message = "Verification token is required." });

        var (result, error) = await verifyEmailCommand.HandleAsync(new VerifyEmailCommand(request.Token));
        if (error is not null)
        {
            return BadRequest(new { message = "Verification failed." });
        }

        // Set JWT cookie for persistent authentication across redirects
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Domain = GetValidatedCookieDomain(),
            Expires = DateTime.UtcNow.AddHours(4),
            IsEssential = true
        };
        Response.Cookies.Append("casting_cards_token", result.Token, cookieOptions);

        // Generate antiforgery token
        var antiforgeryTokens = antiforgery.GetAndStoreTokens(HttpContext);

        // Use AntiforgeryHelper to set cookie with consistent options
        if (AntiforgeryHelper.ValidateTokensGenerated(antiforgeryTokens, logger))
        {
            AntiforgeryHelper.SetXsrfCookie(Response, antiforgeryTokens.CookieToken!, Request.IsHttps, logger);
        }

        return Ok(new {
            token = result.Token,
            user = result.User,
            bypassPayment = result.BypassPayment,
            xsrfToken = antiforgeryTokens.RequestToken
        });
    }

    [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var validator = new ResetPasswordRequestValidator();
        var validation = validator.Validate(request);
        if (!validation.IsValid)
        {
            var errors = validation.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        var (success, error) = await resetPasswordCommand.HandleAsync(new ResetPasswordCommand(request));
        if (!success)
        {
            return BadRequest(new { message = "Password reset failed." });
        }

        return Ok(new { message = "Password reset successfully." });
    }

    [Authorize]
    [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var validator = new ChangePasswordRequestValidator();
        var validation = validator.Validate(request);
        if (!validation.IsValid)
        {
            var errors = validation.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(errors);
        }

        var userId = userRetriever.GetUserId(User);
        var user = await userReadRepository.GetByIdAsync(userId);
        var (success, error) = await changePasswordCommand.HandleAsync(new ChangePasswordCommand(userId, request));
        if (!success)
        {
            // Log failed password change attempt
            await auditService.LogAuthenticationEventAsync(
                userId,
                user?.Email ?? "Unknown",
                AuditEventType.PasswordChange,
                "Password change failed",
                GetClientIpAddress(),
                GetUserAgent(),
                isSuccess: false,
                errorMessage: error);

            return BadRequest(new { message = "Password change failed." });
        }

        // Log successful password change
        await auditService.LogAuthenticationEventAsync(
            userId,
            user?.Email ?? "Unknown",
            AuditEventType.PasswordChange,
            "Password changed successfully",
            GetClientIpAddress(),
            GetUserAgent(),
            isSuccess: true);

        return Ok(new { message = "Password changed successfully." });
    }

    [Authorize]
    [HttpPost("update-display-name")]
        public async Task<IActionResult> UpdateDisplayName([FromBody] UpdateDisplayNameRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var user = await userReadRepository.GetByIdAsync(userId);
        var (success, error) = await updateDisplayNameCommand.HandleAsync(new UpdateDisplayNameCommand(userId, request));
        if (!success)
        {
            return BadRequest(new { message = error ?? "Failed to update display name." });
        }

        // Refresh the user session with updated data
        var subscription = await subscriptionReadRepository.GetByUserIdAsync(userId);
        var userDomain = new UserDomain
        {
            Id = user!.Id,
            Email = user.Email,
            DisplayName = request.DisplayName,
            Role = user.Role,
            TokenVersion = user.TokenVersion
        };

        var token = jwtTokenService.GenerateToken(userDomain, subscription);

        var response = new AuthResponse
        {
            Token = token,
            User = new UserResponse
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = request.DisplayName,
                Role = user.Role.ToString(),
            },
            BypassPayment = subscription?.BypassPayment ?? false
        };

        return Ok(response);
    }

    [Authorize]
    [HttpPost("update-email")]
        public async Task<IActionResult> UpdateEmail([FromBody] UpdateEmailRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var user = await userReadRepository.GetByIdAsync(userId);
        var (success, error) = await updateEmailCommand.HandleAsync(new UpdateEmailCommand(userId, request));
        if (!success)
        {
            return BadRequest(new { message = error ?? "Failed to update email." });
        }

        // Refresh the user session with updated data
        var subscription = await subscriptionReadRepository.GetByUserIdAsync(userId);
        var userDomain = new UserDomain
        {
            Id = user!.Id,
            Email = request.Email,
            DisplayName = user.DisplayName,
            Role = user.Role,
            TokenVersion = user.TokenVersion
        };

        var token = jwtTokenService.GenerateToken(userDomain, subscription);

        var response = new AuthResponse
        {
            Token = token,
            User = new UserResponse
            {
                Id = user.Id,
                Email = request.Email,
                DisplayName = user.DisplayName,
                Role = user.Role.ToString(),
            },
            BypassPayment = subscription?.BypassPayment ?? false
        };

        return Ok(response);
    }

    [HttpGet("xsrf-token")]
        public IActionResult GetXsrfToken()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);

        // Use AntiforgeryHelper to set cookie with consistent options
        if (AntiforgeryHelper.ValidateTokensGenerated(tokens, logger))
        {
            AntiforgeryHelper.SetXsrfCookie(Response, tokens.CookieToken!, Request.IsHttps, logger);
        }

        return Ok(new { token = tokens.RequestToken });
    }

    [Authorize]
    [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
    {
        var userId = userRetriever.GetUserId(User);
        var user = await userReadRepository.GetByIdAsync(userId);
        if (user is null)
        {
            return NotFound();
        }

        var subscription = await subscriptionReadRepository.GetByUserIdAsync(userId);

        // Convert to UserDomain for token generation
        var userDomain = new UserDomain
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            Role = user.Role,
            TokenVersion = user.TokenVersion
        };

        var token = jwtTokenService.GenerateToken(userDomain, subscription);

        var response = new AuthResponse
        {
            Token = token,
            User = new UserResponse
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                Role = user.Role.ToString(),
            },
            BypassPayment = subscription?.BypassPayment ?? false
        };
        return Ok(response);
    }

    [HttpPost("logout")]
    [Authorize]
        public async Task<IActionResult> Logout()
    {
        var userId = userRetriever.GetUserId(User);
        var userEmail = "Unknown";
        
        if (userId != Guid.Empty)
        {
            var user = await userReadRepository.GetByIdAsync(userId);
            userEmail = user?.Email ?? "Unknown";
        }

        // Log logout event
        await auditService.LogAuthenticationEventAsync(
            userId,
            userEmail,
            AuditEventType.Logout,
            "User logged out",
            GetClientIpAddress(),
            GetUserAgent(),
            isSuccess: true);

        Response.Cookies.Delete("casting_cards_token");
        return Ok(new { message = "Logged out successfully" });
    }

    private string GetClientIpAddress()
    {
        var xForwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(xForwardedFor))
        {
            return xForwardedFor.Split(',')[0].Trim();
        }

        var xRealIp = Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(xRealIp))
        {
            return xRealIp;
        }

        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
    }

    private string GetUserAgent()
    {
        return Request.Headers["User-Agent"].ToString() ?? "Unknown";
    }
}
