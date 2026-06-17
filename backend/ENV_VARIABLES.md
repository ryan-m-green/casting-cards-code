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

### Email Configuration (Sender.net)
```
SENDER_API_TOKEN=<your-sender-net-api-token>
SENDER_FROM_EMAIL=your-email@yourdomain.com
SENDER_FROM_NAME=Your Name
EMAIL_ADMIN_ADDRESS=admin@yourdomain.com
```
Get your API token from Sender.net Settings -> API access tokens

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
SENDER_API_TOKEN=your-sender-net-api-token
SENDER_FROM_EMAIL=your-email@yourdomain.com
SENDER_FROM_NAME=Your Name
EMAIL_ADMIN_ADDRESS=admin@yourdomain.com
FRONTEND_BASE_URL=http://localhost:4200
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

## Sender.net Setup

1. Create a Sender.net account at https://sender.net
2. Go to Settings -> API access tokens
3. Create an API token (set validation period to "Forever")
4. Verify your sending domain in Sender.net Settings
5. Use the token as `SENDER_API_TOKEN`
6. Set `SENDER_FROM_EMAIL` to your verified domain email
7. Set `SENDER_FROM_NAME` to your desired sender name

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

### "SENDER_API_TOKEN not configured" error
- Ensure `SENDER_API_TOKEN` is set in environment variables
- Verify the token is valid in Sender.net
- Check Runtime Logs for configuration errors

### Email sending failures
- Verify your sending domain is authenticated in Sender.net
- Check that `SENDER_FROM_EMAIL` matches your verified domain
- Review Sender.net logs for delivery status
- Ensure API token has proper permissions

### Variables not being picked up
- Variable names must use double underscores (`__`) not colons (`:`)
- Example: `Jwt__Key` not `Jwt:Key`
- Changes require app redeployment
- Check Runtime Logs for configuration errors
