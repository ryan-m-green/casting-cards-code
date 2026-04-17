using CastLibrary.Logic.Commands.Admin;
using CastLibrary.Logic.Commands.Auth;
using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Commands.CampaignNote;
using CastLibrary.Logic.Commands.Cast;
using CastLibrary.Logic.Commands.Location;
using CastLibrary.Logic.Commands.Library;
using CastLibrary.Logic.Commands.PlayerCard;
using CastLibrary.Logic.Commands.Sublocation;
using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Queries.Admin;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Queries.CampaignNote;
using CastLibrary.Logic.Queries.Cast;
using CastLibrary.Logic.Queries.Location;
using CastLibrary.Logic.Queries.Library;
using CastLibrary.Logic.Queries.PlayerCard;
using CastLibrary.Logic.Queries.Sublocation;
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

            services.AddScoped<ICreateLocationCommandHandler, CreateLocationCommandHandler>();
            services.AddScoped<IUpdateLocationCommandHandler, UpdateLocationCommandHandler>();
            services.AddScoped<IUploadLocationImageCommandHandler, UploadLocationImageCommandHandler>();
            services.AddScoped<IDeleteLocationCommandHandler, DeleteLocationCommandHandler>();

            services.AddScoped<ICreateSublocationCommandHandler, CreateSublocationCommandHandler>();
            services.AddScoped<IUpdateSublocationCommandHandler, UpdateSublocationCommandHandler>();
            services.AddScoped<IUploadSublocationImageCommandHandler, UploadSublocationImageCommandHandler>();
            services.AddScoped<IDeleteSublocationCommandHandler, DeleteSublocationCommandHandler>();

            services.AddScoped<ICreateCampaignCommandHandler, CreateCampaignCommandHandler>();
            services.AddScoped<IUpdateCampaignCommandHandler, UpdateCampaignCommandHandler>();
            services.AddScoped<IDeleteCampaignCommandHandler, DeleteCampaignCommandHandler>();
            services.AddScoped<IAddCastToCampaignCommandHandler, AddCastToCampaignCommandHandler>();
            services.AddScoped<IAddLocationToCampaignCommandHandler, AddLocationToCampaignCommandHandler>();
            services.AddScoped<IUpdateLocationInstanceCommandHandler, UpdateLocationInstanceCommandHandler>();
            services.AddScoped<IUpdateLocationInstanceVisibilityCommandHandler, UpdateLocationInstanceVisibilityCommandHandler>();
            services.AddScoped<IUpdateCastInstanceCommandHandler, UpdateCastInstanceCommandHandler>();
            services.AddScoped<IDeleteLocationInstanceCommandHandler, DeleteLocationInstanceCommandHandler>();
            services.AddScoped<IDeleteCastInstanceCommandHandler, DeleteCastInstanceCommandHandler>();
            services.AddScoped<IAddCampaignSecretCommandHandler, AddCampaignSecretCommandHandler>();
            services.AddScoped<IDeleteCampaignSecretCommandHandler, DeleteCampaignSecretCommandHandler>();
            services.AddScoped<IRevealSecretCommandHandler, RevealSecretCommandHandler>();
            services.AddScoped<IResealSecretCommandHandler, ResealSecretCommandHandler>();
            services.AddScoped<IUpdateCastCustomItemsCommandHandler, UpdateCastCustomItemsCommandHandler>();
            services.AddScoped<IUpdateSublocationCustomItemsCommandHandler, UpdateSublocationCustomItemsCommandHandler>();
            services.AddScoped<IUpdateSecretCommandHandler, UpdateSecretCommandHandler>();

            services.AddScoped<IAddSublocationToCampaignCommandHandler, AddSublocationToCampaignCommandHandler>();
            services.AddScoped<IDeleteSublocationInstanceCommandHandler, DeleteSublocationInstanceCommandHandler>();
            services.AddScoped<IUpdateSublocationInstanceVisibilityCommandHandler, UpdateSublocationInstanceVisibilityCommandHandler>();
            services.AddScoped<IUpdateLocationSublocationsVisibilityCommandHandler, UpdateLocationSubLocationsVisibilityCommandHandler>();
            services.AddScoped<IUpdateCastInstanceVisibilityCommandHandler, UpdateCastInstanceVisibilityCommandHandler>();
            services.AddScoped<IUpdateSublocationCastsVisibilityCommandHandler, UpdateSublocationCastsVisibilityCommandHandler>();

            services.AddScoped<IUpsertCampaignNoteCommandHandler, UpsertCampaignNoteCommandHandler>();

            services.AddScoped<IAddCastRelationshipCommandHandler, AddCastRelationshipCommandHandler>();
            services.AddScoped<IUpdateCastRelationshipCommandHandler, UpdateCastRelationshipCommandHandler>();
            services.AddScoped<IDeleteCastRelationshipCommandHandler, DeleteCastRelationshipCommandHandler>();

            services.AddScoped<IImportLibraryCommandHandler, ImportLibraryCommandHandler>();
            services.AddScoped<IZipLibraryImportCommandHandler, ZipLibraryImportCommandHandler>();

            services.AddScoped<IUpsertCastPlayerNotesCommandHandler, UpsertCastPlayerNotesCommandHandler>();
            services.AddScoped<IUpsertLocationPoliticalNotesCommandHandler, UpsertLocationPoliticalNotesCommandHandler>();

            services.AddScoped<IUpdateLocationInstanceKeywordsCommandHandler, UpdateLocationInstanceKeywordsCommandHandler>();
            services.AddScoped<IUpdateCastInstanceKeywordsCommandHandler, UpdateCastInstanceKeywordsCommandHandler>();
            services.AddScoped<IUpdateSublocationInstanceKeywordsCommandHandler, UpdateSublocationInstanceKeywordsCommandHandler>();

            services.AddScoped<IUpdateSublocationInstanceCommandHandler, UpdateSublocationInstanceCommandHandler>();
            services.AddScoped<IAddSublocationShopItemCommandHandler, AddSublocationShopItemCommandHandler>();
            services.AddScoped<IToggleShopItemScratchCommandHandler, ToggleShopItemScratchCommandHandler>();

            services.AddScoped<IGenerateAdminInviteCodeCommandHandler, GenerateAdminInviteCodeCommandHandler>();

            services.AddScoped<IGenerateCampaignInviteCodeCommandHandler, GenerateCampaignInviteCodeCommandHandler>();
            services.AddScoped<IRedeemCampaignInviteCodeCommandHandler, RedeemCampaignInviteCodeCommandHandler>();
            services.AddScoped<IRemoveCampaignPlayerCommandHandler, RemoveCampaignPlayerCommandHandler>();

            services.AddScoped<IUpsertTimeOfDayCommandHandler, UpsertTimeOfDayCommandHandler>();
            services.AddScoped<IUpdateCursorPositionCommandHandler, UpdateCursorPositionCommandHandler>();
            services.AddScoped<IUpdateSlicePlayerNotesCommandHandler, UpdateSlicePlayerNotesCommandHandler>();
            services.AddScoped<IUpdateSliceDmNotesCommandHandler, UpdateSliceDmNotesCommandHandler>();

            services.AddScoped<ICreatePlayerCardCommandHandler, CreatePlayerCardCommandHandler>();
            services.AddScoped<IUpdatePlayerCardCommandHandler, UpdatePlayerCardCommandHandler>();
            services.AddScoped<IUploadPlayerCardImageCommandHandler, UploadPlayerCardImageCommandHandler>();
            services.AddScoped<IAssignConditionCommandHandler, AssignConditionCommandHandler>();
            services.AddScoped<IRemoveConditionCommandHandler, RemoveConditionCommandHandler>();
            services.AddScoped<IAddMemoryCommandHandler, AddMemoryCommandHandler>();
            services.AddScoped<IDeleteMemoryCommandHandler, DeleteMemoryCommandHandler>();
            services.AddScoped<IUpsertTraitCommandHandler, UpsertTraitCommandHandler>();
            services.AddScoped<IDeleteTraitCommandHandler, DeleteTraitCommandHandler>();
            services.AddScoped<IToggleGoalCompleteCommandHandler, ToggleGoalCompleteCommandHandler>();
            services.AddScoped<IDeliverSecretCommandHandler, DeliverSecretCommandHandler>();
            services.AddScoped<IShareSecretCommandHandler, ShareSecretCommandHandler>();
            services.AddScoped<IDeletePlayerCardSecretCommandHandler, DeletePlayerCardSecretCommandHandler>();
            services.AddScoped<IUpsertPlayerCastPerceptionCommandHandler, UpsertPlayerCastPerceptionCommandHandler>();
            services.AddScoped<IAwardCurrencyCommandHandler, AwardCurrencyCommandHandler>();

            return services;
        }

        public static IServiceCollection AddQueries(this IServiceCollection services)
        {
            services.AddScoped<IGetCastLibraryQueryHandler, GetCastLibraryQueryHandler>();
            services.AddScoped<IGetCastDetailQueryHandler, GetCastDetailQueryHandler>();

            services.AddScoped<IGetLocationLibraryQueryHandler, GetLocationLibraryQueryHandler>();
            services.AddScoped<IGetLocationDetailQueryHandler, GetLocationDetailQueryHandler>();

            services.AddScoped<IGetSublocationLibraryQueryHandler, GetSublocationLibraryQueryHandler>();
            services.AddScoped<IGetSublocationDetailQueryHandler, GetSublocationDetailQueryHandler>();

            services.AddScoped<IGetCampaignLibraryQueryHandler, GetCampaignLibraryQueryHandler>();
            services.AddScoped<IGetPlayerCampaignLibraryQueryHandler, GetPlayerCampaignLibraryQueryHandler>();
            services.AddScoped<IGetCampaignDetailQueryHandler, GetCampaignDetailQueryHandler>();
            services.AddScoped<IGetPlayerCampaignDetailQueryHandler, GetPlayerCampaignDetailQueryHandler>();
            services.AddScoped<IGetCampaignInviteCodeQueryHandler, GetCampaignInviteCodeQueryHandler>();

            services.AddScoped<IGetCampaignNotesQueryHandler, GetCampaignNotesQueryHandler>();

            services.AddScoped<IGetCastRelationshipsQueryHandler, GetCastRelationshipsQueryHandler>();
            services.AddScoped<IGetCastRelationshipByIdQueryHandler, GetCastRelationshipByIdQueryHandler>();

            services.AddScoped<IExportLibraryQueryHandler, ExportLibraryQueryHandler>();
            services.AddScoped<IExportCastLibraryQueryHandler, ExportCastLibraryQueryHandler>();
            services.AddScoped<IExportLocationLibraryQueryHandler, ExportLocationLIbraryQueryHandler>();
            services.AddScoped<IExportSublocationLibraryQueryHandler, ExportSublocationLibraryQueryHandler>();
            services.AddScoped<IGetImportTemplateQueryHandler, GetImportTemplateQueryHandler>();
            services.AddScoped<IImageFileNameQueryHandler, ImageFileNameQueryHandler>();
            services.AddScoped<IGetUserKeywordsQueryHandler, GetUserKeywordsQueryHandler>();

            services.AddScoped<IGetCastPlayerNotesQueryHandler, GetCastPlayerNotesQueryHandler>();
            services.AddScoped<IGetLocationPoliticalNotesQueryHandler, GetLocationPoliticalNotesQueryHandler>();

            services.AddScoped<IGetAdminInviteCodeQueryHandler, GetAdminInviteCodeQueryHandler>();
            services.AddScoped<IGetTimeOfDayQueryHandler, GetTimeOfDayQueryHandler>();

            services.AddScoped<IGetPlayerCardQueryHandler, GetPlayerCardQueryHandler>();
            services.AddScoped<IGetAllPlayerCardsQueryHandler, GetAllPlayerCardsQueryHandler>();
            services.AddScoped<IGetPlayerMemoriesQueryHandler, GetPlayerMemoriesQueryHandler>();
            services.AddScoped<IGetPlayerTraitsQueryHandler, GetPlayerTraitsQueryHandler>();
            services.AddScoped<IGetPlayerSecretsQueryHandler, GetPlayerSecretsQueryHandler>();
            services.AddScoped<IGetPlayerConditionsQueryHandler, GetPlayerConditionsQueryHandler>();
            services.AddScoped<IGetDiscoveredCastQueryHandler, GetDiscoveredCastQueryHandler>();
            services.AddScoped<IGetPlayerCastPerceptionsQueryHandler, GetPlayerCastPerceptionsQueryHandler>();
            services.AddScoped<IGetCastInstancePerceptionsQueryHandler, GetCastInstancePerceptionsQueryHandler>();

            return services;
        }

        public static IServiceCollection AddServices(this IServiceCollection services)
        {
            services.AddScoped<IPasswordHashingService, PasswordHashingService>();
            services.AddScoped<IJwtTokenService, JwtTokenService>();
            services.AddScoped<IImageKeyCreator, ImageKeyCreator>();
            services.AddScoped<IFilenameService, FilenameService>();
            services.AddScoped<ITemplateZipService, TemplateZipService>();
            services.AddScoped<ISystemValuesService, SystemValuesService>();
            services.AddScoped<ILibraryImageExtractionService, LibraryImageExtractionService>();

            return services;
        }

        public static IServiceCollection AddFactories(this IServiceCollection services)
        {
            services.AddScoped<ICastFactory, CastFactory>();
            services.AddScoped<ICastInstanceFactory, CastInstanceFactory>();
            services.AddScoped<ILocationInstanceFactory, LocationInstanceFactory>();
            services.AddScoped<ISublocationInstanceFactory, SublocationInstanceFactory>();
            services.AddScoped<ICampaignFactory, CampaignFactory>();
            services.AddScoped<ICastCardFactory, CastCardFactory>();
            services.AddScoped<ILocationCardFactory, LocationCardFactory>();
            services.AddScoped<ISublocationCardFactory, SublocationCardFactory>();
            services.AddScoped<ILibraryBundleTemplateFactory, LibraryBundleTemplateFactory>();
            services.AddScoped<ITemplateReadMeFactory, TemplateReadMeFactory>();

            return services;
        }

    }
}


