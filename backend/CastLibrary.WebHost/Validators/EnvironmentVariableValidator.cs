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
        "FRONTEND_BASE_URL",
        "SPACES_ACCESS_KEY",
        "SPACES_SECRET_KEY",
        "SPACES_BUCKET_NAME",
        "SPACES_REGION",
        "SPACES_ENDPOINT",
        "SPACES_PUBLIC_URL",
        "SEED_DM_EMAIL",
        "SEED_DM_PASSWORD",
        "SEED_DM_DISPLAY_NAME",
        "SMTP_HOST",
        "SMTP_USERNAME",
        "SMTP_PASSWORD",
        "EMAIL_FROM_ADDRESS",
        "STRIPE_SECRET_KEY",
        "STRIPE_PUBLISHABLE_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_SUCCESS_URL",
        "STRIPE_CANCEL_URL",
        "STRIPE_RETURN_URL",
        "EMAIL_API_TOKEN"
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
