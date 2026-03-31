using CastLibrary.Logic.Commands.Cast;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Cast;

[TestFixture]
public class DeleteCastCommandHandlerTests
{
    private ICastRepository _castRepository;
    private IImageStorageOperator _imageStorage;
    private IImageKeyCreator _imageKeyCreator;
    private DeleteCastCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _castRepository = Substitute.For<ICastRepository>();
        _imageStorage = Substitute.For<IImageStorageOperator>();
        _imageKeyCreator = Substitute.For<IImageKeyCreator>();

        _handler = new DeleteCastCommandHandler(_castRepository, _imageStorage, _imageKeyCreator);
    }

    [TestCase("DeleteCastCommandHandler deletes cast when found")]
    public async Task HandleAsync_DeletesCastWhenFound(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        var cast = new CastDomain { Id = castId, DmUserId = dmUserId, Name = "Test Cast" };

        _castRepository.GetByIdAsync(castId).Returns(cast);
        _imageKeyCreator.Create(dmUserId, castId, EntityType.Cast).Returns((string)null);

        // Act
        var result = await _handler.HandleAsync(castId, dmUserId);

        // Assert
        result.Should().BeTrue();
        await _castRepository.Received(1).DeleteAsync(castId);
    }

    [TestCase("DeleteCastCommandHandler returns false when cast not found")]
    public async Task HandleAsync_ReturnsFalseWhenCastNotFound(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        _castRepository.GetByIdAsync(castId).Returns((CastDomain)null);

        // Act
        var result = await _handler.HandleAsync(castId, dmUserId);

        // Assert
        result.Should().BeFalse();
        await _castRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    [TestCase("DeleteCastCommandHandler returns false when user not owner")]
    public async Task HandleAsync_ReturnsFalseWhenUserNotOwner(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var differentUserId = Guid.NewGuid();

        var cast = new CastDomain { Id = castId, DmUserId = differentUserId };

        _castRepository.GetByIdAsync(castId).Returns(cast);

        // Act
        var result = await _handler.HandleAsync(castId, dmUserId);

        // Assert
        result.Should().BeFalse();
        await _castRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    [TestCase("DeleteCastCommandHandler deletes image when image path exists")]
    public async Task HandleAsync_DeletesImageWhenPathExists(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var imagePath = $"{dmUserId}/casts/{castId}.jpg";

        var cast = new CastDomain { Id = castId, DmUserId = dmUserId };

        _castRepository.GetByIdAsync(castId).Returns(cast);
        _imageKeyCreator.Create(dmUserId, castId, EntityType.Cast).Returns(imagePath);

        // Act
        await _handler.HandleAsync(castId, dmUserId);

        // Assert
        await _imageStorage.Received(1).DeleteAsync(imagePath);
        await _castRepository.Received(1).DeleteAsync(castId);
    }

    [TestCase("DeleteCastCommandHandler does not delete image when path is null")]
    public async Task HandleAsync_DoesNotDeleteImageWhenPathNull(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        var cast = new CastDomain { Id = castId, DmUserId = dmUserId };

        _castRepository.GetByIdAsync(castId).Returns(cast);
        _imageKeyCreator.Create(dmUserId, castId, EntityType.Cast).Returns((string)null);

        // Act
        await _handler.HandleAsync(castId, dmUserId);

        // Assert
        await _imageStorage.DidNotReceive().DeleteAsync(Arg.Any<string>());
        await _castRepository.Received(1).DeleteAsync(castId);
    }
}
