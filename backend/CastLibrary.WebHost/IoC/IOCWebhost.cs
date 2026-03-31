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
            services.AddScoped<ICityWebMapper, CityWebMapper>();
            services.AddScoped<ILocationWebMapper, LocationWebMapper>();
            services.AddScoped<ICampaignWebMapper, CampaignWebMapper>();
            services.AddScoped<ICityPoliticalNotesMapper, CityPoliticalNotesMapper>();
            services.AddScoped<ICityFactionMapper, CityFactionMapper>();
            services.AddScoped<ICityFactionRelationshipMapper, CityFactionRelationshipMapper>();
            services.AddScoped<ICityNpcRolesMapper, CityNpcRolesMapper>();
            services.AddScoped<ICampaignCastPlayerNotesMapper, CampaignCastPlayerNotesMapper>();

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
