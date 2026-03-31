# Quick Start: Deploy to DigitalOcean in 10 Steps

## Step 1: Create DigitalOcean Account
- Go to https://www.digitalocean.com
- Sign up or log in
- Choose a region

## Step 2: Create PostgreSQL Database
1. In DigitalOcean Console → **Databases** → **Create Database**
2. Select **PostgreSQL 15**
3. Choose your region
4. Select basic plan
5. Name it `cast-library-db`
6. Create a database named `DndLibrary`
7. Create a user (save password)
8. Copy the connection string

## Step 3: Generate JWT Key
Run this in PowerShell:
```powershell
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString() + "Extra" )) | Select-Object -First 43
```
Copy the output.

## Step 4: Prepare GitHub
```bash
# Push all changes
git add .
git commit -m "Add DigitalOcean deployment files"
git push origin main
```

Make sure these new files are in your repo:
- `Dockerfile`
- `app.yaml`
- `DIGITALOCEAN_DEPLOYMENT.md`

## Step 5: Create App Platform App
1. In DigitalOcean Console → **Apps** → **Create App**
2. Select **GitHub**
3. Select your repository: `casting-cards`
4. Select branch: `main`
5. Region: Choose closest to you
6. Click **Next**

## Step 6: Configure Build Settings
- Dockerfile path: `/Dockerfile` (should auto-detect)
- Source: `/` (root)
- Click **Next**

## Step 7: Set Environment Variables
Copy these into DigitalOcean App Platform console:

```
DB_CONNECTION_STRING=postgresql://user:password@host.db.ondigitalocean.com:25060/DndLibrary
JWT_KEY=<paste your generated key from Step 3>
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=<gmail app-specific password>
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
FRONTEND_BASE_URL=https://yourdomain.com
IMAGE_STORAGE_BASE_URL=https://api.yourdomain.com/images
```

## Step 8: Review & Create
1. Review all settings
2. Click **Create App**
3. DigitalOcean will build and deploy

## Step 9: Monitor Deployment
1. Go to **Deployments** tab
2. Watch the build progress
3. Check **Build Logs** if there are issues
4. Once complete, app is live!

## Step 10: Test It Out
1. Go to your app's URL (displayed in DigitalOcean console)
2. Test the `/health` endpoint
3. Update your frontend to use new API URL
4. Test some API calls

---

## Total Setup Time: ~15 minutes

**Your app is now live on DigitalOcean! 🚀**

---

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Build fails | Check **Build Logs** → redeploy |
| Can't connect to database | Verify `DB_CONNECTION_STRING` in Environment Variables |
| CORS errors | Update `FRONTEND_BASE_URL` environment variable |
| Email won't send | Use Gmail app-specific password |
| 500 errors | Check **Runtime Logs** for error messages |

## Next Steps
- [ ] Configure custom domain
- [ ] Set up monitoring alerts
- [ ] Review costs weekly
- [ ] Test backup/restore procedures
- [ ] Document deployment in your team wiki

---

For detailed information, see:
- `DIGITALOCEAN_DEPLOYMENT.md` - Full deployment guide
- `ENV_VARIABLES.md` - Environment variable reference
- `DEPLOYMENT_CHECKLIST.md` - Pre/post deployment checklist
