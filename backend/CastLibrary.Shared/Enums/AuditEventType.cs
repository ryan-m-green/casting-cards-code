namespace CastLibrary.Shared.Enums;

public enum AuditEventType
{
    // Authentication Events
    LoginSuccess,
    LoginFailure,
    Logout,
    PasswordChange,
    PasswordReset,
    AccountLocked,
    AccountUnlocked,

    // Subscription Events
    SubscriptionCreated,
    SubscriptionUpdated,
    SubscriptionCancelled,
    SubscriptionRefresh,
    SubscriptionDowngraded,
    SubscriptionUpgraded,

    // Permission Events
    RoleAssigned,
    RoleRemoved,
    PermissionGranted,
    PermissionRevoked,
    CampaignAccessGranted,
    CampaignAccessRevoked,

    // Data Access Events
    CampaignCreated,
    CampaignUpdated,
    CampaignDeleted,
    CastCreated,
    CastUpdated,
    CastDeleted,
    LocationCreated,
    LocationUpdated,
    LocationDeleted,
    PlayerCardCreated,
    PlayerCardUpdated,
    PlayerCardDeleted,

    // Security Events
    RateLimitViolation,
    SuspiciousActivity,
    DataExport,
    DataImport,
    ConfigurationChange,

    // System Events
    UserRegistration,
    AccountDeletion,
    EmailVerification,
    TwoFactorEnabled,
    TwoFactorDisabled,

    // API Events
    ApiAccess,
    ApiError,
    BulkOperation,
    FileUpload,
    FileDownload
}
