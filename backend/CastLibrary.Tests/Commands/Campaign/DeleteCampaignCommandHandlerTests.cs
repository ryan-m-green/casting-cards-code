using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories.Insert;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class DeleteCampaignCommandHandlerTests
{
    private ICampaignDeleteRepository _campaignDeleteRepository;
    private DeleteCampaignCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignDeleteRepository = Substitute.For<ICampaignDeleteRepository>();
        _handler = new DeleteCampaignCommandHandler(_campaignDeleteRepository);
    }

    [TestCase(TestName = "DeleteCampaignComandHandler deletes a campaign")]
    public async Task HandleAsync_DeletesCampaign()
    {
        // Arrange
        var campaignId = Guid.NewGuid();

        // Act
        await _handler.HandleAsync(campaignId);

        // Assert
        await _campaignDeleteRepository.Received(1).DeleteAsync(campaignId);
    }
}
