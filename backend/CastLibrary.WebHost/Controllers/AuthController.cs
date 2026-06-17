using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using CastLibrary.Logic.Commands.Auth;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.Logic.Services;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Validators;

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
    IUserRetriever userRetriever,
    IJwtTokenService jwtTokenService,
    IUserReadRepository userReadRepository,
    ISubscriptionReadRepository subscriptionReadRepository) : ControllerBase
{
    [HttpPost("login")]
    [EnableRateLimiting("AuthEndpoints")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await loginCommand.HandleAsync(new LoginCommand(request));
        if (result is null)
        {
            return Unauthorized(new { message = "Invalid email or password, or email not verified." });
        }

        return Ok(result);
    }

    [HttpPost("register")]
    [EnableRateLimiting("AuthEndpoints")]
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
            return BadRequest(new List<string> { error });
        }

        return Ok(new { message = successMessage });
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("AuthEndpoints")]
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
    [EnableRateLimiting("AuthEndpoints")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return BadRequest(new { message = "Verification token is required." });

        var (result, error) = await verifyEmailCommand.HandleAsync(new VerifyEmailCommand(request.Token));
        if (error is not null)
        {
            return BadRequest(new { message = error });
        }

        return Ok(result);
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
            return BadRequest(new { message = error });
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
        var (success, error) = await changePasswordCommand.HandleAsync(new ChangePasswordCommand(userId, request));
        if (!success)
        {
            return BadRequest(new { message = error });
        }

        return Ok(new { message = "Password changed successfully." });
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

        var response = new AuthResponse
        {
            Token = jwtTokenService.GenerateToken(user, subscription),
            User = new UserResponse
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                Role = user.Role.ToString(),
            }
        };
        return Ok(response);
    }
}
