using CastLibrary.Adapter.EmailBuilders;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Configuration;
using CastLibrary.Shared.Domain;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace CastLibrary.Adapter.Operators;

public interface IEmailOperator
{
    Task<bool> SendEmailAsync(IEmailDomain emailData);
}

public class EmailOperator(
    IEmailConfiguration emailConfiguration,
    IConfiguration configuration,
    IEnumerable<IEmailTemplateBuilder> templateBuilders,
    ILoggingService loggingService) : IEmailOperator
{
    private readonly HttpClient _httpClient = new HttpClient();
    private const string SenderApiUrl = "https://api.sender.net/v2/message/send";

    public async Task<bool> SendEmailAsync(IEmailDomain emailData)
    {
        var builder = GetBuilder(emailData.GetType());

        var adminAddress = emailData is BugReportNotificationEmailDomain
            ? configuration["Email:AdminAddress"] ?? throw new InvalidOperationException("Email:AdminAddress not configured")
            : null;

        var request = builder.GenerateTemplateRequest(emailData,
            emailConfiguration.FromEmail,
            emailConfiguration.FromName,
            adminAddress);

        var json = JsonSerializer.Serialize(request, new JsonSerializerOptions { WriteIndented = true });

        var content = new StringContent(json, Encoding.UTF8, new MediaTypeHeaderValue("application/json"));

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, SenderApiUrl);
        httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", emailConfiguration.ApiToken);
        httpRequest.Content = content;

        try
        {
            var response = await _httpClient.SendAsync(httpRequest);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                loggingService.LogError($"Sender.net Error: {response.StatusCode} - {errorContent}");
                return false;
            }

            response.EnsureSuccessStatusCode();
        }
        catch (Exception ex)
        {
            loggingService.LogError($"Sender.net Server Error: {ex.Message}");
            return false;
        }

        return true;
    }

    private IEmailTemplateBuilder GetBuilder(Type type)
    {
        var builder = templateBuilders.FirstOrDefault(b => b.IsMatch(type));
        if (builder is null)
            throw new InvalidOperationException($"No template builder found for type {type.Name}");
        return builder;
    }
}
