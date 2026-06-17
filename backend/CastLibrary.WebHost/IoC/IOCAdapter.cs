using CastLibrary.Adapter.Configuration;
using CastLibrary.Adapter.ImageConversion;
using CastLibrary.Adapter.Operators;
using CastLibrary.Adapter.Services;
using CastLibrary.Adapter.EmailBuilders;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Configuration;
using CastLibrary.Shared.Configuration;

namespace CastLibrary.WebHost.IoC
{
    public static class IOCAdapter
    {
        public static IServiceCollection AddAdapter(this IServiceCollection services, IConfiguration configuration)
        {
            var useLocalStorage = false;
#if (DEBUG)
            useLocalStorage = true;
#endif

            services.AddScoped<IEmailConfiguration>(sp =>
                new EmailConfiguration(sp.GetRequiredService<IConfiguration>()));
            services.AddScoped<IEmailOperator, EmailOperator>();

            services.AddScoped<IEmailTemplateBuilder, AccountVerificationEmailTemplateBuilder>();
            services.AddScoped<IEmailTemplateBuilder, PasswordResetEmailTemplateBuilder>();
            services.AddScoped<IEmailTemplateBuilder, BugReportEmailTemplateBuilder>();
            services.AddScoped<IEmailTemplateBuilder, WelcomeEmailTemplateBuilder>();
            services.AddScoped<IEmailTemplateBuilder, CampaignInvitationEmailTemplateBuilder>();
            services.AddScoped<IEmailTemplateBuilder, InactivityReminderEmailTemplateBuilder>();

            if (useLocalStorage)
            {
                services.AddScoped<IImageStorageOperator, LocalFileImageStorageOperator>();
            }
            else
            {
                services.AddScoped<IFileStorageConfiguration>(sp =>
                    new FileStorageConfiguration(sp.GetRequiredService<IConfiguration>()));
                services.AddScoped<IImageStorageOperator, FileImageStorageOperator>();
            }

            services.AddSingleton<Shared.Configuration.IConfigurationCache, Repository.Configuration.ConfigurationCache>();
            services.AddSingleton<IStripeConfiguration, Adapter.Configuration.StripeConfiguration>();
            services.AddScoped<IStripeService, StripeService>();
            services.AddScoped<IImageConverter, ImageConverter>();

            return services;
        }
    }
}
