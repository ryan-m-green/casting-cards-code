using CastLibrary.Adapter.ImageConversion;
using CastLibrary.Adapter.Operators;
using CastLibrary.Logic.Interfaces;
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

            services.AddScoped<IEmailOperator, EmailOperator>();

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

            services.AddScoped<IImageConverter, ImageConverter>();

            return services;
        }
    }
}
