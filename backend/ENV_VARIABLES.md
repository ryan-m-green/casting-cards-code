# Environment Variables for DigitalOcean Deployment

This file documents all environment variables needed for deployment.

## Required Variables

### Database Connection
```
DB_CONNECTION_STRING=postgresql://username:password@host.db.ondigitalocean.com:25060/DndLibrary
```
Get this from your DigitalOcean PostgreSQL database connection string.

### JWT Configuration
```
JWT_KEY=<generate a secure random string, 32+ characters>
```
Example: `MySecureKey123456789012345678901234567890`

### Email Configuration (SMTP)
```
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=<gmail app-specific password, NOT your main password>
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
```

### Frontend & Image Storage
```
FRONTEND_BASE_URL=https://yourdomain.com
IMAGE_STORAGE_BASE_URL=https://api.yourdomain.com/images
```

## Local Development

Create a `.env.local` file in the project root for local testing:

```
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=DndLibrary;Username=postgres;Password=your_password
Jwt__Key=LocalDevelopmentKeyMin32CharactersLongForTesting
Email__SmtpHost=smtp.gmail.com
Email__SmtpPort=587
Email__SmtpUsername=your-email@gmail.com
Email__SmtpPassword=your-app-specific-password
Email__FromAddress=your-email@gmail.com
Email__FrontendBaseUrl=http://localhost:4200
ImageStorage__BaseUrl=http://localhost:5048/images
```

Then in `Program.cs`, the configuration will automatically pick up environment variables with double underscores.

## Setting Variables in DigitalOcean App Platform

1. Go to your App in DigitalOcean Console
2. Click **Settings**
3. Scroll to **Environment Variables**
4. Click **Edit** and add your variables
5. Click **Save**
6. The app will automatically redeploy with the new variables

## Generating a Secure JWT Key

### Option 1: PowerShell
```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes([Guid]::NewGuid().ToString() + [Guid]::NewGuid().ToString() + "Extra"))
```

### Option 2: Online Tool
Visit: https://generate.plus/en/base64?gp_size=48

### Option 3: Command Line (Linux/Mac)
```bash
openssl rand -base64 32
```

## Gmail App Password Setup

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Google will generate a 16-character password
4. Use this as your `SMTP_PASSWORD`
5. Remove spaces if any

## Verifying Variables Are Set

After deployment, you can verify variables were correctly set:

1. Go to App Platform console
2. Click your app
3. Click **Runtime Logs** tab
4. Look for any configuration error messages
5. If app starts successfully, variables are loaded correctly

## Troubleshooting

### "Invalid JWT key" error
- Ensure `JWT_KEY` is at least 32 characters
- Regenerate and update in App Platform settings
- Redeploy the app

### "Cannot connect to database" error
- Verify `DB_CONNECTION_STRING` is correct
- Ensure PostgreSQL database is running
- Check firewall rules allow connection from App Platform

### "SMTP authentication failed" error
- For Gmail: Use app-specific password, not your main password
- Verify email/password are correct
- Check SMTP_HOST is correct for your email provider

### Variables not being picked up
- Variable names must use double underscores (`__`) not colons (`:`)
- Example: `Jwt__Key` not `Jwt:Key`
- Changes require app redeployment
- Check Runtime Logs for configuration errors
