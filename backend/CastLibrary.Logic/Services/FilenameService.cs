using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using System.Text.RegularExpressions;

namespace CastLibrary.Logic.Services
{
    public interface IFilenameService
    {
        string BuildUniqueFilename(string prefix, string name, HashSet<string> used);
        void AddImageUrls(Guid dmUserId,
            List<CampaignLocationInstanceDomain> locations,
            List<CampaignSublocationInstanceDomain> sublocations,
            List<CampaignCastInstanceDomain> casts,
            List<CampaignPlayerDomain> players);
    }
    public class FilenameService(IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IFilenameService
    {
        public void AddImageUrls(Guid dmUserId,
            List<CampaignLocationInstanceDomain> locations,
            List<CampaignSublocationInstanceDomain> sublocations,
            List<CampaignCastInstanceDomain> casts,
            List<CampaignPlayerDomain> players)
        {
            Parallel.ForEach(locations, new ParallelOptions { MaxDegreeOfParallelism = 4 }, location =>
            {
                var imageKey = imageKeyCreator.Create(dmUserId, location.SourceLocationId, EntityType.Location);
                if (!string.IsNullOrEmpty(imageKey))
                {
                    var newImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
                    location.ImageUrl = newImageUrl;
                }
            });

            Parallel.ForEach(casts, new ParallelOptions { MaxDegreeOfParallelism = 4 }, cast =>
            {
                var imageKey = imageKeyCreator.Create(dmUserId, cast.SourceCastId, EntityType.Cast);
                if (!string.IsNullOrEmpty(imageKey))
                {
                    var newImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
                    cast.ImageUrl = newImageUrl;
                }
            });

            Parallel.ForEach(sublocations, new ParallelOptions { MaxDegreeOfParallelism = 4 }, subLocation =>
            {
                var imageKey = imageKeyCreator.Create(dmUserId, subLocation.SourceSublocationId, EntityType.Sublocation);
                if (!string.IsNullOrEmpty(imageKey))
                {
                    var newImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
                    subLocation.ImageUrl = newImageUrl;
                }
            });

            Parallel.ForEach(players, new ParallelOptions { MaxDegreeOfParallelism = 4 }, player =>
            {
                var imageKey = imageKeyCreator.Create(dmUserId, player.UserId, EntityType.PlayerCard);
                if (!string.IsNullOrEmpty(imageKey))
                {
                    var newImageUrl = imageStorageOperator.GetPublicUrl(imageKey);
                    player.ImageUrl = newImageUrl;
                }
            });
        }

        public string BuildUniqueFilename(string prefix, string name, HashSet<string> used)
        {
            var slug = Regex.Replace(name.ToLowerInvariant().Replace(" ", "_"), @"[^a-z0-9_]", "");
            if (string.IsNullOrEmpty(slug)) slug = "unnamed";

            var candidate = $"{prefix}_{slug}.png";
            if (!used.Contains(candidate)) return candidate;

            var i = 2;
            while (used.Contains($"{prefix}_{slug}_{i}.png")) i++;
            return $"{prefix}_{slug}_{i}.png";
        }
    }
}
