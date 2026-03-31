using Microsoft.Extensions.Configuration;
using Npgsql;

var config = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

var connectionString = config.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("DefaultConnection not found in appsettings.json.");

var connBuilder = new NpgsqlConnectionStringBuilder(connectionString);
var databaseName = connBuilder.Database
    ?? throw new InvalidOperationException("Database name not specified in connection string.");

connBuilder.Database = "postgres";
var serverConnectionString = connBuilder.ConnectionString;

// ─── Step 1: Create database ──────────────────────────────────────────────────
Console.WriteLine($"[1/3] Checking database '{databaseName}'...");

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
Console.WriteLine("[2/3] Applying schema...");

var sqlPath = Path.Combine(AppContext.BaseDirectory, "init.sql");
var schemaSql = await File.ReadAllTextAsync(sqlPath);

await using var conn = new NpgsqlConnection(connectionString);
await conn.OpenAsync();

await using var schemaCmd = new NpgsqlCommand(schemaSql, conn);
await schemaCmd.ExecuteNonQueryAsync();
Console.WriteLine("       Schema applied.");

// ─── Step 3: Seed ─────────────────────────────────────────────────────────────
Console.WriteLine("[3/3] Seeding...");

await using var countCmd = new NpgsqlCommand("SELECT COUNT(*) FROM users", conn);
var userCount = (long)(await countCmd.ExecuteScalarAsync())!;

if (userCount > 0)
{
    Console.WriteLine($"       Skipping — {userCount} user(s) already exist.");
}
else
{
    var seedEmail       = config["Seed:DmEmail"]       ?? "admin@cast-library.dev";
    var seedPassword    = config["Seed:DmPassword"]    ?? "admin1234";
    var seedDisplayName = config["Seed:DmDisplayName"] ?? "Admin DM";

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
