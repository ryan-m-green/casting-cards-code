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
public class AddCastToCampaignCommandHandlerTests
{
    private ICampaignReadRepository _campaignReadRepository;
    private ICampaignInsertRepository _campaignInsertRepository;
    private ICastRepository _castRepository;
    private ICastInstanceFactory _castInstanceFactory;
    private AddCastToCampaignCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignReadRepository = Substitute.For<ICampaignReadRepository>();
        _campaignInsertRepository = Substitute.For<ICampaignInsertRepository>();
        _castRepository = Substitute.For<ICastRepository>();
        _castInstanceFactory = Substitute.For<ICastInstanceFactory>();

        _handler = new AddCastToCampaignCommandHandler(
            _campaignReadRepository,
            _campaignInsertRepository,
            _castRepository,
            _castInstanceFactory);
    }

    [TestCase("AddCastToCampaignCommandHandler adds cast to campaign successfully")]
    [TestCase("AddCastToCampaignCommandHandler returns cast instance")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var castId = Guid.NewGuid();
        var cityInstanceId = Guid.NewGuid();
        var locationInstanceId = Guid.NewGuid();
        var instanceId = Guid.NewGuid();

        var cast = new CastDomain { Id = castId, Name = "Test Cast" };
        var instance = new CampaignCastInstanceDomain
        {
            InstanceId = instanceId,
            CampaignId = campaignId,
            SourceCastId = castId
        };

        _castRepository.GetByIdAsync(castId).Returns(cast);
        _campaignReadRepository.GetCastInstanceBySourceCastIdAsync(campaignId, castId).Returns((CampaignCastInstanceDomain)null);
        _castInstanceFactory.Create(cast, campaignId, cityInstanceId, locationInstanceId).Returns(instance);
        _campaignInsertRepository.InsertCastInstanceAsync(instance).Returns(instance);

        // Act
        var result = await _handler.HandleAsync(campaignId, castId, cityInstanceId, locationInstanceId);

        // Assert
        if (scenario == "AddCastToCampaignCommandHandler adds cast to campaign successfully")
        {
            result.Should().NotBeNull();
            result.SourceCastId.Should().Be(castId);
            result.CampaignId.Should().Be(campaignId);
        }
        else if (scenario == "AddCastToCampaignCommandHandler returns cast instance")
        {
            result.Should().NotBeNull();
            result.InstanceId.Should().Be(instanceId);
        }
    }

    [TestCase("AddCastToCampaignCommandHandler calls repositories in correct order")]
    public async Task HandleAsync_CallsRepositoriesInCorrectOrder(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var castId = Guid.NewGuid();
        var locationInstanceId = Guid.NewGuid();
        var callOrder = new List<string>();

        var cast = new CastDomain { Id = castId };
        var instance = new CampaignCastInstanceDomain { InstanceId = Guid.NewGuid(), CampaignId = campaignId, SourceCastId = castId };

        _castRepository.GetByIdAsync(castId).Returns(x =>
        {
            callOrder.Add("GetByIdAsync");
            return cast;
        });

        _campaignReadRepository.GetCastInstanceBySourceCastIdAsync(campaignId, castId).Returns(x =>
        {
            callOrder.Add("GetCastInstanceBySourceCastIdAsync");
            return (CampaignCastInstanceDomain)null;
        });

        _castInstanceFactory.Create(cast, campaignId, null, locationInstanceId).Returns(instance);

        _campaignInsertRepository.InsertCastInstanceAsync(instance).Returns(x =>
        {
            callOrder.Add("InsertCastInstanceAsync");
            return instance;
        });

        // Act
        await _handler.HandleAsync(campaignId, castId, null, locationInstanceId);

        // Assert
        callOrder.Should().ContainInOrder("GetByIdAsync", "GetCastInstanceBySourceCastIdAsync", "InsertCastInstanceAsync");
    }

    [TestCase("AddCastToCampaignCommandHandler returns null when cast not found")]
    public async Task HandleAsync_ReturnsNull_WhenCastNotFound(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var castId = Guid.NewGuid();
        var locationInstanceId = Guid.NewGuid();

        _castRepository.GetByIdAsync(castId).Returns((CastDomain)null);

        // Act
        var result = await _handler.HandleAsync(campaignId, castId, null, locationInstanceId);

        // Assert
        result.Should().BeNull();
        await _campaignReadRepository.DidNotReceive().GetCastInstanceBySourceCastIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        _castInstanceFactory.DidNotReceive().Create(Arg.Any<CastDomain>(), Arg.Any<Guid>(), Arg.Any<Guid?>(), Arg.Any<Guid>());
    }

    [TestCase("AddCastToCampaignCommandHandler returns null when cast already in campaign")]
    public async Task HandleAsync_ReturnsNull_WhenCastAlreadyExists(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var castId = Guid.NewGuid();
        var locationInstanceId = Guid.NewGuid();
        var existingInstanceId = Guid.NewGuid();

        var cast = new CastDomain { Id = castId };
        var existingInstance = new CampaignCastInstanceDomain
        {
            InstanceId = existingInstanceId,
            CampaignId = campaignId,
            SourceCastId = castId
        };

        _castRepository.GetByIdAsync(castId).Returns(cast);
        _campaignReadRepository.GetCastInstanceBySourceCastIdAsync(campaignId, castId).Returns(existingInstance);

        // Act
        var result = await _handler.HandleAsync(campaignId, castId, null, locationInstanceId);

        // Assert
        result.Should().BeNull();
        _castInstanceFactory.DidNotReceive().Create(Arg.Any<CastDomain>(), Arg.Any<Guid>(), Arg.Any<Guid?>(), Arg.Any<Guid>());
        await _campaignInsertRepository.DidNotReceive().InsertCastInstanceAsync(Arg.Any<CampaignCastInstanceDomain>());
    }

    [TestCase("AddCastToCampaignCommandHandler passes city instance id to factory")]
    public async Task HandleAsync_PassesCityInstanceIdToFactory(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var castId = Guid.NewGuid();
        var cityInstanceId = Guid.NewGuid();
        var locationInstanceId = Guid.NewGuid();

        var cast = new CastDomain { Id = castId };
        var instance = new CampaignCastInstanceDomain { InstanceId = Guid.NewGuid(), CampaignId = campaignId, SourceCastId = castId };

        _castRepository.GetByIdAsync(castId).Returns(cast);
        _campaignReadRepository.GetCastInstanceBySourceCastIdAsync(campaignId, castId).Returns((CampaignCastInstanceDomain)null);
        _castInstanceFactory.Create(cast, campaignId, cityInstanceId, locationInstanceId).Returns(instance);
        _campaignInsertRepository.InsertCastInstanceAsync(instance).Returns(instance);

        // Act
        await _handler.HandleAsync(campaignId, castId, cityInstanceId, locationInstanceId);

        // Assert
        _castInstanceFactory.Received(1).Create(cast, campaignId, cityInstanceId, locationInstanceId);
    }
}
