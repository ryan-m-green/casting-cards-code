namespace CastLibrary.Shared.Exceptions;

public class LimitExceededException : Exception
{
    public LimitExceededException(string message) : base(message)
    {
    }

    public LimitExceededException() : base("Free tier limit reached. Upgrade to continue.")
    {
    }
}
