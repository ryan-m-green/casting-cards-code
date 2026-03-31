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
public class AddCityToCampaignCommandHandlerTests
{
    private ICampaignReadRepository _campaignReadRepository;
    private ICampaignInsertRepository _campaignInsertRepository;
    private ICityRepository _cityRepository;
    private ICityInstanceFactory _cityInstanceFactory;
    private AddCityToCampaignCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignReadRepository = Substitute.For<ICampaignReadRepository>();
        _campaignInsertRepository = Substitute.For<ICampaignInsertRepository>();
        _cityRepository = Substitute.For<ICityRepository>();
        _cityInstanceFactory = Substitute.For<ICityInstanceFactory>();

        _handler = new AddCityToCampaignCommandHandler(
            _campaignReadRepository,
            _campaignInsertRepository,
            _cityRepository,
            _cityInstanceFactory);
    }

    [TestCase("AddCityToCampaignCommandHandler adds city to campaign successfully")]
    [TestCase("AddCityToCampaignCommandHandler returns city instance")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var cityId = Guid.NewGuid();
        var instanceId = Guid.NewGuid();

        var city = new CityDomain { Id = cityId, Name = "Test City" };
        var instance = new CampaignCityInstanceDomain
        {
            InstanceId = instanceId,
            CampaignId = campaignId,
            SourceCityId = cityId,
            SortOrder = 0
        };

        _cityRepository.GetByIdAsync(cityId).Returns(city);
        _campaignReadRepository.GetCityInstancesByCampaignAsync(campaignId).Returns(new List<CampaignCityInstanceDomain>());
        _cityInstanceFactory.Create(city, campaignId, 0).Returns(instance);
        _campaignInsertRepository.InsertCityInstanceAsync(instance).Returns(instance);

        // Act
        var result = await _handler.HandleAsync(campaignId, cityId);

        // Assert
        if (scenario == "AddCityToCampaignCommandHandler adds city to campaign successfully")
        {
            result.Should().NotBeNull();
            result.SourceCityId.Should().Be(cityId);
            result.CampaignId.Should().Be(campaignId);
        }
        else if (scenario == "AddCityToCampaignCommandHandler returns city instance")
        {
            result.Should().NotBeNull();
            result.InstanceId.Should().Be(instanceId);
        }
    }

    [TestCase("AddCityToCampaignCommandHandler calls repositories in correct order")]
    public async Task HandleAsync_CallsRepositoriesInCorrectOrder(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var cityId = Guid.NewGuid();
        var callOrder = new List<string>();

        var city = new CityDomain { Id = cityId };
        var instance = new CampaignCityInstanceDomain 
        { 
            InstanceId = Guid.NewGuid(), 
            CampaignId = campaignId, 
            SourceCityId = cityId,
            SortOrder = 0
        };

        _cityRepository.GetByIdAsync(cityId).Returns(x =>
        {
            callOrder.Add("GetByIdAsync");
            return city;
        });

        _campaignReadRepository.GetCityInstancesByCampaignAsync(campaignId).Returns(x =>
        {
            callOrder.Add("GetCityInstancesByCampaignAsync");
            return new List<CampaignCityInstanceDomain>();
        });

        _cityInstanceFactory.Create(city, campaignId, 0).Returns(instance);

        _campaignInsertRepository.InsertCityInstanceAsync(instance).Returns(x =>
        {
            callOrder.Add("InsertCityInstanceAsync");
            return instance;
        });

        // Act
        await _handler.HandleAsync(campaignId, cityId);

        // Assert
        callOrder.Should().ContainInOrder("GetByIdAsync", "GetCityInstancesByCampaignAsync", "InsertCityInstanceAsync");
    }

    [TestCase("AddCityToCampaignCommandHandler returns null when city not found")]
    public async Task HandleAsync_ReturnsNull_WhenCityNotFound(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var cityId = Guid.NewGuid();

        _cityRepository.GetByIdAsync(cityId).Returns((CityDomain)null);

        // Act
        var result = await _handler.HandleAsync(campaignId, cityId);

        // Assert
        result.Should().BeNull();
        await _campaignReadRepository.DidNotReceive().GetCityInstancesByCampaignAsync(Arg.Any<Guid>());
        _cityInstanceFactory.DidNotReceive().Create(Arg.Any<CityDomain>(), Arg.Any<Guid>(), Arg.Any<int>());
    }

    [TestCase("AddCityToCampaignCommandHandler sets display order based on existing cities")]
    public async Task HandleAsync_SetsDisplayOrderCorrectly(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var cityId = Guid.NewGuid();
        var existingCount = 3;

        var city = new CityDomain { Id = cityId };
        var existingCities = Enumerable.Range(0, existingCount)
            .Select(_ => new CampaignCityInstanceDomain { InstanceId = Guid.NewGuid() })
            .ToList();

        var instance = new CampaignCityInstanceDomain
        {
            InstanceId = Guid.NewGuid(),
            CampaignId = campaignId,
            SourceCityId = cityId,
            SortOrder = existingCount
        };

        _cityRepository.GetByIdAsync(cityId).Returns(city);
        _campaignReadRepository.GetCityInstancesByCampaignAsync(campaignId).Returns(existingCities);
        _cityInstanceFactory.Create(city, campaignId, existingCount).Returns(instance);
        _campaignInsertRepository.InsertCityInstanceAsync(instance).Returns(instance);

        // Act
        await _handler.HandleAsync(campaignId, cityId);

        // Assert
        _cityInstanceFactory.Received(1).Create(city, campaignId, existingCount);
    }

    [TestCase("AddCityToCampaignCommandHandler inserts city instance into repository")]
    public async Task HandleAsync_InsertsInstance(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var cityId = Guid.NewGuid();

        var city = new CityDomain { Id = cityId };
        var instance = new CampaignCityInstanceDomain
        {
            InstanceId = Guid.NewGuid(),
            CampaignId = campaignId,
            SourceCityId = cityId,
            SortOrder = 0
        };

        _cityRepository.GetByIdAsync(cityId).Returns(city);
        _campaignReadRepository.GetCityInstancesByCampaignAsync(campaignId).Returns(new List<CampaignCityInstanceDomain>());
        _cityInstanceFactory.Create(city, campaignId, 0).Returns(instance);
        _campaignInsertRepository.InsertCityInstanceAsync(instance).Returns(instance);

        // Act
        await _handler.HandleAsync(campaignId, cityId);

        // Assert
        await _campaignInsertRepository.Received(1).InsertCityInstanceAsync(instance);
    }
}
