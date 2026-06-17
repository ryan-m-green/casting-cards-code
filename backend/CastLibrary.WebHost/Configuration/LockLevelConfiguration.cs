using CastLibrary.Shared.Enums;

namespace CastLibrary.WebHost.Configuration;

/// <summary>
/// Static configuration defining which API endpoints remain accessible in each lock level.
/// URL patterns use wildcard matching where * matches any segment.
/// </summary>
public static class LockLevelConfiguration
{
    /// <summary>
    /// Maps lock levels to lists of allowed URL patterns.
    /// FullAccess has no restrictions (empty list = allow all).
    /// </summary>
    public static Dictionary<LockLevel, List<string>> AllowedPaths { get; } = new()
    {
        {
            LockLevel.FullAccess,
            new List<string>() // Empty list = allow all requests
        },
        {
            LockLevel.SoftLock,
            new List<string>() // Empty list = use denylist for SoftLock
        },
        {
            LockLevel.HardLock,
            new List<string>
            {
                // Subscription and payment endpoints (always accessible)
                "/api/subscription/*",
                "/api/stripe/*",

                // Dashboard GET endpoints (include stats for card counts)
                "/api/dashboard",
                "/api/dashboard/*",

                // Health endpoints
                "/api/health",
                "/health",

                // Auth endpoints (always accessible for account recovery)
                "/api/auth/register",
                "/api/auth/login",
                "/api/auth/logout",
                "/api/auth/forgot-password",
                "/api/auth/reset-password",
                "/api/auth/verify-email",
            }
        },
        {
            LockLevel.Suspended,
            new List<string>
            {
                // Subscription and payment endpoints (always accessible)
                "/api/subscription/*",
                "/api/stripe/*",

                // Dashboard GET endpoints
                "/api/dashboard",

                // Health endpoints
                "/api/health",
                "/health",

                // Auth endpoints (always accessible for account recovery)
                "/api/auth/register",
                "/api/auth/login",
                "/api/auth/logout",
                "/api/auth/forgot-password",
                "/api/auth/reset-password",
                "/api/auth/verify-email",
            }
        }
    };

    /// <summary>
    /// Maps lock levels to lists of blocked URL patterns (denylist).
    /// Used for SoftLock to allow all except specific patterns.
    /// </summary>
    public static Dictionary<LockLevel, List<string>> BlockedPaths { get; } = new()
    {
        {
            LockLevel.SoftLock,
            new List<string>
            {
                // Campaign new and edit (POST create, PUT update)
                "POST /api/campaigns",
                "PUT /api/campaigns/*",

                // Cast library cards new and edit
                "POST /api/cast",
                "PUT /api/cast/*",

                // Location library cards new and edit
                "POST /api/locations",
                "PUT /api/locations/*",

                // Sublocation library cards new and edit
                "POST /api/sublocations",
                "PUT /api/sublocations/*",

                // Faction library cards new and edit
                "POST /api/factions",
                "PUT /api/factions/*",
            }
        }
    };

    /// <summary>
    /// Checks if a given path is allowed for a specific lock level.
    /// Uses wildcard matching where * matches any segment.
    /// </summary>
    public static bool IsPathAllowed(string path, LockLevel lockLevel, string method = "GET")
    {
        // FullAccess allows everything
        if (lockLevel == LockLevel.FullAccess)
            return true;

        // Check blocked paths (denylist) for SoftLock
        if (BlockedPaths.TryGetValue(lockLevel, out var blockedPatterns) && blockedPatterns.Count > 0)
        {
            if (blockedPatterns.Any(pattern => MatchesPatternWithMethod(path, method, pattern)))
                return false;
            // If not blocked, allow all for SoftLock
            return true;
        }

        if (!AllowedPaths.TryGetValue(lockLevel, out var allowedPatterns))
            return false;

        // If no patterns defined, deny access
        if (allowedPatterns.Count == 0)
            return false;

        // Check if path matches any allowed pattern
        return allowedPatterns.Any(pattern => MatchesPattern(path, pattern));
    }

    /// <summary>
    /// Matches a path against a pattern with wildcard support.
    /// * matches any single path segment.
    /// </summary>
    private static bool MatchesPattern(string path, string pattern)
    {
        var pathSegments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var patternSegments = pattern.Split('/', StringSplitOptions.RemoveEmptyEntries);

        // If pattern has more segments than path, no match
        if (patternSegments.Length > pathSegments.Length)
            return false;

        for (int i = 0; i < patternSegments.Length; i++)
        {
            var patternSegment = patternSegments[i];
            var pathSegment = pathSegments[i];

            // * matches any segment
            if (patternSegment == "*")
                continue;

            // Exact match required
            if (!string.Equals(patternSegment, pathSegment, StringComparison.OrdinalIgnoreCase))
                return false;
        }

        // If pattern is shorter than path, require exact match (no trailing segments)
        return patternSegments.Length == pathSegments.Length;
    }

    /// <summary>
    /// Matches a path and method against a pattern with wildcard support.
    /// Pattern format: "METHOD /path/segments"
    /// * matches any single path segment.
    /// </summary>
    private static bool MatchesPatternWithMethod(string path, string method, string pattern)
    {
        var parts = pattern.Split(' ', 2);
        if (parts.Length != 2)
            return false;

        var patternMethod = parts[0];
        var patternPath = parts[1];

        // Check method match
        if (!string.Equals(patternMethod, method, StringComparison.OrdinalIgnoreCase))
            return false;

        // Check path match
        return MatchesPattern(path, patternPath);
    }
}
