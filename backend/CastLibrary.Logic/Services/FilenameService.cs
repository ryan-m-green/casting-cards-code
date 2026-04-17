using System.Text.RegularExpressions;

namespace CastLibrary.Logic.Services
{
    public interface IFilenameService
    {
        string BuildUniqueFilename(string prefix, string name, HashSet<string> used);
    }
    public class FilenameService : IFilenameService
    {
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
