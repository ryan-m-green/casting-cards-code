using CastLibrary.Logic.Commands.Admin;
using CastLibrary.Logic.Commands.Auth;
using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Commands.CampaignNote;
using CastLibrary.Logic.Commands.Cast;
using CastLibrary.Logic.Commands.City;
using CastLibrary.Logic.Commands.Library;
using CastLibrary.Logic.Commands.Location;
using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Queries.Admin;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Queries.CampaignNote;
using CastLibrary.Logic.Queries.Cast;
using CastLibrary.Logic.Queries.City;
using CastLibrary.Logic.Queries.Library;
using CastLibrary.Logic.Queries.Location;
using CastLibrary.Logic.Services;

namespace CastLibrary.WebHost.IoC
{
    public static class IOCLogic
    {
        public static IServiceCollection AddLogic(this IServiceCollection services)
        {
            services.AddScoped<ILoggingService, LoggingService>();

            return services.AddServices().AddFactories().AddCommands().AddQueries();
        }

        public static IServiceCollection AddCommands(this IServiceCollection services)
        {
            services.AddScoped<ILoginCommandHandler, LoginCommandHandler>();
            services.AddScoped<IRegisterUserCommandHandler, RegisterUserCommandHandler>();
            services.AddScoped<IForgotPasswordCommandHandler, ForgotPasswordCommandHandler>();
            services.AddScoped<IResetPasswordCommandHandler, ResetPasswordCommandHandler>();
            services.AddScoped<IChangePasswordCommandHandler, ChangePasswordCommandHandler>();

            services.AddScoped<ICreateCastCommandHandler, CreateCastCommandHandler>();
            services.AddScoped<IUpdateCastCommandHandler, UpdateCastCommandHandler>();
            services.AddScoped<IUploadCastImageCommandHandler, UploadCastImageCommandHandler>();
            services.AddScoped<IDeleteCastCommandHandler, DeleteCastCommandHandler>();

            services.AddScoped<ICreateCityCommandHandler, CreateCityCommandHandler>();
            services.AddScoped<IUpdateCityCommandHandler, UpdateCityCommandHandler>();
            services.AddScoped<IUploadCityImageCommandHandler, UploadCityImageCommandHandler>();
            services.AddScoped<IDeleteCityCommandHandler, DeleteCityCommandHandler>();

            services.AddScoped<ICreateLocationCommandHandler, CreateLocationCommandHandler>();
            services.AddScoped<IUpdateLocationCommandHandler, UpdateLocationCommandHandler>();
            services.AddScoped<IUploadLocationImageCommandHandler, UploadLocationImageCommandHandler>();
            services.AddScoped<IDeleteLocationCommandHandler, DeleteLocationCommandHandler>();

            services.AddScoped<ICreateCampaignCommandHandler, CreateCampaignCommandHandler>();
            services.AddScoped<IUpdateCampaignCommandHandler, UpdateCampaignCommandHandler>();
            services.AddScoped<IDeleteCampaignCommandHandler, DeleteCampaignCommandHandler>();
            services.AddScoped<IAddCastToCampaignCommandHandler, AddCastToCampaignCommandHandler>();
            services.AddScoped<IAddCityToCampaignCommandHandler, AddCityToCampaignCommandHandler>();
            services.AddScoped<IUpdateCityInstanceCommandHandler, UpdateCityInstanceCommandHandler>();
            services.AddScoped<IUpdateCityInstanceVisibilityCommandHandler, UpdateCityInstanceVisibilityCommandHandler>();
            services.AddScoped<IUpdateCastInstanceCommandHandler, UpdateCastInstanceCommandHandler>();
            services.AddScoped<IDeleteCityInstanceCommandHandler, DeleteCityInstanceCommandHandler>();
            services.AddScoped<IDeleteCastInstanceCommandHandler, DeleteCastInstanceCommandHandler>();
            services.AddScoped<IAddCampaignSecretCommandHandler, AddCampaignSecretCommandHandler>();
            services.AddScoped<IDeleteCampaignSecretCommandHandler, DeleteCampaignSecretCommandHandler>();
            services.AddScoped<IRevealSecretCommandHandler, RevealSecretCommandHandler>();
            services.AddScoped<IResealSecretCommandHandler, ResealSecretCommandHandler>();
            services.AddScoped<IUpdateCastCustomItemsCommandHandler, UpdateCastCustomItemsCommandHandler>();
            services.AddScoped<IUpdateLocationCustomItemsCommandHandler, UpdateLocationCustomItemsCommandHandler>();
            services.AddScoped<IUpdateSecretCommandHandler, UpdateSecretCommandHandler>();

            services.AddScoped<IAddLocationToCampaignCommandHandler, AddLocationToCampaignCommandHandler>();
            services.AddScoped<IDeleteLocationInstanceCommandHandler, DeleteLocationInstanceCommandHandler>();
            services.AddScoped<IUpdateLocationInstanceVisibilityCommandHandler, UpdateLocationInstanceVisibilityCommandHandler>();
            services.AddScoped<IUpdateCityLocationsVisibilityCommandHandler, UpdateCityLocationsVisibilityCommandHandler>();
            services.AddScoped<IUpdateCastInstanceVisibilityCommandHandler, UpdateCastInstanceVisibilityCommandHandler>();
            services.AddScoped<IUpdateLocationCastsVisibilityCommandHandler, UpdateLocationCastsVisibilityCommandHandler>();

            services.AddScoped<IUpsertCampaignNoteCommandHandler, UpsertCampaignNoteCommandHandler>();

            services.AddScoped<IAddCastRelationshipCommandHandler, AddCastRelationshipCommandHandler>();
            services.AddScoped<IUpdateCastRelationshipCommandHandler, UpdateCastRelationshipCommandHandler>();
            services.AddScoped<IDeleteCastRelationshipCommandHandler, DeleteCastRelationshipCommandHandler>();

            services.AddScoped<IImportLibraryCommandHandler, ImportLibraryCommandHandler>();

            services.AddScoped<IUpsertCastPlayerNotesCommandHandler, UpsertCastPlayerNotesCommandHandler>();
            services.AddScoped<IUpsertCityPoliticalNotesCommandHandler, UpsertCityPoliticalNotesCommandHandler>();

            services.AddScoped<IUpdateCityInstanceKeywordsCommandHandler, UpdateCityInstanceKeywordsCommandHandler>();
            services.AddScoped<IUpdateCastInstanceKeywordsCommandHandler, UpdateCastInstanceKeywordsCommandHandler>();
            services.AddScoped<IUpdateLocationInstanceKeywordsCommandHandler, UpdateLocationInstanceKeywordsCommandHandler>();

            services.AddScoped<IUpdateLocationInstanceCommandHandler, UpdateLocationInstanceCommandHandler>();
            services.AddScoped<IAddLocationShopItemCommandHandler, AddLocationShopItemCommandHandler>();
            services.AddScoped<IToggleShopItemScratchCommandHandler, ToggleShopItemScratchCommandHandler>();

            services.AddScoped<IGenerateAdminInviteCodeCommandHandler, GenerateAdminInviteCodeCommandHandler>();

            services.AddScoped<IGenerateCampaignInviteCodeCommandHandler, GenerateCampaignInviteCodeCommandHandler>();
            services.AddScoped<IRedeemCampaignInviteCodeCommandHandler, RedeemCampaignInviteCodeCommandHandler>();
            services.AddScoped<IRemoveCampaignPlayerCommandHandler, RemoveCampaignPlayerCommandHandler>();

            return services;
        }

        public static IServiceCollection AddQueries(this IServiceCollection services)
        {
            services.AddScoped<IGetCastLibraryQueryHandler, GetCastLibraryQueryHandler>();
            services.AddScoped<IGetCastDetailQueryHandler, GetCastDetailQueryHandler>();

            services.AddScoped<IGetCityLibraryQueryHandler, GetCityLibraryQueryHandler>();
            services.AddScoped<IGetCityDetailQueryHandler, GetCityDetailQueryHandler>();

            services.AddScoped<IGetLocationLibraryQueryHandler, GetLocationLibraryQueryHandler>();
            services.AddScoped<IGetLocationDetailQueryHandler, GetLocationDetailQueryHandler>();

            services.AddScoped<IGetCampaignLibraryQueryHandler, GetCampaignLibraryQueryHandler>();
            services.AddScoped<IGetPlayerCampaignLibraryQueryHandler, GetPlayerCampaignLibraryQueryHandler>();
            services.AddScoped<IGetCampaignDetailQueryHandler, GetCampaignDetailQueryHandler>();
            services.AddScoped<IGetPlayerCampaignDetailQueryHandler, GetPlayerCampaignDetailQueryHandler>();
            services.AddScoped<IGetCampaignInviteCodeQueryHandler, GetCampaignInviteCodeQueryHandler>();

            services.AddScoped<IGetCampaignNotesQueryHandler, GetCampaignNotesQueryHandler>();

            services.AddScoped<IGetCastRelationshipsQueryHandler, GetCastRelationshipsQueryHandler>();
            services.AddScoped<IGetCastRelationshipByIdQueryHandler, GetCastRelationshipByIdQueryHandler>();

            services.AddScoped<IExportLibraryQueryHandler, ExportLibraryQueryHandler>();
            services.AddScoped<IGetUserKeywordsQueryHandler, GetUserKeywordsQueryHandler>();

            services.AddScoped<IGetCastPlayerNotesQueryHandler, GetCastPlayerNotesQueryHandler>();
            services.AddScoped<IGetCityPoliticalNotesQueryHandler, GetCityPoliticalNotesQueryHandler>();

            services.AddScoped<IGetAdminInviteCodeQueryHandler, GetAdminInviteCodeQueryHandler>();

            return services;
        }

        public static IServiceCollection AddServices(this IServiceCollection services)
        {
            services.AddScoped<IPasswordHashingService, PasswordHashingService>();
            services.AddScoped<IJwtTokenService, JwtTokenService>();
            services.AddScoped<IImageKeyCreator, ImageKeyCreator>();

            return services;
        }

        public static IServiceCollection AddFactories(this IServiceCollection services)
        {
            services.AddScoped<ICastFactory, CastFactory>();
            services.AddScoped<ICastInstanceFactory, CastInstanceFactory>();
            services.AddScoped<ICityInstanceFactory, CityInstanceFactory>();
            services.AddScoped<ILocationInstanceFactory, LocationInstanceFactory>();
            services.AddScoped<ICampaignFactory, CampaignFactory>();

            return services;
        }

    }
}
