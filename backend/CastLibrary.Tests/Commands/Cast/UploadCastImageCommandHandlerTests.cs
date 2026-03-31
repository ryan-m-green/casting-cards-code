using CastLibrary.Logic.Commands.Cast;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Cast;

[TestFixture]
public class UploadCastImageCommandHandlerTests
{
    private ICastRepository _castRepository;
    private IImageStorageOperator _imageStorage;
    private UploadCastImageCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _castRepository = Substitute.For<ICastRepository>();
        _imageStorage = Substitute.For<IImageStorageOperator>();

        _handler = new UploadCastImageCommandHandler(_castRepository, _imageStorage);
    }

    [TestCase("UploadCastImageCommandHandler uploads image successfully")]
    [TestCase("UploadCastImageCommandHandler returns success and key")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream(new byte[] { 1, 2, 3 });
        var contentType = "image/jpeg";

        var cast = new CastDomain { Id = castId, DmUserId = dmUserId };

        _castRepository.GetByIdAsync(castId).Returns(cast);

        // Act
        var (success, key) = await _handler.HandleAsync(castId, dmUserId, stream, contentType);

        // Assert
        success.Should().BeTrue();
        key.Should().Contain(dmUserId.ToString());
        key.Should().Contain(castId.ToString());
    }

    [TestCase("UploadCastImageCommandHandler returns failure when cast not found")]
    public async Task HandleAsync_ReturnsFalseWhenCastNotFound(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream();

        _castRepository.GetByIdAsync(castId).Returns((CastDomain)null);

        // Act
        var (success, key) = await _handler.HandleAsync(castId, dmUserId, stream, "image/jpeg");

        // Assert
        success.Should().BeFalse();
        key.Should().BeNull();
    }

    [TestCase("UploadCastImageCommandHandler returns failure when user not owner")]
    public async Task HandleAsync_ReturnsFalseWhenUserNotOwner(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var differentUserId = Guid.NewGuid();
        var stream = new MemoryStream();

        var cast = new CastDomain { Id = castId, DmUserId = differentUserId };

        _castRepository.GetByIdAsync(castId).Returns(cast);

        // Act
        var (success, key) = await _handler.HandleAsync(castId, dmUserId, stream, "image/jpeg");

        // Assert
        success.Should().BeFalse();
        key.Should().BeNull();
    }

    [TestCase("UploadCastImageCommandHandler creates correct key for jpeg")]
    public async Task HandleAsync_CreatesCorrectKeyForJpeg(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream();

        var cast = new CastDomain { Id = castId, DmUserId = dmUserId };

        _castRepository.GetByIdAsync(castId).Returns(cast);

        // Act
        var (success, key) = await _handler.HandleAsync(castId, dmUserId, stream, "image/jpeg");

        // Assert
        key.Should().Be($"{dmUserId}/casts/{castId}.jpg");
    }

    [TestCase("UploadCastImageCommandHandler creates correct key for png")]
    public async Task HandleAsync_CreatesCorrectKeyForPng(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream();

        var cast = new CastDomain { Id = castId, DmUserId = dmUserId };

        _castRepository.GetByIdAsync(castId).Returns(cast);

        // Act
        var (success, key) = await _handler.HandleAsync(castId, dmUserId, stream, "image/png");

        // Assert
        key.Should().Be($"{dmUserId}/casts/{castId}.png");
    }

    [TestCase("UploadCastImageCommandHandler creates correct key for webp")]
    public async Task HandleAsync_CreatesCorrectKeyForWebp(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream();

        var cast = new CastDomain { Id = castId, DmUserId = dmUserId };

        _castRepository.GetByIdAsync(castId).Returns(cast);

        // Act
        var (success, key) = await _handler.HandleAsync(castId, dmUserId, stream, "image/webp");

        // Assert
        key.Should().Be($"{dmUserId}/casts/{castId}.webp");
    }

    [TestCase("UploadCastImageCommandHandler defaults to jpg for unknown type")]
    public async Task HandleAsync_DefaultsToJpgForUnknownType(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream();

        var cast = new CastDomain { Id = castId, DmUserId = dmUserId };

        _castRepository.GetByIdAsync(castId).Returns(cast);

        // Act
        var (success, key) = await _handler.HandleAsync(castId, dmUserId, stream, "image/unknown");

        // Assert
        key.Should().EndWith(".jpg");
    }

    [TestCase("UploadCastImageCommandHandler calls storage with correct parameters")]
    public async Task HandleAsync_CallsStorageWithCorrectParameters(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var stream = new MemoryStream(new byte[] { 1, 2, 3 });
        var contentType = "image/png";

        var cast = new CastDomain { Id = castId, DmUserId = dmUserId };

        _castRepository.GetByIdAsync(castId).Returns(cast);

        // Act
        await _handler.HandleAsync(castId, dmUserId, stream, contentType);

        // Assert
        await _imageStorage.Received(1).SaveAsync(
            Arg.Is<string>(k => k.Contains(dmUserId.ToString()) && k.Contains(castId.ToString())),
            Arg.Is(stream),
            Arg.Is(contentType));
    }
}
