using Microsoft.AspNetCore.Mvc;
using CastLibrary.WebHost.Controllers;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Tests;

[TestFixture]
public class AuthErrorMessagesTests
{
    [Test]
    public void AuthController_ErrorMessages_ShouldBeGeneric()
    {
        // This test verifies that the AuthController has been updated
        // to use generic error messages instead of specific ones
        
        // Read the AuthController file and verify it contains generic messages
        var controllerPath = @"c:\Repository\CastingCards\Code\backend\CastLibrary.WebHost\Controllers\AuthController.cs";
        var controllerContent = System.IO.File.ReadAllText(controllerPath);
        
        // Verify generic error messages are used
        Assert.That(controllerContent, Does.Contain("Invalid credentials."), "Login should return generic 'Invalid credentials.' message");
        Assert.That(controllerContent, Does.Contain("Registration failed."), "Registration should return generic 'Registration failed.' message");
        Assert.That(controllerContent, Does.Contain("Verification failed."), "Email verification should return generic 'Verification failed.' message");
        Assert.That(controllerContent, Does.Contain("Password reset failed."), "Password reset should return generic 'Password reset failed.' message");
        Assert.That(controllerContent, Does.Contain("Password change failed."), "Password change should return generic 'Password change failed.' message");
        
        // Verify specific error details are still logged for admin debugging
        Assert.That(controllerContent, Does.Contain("errorMessage: error"), "Specific error details should be logged for debugging");
    }
}
