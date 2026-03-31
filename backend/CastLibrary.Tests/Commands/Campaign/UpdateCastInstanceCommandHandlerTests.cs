using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class UpdateCastInstanceCommandHandlerTests
{
    private UpdateCastInstanceCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _handler = new UpdateCastInstanceCommandHandler();
    }

    [TestCase("UpdateCastInstanceCommandHandler completes without error")]
    public async Task HandleAsync_CompletesWithoutError(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var request = new UpdateCastInstanceRequest { CastInstanceId = Guid.NewGuid() };

        // Act
        var act = async () => await _handler.HandleAsync(instanceId, request);

        // Assert
        await act.Should().NotThrowAsync();
    }

    [TestCase("UpdateCastInstanceCommandHandler handles null cast instance id")]
    public async Task HandleAsync_HandlesNullCastInstanceId(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var request = new UpdateCastInstanceRequest { CastInstanceId = null };

        // Act
        var act = async () => await _handler.HandleAsync(instanceId, request);

        // Assert
        await act.Should().NotThrowAsync();
    }
}
