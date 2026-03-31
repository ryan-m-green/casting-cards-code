using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Factories;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class CreateCampaignCommandHandlerTests
{
    private ICampaignInsertRepository _campaignInsertRepository;
    private ICityRepository _cityRepository;
    private ICampaignFactory _campaignFactory;
    private ICityInstanceFactory _cityInstanceFactory;
    private CreateCampaignCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignInsertRepository = Substitute.For<ICampaignInsertRepository>();
        _cityRepository = Substitute.For<ICityRepository>();
        _campaignFactory = Substitute.For<ICampaignFactory>();
        _cityInstanceFactory = Substitute.For<ICityInstanceFactory>();

        _handler = new CreateCampaignCommandHandler(
            _campaignInsertRepository,
            _cityRepository,
            _campaignFactory,
            _cityInstanceFactory);
    }

    [TestCase("CreateCampaignCommandHandler creates campaign successfully")]
    [TestCase("CreateCampaignCommandHandler returns created campaign")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();
        var request = new CreateCampaignRequest
        {
            Name = "Test Campaign",
            FantasyType = "Fantasy",
            Description = "Test Description",
            CityIds = []
        };

        var campaign = new CampaignDomain
        {
            Id = campaignId,
            Name = request.Name,
            DmUserId = dmUserId
        };

        _campaignFactory.Create(request, dmUserId).Returns(campaign);
        _campaignInsertRepository.InsertAsync(campaign).Returns(campaign);

        // Act
        var result = await _handler.HandleAsync(request, dmUserId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(campaignId);
        result.DmUserId.Should().Be(dmUserId);
    }

    [TestCase("CreateCampaignCommandHandler calls factory and repository")]
    public async Task HandleAsync_CallsFactoryAndRepository(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();
        var request = new CreateCampaignRequest { CityIds = [] };

        var campaign = new CampaignDomain { Id = campaignId, DmUserId = dmUserId };

        _campaignFactory.Create(request, dmUserId).Returns(campaign);
        _campaignInsertRepository.InsertAsync(campaign).Returns(campaign);

        // Act
        await _handler.HandleAsync(request, dmUserId);

        // Assert
        _campaignFactory.Received(1).Create(request, dmUserId);
        await _campaignInsertRepository.Received(1).InsertAsync(campaign);
    }

    [TestCase("CreateCampaignCommandHandler adds city instances with correct sort order")]
    public async Task HandleAsync_AddsCityInstancesWithCorrectSortOrder(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();
        var cityId1 = Guid.NewGuid();
        var cityId2 = Guid.NewGuid();

        var request = new CreateCampaignRequest
        {
            CityIds = [cityId1, cityId2]
        };

        var campaign = new CampaignDomain { Id = campaignId, DmUserId = dmUserId };
        var city1 = new CityDomain { Id = cityId1, Name = "City 1" };
        var city2 = new CityDomain { Id = cityId2, Name = "City 2" };

        _campaignFactory.Create(request, dmUserId).Returns(campaign);
        _campaignInsertRepository.InsertAsync(campaign).Returns(campaign);
        _cityRepository.GetByIdAsync(cityId1).Returns(city1);
        _cityRepository.GetByIdAsync(cityId2).Returns(city2);

        var instance1 = new CampaignCityInstanceDomain { SourceCityId = cityId1, SortOrder = 0 };
        var instance2 = new CampaignCityInstanceDomain { SourceCityId = cityId2, SortOrder = 1 };

        _cityInstanceFactory.Create(city1, campaignId, 0).Returns(instance1);
        _cityInstanceFactory.Create(city2, campaignId, 1).Returns(instance2);

        // Act
        await _handler.HandleAsync(request, dmUserId);

        // Assert
        await _campaignInsertRepository.Received(1).InsertCityInstanceAsync(
            Arg.Is<CampaignCityInstanceDomain>(x => x.SourceCityId == cityId1 && x.SortOrder == 0));
        await _campaignInsertRepository.Received(1).InsertCityInstanceAsync(
            Arg.Is<CampaignCityInstanceDomain>(x => x.SourceCityId == cityId2 && x.SortOrder == 1));
    }

    [TestCase("CreateCampaignCommandHandler skips null cities")]
    public async Task HandleAsync_SkipsNullCities(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();
        var cityId1 = Guid.NewGuid();
        var cityId2 = Guid.NewGuid();

        var request = new CreateCampaignRequest
        {
            CityIds = [cityId1, cityId2]
        };

        var campaign = new CampaignDomain { Id = campaignId, DmUserId = dmUserId };
        var city1 = new CityDomain { Id = cityId1, Name = "City 1" };

        _campaignFactory.Create(request, dmUserId).Returns(campaign);
        _campaignInsertRepository.InsertAsync(campaign).Returns(campaign);
        _cityRepository.GetByIdAsync(cityId1).Returns(city1);
        _cityRepository.GetByIdAsync(cityId2).Returns((CityDomain)null);

        var instance1 = new CampaignCityInstanceDomain { SourceCityId = cityId1, SortOrder = 0 };
        _cityInstanceFactory.Create(city1, campaignId, 0).Returns(instance1);

        // Act
        await _handler.HandleAsync(request, dmUserId);

        // Assert
        await _campaignInsertRepository.Received(1).InsertCityInstanceAsync(Arg.Any<CampaignCityInstanceDomain>());
    }
}
