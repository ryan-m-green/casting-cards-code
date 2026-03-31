using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Factories;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class AddLocationToCampaignCommandHandlerTests
{
    private ICampaignReadRepository _campaignReadRepository;
    private ICampaignInsertRepository _campaignInsertRepository;
    private ILocationRepository _locationRepository;
    private ILocationInstanceFactory _locationInstanceFactory;
    private AddLocationToCampaignCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignReadRepository = Substitute.For<ICampaignReadRepository>();
        _campaignInsertRepository = Substitute.For<ICampaignInsertRepository>();
        _locationRepository = Substitute.For<ILocationRepository>();
        _locationInstanceFactory = Substitute.For<ILocationInstanceFactory>();

        _handler = new AddLocationToCampaignCommandHandler(
            _campaignReadRepository,
            _campaignInsertRepository,
            _locationRepository,
            _locationInstanceFactory);
    }

    [TestCase("AddLocationToCampaignCommandHandler adds location to campaign successfully")]
    [TestCase("AddLocationToCampaignCommandHandler returns location instance")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var locationId = Guid.NewGuid();
        var cityInstanceId = Guid.NewGuid();
        var instanceId = Guid.NewGuid();

        var location = new LocationDomain { Id = locationId, Name = "Test Location" };
        var instance = new CampaignLocationInstanceDomain
        {
            InstanceId = instanceId,
            CampaignId = campaignId,
            SourceLocationId = locationId
        };

        _locationRepository.GetByIdAsync(locationId).Returns(location);
        _campaignReadRepository.GetLocationInstanceBySourceLocationIdAsync(campaignId, locationId).Returns((CampaignLocationInstanceDomain)null);
        _locationInstanceFactory.Create(location, campaignId, cityInstanceId).Returns(instance);
        _campaignInsertRepository.InsertLocationInstanceAsync(instance).Returns(instance);

        // Act
        var result = await _handler.HandleAsync(campaignId, locationId, cityInstanceId);

        // Assert
        if (scenario == "AddLocationToCampaignCommandHandler adds location to campaign successfully")
        {
            result.Should().NotBeNull();
            result.SourceLocationId.Should().Be(locationId);
            result.CampaignId.Should().Be(campaignId);
        }
        else if (scenario == "AddLocationToCampaignCommandHandler returns location instance")
        {
            result.Should().NotBeNull();
            result.InstanceId.Should().Be(instanceId);
        }
    }

    [TestCase("AddLocationToCampaignCommandHandler calls repositories in correct order")]
    public async Task HandleAsync_CallsRepositoriesInCorrectOrder(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var locationId = Guid.NewGuid();
        var callOrder = new List<string>();

        var location = new LocationDomain { Id = locationId };
        var instance = new CampaignLocationInstanceDomain
        {
            InstanceId = Guid.NewGuid(),
            CampaignId = campaignId,
            SourceLocationId = locationId
        };

        _locationRepository.GetByIdAsync(locationId).Returns(x =>
        {
            callOrder.Add("GetByIdAsync");
            return location;
        });

        _campaignReadRepository.GetLocationInstanceBySourceLocationIdAsync(campaignId, locationId).Returns(x =>
        {
            callOrder.Add("GetLocationInstanceBySourceLocationIdAsync");
            return (CampaignLocationInstanceDomain)null;
        });

        _locationInstanceFactory.Create(location, campaignId, null).Returns(instance);

        _campaignInsertRepository.InsertLocationInstanceAsync(instance).Returns(x =>
        {
            callOrder.Add("InsertLocationInstanceAsync");
            return instance;
        });

        // Act
        await _handler.HandleAsync(campaignId, locationId, null);

        // Assert
        callOrder.Should().ContainInOrder("GetByIdAsync", "GetLocationInstanceBySourceLocationIdAsync", "InsertLocationInstanceAsync");
    }

    [TestCase("AddLocationToCampaignCommandHandler returns null when location not found")]
    public async Task HandleAsync_ReturnsNull_WhenLocationNotFound(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var locationId = Guid.NewGuid();

        _locationRepository.GetByIdAsync(locationId).Returns((LocationDomain)null);

        // Act
        var result = await _handler.HandleAsync(campaignId, locationId, null);

        // Assert
        result.Should().BeNull();
        await _campaignReadRepository.DidNotReceive().GetLocationInstanceBySourceLocationIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        _locationInstanceFactory.DidNotReceive().Create(Arg.Any<LocationDomain>(), Arg.Any<Guid>(), Arg.Any<Guid?>());
    }

    [TestCase("AddLocationToCampaignCommandHandler returns null when location already in campaign")]
    public async Task HandleAsync_ReturnsNull_WhenLocationAlreadyExists(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var locationId = Guid.NewGuid();
        var existingInstanceId = Guid.NewGuid();

        var location = new LocationDomain { Id = locationId };
        var existingInstance = new CampaignLocationInstanceDomain
        {
            InstanceId = existingInstanceId,
            CampaignId = campaignId,
            SourceLocationId = locationId
        };

        _locationRepository.GetByIdAsync(locationId).Returns(location);
        _campaignReadRepository.GetLocationInstanceBySourceLocationIdAsync(campaignId, locationId).Returns(existingInstance);

        // Act
        var result = await _handler.HandleAsync(campaignId, locationId, null);

        // Assert
        result.Should().BeNull();
        _locationInstanceFactory.DidNotReceive().Create(Arg.Any<LocationDomain>(), Arg.Any<Guid>(), Arg.Any<Guid?>());
        await _campaignInsertRepository.DidNotReceive().InsertLocationInstanceAsync(Arg.Any<CampaignLocationInstanceDomain>());
    }

    [TestCase("AddLocationToCampaignCommandHandler inserts location instance into repository")]
    public async Task HandleAsync_InsertsInstance(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var locationId = Guid.NewGuid();
        var cityInstanceId = Guid.NewGuid();

        var location = new LocationDomain { Id = locationId };
        var instance = new CampaignLocationInstanceDomain
        {
            InstanceId = Guid.NewGuid(),
            CampaignId = campaignId,
            SourceLocationId = locationId
        };

        _locationRepository.GetByIdAsync(locationId).Returns(location);
        _campaignReadRepository.GetLocationInstanceBySourceLocationIdAsync(campaignId, locationId).Returns((CampaignLocationInstanceDomain)null);
        _locationInstanceFactory.Create(location, campaignId, cityInstanceId).Returns(instance);
        _campaignInsertRepository.InsertLocationInstanceAsync(instance).Returns(instance);

        // Act
        await _handler.HandleAsync(campaignId, locationId, cityInstanceId);

        // Assert
        await _campaignInsertRepository.Received(1).InsertLocationInstanceAsync(instance);
    }
}
