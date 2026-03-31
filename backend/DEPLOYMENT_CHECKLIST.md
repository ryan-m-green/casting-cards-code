# DigitalOcean Deployment Checklist

Use this checklist to ensure your app is properly configured for deployment.

## Pre-Deployment

- [ ] All code committed and pushed to `main` branch on GitHub
- [ ] GitHub repository is public or DigitalOcean has access
- [ ] No hardcoded secrets in code
- [ ] `.env` and `.env.local` files added to `.gitignore`

## DigitalOcean Setup

### Account & Region
- [ ] DigitalOcean account created
- [ ] Selected preferred region (for lower latency)

### PostgreSQL Database
- [ ] PostgreSQL 15 database created
- [ ] Database name: `DndLibrary`
- [ ] User created with strong password
- [ ] Connection string saved
- [ ] Firewall rules configured to allow App Platform access
- [ ] Backups enabled

### Environment Variables (Set in App Platform)
- [ ] `DB_CONNECTION_STRING` - PostgreSQL connection string
- [ ] `JWT_KEY` - Secure random 32+ character key
- [ ] `SMTP_HOST` - Email provider SMTP host
- [ ] `SMTP_USERNAME` - Email account username
- [ ] `SMTP_PASSWORD` - Email account password (Gmail app-specific password if using Gmail)
- [ ] `EMAIL_FROM_ADDRESS` - Sender email address
- [ ] `FRONTEND_BASE_URL` - Your frontend URL
- [ ] `IMAGE_STORAGE_BASE_URL` - Image storage public URL

## App Platform Configuration

### Create App
- [ ] App Platform app created
- [ ] GitHub repository connected
- [ ] `main` branch selected
- [ ] `app.yaml` configuration reviewed

### App Settings
- [ ] Service name: `api`
- [ ] Dockerfile detected correctly
- [ ] HTTP port: `8080`
- [ ] Deploy on push enabled (or disabled if preferred)
- [ ] Health check: `/health`

### Database
- [ ] PostgreSQL database linked (if using DO Managed DB)
- [ ] Connection string environment variable set

## Security Review

- [ ] No hardcoded credentials in `appsettings.json`
- [ ] No API keys exposed in code
- [ ] JWT key is strong and randomized
- [ ] Database password is strong
- [ ] CORS origins properly configured for your frontend domain
- [ ] HTTPS enabled on custom domain

## Testing

- [ ] App builds successfully locally
- [ ] `dotnet run` works with environment variables set
- [ ] All migrations run successfully
- [ ] Health check endpoint returns 200 OK
- [ ] Basic API endpoints respond correctly

## Deployment

- [ ] Repository pushed to GitHub
- [ ] All files committed (Dockerfile, app.yaml, etc.)
- [ ] App created in DigitalOcean App Platform
- [ ] Environment variables set
- [ ] Deployment initiated
- [ ] Build logs reviewed for errors
- [ ] Runtime logs show successful startup
- [ ] Health check passing

## Post-Deployment

- [ ] App is accessible at DigitalOcean URL
- [ ] API endpoints responding correctly
- [ ] Database connectivity working
- [ ] Email sending tested (if applicable)
- [ ] Image upload/download working
- [ ] Authentication working
- [ ] Logs being generated correctly
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate installed (if applicable)

## Monitoring

- [ ] App Platform dashboard bookmarked
- [ ] Runtime logs checked regularly
- [ ] Error logs reviewed for issues
- [ ] Resource usage within acceptable limits
- [ ] Database backups running
- [ ] Monitoring alerts configured (optional)

## Documentation

- [ ] Team notified of deployment URL
- [ ] Frontend developers have correct API URL
- [ ] Documentation updated with new API endpoint
- [ ] Deployment procedure documented for future reference

## Rollback Plan

- [ ] Previous version tagged in Git
- [ ] Know how to redeploy previous version
- [ ] Database backups available
- [ ] Understand deployment rollback process in App Platform

## Cost Monitoring

- [ ] DigitalOcean billing alerts set
- [ ] Understand current monthly costs
- [ ] Review resource scaling needs

## Common Issues & Fixes

### App won't start
1. Check runtime logs for error messages
2. Verify all environment variables are set
3. Check database connection string
4. Review PostgreSQL firewall rules

### Build fails
1. Check build logs in Deployments tab
2. Verify Dockerfile is correct
3. Ensure all project files are in repository
4. Check that `.NET SDK 10.0` is used in build

### Database connection errors
1. Verify `DB_CONNECTION_STRING` is set
2. Check PostgreSQL database is running
3. Verify username/password are correct
4. Check firewall allows App Platform IP range
5. Test connection locally first

### CORS errors
1. Check `FRONTEND_BASE_URL` matches your frontend domain
2. Update `AllowedOrigins` in appsettings.json if needed
3. Redeploy after changes

### Email not sending
1. Verify SMTP credentials are correct
2. For Gmail, use app-specific password, not main password
3. Enable "Less secure app access" if using Gmail
4. Check SMTP_PORT is 587 for TLS

## Post-Deployment Monitoring

Set up regular checks:
- [ ] Weekly: Review resource usage and logs
- [ ] Monthly: Check cost and optimization opportunities
- [ ] Quarterly: Test disaster recovery procedures

## Support Resources

- DigitalOcean Docs: https://docs.digitalocean.com/products/app-platform/
- .NET Docs: https://learn.microsoft.com/dotnet/
- GitHub: https://github.com/ryan-m-green/casting-cards

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Version**: _____________
**Notes**: ________________________________________________________________________
