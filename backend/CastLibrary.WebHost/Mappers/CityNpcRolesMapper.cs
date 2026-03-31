using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ICityNpcRolesMapper
    {
        List<CityNpcRoleResponse> ToResponse(List<CityNpcRoleDomain> domain);
    }
    public class CityNpcRolesMapper : ICityNpcRolesMapper
    {
        public List<CityNpcRoleResponse> ToResponse(List<CityNpcRoleDomain> domain)
        {
            return domain.Select(o => new CityNpcRoleResponse
            {
                Id = o.Id,
                CastInstanceId = o.CastInstanceId,
                FactionId = o.FactionId,
                Role = o.Role,
                Motivation = o.Motivation
            }).ToList();
        }
    }
}
