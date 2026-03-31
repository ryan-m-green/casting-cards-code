using CastLibrary.Logic.Commands.Location;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Location;

[TestFixture]
public class CreateLocationCommandHandlerTests
{
    private ILocationRepository _locationRepository;
    private CreateLocationCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _locationRepository = Substitute.For<ILocationRepository>();
        _handler = new CreateLocationCommandHandler(_locationRepository);
    }

    [TestCase("CreateLocationCommandHandler creates location successfully")]
    [TestCase("CreateLocationCommandHandler returns created location")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var cityId = Guid.NewGuid();

        var request = new CreateLocationRequest
        {
            Name = "Test Location",
            CityId = cityId,
            Description = "A test location",
            ShopItems = []
        };

        var insertedLocation = new LocationDomain();

        _locationRepository.InsertAsync(Arg.Any<LocationDomain>()).Returns(x => x.ArgAt<LocationDomain>(0));

        // Act
        var result = await _handler.HandleAsync(request, dmUserId);

        // Assert
        result.Should().NotBeNull();
        result.DmUserId.Should().Be(dmUserId);
        result.CityId.Should().Be(cityId);
        result.Name.Should().Be("Test Location");
    }

    [TestCase("CreateLocationCommandHandler creates location with shop items")]
    public async Task HandleAsync_CreatesWithShopItems(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var cityId = Guid.NewGuid();

        var request = new CreateLocationRequest
        {
            Name = "Test Location",
            CityId = cityId,
            Description = "A shop",
            ShopItems = new List<ShopItemRequest>
            {
                new ShopItemRequest { Name = "Sword", Price = "100", Description = "A sword" },
                new ShopItemRequest { Name = "Shield", Price = "50", Description = "A shield" }
            }
        };

        _locationRepository.InsertAsync(Arg.Any<LocationDomain>()).Returns(x => x.ArgAt<LocationDomain>(0));

        // Act
        var result = await _handler.HandleAsync(request, dmUserId);

        // Assert
        result.ShopItems.Should().HaveCount(2);
        result.ShopItems[0].Name.Should().Be("Sword");
        result.ShopItems[0].SortOrder.Should().Be(0);
        result.ShopItems[1].Name.Should().Be("Shield");
        result.ShopItems[1].SortOrder.Should().Be(1);
    }

    [TestCase("CreateLocationCommandHandler sets created at timestamp")]
    public async Task HandleAsync_SetsCreatedAtTimestamp(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var before = DateTime.UtcNow;
        var request = new CreateLocationRequest { Name = "Test", CityId = Guid.NewGuid(), ShopItems = [] };

        _locationRepository.InsertAsync(Arg.Any<LocationDomain>()).Returns(x => x.ArgAt<LocationDomain>(0));

        // Act
        var result = await _handler.HandleAsync(request, dmUserId);

        // Assert
        result.CreatedAt.Should().BeCloseTo(before, TimeSpan.FromSeconds(1));
    }

    [TestCase("CreateLocationCommandHandler calls repository insert")]
    public async Task HandleAsync_CallsRepositoryInsert(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var request = new CreateLocationRequest { Name = "Test", CityId = Guid.NewGuid(), ShopItems = [] };

        _locationRepository.InsertAsync(Arg.Any<LocationDomain>()).Returns(x => x.ArgAt<LocationDomain>(0));

        // Act
        await _handler.HandleAsync(request, dmUserId);

        // Assert
                 await _locationRepository.Received(1).InsertAsync(
                     Arg.Is<LocationDomain>(l => l.DmUserId == dmUserId && l.Name == "Test"));
            }
        }
