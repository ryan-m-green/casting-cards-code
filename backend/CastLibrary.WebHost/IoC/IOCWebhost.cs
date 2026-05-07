using CastLibrary.Logic.Interfaces;
using CastLibrary.WebHost.Filters;
using CastLibrary.WebHost.Infrastructure;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;

namespace CastLibrary.WebHost.IoC
{
    public static class IOCWebhost
    {
        public static IServiceCollection AddWebhost(this IServiceCollection services)
        {
            services.AddScoped<ICastWebMapper, CastWebMapper>();
            services.AddScoped<ILocationWebMapper, LocationWebMapper>();
            services.AddScoped<ISublocationWebMapper, SublocationWebMapper>();
            services.AddScoped<ICampaignWebMapper, CampaignWebMapper>();
            services.AddScoped<ILocationNpcRolesMapper, LocationNpcRolesMapper>();
            services.AddScoped<ICampaignCastPlayerNotesMapper, CampaignCastPlayerNotesMapper>();
            services.AddScoped<ICampaignLocationPlayerNotesMapper, CampaignLocationPlayerNotesMapper>();
            services.AddScoped<IPlayerCardWebMapper, PlayerCardWebMapper>();
            services.AddScoped<IFactionWebMapper, FactionWebMapper>();
            services.AddScoped<ICampaignFactionInstanceWebMapper, CampaignFactionInstanceWebMapper>();
            services.AddScoped<ICampaignFactionPlayerNotesMapper, CampaignFactionPlayerNotesMapper>();
            services.AddScoped<ICampaignSublocationPlayerNotesMapper, CampaignSublocationPlayerNotesMapper>();
            services.AddScoped<ICampaignPlayerNotesMapper, CampaignPlayerNotesMapper>();
            services.AddScoped<IPlayerQuicknoteQueueMapper, PlayerQuicknoteQueueMapper>();
            services.AddScoped<IZipArchiveMapper, ZipArchiveMapper>();

            services.AddScoped<IUserRetriever, UserRetriever>();
            // Scoped: one CorrelationContext per HTTP request.
            // All components (controllers, mappers, repositories) share the same
            // instance within a single request so every log entry carries the
            // same trace_id.
            services.AddScoped<ICorrelationContext, CorrelationContext>();

            return services;
        }
    }
}
