namespace CastLibrary.WebHost.IoC;

public static class IOCRootContainer
{
    public static IServiceCollection AddCastLibraryServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddWebhost()
            .AddLogic()
            .AddRepository()
            .AddAdapter(configuration);

        return services;
    }
}
