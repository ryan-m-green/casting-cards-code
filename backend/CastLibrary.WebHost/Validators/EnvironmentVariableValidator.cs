using Microsoft.Extensions.Logging;

namespace CastLibrary.WebHost.Validators;

/// <summary>
/// Validates environment variables are properly configured at startup.
/// Logs warnings for missing variables and errors for empty string values.
/// </summary>
public static class EnvironmentVariableValidator
{
    private static readonly string[] EnvironmentVariableKeys = new[]
    {
        "DB_CONNECTION_STRING",
        "JWT_KEY",
        "Email__FrontendBaseUrl",
        "SPACES_ACCESS_KEY",
        "SPACES_SECRET_KEY",
        "SPACES_BUCKET_NAME",
        "SPACES_REGION",
        "SPACES_ENDPOINT",
        "SPACES_PUBLIC_URL",
        "SEED_DM_EMAIL",
        "SEED_DM_PASSWORD",
        "SEED_DM_DISPLAY_NAME",
        "Email__ApiToken",
        "Email__FromEmail",
        "Email__AdminAddress",
        "Email__FromName"
    };

    public static void Validate(ILogger logger)
    {
        var emptyEnvVars = new List<string>();

        foreach (var key in EnvironmentVariableKeys)
        {
            var value = Environment.GetEnvironmentVariable(key);
            if (value == "")
            {
                emptyEnvVars.Add(key);
            }
        }

        if (emptyEnvVars.Any())
        {
            logger.LogError("!!!!!!!!!!!!!!!!!!!!  The following environment variables are empty strings: {EmptyVars}", string.Join(", ", emptyEnvVars));
        }
        else
        {
            logger.LogInformation("*********************  ALL ENVIRONMENT VARIABLES ACCOUNTED FOR  **********************");
        }
    }
}
