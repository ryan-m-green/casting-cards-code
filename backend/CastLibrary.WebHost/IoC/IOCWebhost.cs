using CastLibrary.Logic.Interfaces;
using CastLibrary.WebHost.Infrastructure;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Services;

namespace CastLibrary.WebHost.IoC
{
    public static class IOCWebhost
    {
        public static IServiceCollection AddWebhost(this IServiceCollection services)
        {
            services.AddScoped<ICampaignRuleMapper, CampaignRuleMapper>();
            services.AddScoped<IConditionMapper, ConditionMapper>();
            services.AddScoped<ICastWebMapper, CastWebMapper>();
            services.AddScoped<ILocationWebMapper, LocationWebMapper>();
            services.AddScoped<ISublocationWebMapper, SublocationWebMapper>();
            services.AddScoped<ICampaignWebMapper, CampaignWebMapper>();
            services.AddScoped<IPlayerCardWebMapper, PlayerCardWebMapper>();
            services.AddScoped<IFactionWebMapper, FactionWebMapper>();
            services.AddScoped<ICampaignFactionInstanceWebMapper, CampaignFactionInstanceWebMapper>();
            services.AddScoped<IPlayerQuicknoteQueueMapper, PlayerQuicknoteQueueMapper>();
            services.AddScoped<ICampaignEventWebMapper, CampaignEventWebMapper>();
            services.AddScoped<IPlayerFieldJournalEntryMapper, PlayerFieldJournalEntryMapper>();

            services.AddScoped<IUserRetriever, UserRetriever>();
            // Scoped: one CorrelationContext per HTTP request.
            // All components (controllers, mappers, repositories) share the same
            // instance within a single request so every log entry carries the
            // same trace_id.
            services.AddScoped<ICorrelationContext, CorrelationContext>();

            services.AddScoped<ISignalRNotificationService, SignalRNotificationService>();

            return services;
        }
    }
}
