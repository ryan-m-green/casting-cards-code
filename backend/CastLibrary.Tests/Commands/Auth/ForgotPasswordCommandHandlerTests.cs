using CastLibrary.Logic.Commands.Auth;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using CastLibrary.Adapter.Operators;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Auth;

[TestFixture]
public class ForgotPasswordCommandHandlerTests
{
    private IUserRepository _userRepository;
    private IPasswordResetTokenRepository _tokenRepository;
    private IEmailOperator _emailOperator;
    private IConfiguration _configuration;
    private ILogger<IForgotPasswordCommandHandler> _logger;
    private ForgotPasswordCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _userRepository = Substitute.For<IUserRepository>();
        _tokenRepository = Substitute.For<IPasswordResetTokenRepository>();
        _emailOperator = Substitute.For<IEmailOperator>();
        _configuration = Substitute.For<IConfiguration>();
        _logger = Substitute.For<ILogger<IForgotPasswordCommandHandler>>();

        _handler = new ForgotPasswordCommandHandler(
            _userRepository,
            _tokenRepository,
            _emailOperator,
            _configuration,
            _logger);
    }

    [TestCase("executes password reset flow")]
    [TestCase("calls methods in correct order")]
    public async Task ForgotPasswordCommandHandler_WhenUserExists(string scenario)
    {
        // Arrange
        var email = "user@example.com";
        var userId = Guid.NewGuid();
        var user = new UserDomain
        {
            Id = userId,
            Email = email,
            DisplayName = "Test User"
        };

        var request = new ForgotPasswordRequest { Email = email };
        var callOrder = new List<string>();

        _userRepository.GetByEmailAsync(email).Returns(x =>
        {
            callOrder.Add("GetByEmailAsync");
            return user;
        });

        _tokenRepository.InsertAsync(Arg.Any<PasswordResetTokenDomain>()).Returns(x =>
        {
            callOrder.Add("InsertAsync");
            return Task.CompletedTask;
        });

        _emailOperator.SendPasswordResetEmailAsync(Arg.Any<PasswordResetEmailDomain>()).Returns(x =>
        {
            callOrder.Add("SendPasswordResetEmailAsync");
            return Task.CompletedTask;
        });

        _configuration["Email:FrontendBaseUrl"].Returns("https://example.com");

        // Act
        await _handler.HandleAsync(request);

        // Assert
        if (scenario == "ForgotPasswordCommandHandler executes password reset flow")
        {
            await _userRepository.Received(1).GetByEmailAsync(email);
            await _tokenRepository.Received(1).InsertAsync(Arg.Is<PasswordResetTokenDomain>(t =>
                t.UserId == userId &&
                t.TokenHash != null &&
                t.ExpiresAt > DateTime.UtcNow));

            await _emailOperator.Received(1).SendPasswordResetEmailAsync(Arg.Is<PasswordResetEmailDomain>(e =>
                e.ToEmail == email &&
                e.DisplayName == "Test User" &&
                e.ResetLink.StartsWith("https://example.com/reset-password?token=")));
        }
        else if (scenario == "ForgotPasswordCommandHandler calls methods in correct order")
        {
            callOrder.Should().ContainInOrder("GetByEmailAsync", "InsertAsync", "SendPasswordResetEmailAsync");
        }
    }

    [TestCase("nonexistent@example.com")]
    public async Task ForgotPasswordCommandHandler_ReturnsEarlyWithoutTokenInsertion_WhenUserNotFound(string email)
    {
        // Arrange
        var request = new ForgotPasswordRequest { Email = email };

        _userRepository.GetByEmailAsync(email).Returns((UserDomain)null);

        // Act
        await _handler.HandleAsync(request);

        // Assert
        await _userRepository.Received(1).GetByEmailAsync(email);
        await _tokenRepository.DidNotReceive().InsertAsync(Arg.Any<PasswordResetTokenDomain>());
        await _emailOperator.DidNotReceive().SendPasswordResetEmailAsync(Arg.Any<PasswordResetEmailDomain>());
    }

    [TestCase("SMTP connection failed")]
    public async Task ForgotPasswordCommandHandler_LogsErrorAndCompletes_WhenEmailSendingFails(string exceptionMessage)
    {
        // Arrange
        var email = "user@example.com";
        var userId = Guid.NewGuid();
        var user = new UserDomain
        {
            Id = userId,
            Email = email,
            DisplayName = "Test User"
        };

        var request = new ForgotPasswordRequest { Email = email };
        var sendException = new Exception("SMTP connection failed");

        _userRepository.GetByEmailAsync(email).Returns(user);
        _configuration["Email:FrontendBaseUrl"].Returns("https://example.com");
        _emailOperator.SendPasswordResetEmailAsync(Arg.Any<PasswordResetEmailDomain>())
            .Returns(Task.FromException(sendException));

        // Act
        var act = async () => await _handler.HandleAsync(request);

        // Assert
        await act.Should().NotThrowAsync();
        await _userRepository.Received(1).GetByEmailAsync(email);
        await _tokenRepository.Received(1).InsertAsync(Arg.Any<PasswordResetTokenDomain>());
        _logger.Received(1).Log(
            LogLevel.Error,
            Arg.Any<EventId>(),
            Arg.Is<object>(v => v.ToString().Contains("Failed to send password reset email")),
            Arg.Is<Exception>(e => e == sendException),
            Arg.Any<Func<object, Exception, string>>());
    }

    [TestCase("ForgotPasswordCommandHandler removes trailing slash from frontend base url")]
    public async Task RemovesTrailingSlash_FromFrontendBaseUrl(string scenario)
    {
        // Arrange
        var email = "user@example.com";
        var user = new UserDomain
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = "Test User"
        };

        var baseUrl = "https://example.com/";
        var request = new ForgotPasswordRequest { Email = email };

        _userRepository.GetByEmailAsync(email).Returns(user);
        _configuration["Email:FrontendBaseUrl"].Returns(baseUrl);
        _emailOperator.SendPasswordResetEmailAsync(Arg.Any<PasswordResetEmailDomain>())
            .Returns(Task.CompletedTask);

        // Act
        await _handler.HandleAsync(request);

        // Assert
        await _emailOperator.Received(1).SendPasswordResetEmailAsync(Arg.Is<PasswordResetEmailDomain>(e =>
            e.ResetLink.StartsWith("https://example.com/reset-password?token=") &&
            !e.ResetLink.Contains("//reset-password")));
    }
}
