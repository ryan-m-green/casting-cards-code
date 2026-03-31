using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class UpdateCityInstanceVisibilityCommandHandlerTests
{
    private ICampaignUpdateRepository _campaignUpdateRepository;
    private UpdateCityInstanceVisibilityCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignUpdateRepository = Substitute.For<ICampaignUpdateRepository>();
        _handler = new UpdateCityInstanceVisibilityCommandHandler(_campaignUpdateRepository);
    }

    [TestCase("UpdateCityInstanceVisibilityCommandHandler updates visibility to true")]
    public async Task HandleAsync_UpdatesVisibilityToTrue(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var request = new UpdateCityInstanceVisibilityRequest { IsVisibleToPlayers = true };

        // Act
        await _handler.HandleAsync(instanceId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCityInstanceVisibilityAsync(instanceId, true);
    }

    [TestCase("UpdateCityInstanceVisibilityCommandHandler updates visibility to false")]
    public async Task HandleAsync_UpdatesVisibilityToFalse(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var request = new UpdateCityInstanceVisibilityRequest { IsVisibleToPlayers = false };

        // Act
        await _handler.HandleAsync(instanceId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCityInstanceVisibilityAsync(instanceId, false);
    }

    [TestCase("UpdateCityInstanceVisibilityCommandHandler calls repository with correct parameters")]
    public async Task HandleAsync_CallsRepositoryWithCorrectParameters(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var request = new UpdateCityInstanceVisibilityRequest { IsVisibleToPlayers = true };

        // Act
        await _handler.HandleAsync(instanceId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCityInstanceVisibilityAsync(
            Arg.Is<Guid>(x => x == instanceId),
            Arg.Is<bool>(x => x == true));
    }
}
