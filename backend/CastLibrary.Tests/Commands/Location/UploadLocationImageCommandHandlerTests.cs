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
public class UploadLocationImageCommandHandlerTests
{
    private ILocationRepository _locationRepository;
    private IImageStorageOperator _imageStorage;
    private IImageKeyCreator _imageKeyCreator;
    private UploadLocationImageCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _locationRepository = Substitute.For<ILocationRepository>();
        _imageStorage = Substitute.For<IImageStorageOperator>();
        _imageKeyCreator = Substitute.For<IImageKeyCreator>();

        _handler = new UploadLocationImageCommandHandler(_locationRepository, _imageStorage, _imageKeyCreator);
    }

    [TestCase("UploadLocationImageCommandHandler uploads image successfully")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream(new byte[] { 1, 2, 3 });
        var contentType = "image/jpeg";
        var imageKey = $"{dmUserId}/locations/{locationId}.jpg";

        var location = new LocationDomain { Id = locationId, DmUserId = dmUserId };

        _locationRepository.GetByIdAsync(locationId).Returns(location);
        _imageKeyCreator.Create(dmUserId, locationId, EntityType.Location).Returns(imageKey);

        // Act
        var (success, key) = await _handler.HandleAsync(locationId, dmUserId, stream, contentType);

        // Assert
        success.Should().BeTrue();
        key.Should().Be(imageKey);
    }

    [TestCase("UploadLocationImageCommandHandler returns failure when location not found")]
    public async Task HandleAsync_ReturnsFalseWhenLocationNotFound(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream();

        _locationRepository.GetByIdAsync(locationId).Returns((LocationDomain)null);

        // Act
        var (success, key) = await _handler.HandleAsync(locationId, dmUserId, stream, "image/jpeg");

        // Assert
        success.Should().BeFalse();
        key.Should().BeNull();
    }

    [TestCase("UploadLocationImageCommandHandler returns failure when user not owner")]
    public async Task HandleAsync_ReturnsFalseWhenUserNotOwner(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var differentUserId = Guid.NewGuid();
        var stream = new MemoryStream();

        var location = new LocationDomain { Id = locationId, DmUserId = differentUserId };

        _locationRepository.GetByIdAsync(locationId).Returns(location);

        // Act
        var (success, key) = await _handler.HandleAsync(locationId, dmUserId, stream, "image/jpeg");

        // Assert
        success.Should().BeFalse();
        key.Should().BeNull();
    }

    [TestCase("UploadLocationImageCommandHandler calls storage with image key")]
    public async Task HandleAsync_CallsStorageWithImageKey(string scenario)
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream(new byte[] { 1, 2, 3 });
        var contentType = "image/png";
        var imageKey = $"{dmUserId}/locations/{locationId}.png";

        var location = new LocationDomain { Id = locationId, DmUserId = dmUserId };

        _locationRepository.GetByIdAsync(locationId).Returns(location);
        _imageKeyCreator.Create(dmUserId, locationId, EntityType.Location).Returns(imageKey);

        // Act
        await _handler.HandleAsync(locationId, dmUserId, stream, contentType);

        // Assert
        await _imageStorage.Received(1).SaveAsync(
            Arg.Is(imageKey),
            Arg.Is(stream),
            Arg.Is(contentType));
    }
}
