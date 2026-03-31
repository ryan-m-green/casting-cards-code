using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using System;
using System.Collections.Generic;
using System.Text;

namespace CastLibrary.Logic.Commands.Campaign
{
    public interface IUpdateSecretCommandHandler
    {
        Task<CampaignSecretDomain> HandleAsync(UpdateSecretCommand command);
    }
    public class UpdateSecretCommandHandler(
        ISecretReadRepository secretReadRepository,
        ISecretUpdateRepository secretUpdateRepository) : IUpdateSecretCommandHandler
    {
        public async Task<CampaignSecretDomain> HandleAsync(UpdateSecretCommand command)
        {
            var campaignSecret = await secretReadRepository.GetByIdAsync(command.Id);
            if (campaignSecret == null) return null;

            campaignSecret.Content = command.Request.Content;
            await secretUpdateRepository.UpdateAsync(campaignSecret);

            return campaignSecret;
        }
    }

    public class UpdateSecretCommand
    {
        public UpdateSecretCommand(Guid id, Guid secret, UpdateSecretRequest request)
        {
            Id = id;
            Secret = secret;
            Request = request;
        }

        public Guid Id { get; }
        public Guid Secret { get; }
        public UpdateSecretRequest Request { get; }
    }

}
