using CastLibrary.Logic.Commands.Admin;
using CastLibrary.Logic.Commands.Auth;
using CastLibrary.Logic.Commands.BugReport;
using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Commands.CampaignChronicles;
using CastLibrary.Logic.Commands.CampaignRules;
using CastLibrary.Logic.Commands.Conditions;
using CastLibrary.Logic.Commands.Soundtrack;
using CastLibrary.Logic.Commands.Ambiance;
using CastLibrary.Logic.Commands.Cast;
using CastLibrary.Logic.Commands.Encounter;
using CastLibrary.Logic.Commands.Faction;
using CastLibrary.Logic.Commands.Location;
using CastLibrary.Logic.Commands.PlayerCard;
using CastLibrary.Logic.Commands.QuicknoteQueue;
using CastLibrary.Logic.Commands.Sublocation;
using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Queries.Admin;
using CastLibrary.Logic.Queries.BugReport;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Queries.CampaignChronicles;
using CastLibrary.Logic.Queries.CampaignRules;
using CastLibrary.Logic.Queries.Conditions;
using CastLibrary.Logic.Queries.Cast;
using CastLibrary.Logic.Queries.Encounter;
using CastLibrary.Logic.Queries.Faction;
using CastLibrary.Logic.Queries.Location;
using CastLibrary.Logic.Queries.PlayerCard;
using CastLibrary.Logic.Queries.QuicknoteQueue;
using CastLibrary.Logic.Queries.Sublocation;
using CastLibrary.Logic.Queries.Soundtrack;
using CastLibrary.Logic.Queries.Ambiance;
using CastLibrary.Logic.Queries.Subscription;
using CastLibrary.Logic.Services;
using CastLibrary.Logic.Strategies;
using CastLibrary.Logic.Commands.Subscription;
using CastLibrary.Logic.Strategies.SubscriptionEvent;
using CastLibrary.Logic.Strategies.InvoiceEvent;
using CastLibrary.Logic.Strategies.WebhookEvent;
using CastLibrary.Logic.Commands.Stripe;
using CastLibrary.Shared.Interfaces;

namespace CastLibrary.WebHost.IoC
{
    public static class IOCLogic
    {
        public static IServiceCollection AddLogic(this IServiceCollection services)
        {
            services.AddScoped<ILoggingService, LoggingService>();

            return services.AddServices().AddFactories().AddCommands().AddQueries().AddStrategies();
        }

        public static IServiceCollection AddCommands(this IServiceCollection services)
        {
            services.AddScoped<ILoginCommandHandler, LoginCommandHandler>();
            services.AddScoped<IRegisterUserCommandHandler, RegisterUserCommandHandler>();
            services.AddScoped<IVerifyEmailCommandHandler, VerifyEmailCommandHandler>();
            services.AddScoped<IForgotPasswordCommandHandler, ForgotPasswordCommandHandler>();
            services.AddScoped<IResetPasswordCommandHandler, ResetPasswordCommandHandler>();
            services.AddScoped<IChangePasswordCommandHandler, ChangePasswordCommandHandler>();
            services.AddScoped<IUpdateDisplayNameCommandHandler, UpdateDisplayNameCommandHandler>();
            services.AddScoped<IUpdateEmailCommandHandler, UpdateEmailCommandHandler>();
            services.AddScoped<ISendEmailChangeNotificationsCommandHandler, SendEmailChangeNotificationsCommandHandler>();

            services.AddScoped<ICreateCastCommandHandler, CreateCastCommandHandler>();

        // v2 encounters (initiative circle of cards)
        services.AddScoped<ICreateEncounterCommandHandler, CreateEncounterCommandHandler>();
        services.AddScoped<IAddCombatantToEncounterCommandHandler, AddCombatantToEncounterCommandHandler>();
        services.AddScoped<ICreateEncounterGroupCommandHandler, CreateEncounterGroupCommandHandler>();
        services.AddScoped<ICreateEncounterSpotCommandHandler, CreateEncounterSpotCommandHandler>();
        services.AddScoped<IRenameEncounterSpotCommandHandler, RenameEncounterSpotCommandHandler>();
        services.AddScoped<IDeleteEncounterSpotCommandHandler, DeleteEncounterSpotCommandHandler>();
        services.AddScoped<IUpdateEncounterCombatantCommandHandler, UpdateEncounterCombatantCommandHandler>();
        services.AddScoped<IRemoveEncounterCombatantCommandHandler, RemoveEncounterCombatantCommandHandler>();
        services.AddScoped<IAssignEncounterCombatantConditionCommandHandler, AssignEncounterCombatantConditionCommandHandler>();
        services.AddScoped<IRemoveEncounterCombatantConditionCommandHandler, RemoveEncounterCombatantConditionCommandHandler>();
        services.AddScoped<IReorderEncounterSpotsCommandHandler, ReorderEncounterSpotsCommandHandler>();
        services.AddScoped<ISetEncounterInitiativeCommandHandler, SetEncounterInitiativeCommandHandler>();
        services.AddScoped<IRenameEncounterCommandHandler, RenameEncounterCommandHandler>();
        services.AddScoped<IStartEncounterCommandHandler, StartEncounterCommandHandler>();
        services.AddScoped<IAdvanceEncounterTurnCommandHandler, AdvanceEncounterTurnCommandHandler>();
        services.AddScoped<IEndEncounterCommandHandler, EndEncounterCommandHandler>();
        services.AddScoped<IGetCampaignEncountersQueryHandler, GetCampaignEncountersQueryHandler>();
        services.AddScoped<IGetEncounterDetailQueryHandler, GetEncounterDetailQueryHandler>();
        services.AddScoped<IGetEncounterCombatantConditionsQueryHandler, GetEncounterCombatantConditionsQueryHandler>();
        services.AddScoped<IEncounterCombatantBuilder, EncounterCombatantBuilder>();

        // v2 cast index (encounter builder picker)
        services.AddScoped<IGetCastIndexQueryHandler, GetCastIndexQueryHandler>();
        services.AddScoped<IGetCastKeywordCountsQueryHandler, GetCastKeywordCountsQueryHandler>();
        services.AddScoped<IGetCampaignFactionLibraryQueryHandler, GetCampaignFactionLibraryQueryHandler>();
        services.AddScoped<IGetCampaignFactionLibraryKeywordCountsQueryHandler, GetCampaignFactionLibraryKeywordCountsQueryHandler>();
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
        services.AddScoped<IUpdateCastInstanceStarsCommandHandler, UpdateCastInstanceStarsCommandHandler>();
            services.AddScoped<ITravelCastInstanceCommandHandler, TravelCastInstanceCommandHandler>();
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



            services.AddScoped<IUpdateLocationInstanceKeywordsCommandHandler, UpdateLocationInstanceKeywordsCommandHandler>();
            services.AddScoped<IUpdateCastInstanceKeywordsCommandHandler, UpdateCastInstanceKeywordsCommandHandler>();
            services.AddScoped<IUpdateSublocationInstanceKeywordsCommandHandler, UpdateSublocationInstanceKeywordsCommandHandler>();

            services.AddScoped<IUpdateSublocationInstanceCommandHandler, UpdateSublocationInstanceCommandHandler>();
            services.AddScoped<IAddSublocationShopItemCommandHandler, AddSublocationShopItemCommandHandler>();
            services.AddScoped<IToggleShopItemScratchCommandHandler, ToggleShopItemScratchCommandHandler>();
            services.AddScoped<IUpdateShopItemCommandHandler, UpdateShopItemCommandHandler>();
            services.AddScoped<IDeleteShopItemCommandHandler, DeleteShopItemCommandHandler>();

            services.AddScoped<IDeleteUserCommandHandler, DeleteUserCommandHandler>();
            services.AddScoped<ICreatePlayerCommandHandler, CreatePlayerCommandHandler>();
            services.AddScoped<ISetCampaignIsDemoCommandHandler, SetCampaignIsDemoCommandHandler>();
            services.AddScoped<IAddUserToDemoCampaignCommandHandler, AddUserToDemoCampaignCommandHandler>();
            services.AddScoped<IChangeUserRoleCommandHandler, ChangeUserRoleCommandHandler>();
            services.AddScoped<IResetUserPasswordCommandHandler, ResetUserPasswordCommandHandler>();
            services.AddScoped<IUpdateConfigurationCommandHandler, UpdateConfigurationCommandHandler>();
            services.AddScoped<IUpdateUserSubscriptionCommandHandler, UpdateUserSubscriptionCommandHandler>();

            services.AddScoped<IGenerateCampaignInviteCodeCommandHandler, GenerateCampaignInviteCodeCommandHandler>();
            services.AddScoped<IRedeemCampaignInviteCodeCommandHandler, RedeemCampaignInviteCodeCommandHandler>();
            services.AddScoped<IRemoveCampaignPlayerCommandHandler, RemoveCampaignPlayerCommandHandler>();

            services.AddScoped<IUpsertTimeOfDayCommandHandler, UpsertTimeOfDayCommandHandler>();
            services.AddScoped<IUpdateCursorPositionCommandHandler, UpdateCursorPositionCommandHandler>();
            services.AddScoped<IAdvanceDayCommandHandler, AdvanceDayCommandHandler>();
            services.AddScoped<IUpdateSlicePlayerNotesCommandHandler, UpdateSlicePlayerNotesCommandHandler>();
            services.AddScoped<IUpdateSliceDmNotesCommandHandler, UpdateSliceDmNotesCommandHandler>();

            services.AddScoped<ICreatePlayerCardCommandHandler, CreatePlayerCardCommandHandler>();
            services.AddScoped<IUpdatePlayerCardCommandHandler, UpdatePlayerCardCommandHandler>();
            services.AddScoped<IUploadPlayerCardImageCommandHandler, UploadPlayerCardImageCommandHandler>();
            services.AddScoped<IAssignConditionCommandHandler, AssignConditionCommandHandler>();
            services.AddScoped<IRemoveConditionCommandHandler, RemoveConditionCommandHandler>();
            services.AddScoped<IUpsertTraitCommandHandler, UpsertTraitCommandHandler>();
            services.AddScoped<IDeleteTraitCommandHandler, DeleteTraitCommandHandler>();
            services.AddScoped<IToggleGoalCompleteCommandHandler, ToggleGoalCompleteCommandHandler>();
            services.AddScoped<IToggleTraitSharedCommandHandler, ToggleTraitSharedCommandHandler>();
            services.AddScoped<IDeliverSecretCommandHandler, DeliverSecretCommandHandler>();
            services.AddScoped<IShareSecretCommandHandler, ShareSecretCommandHandler>();
            services.AddScoped<IDeletePlayerCardSecretCommandHandler, DeletePlayerCardSecretCommandHandler>();
            services.AddScoped<IUpdatePlayerCardSecretCommandHandler, UpdatePlayerCardSecretCommandHandler>();
            services.AddScoped<IUpsertPlayerCastPerceptionCommandHandler, UpsertPlayerCastPerceptionCommandHandler>();
            services.AddScoped<IAwardCurrencyCommandHandler, AwardCurrencyCommandHandler>();
            services.AddScoped<IPurchaseShopItemCommandHandler, PurchaseShopItemCommandHandler>();
            services.AddScoped<IUseInventoryItemCommandHandler, UseInventoryItemCommandHandler>();
            services.AddScoped<ISubmitBugReportCommandHandler, SubmitBugReportCommandHandler>();
            services.AddScoped<IMarkBugFixedCommandHandler, MarkBugFixedCommandHandler>();
            services.AddScoped<ICleanupBugReportsCommandHandler, CleanupBugReportsCommandHandler>();
            services.AddScoped<IDeleteBugReportCommandHandler, DeleteBugReportCommandHandler>();
            services.AddScoped<IUpdateBugSeverityCommandHandler, UpdateBugSeverityCommandHandler>();

            services.AddScoped<ICreateFactionCommandHandler, CreateFactionCommandHandler>();
            services.AddScoped<IUpdateFactionCommandHandler, UpdateFactionCommandHandler>();
            services.AddScoped<IDeleteFactionCommandHandler, DeleteFactionCommandHandler>();
            services.AddScoped<IUploadFactionImageCommandHandler, UploadFactionImageCommandHandler>();
            services.AddScoped<IAddFactionToCampaignCommandHandler, AddFactionToCampaignCommandHandler>();
            services.AddScoped<IDeleteFactionInstanceCommandHandler, DeleteFactionInstanceCommandHandler>();
            services.AddScoped<IUpdateFactionInstanceCommandHandler, UpdateFactionInstanceCommandHandler>();
            services.AddScoped<IAddFactionCastMemberCommandHandler, AddFactionCastMemberCommandHandler>();
            services.AddScoped<IRemoveFactionCastMemberCommandHandler, RemoveFactionCastMemberCommandHandler>();
            services.AddScoped<ISetFactionCastMemberPrimaryCommandHandler, SetFactionCastMemberPrimaryCommandHandler>();
            services.AddScoped<IClearFactionCastMemberPrimaryCommandHandler, ClearFactionCastMemberPrimaryCommandHandler>();
            services.AddScoped<IAddFactionRelationshipCommandHandler, AddFactionRelationshipCommandHandler>();
            services.AddScoped<IRemoveFactionRelationshipCommandHandler, RemoveFactionRelationshipCommandHandler>();
            services.AddScoped<IUpdateFactionInstanceVisibilityCommandHandler, UpdateFactionInstanceVisibilityCommandHandler>();
            services.AddScoped<IUpsertFieldJournalEntryCommandHandler, UpsertFieldJournalEntryCommandHandler>();
            services.AddScoped<IAddChronicleCommandHandler, AddChronicleCommandHandler>();
            services.AddScoped<ICreateQuicknoteQueueItemCommandHandler, CreateQuicknoteQueueItemCommandHandler>();
            services.AddScoped<IUpdateQuicknoteQueueItemCommandHandler, UpdateQuicknoteQueueItemCommandHandler>();
            services.AddScoped<IDeleteQuicknoteQueueItemCommandHandler, DeleteQuicknoteQueueItemCommandHandler>();
            services.AddScoped<ICreateCampaignRuleCommandHandler, CreateCampaignRuleCommandHandler>();
            services.AddScoped<IUpdateCampaignRuleCommandHandler, UpdateCampaignRuleCommandHandler>();
            services.AddScoped<IDeleteCampaignRuleCommandHandler, DeleteCampaignRuleCommandHandler>();
            services.AddScoped<IDeleteLibraryRuleCommandHandler, DeleteLibraryRuleCommandHandler>();
        services.AddScoped<ILinkCampaignRulesCommandHandler, LinkCampaignRulesCommandHandler>();
            services.AddScoped<ICreateConditionCommandHandler, CreateConditionCommandHandler>();
            services.AddScoped<IUpdateConditionCommandHandler, UpdateConditionCommandHandler>();
            services.AddScoped<ILinkConditionsCommandHandler, LinkConditionsCommandHandler>();
            services.AddScoped<IDeleteConditionCommandHandler, DeleteConditionCommandHandler>();
            services.AddScoped<IDeleteLibraryConditionCommandHandler, DeleteLibraryConditionCommandHandler>();
            services.AddScoped<IAssignFactionToSublocationCommandHandler, AssignFactionToSublocationCommandHandler>();
            services.AddScoped<IAssignFactionToCastCommandHandler, AssignFactionToCastCommandHandler>();
            services.AddScoped<IUpdateCampaignLastAccessedCommandHandler, UpdateCampaignLastAccessedCommandHandler>();

            services.AddScoped<ICreateCampaignStorylineCommandHandler, CreateCampaignStorylineCommandHandler>();
            services.AddScoped<IUpdateStorylineVisibilityCommandHandler, UpdateCampaignEventVisibilityCommandHandler>();
            services.AddScoped<IUpdateStorylineArchiveMarkCommandHandler, UpdateStorylineArchiveMarkCommandHandler>();
            services.AddScoped<IUpdateCampaignEventBodyCommandHandler, UpdateCampaignEventBodyCommandHandler>();
            services.AddScoped<IUploadCampaignStorylineHandoutCommandHandler, UploadCampaignStorylineHandoutCommandHandler>();
            services.AddScoped<IUploadCampaignEventHandoutImageCommandHandler, UploadCampaignEventHandoutImageCommandHandler>();
            services.AddScoped<IUploadCampaignWorldMapImageCommandHandler, UploadCampaignWorldMapImageCommandHandler>();
            services.AddScoped<IUpdateCampaignEventDetailsCommandHandler, UpdateCampaignEventDetailsCommandHandler>();
            services.AddScoped<IDeleteCampaignEventCommandHandler, DeleteCampaignEventCommandHandler>();
            services.AddScoped<IReorderCampaignEventsCommandHandler, ReorderCampaignEventsCommandHandler>();

            services.AddScoped<IUploadSoundtrackCommandHandler, UploadSoundtrackCommandHandler>();
            services.AddScoped<IDeleteSoundtrackCommandHandler, DeleteSoundtrackCommandHandler>();
            services.AddScoped<IUpdateSoundtrackCommandHandler, UpdateSoundtrackCommandHandler>();
            services.AddScoped<ICreateAmbianceCommandHandler, CreateAmbianceCommandHandler>();
            services.AddScoped<IUpdateAmbianceCommandHandler, UpdateAmbianceCommandHandler>();
            services.AddScoped<IDeleteAmbianceCommandHandler, DeleteAmbianceCommandHandler>();

            services.AddScoped<ICreateFreeTrialSubscriptionCommandHandler, CreateFreeTrialSubscriptionCommandHandler>();
            services.AddScoped<ICreateCheckoutSessionCommandHandler, CreateCheckoutSessionCommandHandler>();
            services.AddScoped<ICreateCustomerPortalSessionCommandHandler, CreateCustomerPortalSessionCommandHandler>();
            services.AddScoped<IProcessStripeWebhookCommandHandler, ProcessStripeWebhookCommandHandler>();


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
            services.AddScoped<IGetPlayerInventoryQueryHandler, GetPlayerInventoryQueryHandler>();

            // V2 Campaign query handlers
            services.AddScoped<IGetCampaignLocationInstancesQueryHandler, GetCampaignLocationInstancesQueryHandler>();
            services.AddScoped<IGetCampaignSublocationInstancesQueryHandler, GetCampaignSublocationInstancesQueryHandler>();
            services.AddScoped<IGetCampaignCastInstancesQueryHandler, GetCampaignCastInstancesQueryHandler>();

            services.AddScoped<IGetSoundtracksQueryHandler, GetSoundtracksQueryHandler>();
            services.AddScoped<IGetAmbiancesQueryHandler, GetAmbiancesQueryHandler>();

            services.AddScoped<IGetUserKeywordsQueryHandler, GetUserKeywordsQueryHandler>();
            services.AddScoped<IGetCampaignKeywordsQueryHandler, GetCampaignKeywordsQueryHandler>();
            services.AddScoped<IAddCampaignKeywordCommandHandler, AddCampaignKeywordCommandHandler>();
            services.AddScoped<IDeleteCampaignKeywordCommandHandler, DeleteCampaignKeywordCommandHandler>();

            services.AddScoped<IGetAllUsersQueryHandler, GetAllUsersQueryHandler>();
            services.AddScoped<IGetCampaignPlayersQueryHandler, GetCampaignPlayersQueryHandler>();
            services.AddScoped<IGetDemoCampaignsQueryHandler, GetDemoCampaignsQueryHandler>();
            services.AddScoped<IGetDemoPlayersQueryHandler, GetDemoPlayersQueryHandler>();
            services.AddScoped<IGetConfigurationQueryHandler, GetConfigurationQueryHandler>();
            services.AddScoped<IGetPricingDisplayQueryHandler, GetPricingDisplayQueryHandler>();
            services.AddScoped<IGetTimeOfDayQueryHandler, GetTimeOfDayQueryHandler>();

            services.AddScoped<IGetPlayerCardQueryHandler, GetPlayerCardQueryHandler>();
            services.AddScoped<IGetAllPlayerCardsQueryHandler, GetAllPlayerCardsQueryHandler>();
            services.AddScoped<IGetPlayerTraitsQueryHandler, GetPlayerTraitsQueryHandler>();
            services.AddScoped<IGetPlayerSecretsQueryHandler, GetPlayerSecretsQueryHandler>();
            services.AddScoped<IGetSharedPlayerSecretsQueryHandler, GetSharedPlayerSecretsQueryHandler>();
            services.AddScoped<IGetCampaignSecretsQueryHandler, GetCampaignSecretsQueryHandler>();
            services.AddScoped<IGetPlayerConditionsQueryHandler, GetPlayerConditionsQueryHandler>();
            services.AddScoped<IGetDiscoveredCastQueryHandler, GetDiscoveredCastQueryHandler>();
            services.AddScoped<IGetPlayerCastPerceptionsQueryHandler, GetPlayerCastPerceptionsQueryHandler>();
            services.AddScoped<IGetCastInstancePerceptionsQueryHandler, GetCastInstancePerceptionsQueryHandler>();
            services.AddScoped<IGetBugReportsQueryHandler, GetBugReportsQueryHandler>();

            services.AddScoped<IGetFactionLibraryQueryHandler, GetFactionLibraryQueryHandler>();
            services.AddScoped<IGetFactionDetailQueryHandler, GetFactionDetailQueryHandler>();
            services.AddScoped<IGetCampaignFactionInstancesQueryHandler, GetCampaignFactionInstancesQueryHandler>();
            services.AddScoped<IGetPlayerCampaignFactionInstancesQueryHandler, GetPlayerCampaignFactionInstancesQueryHandler>();
            services.AddScoped<IGetPartyCampaignFactionInstancesQueryHandler, GetPartyCampaignFactionInstancesQueryHandler>();
            services.AddScoped<IGetFieldJournalEntriesQueryHandler, GetFieldJournalEntriesQueryHandler>();
            services.AddScoped<IGetChronicleFeedQueryHandler, GetChronicleFeedQueryHandler>();

            services.AddScoped<IGetQuicknoteQueueQueryHandler, GetQuicknoteQueueQueryHandler>();
            services.AddScoped<IGetCampaignRulesQueryHandler, GetCampaignRulesQueryHandler>();
        services.AddScoped<IGetAvailableCampaignRulesQueryHandler, GetAvailableCampaignRulesQueryHandler>();
            services.AddScoped<IGetLibraryRulesQueryHandler, GetLibraryRulesQueryHandler>();
            services.AddScoped<IGetConditionsQueryHandler, GetConditionsQueryHandler>();
            services.AddScoped<IGetAvailableConditionsQueryHandler, GetAvailableConditionsQueryHandler>();
            services.AddScoped<IGetLibraryConditionsQueryHandler, GetLibraryConditionsQueryHandler>();
            services.AddScoped<IGetCampaignStorylineItemsQueryHandler, GetCampaignStorylineItemsQueryHandler>();
            services.AddScoped<IGetVisibleCampaignEventsQueryHandler, GetVisibleCampaignEventsQueryHandler>();
            services.AddScoped<IGetUserSubscriptionQueryHandler, GetUserSubscriptionQueryHandler>();
            services.AddScoped<IGetUserEntityLimitsQueryHandler, GetUserEntityLimitsQueryHandler>();


            return services;
        }

        public static IServiceCollection AddServices(this IServiceCollection services)
        {
            services.AddScoped<IPasswordHashingService, PasswordHashingService>();
            services.AddScoped<IJwtTokenService, JwtTokenService>();
            services.AddScoped<IImageKeyCreator, ImageKeyCreator>();
            services.AddScoped<IFilenameService, FilenameService>();
            services.AddScoped<IPartyAnchorService, PartyAnchorService>();
            services.AddScoped<ISystemValuesService, SystemValuesService>();
            services.AddScoped<ICampaignAccessService, CampaignAccessService>();
            services.AddScoped<ISubscriptionLimitService, SubscriptionLimitService>();
            services.AddScoped<IEmailService, EmailService>();
            services.AddScoped<IAuditLoggingService, AuditLoggingService>();
            services.AddScoped<IFileValidationService, FileValidationService>();

            return services;
        }

        public static IServiceCollection AddFactories(this IServiceCollection services)
        {
            services.AddScoped<ICastFactory, CastFactory>();
            services.AddScoped<ICastInstanceFactory, CastInstanceFactory>();
            services.AddScoped<IFactionFactory, FactionFactory>();
            services.AddScoped<ILocationInstanceFactory, LocationInstanceFactory>();
            services.AddScoped<ISublocationInstanceFactory, SublocationInstanceFactory>();
            services.AddScoped<ICampaignFactory, CampaignFactory>();
            services.AddScoped<ICampaignChronicleFeedFactory, CampaignChronicleFeedFactory>();

            return services;
        }

        public static IServiceCollection AddStrategies(this IServiceCollection services)
        {
            services.AddScoped<IEntityVisibilityUpdater, CampaignEntityVisibilityUpdater>();
            services.AddScoped<IEntityVisibilityUpdater, SublocationEntityVisibilityUpdater>();
            services.AddScoped<IEntityVisibilityUpdater, LocationEntityVisibilityUpdater>();
            services.AddScoped<IEntityVisibilityUpdater, CastEntityVisibilityUpdater>();
            services.AddScoped<IEntityVisibilityUpdater, FactionEntityVisibilityUpdater>();
            services.AddScoped<IEntityVisibilityUpdater, TimeOfDayEntityVisibilityUpdater>();
            services.AddScoped<IEntityVisibilityUpdater, PlayerEntityVisibilityUpdater>();
            services.AddScoped<IEntityVisibilityUpdater, SecretEntityVisibilityUpdater>();
            services.AddScoped<IEntityVisibilityUpdater, CastTraveledEntityVisibilityUpdater>();

            // Subscription event strategies
            services.AddScoped<ISubscriptionEventStrategy, SubscriptionCreatedStrategy>();
            services.AddScoped<ISubscriptionEventStrategy, SubscriptionUpdatedStrategy>();
            services.AddScoped<ISubscriptionEventStrategy, SubscriptionDeletedStrategy>();
            services.AddScoped<ISubscriptionEventStrategy, SubscriptionPausedStrategy>();
            services.AddScoped<ISubscriptionEventStrategy, SubscriptionResumedStrategy>();

            // Invoice event strategies
            services.AddScoped<IInvoiceEventStrategy, CastLibrary.Logic.Strategies.InvoiceEvent.InvoicePaymentSucceededStrategy>();
            services.AddScoped<IInvoiceEventStrategy, CastLibrary.Logic.Strategies.InvoiceEvent.InvoicePaymentFailedStrategy>();
            services.AddScoped<IInvoiceEventStrategy, CastLibrary.Logic.Strategies.InvoiceEvent.InvoicePaymentActionRequiredStrategy>();

            // Webhook event strategies
            services.AddScoped<IWebhookEventStrategy, ChargeDisputeClosedStrategy>();
            services.AddScoped<IWebhookEventStrategy, ChargeDisputeCreatedStrategy>();
            services.AddScoped<IWebhookEventStrategy, CheckoutSessionCompletedStrategy>();
            services.AddScoped<IWebhookEventStrategy, CustomerSubscriptionDeletedStrategy>();
            services.AddScoped<IWebhookEventStrategy, CustomerSubscriptionPausedStrategy>();
            services.AddScoped<IWebhookEventStrategy, CustomerSubscriptionResumedStrategy>();
            services.AddScoped<IWebhookEventStrategy, CastLibrary.Logic.Strategies.WebhookEvent.InvoicePaymentFailedStrategy>();
            services.AddScoped<IWebhookEventStrategy, CastLibrary.Logic.Strategies.WebhookEvent.InvoicePaymentSucceededStrategy>();
            services.AddScoped<IWebhookEventStrategy, PaymentIntentPaymentFailedStrategy>();
            services.AddScoped<IWebhookEventStrategy, PaymentIntentSucceededStrategy>();

            // v2 chronicle archive strategies
            services.AddScoped<IChronicleMapper, ChronicleMapper>();
            services.AddScoped<IChronicleArchiveStrategy, StorylineChronicleArchiveStrategy>();
            services.AddScoped<IChronicleArchiveStrategy, PlayerNoteChronicleArchiveStrategy>();
            services.AddScoped<IChronicleArchiveStrategy, SecretChronicleArchiveStrategy>();
            services.AddScoped<IChronicleArchiveStrategy, CoinRewardChronicleArchiveStrategy>();
            services.AddScoped<IChronicleArchiveStrategy, ShopPurchaseChronicleArchiveStrategy>();
            services.AddScoped<IChronicleArchiveStrategy, EncounterChronicleArchiveStrategy>();
    services.AddScoped<IChronicleArchiveStrategy, TimePassedChronicleArchiveStrategy>();

            return services;
        }
    }
}
