using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace CastLibrary.Logic.Services
{
    public interface IFilenameService
    {
        string BuildUniqueFilename(string prefix, string name, ConcurrentDictionary<string, byte> used);
        void AddImageUrls(Guid dmUserId, Guid campaignId,
            ConcurrentBag<CampaignLocationInstanceDomain> locations,
            ConcurrentBag<CampaignSublocationInstanceDomain> sublocations,
            ConcurrentBag<CampaignCastInstanceDomain> casts,
            ConcurrentBag<CampaignPlayerDomain> players);
    }
    public class FilenameService(IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IFilenameService
    {
        public void AddImageUrls(Guid dmUserId, Guid campaignId,
            ConcurrentBag<CampaignLocationInstanceDomain> locations,
            ConcurrentBag<CampaignSublocationInstanceDomain> sublocations,
            ConcurrentBag<CampaignCastInstanceDomain> casts,
            ConcurrentBag<CampaignPlayerDomain> players)
        {
            var options = new ParallelOptions() { MaxDegreeOfParallelism = 4 };
            Parallel.ForEach(locations, options, location =>
            {
                var imageKey = imageKeyCreator.Create(dmUserId, campaignId, location.SourceLocationId, EntityType.Location);
                if (!string.IsNullOrEmpty(imageKey))
                {
                    var newImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
                    location.ImageUrl = newImageUrl;
                }
            });

            Parallel.ForEach(casts, options, cast =>
            {
                var imageKey = imageKeyCreator.Create(dmUserId, campaignId, cast.SourceCastId, EntityType.Cast);
                if (!string.IsNullOrEmpty(imageKey))
                {
                    var newImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
                    cast.ImageUrl = newImageUrl;
                }
            });

            Parallel.ForEach(sublocations, options, subLocation =>
            {
                var imageKey = imageKeyCreator.Create(dmUserId, campaignId, subLocation.SourceSublocationId, EntityType.Sublocation);
                if (!string.IsNullOrEmpty(imageKey))
                {
                    var newImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
                    subLocation.ImageUrl = newImageUrl;
                }
            });

            Parallel.ForEach(players, options, player =>
            {
                var imageKey = imageKeyCreator.Create(dmUserId, campaignId, player.UserId, EntityType.PlayerCard);
                if (!string.IsNullOrEmpty(imageKey))
                {
                    var newImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
                    player.ImageUrl = newImageUrl;
                }
            });
        }

        public string BuildUniqueFilename(string prefix, string name, ConcurrentDictionary<string, byte> used)
        {
            var slug = Regex.Replace(name.ToLowerInvariant().Replace(" ", "_"), @"[^a-z0-9_]", "");
            if (string.IsNullOrEmpty(slug)) slug = "unnamed";

            var candidate = $"{prefix}_{slug}.png";
            if (used.TryAdd(candidate, 0)) return candidate;

            var i = 2;
            while (!used.TryAdd($"{prefix}_{slug}_{i}.png", 0)) i++;
            return $"{prefix}_{slug}_{i}.png";
        }
    }
}
