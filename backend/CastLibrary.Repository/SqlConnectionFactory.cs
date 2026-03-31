using Microsoft.Extensions.Configuration;
using Npgsql;

namespace CastLibrary.Repository
{
    public interface ISqlConnectionFactory
    {
        NpgsqlConnection GetConnection();
    }
    public class SqlConnectionFactory(IConfiguration configuration) : ISqlConnectionFactory
    {
        public NpgsqlConnection GetConnection()
        {
            var configurationString = configuration.GetConnectionString("DefaultConnection");
            return new NpgsqlConnection(configurationString);
        }
    }
}
