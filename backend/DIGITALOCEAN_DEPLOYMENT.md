# DigitalOcean App Platform Deployment Guide

This guide will help you deploy the Cast Library API to DigitalOcean App Platform.

## Prerequisites

1. **DigitalOcean Account** - Sign up at https://www.digitalocean.com
2. **GitHub Repository** - Your code must be pushed to GitHub
3. **DigitalOcean CLI** (optional, for advanced management)

## Deployment Steps

### 1. Set Up PostgreSQL Database

First, create a managed PostgreSQL database on DigitalOcean:

1. Log in to the [DigitalOcean Console](https://cloud.digitalocean.com)
2. Go to **Databases** → **Create Database**
3. Select **PostgreSQL** version 15
4. Choose your region (same as your app for lower latency)
5. Select a basic plan (starts at $12/month)
6. Name your database cluster (e.g., `cast-library-db`)
7. Add a database named `DndLibrary`
8. Create a user for your app (note the password)
9. Save the **Connection String** - you'll need it later

### 2. Create DigitalOcean App

1. Go to **Apps** (formerly App Platform) in DigitalOcean Console
2. Click **Create App**
3. Select **GitHub** as the deployment source
4. Authorize DigitalOcean to access your GitHub account
5. Select your repository (`casting-cards`)
6. Select the `main` branch
7. Choose the region closest to your users
8. Click **Next**

### 3. Configure the App

In the App configuration screen:

1. **Service Configuration**:
   - The `app.yaml` file should be auto-detected
   - Review the build command and Docker configuration
   - Click **Edit** if needed to adjust

2. **Environment Variables**:
   Set the following environment variables in the App Platform console:
   
   ```
   JWT_KEY=                    # Generate a secure 32+ character key
   DB_CONNECTION_STRING=       # From your PostgreSQL setup
   SMTP_HOST=                  # Your email provider's SMTP host
   SMTP_USERNAME=              # Email account username
   SMTP_PASSWORD=              # Email account password
   EMAIL_FROM_ADDRESS=         # Sender email address
   FRONTEND_BASE_URL=          # Your Angular app URL (e.g., https://app.example.com)
   IMAGE_STORAGE_BASE_URL=     # The public base URL for images (e.g., https://api.example.com/images)
   ```

3. **Database Configuration**:
   - If using DigitalOcean Managed PostgreSQL, link it in the App Platform console
   - The `DB_CONNECTION_STRING` variable will be automatically populated

### 4. Generate a Secure JWT Key

Generate a secure random key for JWT authentication (minimum 32 characters):

**Using PowerShell:**
```powershell
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString())) | Select-Object -First 32
```

Or use an online generator like: https://www.random.org/strings/

### 5. Deploy

1. After configuring environment variables, click **Create App**
2. DigitalOcean will:
   - Build your Docker image
   - Push it to their container registry
   - Deploy the app to a container
   - Assign a public URL

3. Monitor the deployment in the **Deployments** tab
4. Once complete, your app will be available at a `.ondigitalocean.app` URL

### 6. Configure Custom Domain (Optional)

1. In your App settings, go to **Settings** → **Domains**
2. Add your custom domain
3. Update your domain's DNS records to point to DigitalOcean nameservers
4. DigitalOcean will automatically provision an SSL certificate

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_KEY` | Secret key for JWT signing (32+ chars) | `your-secret-key-here-min-32-chars` |
| `DB_CONNECTION_STRING` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_USERNAME` | Email account for sending | `your-email@gmail.com` |
| `SMTP_PASSWORD` | Email account password or app-specific password | `xxxx xxxx xxxx xxxx` |
| `EMAIL_FROM_ADDRESS` | Sender email address | `noreply@yourdomain.com` |
| `FRONTEND_BASE_URL` | Your Angular frontend URL | `https://app.example.com` |
| `IMAGE_STORAGE_BASE_URL` | Public URL for image storage | `https://api.example.com/images` |

## Important Security Notes

### Gmail Setup
If using Gmail:
1. Enable 2-Factor Authentication on your Google account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use the app password (16 chars, no spaces) as `SMTP_PASSWORD`
4. Do NOT use your main Gmail password

### JWT Key
- Generate a strong, random key
- Minimum 32 characters recommended
- Use only in DigitalOcean App Platform environment variables
- Rotate periodically in production

### Database
- Always use a managed database (DigitalOcean PostgreSQL)
- Enable firewall rules to restrict access
- Use strong passwords
- Set up automatic backups

## Monitoring and Logs

### View Application Logs
1. Go to your App in DigitalOcean Console
2. Click **Runtime Logs** to see real-time application output
3. Use **Build Logs** to debug build issues

### Health Checks
The app includes a health check endpoint at `/health` which DigitalOcean will use to monitor app status.

## Auto-Deployment

With the `app.yaml` configuration:
- Every push to the `main` branch automatically triggers a new deployment
- Disable this in App settings → Deploy on Push if needed

## Troubleshooting

### Build Fails
1. Check **Build Logs** in the Deployments section
2. Verify all environment variables are set correctly
3. Ensure the Dockerfile and `app.yaml` are in the repository root

### App Won't Start
1. Check **Runtime Logs** for error messages
2. Verify database connection string is correct
3. Ensure all required environment variables are set
4. Check database is accessible from the app

### High Memory Usage
- Adjust resource limits in `app.yaml`
- Current config: 512MB memory limit
- Monitor with DigitalOcean's metrics dashboard

## Updating the Application

1. Make changes locally
2. Commit and push to `main` branch
3. DigitalOcean automatically detects changes and redeploys
4. Monitor deployment in the Deployments tab

## Cost Estimation

- **App Container**: ~$12/month (basic, auto-scales)
- **PostgreSQL Database**: ~$12/month (basic, 1GB)
- **Bandwidth & Storage**: Additional charges (usually minimal)

## Support Resources

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [.NET on DigitalOcean](https://docs.digitalocean.com/products/app-platform/languages-frameworks/dotnet/)
- [PostgreSQL Documentation](https://docs.digitalocean.com/products/databases/postgresql/)

## Next Steps

1. Create DigitalOcean account if you haven't
2. Set up PostgreSQL database
3. Generate secure JWT key
4. Create App in DigitalOcean console
5. Set environment variables
6. Deploy!

For questions or issues, check DigitalOcean's support documentation or community forums.
