using CastLibrary.Logic.Commands.Location;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Location;

[TestFixture]
public class DeleteLocationCommandHandlerTests
{
    private ILocationRepository _locationRepository;
    private IImageStorageOperator _imageStorage;
    private IImageKeyCreator _imageKeyCreator;
    private DeleteLocationCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _locationRepository = Substitute.For<ILocationRepository>();
        _imageStorage = Substitute.For<IImageStorageOperator>();
        _imageKeyCreator = Substitute.For<IImageKeyCreator>();

        _handler = new DeleteLocationCommandHandler(_locationRepository, _imageStorage, _imageKeyCreator);
    }

    [TestCase("DeleteLocationCommandHandler deletes location when found")]
    public async Task HandleAsync_DeletesLocationWhenFound(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        var location = new LocationDomain { Id = locationId, DmUserId = dmUserId, Name = "Test Location" };

        _locationRepository.GetByIdAsync(locationId).Returns(location);
        _imageKeyCreator.Create(dmUserId, locationId, EntityType.Location).Returns((string)null);

        // Act
        var result = await _handler.HandleAsync(locationId, dmUserId);

        // Assert
        result.Should().BeTrue();
        await _locationRepository.Received(1).DeleteAsync(locationId);
    }

    [TestCase("DeleteLocationCommandHandler returns false when location not found")]
    public async Task HandleAsync_ReturnsFalseWhenLocationNotFound(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        _locationRepository.GetByIdAsync(locationId).Returns((LocationDomain)null);

        // Act
        var result = await _handler.HandleAsync(locationId, dmUserId);

        // Assert
        result.Should().BeFalse();
        await _locationRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    [TestCase("DeleteLocationCommandHandler returns false when user not owner")]
    public async Task HandleAsync_ReturnsFalseWhenUserNotOwner(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var differentUserId = Guid.NewGuid();

        var location = new LocationDomain { Id = locationId, DmUserId = differentUserId };

        _locationRepository.GetByIdAsync(locationId).Returns(location);

        // Act
        var result = await _handler.HandleAsync(locationId, dmUserId);

        // Assert
        result.Should().BeFalse();
        await _locationRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    [TestCase("DeleteLocationCommandHandler deletes image when path exists")]
    public async Task HandleAsync_DeletesImageWhenPathExists(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var imagePath = $"{dmUserId}/locations/{locationId}.jpg";

        var location = new LocationDomain { Id = locationId, DmUserId = dmUserId };

        _locationRepository.GetByIdAsync(locationId).Returns(location);
        _imageKeyCreator.Create(dmUserId, locationId, EntityType.Location).Returns(imagePath);

        // Act
        await _handler.HandleAsync(locationId, dmUserId);

        // Assert
        await _imageStorage.Received(1).DeleteAsync(imagePath);
    }

    [TestCase("DeleteLocationCommandHandler does not delete image when path is null")]
    public async Task HandleAsync_DoesNotDeleteImageWhenPathNull(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        var location = new LocationDomain { Id = locationId, DmUserId = dmUserId };

        _locationRepository.GetByIdAsync(locationId).Returns(location);
        _imageKeyCreator.Create(dmUserId, locationId, EntityType.Location).Returns((string)null);

        // Act
        await _handler.HandleAsync(locationId, dmUserId);

        // Assert
        await _imageStorage.DidNotReceive().DeleteAsync(Arg.Any<string>());
    }
}
