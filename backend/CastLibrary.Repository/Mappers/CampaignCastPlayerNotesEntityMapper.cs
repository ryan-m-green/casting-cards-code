using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace CastLibrary.Repository.Mappers
{
    public interface ICampaignCastPlayerNotesEntityMapper
    {
        CampaignCastPlayerNotesDomain ToDomain(CampaignCastPlayerNotesEntity entity);
    }
    public class CampaignCastPlayerNotesEntityMapper : ICampaignCastPlayerNotesEntityMapper
    {
        public CampaignCastPlayerNotesDomain ToDomain(CampaignCastPlayerNotesEntity entity)
        {
            return new CampaignCastPlayerNotesDomain()
            {
                Alignment = entity.Alignment ?? string.Empty,
                CampaignId = entity.CampaignId,
                CastInstanceId = entity.CastInstanceId,
                Connections = entity.Connections.Length > 0 ? entity.Connections.Select(o => Guid.Parse(o)).ToList() : new List<Guid>(),
                CreatedAt = entity.CreatedAt,
                Id = entity.Id,
                Perception = entity.Perception,
                Rating = entity.Rating,
                UpdatedAt = entity.UpdatedAt,
                Want = entity.Want ?? string.Empty
            };
        }
    }
}
