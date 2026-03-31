//using System.Reflection;
//namespace CastLibrary.Repository;

//public class SqlReader
//{
//    private readonly Assembly _assembly = Assembly.GetExecutingAssembly();

//    public string Read(string resourcePath)
//    {
//        var name   = $"CastLibrary.Repository.Sql.{resourcePath.Replace('/', '.').Replace('\\', '.')}";
//        using var stream = _assembly.GetManifestResourceStream(name)
//            ?? throw new FileNotFoundException($"Embedded SQL resource not found: {name}");
//        using var reader = new StreamReader(stream);
//        return reader.ReadToEnd();
//    }
//}
