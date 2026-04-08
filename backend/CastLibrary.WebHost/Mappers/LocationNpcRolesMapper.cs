using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers
{
    public interface ILocationNpcRolesMapper
    {
        List<LocationNpcRoleResponse> ToResponse(List<LocationNpcRoleDomain> domain);
    }
    public class LocationNpcRolesMapper : ILocationNpcRolesMapper
    {
        public List<LocationNpcRoleResponse> ToResponse(List<LocationNpcRoleDomain> domain)
        {
            return domain.Select(o => new LocationNpcRoleResponse
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

