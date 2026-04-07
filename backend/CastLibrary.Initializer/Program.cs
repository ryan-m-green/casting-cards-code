using Microsoft.Extensions.Configuration;
using Npgsql;

var config = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

// Read directly from env var — avoids issues with __ key names in DO App Platform
var rawConnectionString =
    Environment.GetEnvironmentVariable("DB_CONNECTION_STRING")
    ?? config.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("No connection string found (DB_CONNECTION_STRING env var not set).");

Console.WriteLine($"[DIAG] Connection string length  : {rawConnectionString.Length}");
Console.WriteLine($"[DIAG] Starts with postgresql:// : {rawConnectionString.StartsWith("postgresql://")}");
Console.WriteLine($"[DIAG] Starts with postgres://   : {rawConnectionString.StartsWith("postgres://")}");
Console.WriteLine($"[DIAG] First 40 chars            : {rawConnectionString[..Math.Min(40, rawConnectionString.Length)]}");

// Support both postgresql:// URI format and Npgsql key-value format
NpgsqlConnectionStringBuilder connBuilder;
try
{
    connBuilder = rawConnectionString.StartsWith("postgresql://") || rawConnectionString.StartsWith("postgres://")
        ? BuildFromUri(rawConnectionString)
        : new NpgsqlConnectionStringBuilder(rawConnectionString);
}
catch (Exception ex)
{
    Console.WriteLine($"[ERROR] Failed to parse connection string: {ex.GetType().Name}: {ex.Message}");
    throw;
}

var connectionString = connBuilder.ConnectionString;
var databaseName = connBuilder.Database
    ?? throw new InvalidOperationException("Database name not specified in connection string.");


var serverConnectionString = connBuilder.ConnectionString;

// ─── Step 1: Create database ──────────────────────────────────────────────────
Console.WriteLine($"[1/4] Checking database '{databaseName}'...");

await using (var serverConn = new NpgsqlConnection(serverConnectionString))
{
    await serverConn.OpenAsync();

    await using var checkCmd = new NpgsqlCommand(
        "SELECT 1 FROM pg_database WHERE datname = @name", serverConn);
    checkCmd.Parameters.AddWithValue("name", databaseName);
    var exists = await checkCmd.ExecuteScalarAsync() is not null;

    if (exists)
    {
        Console.WriteLine("       Already exists. Skipping creation.");
    }
    else
    {
        Console.WriteLine("       Creating database...");
        await using var createCmd = new NpgsqlCommand(
            $"CREATE DATABASE \"{databaseName}\"", serverConn);
        await createCmd.ExecuteNonQueryAsync();
        Console.WriteLine("       Created.");
    }
}

// ─── Step 2: Apply schema ─────────────────────────────────────────────────────
Console.WriteLine("[2/4] Applying schema...");

var sqlPath = Path.Combine(AppContext.BaseDirectory, "init.sql");
var schemaSql = await File.ReadAllTextAsync(sqlPath);

await using var conn = new NpgsqlConnection(connectionString);
await conn.OpenAsync();

await using var schemaCmd = new NpgsqlCommand(schemaSql, conn);
await schemaCmd.ExecuteNonQueryAsync();
Console.WriteLine("       Schema applied.");

// ─── Step 3: Apply migrations ─────────────────────────────────────────────────
Console.WriteLine("[3/4] Applying migrations...");

var alterPath = Path.Combine(AppContext.BaseDirectory, "alter.sql");
if (File.Exists(alterPath))
{
    var alterSql = await File.ReadAllTextAsync(alterPath);
    await using var alterCmd = new NpgsqlCommand(alterSql, conn);
    await alterCmd.ExecuteNonQueryAsync();
    Console.WriteLine("       Migrations applied.");
}
else
{
    Console.WriteLine("       No alter.sql found — skipping.");
}

// ─── Step 4: Seed ─────────────────────────────────────────────────────────────
Console.WriteLine("[4/4] Seeding...");

await using var countCmd = new NpgsqlCommand("SELECT COUNT(*) FROM users", conn);
var userCount = (long)(await countCmd.ExecuteScalarAsync())!;

if (userCount > 0)
{
    Console.WriteLine($"       Skipping — {userCount} user(s) already exist.");
}
else
{
    var seedEmail       = Environment.GetEnvironmentVariable("SEED_DM_EMAIL")       ?? config["Seed:DmEmail"]       ?? "admin@cast-library.dev";
    var seedPassword    = Environment.GetEnvironmentVariable("SEED_DM_PASSWORD")    ?? config["Seed:DmPassword"]    ?? "admin1234";
    var seedDisplayName = Environment.GetEnvironmentVariable("SEED_DM_DISPLAY_NAME") ?? config["Seed:DmDisplayName"] ?? "Admin DM";

    var passwordHash = BCrypt.Net.BCrypt.HashPassword(seedPassword);

    await using var seedCmd = new NpgsqlCommand(
        "INSERT INTO users (id, email, password_hash, display_name, role, created_at) " +
        "VALUES (gen_random_uuid(), @Email, @Hash, @DisplayName, 'Admin', NOW())", conn);
    seedCmd.Parameters.AddWithValue("Email", seedEmail);
    seedCmd.Parameters.AddWithValue("Hash", passwordHash);
    seedCmd.Parameters.AddWithValue("DisplayName", seedDisplayName);
    await seedCmd.ExecuteNonQueryAsync();

    Console.WriteLine($"       Seeded DM — email: {seedEmail}  password: {seedPassword}");
}

Console.WriteLine();
Console.WriteLine("Initialization complete.");

static NpgsqlConnectionStringBuilder BuildFromUri(string uri)
{
    var u = new Uri(uri);
    var userInfo = u.UserInfo.Split(':', 2);
    var user = Uri.UnescapeDataString(userInfo[0]);
    var pass = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
    var db = u.AbsolutePath.TrimStart('/');

    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = u.Host,
        Port = u.Port > 0 ? u.Port : 5432,
        Database = db,
        Username = user,
        Password = pass,
        SslMode = SslMode.Require
    };

    foreach (var part in u.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
    {
        var kv = part.Split('=', 2);
        if (kv.Length == 2 && kv[0].Equals("sslmode", StringComparison.OrdinalIgnoreCase)
            && Enum.TryParse<SslMode>(kv[1], ignoreCase: true, out var parsedMode))
        {
            builder.SslMode = parsedMode;
        }
    }

    return builder;
}
