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
public class DeleteCityCommandHandlerTests
{
    private ICityRepository _cityRepository;
    private IImageStorageOperator _imageStorage;
    private IImageKeyCreator _imageKeyCreator;
    private DeleteCityCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _cityRepository = Substitute.For<ICityRepository>();
        _imageStorage = Substitute.For<IImageStorageOperator>();
        _imageKeyCreator = Substitute.For<IImageKeyCreator>();

        _handler = new DeleteCityCommandHandler(_cityRepository, _imageStorage, _imageKeyCreator);
    }

    [TestCase("DeleteCityCommandHandler deletes city when found")]
    public async Task HandleAsync_DeletesCityWhenFound(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        var city = new CityDomain { Id = cityId, DmUserId = dmUserId, Name = "Test City" };

        _cityRepository.GetByIdAsync(cityId).Returns(city);
        _imageKeyCreator.Create(dmUserId, cityId, EntityType.City).Returns((string)null);

        // Act
        var result = await _handler.HandleAsync(cityId, dmUserId);

        // Assert
        result.Should().BeTrue();
        await _cityRepository.Received(1).DeleteAsync(cityId);
    }

    [TestCase("DeleteCityCommandHandler returns false when city not found")]
    public async Task HandleAsync_ReturnsFalseWhenCityNotFound(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        _cityRepository.GetByIdAsync(cityId).Returns((CityDomain)null);

        // Act
        var result = await _handler.HandleAsync(cityId, dmUserId);

        // Assert
        result.Should().BeFalse();
        await _cityRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    [TestCase("DeleteCityCommandHandler returns false when user not owner")]
    public async Task HandleAsync_ReturnsFalseWhenUserNotOwner(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var differentUserId = Guid.NewGuid();

        var city = new CityDomain { Id = cityId, DmUserId = differentUserId };

        _cityRepository.GetByIdAsync(cityId).Returns(city);

        // Act
        var result = await _handler.HandleAsync(cityId, dmUserId);

        // Assert
        result.Should().BeFalse();
        await _cityRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    [TestCase("DeleteCityCommandHandler deletes image when path exists")]
    public async Task HandleAsync_DeletesImageWhenPathExists(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var imagePath = $"{dmUserId}/cities/{cityId}.jpg";

        var city = new CityDomain { Id = cityId, DmUserId = dmUserId };

        _cityRepository.GetByIdAsync(cityId).Returns(city);
        _imageKeyCreator.Create(dmUserId, cityId, EntityType.City).Returns(imagePath);

        // Act
        await _handler.HandleAsync(cityId, dmUserId);

        // Assert
        await _imageStorage.Received(1).DeleteAsync(imagePath);
    }

    [TestCase("DeleteCityCommandHandler does not delete image when path is null")]
    public async Task HandleAsync_DoesNotDeleteImageWhenPathNull(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        var city = new CityDomain { Id = cityId, DmUserId = dmUserId };

        _cityRepository.GetByIdAsync(cityId).Returns(city);
        _imageKeyCreator.Create(dmUserId, cityId, EntityType.City).Returns((string)null);

        // Act
        await _handler.HandleAsync(cityId, dmUserId);

        // Assert
        await _imageStorage.DidNotReceive().DeleteAsync(Arg.Any<string>());
    }
}
