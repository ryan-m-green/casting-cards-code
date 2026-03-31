using CastLibrary.Logic.Commands.Location;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Location;

[TestFixture]
public class UpdateLocationCommandHandlerTests
{
    private ILocationRepository _locationRepository;
    private UpdateLocationCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _locationRepository = Substitute.For<ILocationRepository>();
        _handler = new UpdateLocationCommandHandler(_locationRepository);
    }

    [TestCase("UpdateLocationCommandHandler updates location successfully")]
    [TestCase("UpdateLocationCommandHandler returns updated location")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var cityId = Guid.NewGuid();

        var request = new CreateLocationRequest
        {
            Name = "Updated Location",
            CityId = cityId,
            Description = "Updated description",
            ShopItems = []
        };

        var existing = new LocationDomain
        {
            Id = locationId,
            DmUserId = dmUserId,
            Name = "Old Location"
        };

        _locationRepository.GetByIdAsync(locationId).Returns(existing);
        _locationRepository.UpdateAsync(Arg.Any<LocationDomain>()).Returns(x => x.ArgAt<LocationDomain>(0));

        // Act
        var result = await _handler.HandleAsync(locationId, request, dmUserId);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Updated Location");
    }

    [TestCase("UpdateLocationCommandHandler returns null when location not found")]
    public async Task HandleAsync_ReturnsNullWhenLocationNotFound(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new CreateLocationRequest { Name = "Test", CityId = Guid.NewGuid(), ShopItems = [] };

        _locationRepository.GetByIdAsync(locationId).Returns((LocationDomain)null);

        // Act
        var result = await _handler.HandleAsync(locationId, request, dmUserId);

        // Assert
        result.Should().BeNull();
        await _locationRepository.DidNotReceive().UpdateAsync(Arg.Any<LocationDomain>());
    }

    [TestCase("UpdateLocationCommandHandler returns null when user not owner")]
    public async Task HandleAsync_ReturnsNullWhenUserNotOwner(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var differentUserId = Guid.NewGuid();
        var request = new CreateLocationRequest { Name = "Test", CityId = Guid.NewGuid(), ShopItems = [] };

        var existing = new LocationDomain { Id = locationId, DmUserId = differentUserId };

        _locationRepository.GetByIdAsync(locationId).Returns(existing);

        // Act
        var result = await _handler.HandleAsync(locationId, request, dmUserId);

        // Assert
        result.Should().BeNull();
        await _locationRepository.DidNotReceive().UpdateAsync(Arg.Any<LocationDomain>());
    }

    [TestCase("UpdateLocationCommandHandler updates shop items with correct sort order")]
    public async Task HandleAsync_UpdatesShopItemsWithSortOrder(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var cityId = Guid.NewGuid();

        var request = new CreateLocationRequest
        {
            Name = "Shop",
            CityId = cityId,
            Description = "A shop",
            ShopItems = new List<ShopItemRequest>
            {
                new ShopItemRequest { Name = "Sword", Price = "100", Description = "A sword" },
                new ShopItemRequest { Name = "Shield", Price = "50", Description = "A shield" }
            }
        };

        var existing = new LocationDomain { Id = locationId, DmUserId = dmUserId };

        _locationRepository.GetByIdAsync(locationId).Returns(existing);
        _locationRepository.UpdateAsync(Arg.Any<LocationDomain>()).Returns(x => x.ArgAt<LocationDomain>(0));

        // Act
        var result = await _handler.HandleAsync(locationId, request, dmUserId);

        // Assert
        result.ShopItems.Should().HaveCount(2);
        result.ShopItems[0].Name.Should().Be("Sword");
        result.ShopItems[0].SortOrder.Should().Be(0);
        result.ShopItems[0].LocationId.Should().Be(locationId);
        result.ShopItems[1].Name.Should().Be("Shield");
        result.ShopItems[1].SortOrder.Should().Be(1);
    }

    [TestCase("UpdateLocationCommandHandler calls repository update")]
    public async Task HandleAsync_CallsRepositoryUpdate(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new CreateLocationRequest { Name = "Updated", CityId = Guid.NewGuid(), ShopItems = [] };

        var existing = new LocationDomain { Id = locationId, DmUserId = dmUserId };

        _locationRepository.GetByIdAsync(locationId).Returns(existing);
        _locationRepository.UpdateAsync(Arg.Any<LocationDomain>()).Returns(x => x.ArgAt<LocationDomain>(0));

        // Act
        await _handler.HandleAsync(locationId, request, dmUserId);

                 // Assert
                 await _locationRepository.Received(1).UpdateAsync(
                     Arg.Is<LocationDomain>(l => l.Id == locationId && l.Name == "Updated"));
            }
        }
