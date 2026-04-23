using CastLibrary.Repository;
using CastLibrary.Repository.Mappers;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;

namespace CastLibrary.WebHost.IoC
{
    public static class IOCRepository
    {
        public static IServiceCollection AddRepository(this IServiceCollection services)
        {
            AddMappers(services);
            services.AddScoped<ISqlConnectionFactory, SqlConnectionFactory>();
            services.AddScoped<IUserReadRepository, UserReadRepository>();
            services.AddScoped<IUserInsertRepository, UserInsertRepository>();
            services.AddScoped<IUserUpdateRepository, UserUpdateRepository>();
            services.AddScoped<IUserDeleteRepository, UserDeleteRepository>();
            services.AddScoped<ICastReadRepository, CastReadRepository>();
            services.AddScoped<ICastInsertRepository, CastInsertRepository>();
            services.AddScoped<ICastUpdateRepository, CastUpdateRepository>();
            services.AddScoped<ICastDeleteRepository, CastDeleteRepository>();
            services.AddScoped<ILocationReadRepository, LocationReadRepository>();
            services.AddScoped<ILocationInsertRepository, LocationInsertRepository>();
            services.AddScoped<ILocationUpdateRepository, LocationUpdateRepository>();
            services.AddScoped<ILocationDeleteRepository, LocationDeleteRepository>();
            services.AddScoped<ISublocationReadRepository, SublocationReadRepository>();
            services.AddScoped<ISublocationInsertRepository, SublocationInsertRepository>();
            services.AddScoped<ISublocationUpdateRepository, SublocationUpdateRepository>();
            services.AddScoped<ISublocationDeleteRepository, SublocationDeleteRepository>();
            services.AddScoped<ICampaignReadRepository, CampaignReadRepository>();
            services.AddScoped<ICampaignInsertRepository, CampaignInsertRepository>();
            services.AddScoped<ICampaignUpdateRepository, CampaignUpdateRepository>();
            services.AddScoped<ICampaignDeleteRepository, CampaignDeleteRepository>();
            services.AddScoped<ISecretReadRepository, SecretReadRepository>();
            services.AddScoped<ISecretInsertRepository, SecretInsertRepository>();
            services.AddScoped<ISecretUpdateRepository, SecretUpdateRepository>();
            services.AddScoped<ISecretDeleteRepository, SecretDeleteRepository>();
            services.AddScoped<IUserInsertRepository, UserInsertRepository>();
            services.AddScoped<IUserUpdateRepository, UserUpdateRepository>();
            services.AddScoped<INoteReadRepository, NoteReadRepository>();
            services.AddScoped<INoteUpdateRepository, NoteUpdateRepository>();
            services.AddScoped<IPasswordResetTokenReadRepository, PasswordResetTokenReadRepository>();
            services.AddScoped<IPasswordResetTokenInsertRepository, PasswordResetTokenInsertRepository>();
            services.AddScoped<IPasswordResetTokenUpdateRepository, PasswordResetTokenUpdateRepository>();
            services.AddScoped<ICampaignCastRelationshipReadRepository, CampaignCastRelationshipReadRepository>();
            services.AddScoped<ICampaignCastRelationshipDeleteRepository, CampaignCastRelationshipDeleteRepository>();
            services.AddScoped<ICampaignCastRelationshipInsertRepository, CampaignCastRelationshipInsertRepository>();
            services.AddScoped<ICampaignCastRelationshipUpdateRepository, CampaignCastRelationshipUpdateRepository>();
            services.AddScoped<ICampaignInviteCodeReadRepository, CampaignInviteCodeReadRepository>();
            services.AddScoped<ICampaignInviteCodeUpdateRepository, CampaignInviteCodeUpdateRepository>();
            services.AddScoped<ICampaignInviteCodeDeleteRepository, CampaignInviteCodeDeleteRepository>();
            services.AddScoped<ICampaignPlayerReadRepository, CampaignPlayerReadRepository>();
            services.AddScoped<ICampaignPlayerInsertRepository, CampaignPlayerInsertRepository>();
            services.AddScoped<ICampaignPlayerDeleteRepository, CampaignPlayerDeleteRepository>();
            services.AddScoped<ICastPlayerNotesReadRepository, CastPlayerNotesReadRepository>();
            services.AddScoped<ICastPlayerNotesUpdateRepository, CastPlayerNotesUpdateRepository>();
            services.AddScoped<ILocationPoliticalNotesReadRepository, LocationPoliticalNotesReadRepository>();
            services.AddScoped<ILocationPoliticalNotesUpdateRepository, LocationPoliticalNotesUpdateRepository>();
            services.AddScoped<IAdminInviteCodeReadRepository, AdminInviteCodeReadRepository>();
            services.AddScoped<IAdminInviteCodeUpdateRepository, AdminInviteCodeUpdateRepository>();
            services.AddScoped<ITimeOfDayReadRepository, TimeOfDayReadRepository>();
            services.AddScoped<ITimeOfDayWriteRepository, TimeOfDayWriteRepository>();
            services.AddScoped<IPlayerCardReadRepository, PlayerCardReadRepository>();
            services.AddScoped<IPlayerCardInsertRepository, PlayerCardInsertRepository>();
            services.AddScoped<IPlayerCardUpdateRepository, PlayerCardUpdateRepository>();
            services.AddScoped<IPlayerCardConditionReadRepository, PlayerCardConditionReadRepository>();
            services.AddScoped<IPlayerCardConditionInsertRepository, PlayerCardConditionInsertRepository>();
            services.AddScoped<IPlayerCardConditionDeleteRepository, PlayerCardConditionDeleteRepository>();
            services.AddScoped<IPlayerCardMemoryReadRepository, PlayerCardMemoryReadRepository>();
            services.AddScoped<IPlayerCardMemoryInsertRepository, PlayerCardMemoryInsertRepository>();
            services.AddScoped<IPlayerCardMemoryDeleteRepository, PlayerCardMemoryDeleteRepository>();
            services.AddScoped<IPlayerCardTraitReadRepository, PlayerCardTraitReadRepository>();
            services.AddScoped<IPlayerCardTraitInsertRepository, PlayerCardTraitInsertRepository>();
            services.AddScoped<IPlayerCardTraitUpdateRepository, PlayerCardTraitUpdateRepository>();
            services.AddScoped<IPlayerCardTraitDeleteRepository, PlayerCardTraitDeleteRepository>();
            services.AddScoped<IPlayerCardSecretReadRepository, PlayerCardSecretReadRepository>();
            services.AddScoped<IPlayerCardSecretInsertRepository, PlayerCardSecretInsertRepository>();
            services.AddScoped<IPlayerCardSecretUpdateRepository, PlayerCardSecretUpdateRepository>();
            services.AddScoped<IPlayerCardSecretDeleteRepository, PlayerCardSecretDeleteRepository>();
            services.AddScoped<IPlayerCastPerceptionReadRepository, PlayerCastPerceptionReadRepository>();
            services.AddScoped<IPlayerCastPerceptionInsertRepository, PlayerCastPerceptionInsertRepository>();
            services.AddScoped<IPlayerCastPerceptionUpdateRepository, PlayerCastPerceptionUpdateRepository>();
            services.AddScoped<IGoldTransactionInsertRepository, GoldTransactionInsertRepository>();
            services.AddScoped<ICurrencyBalanceReadRepository, CurrencyBalanceReadRepository>();
            services.AddScoped<IBugReportInsertRepository, BugReportInsertRepository>();
            services.AddScoped<IBugReportReadRepository, BugReportReadRepository>();
            services.AddScoped<IBugReportUpdateRepository, BugReportUpdateRepository>();
            services.AddScoped<IBugReportDeleteRepository, BugReportDeleteRepository>();
            services.AddHealthChecks()
              .AddCheck<DatabaseHealthCheck>("postgres");

            return services;
        }

        private static void AddMappers(IServiceCollection services)
        {
            services.AddScoped<ICampaignInviteCodeEntityMapper, CampaignInviteCodeEntityMapper>();
            services.AddScoped<ICampaignEntityMapper, CampaignEntityMapper>();
            services.AddScoped<ICastEntityMapper, CastEntityMapper>();
            services.AddScoped<ILocationEntityMapper, LocationEntityMapper>();
            services.AddScoped<IPasswordResetTokenEntityMapper, PasswordResetTokenEntityMapper>();
            services.AddScoped<IUserEntityMapper, UserEntityMapper>();
            services.AddScoped<ICampaignCastRelationshipEntityMapper, CampaignCastRelationshipEntityMapper>();
            services.AddScoped<ICampaignCastPlayerNotesEntityMapper, CampaignCastPlayerNotesEntityMapper>();
            services.AddScoped<ILocationPoliticalNotesEntityMapper, LocationPoliticalNotesEntityMapper>();
            services.AddScoped<ICampaignSecretEntityMapper, CampaignSecretEntityMapper>();
            services.AddScoped<ICampaignPlayerEntityMapper, CampaignPlayerEntityMapper>();
            services.AddScoped<IAdminInviteCodeEntityMapper, AdminInviteCodeEntityMapper>();
            services.AddScoped<IPlayerCardEntityMapper, PlayerCardEntityMapper>();
            services.AddScoped<IPlayerCardConditionEntityMapper, PlayerCardConditionEntityMapper>();
            services.AddScoped<IPlayerCardMemoryEntityMapper, PlayerCardMemoryEntityMapper>();
            services.AddScoped<IPlayerCardTraitEntityMapper, PlayerCardTraitEntityMapper>();
            services.AddScoped<IPlayerCardSecretEntityMapper, PlayerCardSecretEntityMapper>();
            services.AddScoped<IPlayerCastPerceptionEntityMapper, PlayerCastPerceptionEntityMapper>();
            services.AddScoped<IBugReportEntityMapper, BugReportEntityMapper>();
        }
    }
}
