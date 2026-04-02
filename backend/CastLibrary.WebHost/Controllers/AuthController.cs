using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            Console.WriteLine($"[AuthController.Login] START");
            Console.Out.Flush();

            Console.WriteLine($"[AuthController.Login] Request body: {System.Text.Json.JsonSerializer.Serialize(request)}");
            Console.Out.Flush();

            if (!ModelState.IsValid)
            {
                var errors = string.Join(", ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)));
                Console.WriteLine($"[AuthController.Login] ModelState invalid: {errors}");
                Console.Out.Flush();
                return BadRequest(ModelState);
            }

            Console.WriteLine($"[AuthController.Login] Executing login command");
            Console.Out.Flush();

            var result = await loginCommand.HandleAsync(new LoginCommand(request));

            Console.WriteLine($"[AuthController.Login] Command result: {(result is null ? "null" : "success")}");
            Console.Out.Flush();

            if (result is null)
            {
                Console.WriteLine($"[AuthController.Login] Returning Unauthorized");
                Console.Out.Flush();
                return Unauthorized(new { message = "Invalid email or password." });
            }

            Console.WriteLine($"[AuthController.Login] Returning Ok");
            Console.Out.Flush();
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AuthController.Login] EXCEPTION: {ex.GetType().Name} - {ex.Message}");
            Console.WriteLine($"[AuthController.Login] Stack: {ex.StackTrace}");
            Console.Out.Flush();
            throw;
        }
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

        var (result, error) = await registerCommand.HandleAsync(new RegisterCommand(request));
        if (error is not null)
        {
            return BadRequest(new List<string> { error });
        }

        return Ok(result);
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
