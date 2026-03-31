using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class UpdateCityInstanceCommandHandlerTests
{
    private ICampaignReadRepository _campaignReadRepository;
    private ICampaignUpdateRepository _campaignUpdateRepository;
    private UpdateCityInstanceCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignReadRepository = Substitute.For<ICampaignReadRepository>();
        _campaignUpdateRepository = Substitute.For<ICampaignUpdateRepository>();
        _handler = new UpdateCityInstanceCommandHandler(_campaignReadRepository, _campaignUpdateRepository);
    }

    [TestCase("UpdateCityInstanceCommandHandler updates city instance successfully")]
    public async Task HandleAsync_WhenInstanceFound(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var request = new UpdateCityInstanceRequest
        {
            Condition = "Updated Condition",
            Geography = "Updated Geography",
            Climate = "Updated Climate",
            Religion = "Updated Religion",
            Vibe = "Updated Vibe",
            Languages = "Updated Languages"
        };

        var instance = new CampaignCityInstanceDomain
        {
            InstanceId = instanceId,
            Condition = "Old Condition",
            Geography = "Old Geography",
            Climate = "Old Climate",
            Religion = "Old Religion",
            Vibe = "Old Vibe",
            Languages = "Old Languages"
        };

        _campaignReadRepository.GetCityInstanceByIdAsync(instanceId).Returns(instance);

        // Act
        await _handler.HandleAsync(instanceId, request);

        // Assert
        instance.Condition.Should().Be("Updated Condition");
        instance.Geography.Should().Be("Updated Geography");
        instance.Climate.Should().Be("Updated Climate");
        instance.Religion.Should().Be("Updated Religion");
        instance.Vibe.Should().Be("Updated Vibe");
        instance.Languages.Should().Be("Updated Languages");
        await _campaignUpdateRepository.Received(1).UpdateCityInstanceAsync(instance);
    }

    [TestCase("UpdateCityInstanceCommandHandler returns early when instance not found")]
    public async Task HandleAsync_WhenInstanceNotFound(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var request = new UpdateCityInstanceRequest { Condition = "Test" };

        _campaignReadRepository.GetCityInstanceByIdAsync(instanceId).Returns((CampaignCityInstanceDomain)null);

        // Act
        await _handler.HandleAsync(instanceId, request);

        // Assert
        await _campaignUpdateRepository.DidNotReceive().UpdateCityInstanceAsync(Arg.Any<CampaignCityInstanceDomain>());
    }

    [TestCase("UpdateCityInstanceCommandHandler only updates provided properties")]
    public async Task HandleAsync_UpdatesOnlyProvidedProperties(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var request = new UpdateCityInstanceRequest { Condition = "New Condition" };

        var instance = new CampaignCityInstanceDomain
        {
            InstanceId = instanceId,
            Condition = "Old Condition"
        };

        _campaignReadRepository.GetCityInstanceByIdAsync(instanceId).Returns(instance);

        // Act
        await _handler.HandleAsync(instanceId, request);

        // Assert
        instance.Condition.Should().Be("New Condition");
        await _campaignUpdateRepository.Received(1).UpdateCityInstanceAsync(instance);
    }
}
