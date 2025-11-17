# 🔒 Security Checklist for Deployment

## ⚠️ CRITICAL: Before Deploying

### 1. Never Commit These Files
- [ ] `.env` (any environment file with actual values)
- [ ] `serviceAccountKey.json` or `serviceAccountkey.json`
- [ ] Any file containing API keys, passwords, or secrets
- [ ] `node_modules` folder

### 2. Check Git History
If you accidentally committed sensitive data:

```bash
# Check what's in your git history
git log --all --full-history -- "*serviceAccountKey.json"

# If found, you MUST:
# 1. Regenerate all keys/secrets that were exposed
# 2. Use git-filter-repo to remove from history (or start fresh repo)
# 3. Force push to remove from GitHub
```

### 3. Firebase Service Account
- [ ] Never commit `serviceAccountKey.json` to GitHub
- [ ] Add individual fields as environment variables in Render
- [ ] If exposed, immediately regenerate in Firebase Console:
  - Firebase Console → Project Settings → Service Accounts
  - Click "Generate New Private Key"
  - Revoke the old one

### 4. API Keys to Protect
- [ ] `GEMINI_API_KEY` - Regenerate in Google AI Studio
- [ ] `GOOGLE_CLIENT_SECRET` - Regenerate in Google Cloud Console
- [ ] `FIREBASE_PRIVATE_KEY` - Regenerate in Firebase Console
- [ ] Firebase config (API key, etc.) - These are OK to be public for web apps but can be restricted

### 5. Environment Variables Setup

#### Backend (Render)
All sensitive data goes here as environment variables:
- ✅ Set in Render Dashboard → Environment tab
- ❌ Never hardcode in code
- ❌ Never commit in .env files

#### Frontend (Vercel)
- ✅ Use REACT_APP_ prefix for all env vars
- ✅ Set in Vercel Dashboard → Settings → Environment Variables
- ⚠️ These will be visible in browser (use for non-sensitive config only)

### 6. CORS Configuration
- [ ] Set `CORS_ORIGIN` to your exact Vercel URL
- [ ] Don't use wildcard `*` in production
- [ ] Update after deploying frontend

### 7. Firebase Security Rules
Check your Firestore rules are secure:

```javascript
// ❌ BAD - Anyone can read/write
allow read, write: if true;

// ✅ GOOD - Authenticated users only
allow read, write: if request.auth != null;
```

### 8. OAuth Redirect URIs
- [ ] Only add your actual domain URLs
- [ ] Remove `localhost` URLs after testing
- [ ] Use HTTPS only

### 9. Rate Limiting
Consider adding rate limiting to prevent abuse:
- API endpoints (especially AI generation)
- File uploads
- Authentication attempts

### 10. File Upload Security
- [ ] Validate file types on backend
- [ ] Set file size limits
- [ ] Scan for malicious content if possible
- [ ] Use virus scanning for production

## 📋 Pre-Deployment Checklist

### Code Review
- [ ] Remove all `console.log()` with sensitive data
- [ ] Remove debug/development code
- [ ] Check for hardcoded secrets
- [ ] Review error messages (don't expose system details)

### Git Check
```bash
# Check what you're about to commit
git status

# Check for sensitive files
git diff

# If you see any secrets, do NOT commit!
```

### Dependencies
```bash
# Check for known vulnerabilities
npm audit

# Fix if possible
npm audit fix
```

## 🚨 If You Exposed Secrets

### Immediate Actions:
1. **Rotate ALL exposed credentials immediately**
   - Firebase service account
   - Gemini API key
   - Google OAuth credentials
   - Any other exposed keys

2. **Remove from Git History**
   ```bash
   # Use git-filter-repo (better than filter-branch)
   # Or create a fresh repository
   ```

3. **Update all services**
   - Render environment variables
   - Vercel environment variables
   - Firebase Console
   - Google Cloud Console

4. **Monitor for unusual activity**
   - Check Firebase usage
   - Check API quotas
   - Review access logs

## ✅ Best Practices

### Development
- Use `.env.example` files (no real values)
- Use different API keys for dev/prod
- Never share credentials via chat/email
- Use a password manager for secrets

### Production
- Enable 2FA on all services (GitHub, Vercel, Render, Firebase)
- Regularly rotate credentials
- Monitor API usage and costs
- Set up billing alerts
- Use secret management services for larger teams

### Access Control
- Limit who has access to production systems
- Use principle of least privilege
- Remove access when team members leave
- Audit access regularly

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/basics)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Render Environment Variables](https://render.com/docs/environment-variables)

## 🆘 Emergency Contacts

If you suspect a security breach:
1. Immediately rotate all credentials
2. Contact platform support (Vercel, Render, Firebase)
3. Review logs for unauthorized access
4. Consider taking system offline temporarily

---

**Remember**: Security is not optional. Take the time to do it right! 🔒
