using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories.Insert;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class DeleteLocationInstanceCommandHandlerTests
{
    private ICampaignDeleteRepository _campaignDeleteRepository;
    private DeleteLocationInstanceCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignDeleteRepository = Substitute.For<ICampaignDeleteRepository>();
        _handler = new DeleteLocationInstanceCommandHandler(_campaignDeleteRepository);
    }

    [TestCase("DeleteLocationInstanceCommandHandler deletes location instance")]
    public async Task HandleAsync_DeletesLocationInstance(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();

        // Act
        await _handler.HandleAsync(instanceId);

        // Assert
        await _campaignDeleteRepository.Received(1).DeleteLocationInstanceAsync(instanceId);
    }

    [TestCase("DeleteLocationInstanceCommandHandler calls repository with correct id")]
    public async Task HandleAsync_CallsRepositoryWithCorrectId(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();

        // Act
        await _handler.HandleAsync(instanceId);

        // Assert
        await _campaignDeleteRepository.Received(1).DeleteLocationInstanceAsync(Arg.Is<Guid>(x => x == instanceId));
    }
}
