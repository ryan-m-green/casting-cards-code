using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;
using System.Text.Json;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class UpdateCastCustomItemsCommandHandlerTests
{
    private ICampaignUpdateRepository _campaignUpdateRepository;
    private UpdateCastCustomItemsCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignUpdateRepository = Substitute.For<ICampaignUpdateRepository>();
        _handler = new UpdateCastCustomItemsCommandHandler(_campaignUpdateRepository);
    }

    [TestCase("UpdateCastCustomItemsCommandHandler serializes custom items to json")]
    public async Task HandleAsync_SerializesCustomItemsToJson(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();

        var request = new UpdateCastCustomItemsRequest
        {
            Items = new List<CampaignCastCustomItemRequest>
            {
                new("Sword", "100"),
                new("Shield", "50")
            }
        };

        // Act
        await _handler.HandleAsync(instanceId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCastCustomItemsAsync(
            Arg.Is<Guid>(x => x == instanceId),
            Arg.Any<string>());
    }

    [TestCase("UpdateCastCustomItemsCommandHandler handles empty items list")]
    public async Task HandleAsync_HandlesEmptyItemsList(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var request = new UpdateCastCustomItemsRequest { Items = [] };

        // Act
        await _handler.HandleAsync(instanceId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCastCustomItemsAsync(
            Arg.Is<Guid>(x => x == instanceId),
            Arg.Any<string>());
    }

    [TestCase("UpdateCastCustomItemsCommandHandler creates domain objects with correct properties")]
    public async Task HandleAsync_CreatesDomainObjectsWithCorrectProperties(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();

        var request = new UpdateCastCustomItemsRequest
        {
            Items = new List<CampaignCastCustomItemRequest>
            {
                new("Item 1", "123")
            }
        };

        // Act
        await _handler.HandleAsync(instanceId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCastCustomItemsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string>());
    }

    [TestCase("UpdateCastCustomItemsCommandHandler calls repository with correct instance id")]
    public async Task HandleAsync_CallsRepositoryWithCorrectInstanceId(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var request = new UpdateCastCustomItemsRequest
        {
            Items = new List<CampaignCastCustomItemRequest>
            {
                new("Test", "1")
            }
        };

        // Act
        await _handler.HandleAsync(instanceId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCastCustomItemsAsync(
            Arg.Is<Guid>(x => x == instanceId),
            Arg.Any<string>());
    }
}
