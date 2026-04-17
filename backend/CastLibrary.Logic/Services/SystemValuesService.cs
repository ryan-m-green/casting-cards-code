using System;
using System.Collections.Generic;
using System.Text;

namespace CastLibrary.Logic.Services
{
    public interface ISystemValuesService
    {
        DateTime GetUTCNow(int offsetHours = 0);
        Guid GetNewGuid();
    }
    public class SystemValuesService : ISystemValuesService
    {
        public DateTime GetUTCNow(int offsetHours = 0)
        {
            return DateTime.UtcNow.AddHours(offsetHours);
        }

        public Guid GetNewGuid()
        {
            return Guid.NewGuid();
        }
    }
}
