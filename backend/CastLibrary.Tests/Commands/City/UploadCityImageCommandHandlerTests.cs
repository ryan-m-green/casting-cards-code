using CastLibrary.Logic.Commands.City;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.City;

[TestFixture]
public class UploadCityImageCommandHandlerTests
{
    private ICityRepository _cityRepository;
    private IImageStorageOperator _imageStorage;
    private IImageKeyCreator _imageKeyCreator;
    private UploadCityImageCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _cityRepository = Substitute.For<ICityRepository>();
        _imageStorage = Substitute.For<IImageStorageOperator>();
        _imageKeyCreator = Substitute.For<IImageKeyCreator>();

        _handler = new UploadCityImageCommandHandler(_cityRepository, _imageStorage, _imageKeyCreator);
    }

    [TestCase("UploadCityImageCommandHandler uploads image successfully")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream(new byte[] { 1, 2, 3 });
        var contentType = "image/jpeg";
        var imageKey = $"{dmUserId}/cities/{cityId}.jpg";

        var city = new CityDomain { Id = cityId, DmUserId = dmUserId };

        _cityRepository.GetByIdAsync(cityId).Returns(city);
        _imageKeyCreator.Create(dmUserId, cityId, EntityType.City).Returns(imageKey);

        // Act
        var (success, key) = await _handler.HandleAsync(cityId, dmUserId, stream, contentType);

        // Assert
        success.Should().BeTrue();
        key.Should().Be(imageKey);
    }

    [TestCase("UploadCityImageCommandHandler returns failure when city not found")]
    public async Task HandleAsync_ReturnsFalseWhenCityNotFound(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream();

        _cityRepository.GetByIdAsync(cityId).Returns((CityDomain)null);

        // Act
        var (success, key) = await _handler.HandleAsync(cityId, dmUserId, stream, "image/jpeg");

        // Assert
        success.Should().BeFalse();
        key.Should().BeNull();
    }

    [TestCase("UploadCityImageCommandHandler returns failure when user not owner")]
    public async Task HandleAsync_ReturnsFalseWhenUserNotOwner(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var differentUserId = Guid.NewGuid();
        var stream = new MemoryStream();

        var city = new CityDomain { Id = cityId, DmUserId = differentUserId };

        _cityRepository.GetByIdAsync(cityId).Returns(city);

        // Act
        var (success, key) = await _handler.HandleAsync(cityId, dmUserId, stream, "image/jpeg");

        // Assert
        success.Should().BeFalse();
        key.Should().BeNull();
    }

    [TestCase("UploadCityImageCommandHandler calls storage with image key")]
    public async Task HandleAsync_CallsStorageWithImageKey(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream(new byte[] { 1, 2, 3 });
        var contentType = "image/png";
        var imageKey = $"{dmUserId}/cities/{cityId}.png";

        var city = new CityDomain { Id = cityId, DmUserId = dmUserId };

        _cityRepository.GetByIdAsync(cityId).Returns(city);
        _imageKeyCreator.Create(dmUserId, cityId, EntityType.City).Returns(imageKey);

        // Act
        await _handler.HandleAsync(cityId, dmUserId, stream, contentType);

        // Assert
        await _imageStorage.Received(1).SaveAsync(
            Arg.Is(imageKey),
            Arg.Is(stream),
            Arg.Is(contentType));
    }
}
