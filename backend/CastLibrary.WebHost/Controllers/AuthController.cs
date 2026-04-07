using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using CastLibrary.Logic.Commands.Auth;
using CastLibrary.Logic.Interfaces;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Validators;
using CastLibrary.Shared.Requests;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    ILoginCommandHandler loginCommand,
    IRegisterUserCommandHandler registerCommand,
    IForgotPasswordCommandHandler forgotPasswordCommand,
    IResetPasswordCommandHandler resetPasswordCommand,
    IChangePasswordCommandHandler changePasswordCommand,
    IUserRetriever userRetriever) : ControllerBase
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
            return Unauthorized(new { message = "Invalid email or password." });
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

        var (result, error) = await registerCommand.HandleAsync(new RegisterCommand(request));
        if (error is not null)
        {
            return BadRequest(new List<string> { error });
        }

        return Ok(result);
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
}
