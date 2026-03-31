using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories.Insert;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class DeleteCityInstanceCommandHandlerTests
{
    private ICampaignDeleteRepository _campaignDeleteRepository;
    private DeleteCityInstanceCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignDeleteRepository = Substitute.For<ICampaignDeleteRepository>();
        _handler = new DeleteCityInstanceCommandHandler(_campaignDeleteRepository);
    }

    [TestCase("DeleteCityInstanceCommandHandler deletes city instance")]
    public async Task HandleAsync_DeletesCityInstance(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();

        // Act
        await _handler.HandleAsync(instanceId);

        // Assert
        await _campaignDeleteRepository.Received(1).DeleteCityInstanceAsync(instanceId);
    }

    [TestCase("DeleteCityInstanceCommandHandler calls repository with correct id")]
    public async Task HandleAsync_CallsRepositoryWithCorrectId(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();

        // Act
        await _handler.HandleAsync(instanceId);

        // Assert
        await _campaignDeleteRepository.Received(1).DeleteCityInstanceAsync(Arg.Is<Guid>(x => x == instanceId));
    }
}
