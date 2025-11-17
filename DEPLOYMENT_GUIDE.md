# SLIDE-IT Deployment Guide

## Overview
This guide will help you deploy SLIDE-IT with:
- **Frontend**: Vercel (React app)
- **Backend**: Render (Node.js/Express API)

---

## Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Render Account**: Sign up at [render.com](https://render.com)
4. **Firebase Project**: Ensure your Firebase project is set up
5. **API Keys**: Have all your API keys ready (Gemini, Google OAuth, Firebase)

---

## Part 1: Deploy Backend to Render

### Step 1: Prepare Backend Code

1. Ensure your `backend/package.json` has the correct start script:
   ```json
   "scripts": {
     "start": "node server.js"
   }
   ```

2. Update `backend/server.js` to use environment variable for PORT:
   ```javascript
   const PORT = process.env.PORT || 3001;
   ```

3. Ensure CORS is configured to accept your Vercel domain:
   ```javascript
   app.use(cors({
     origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
     credentials: true
   }));
   ```

### Step 2: Deploy to Render

1. **Push code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Log in to Render Dashboard**
   - Go to [dashboard.render.com](https://dashboard.render.com)

3. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repository and the `backend` folder

4. **Configure Web Service**
   - **Name**: `slide-it-backend` (or your choice)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for better performance)

5. **Add Environment Variables**
   Go to "Environment" tab and add:
   ```
   NODE_ENV=production
   PORT=3001
   
   # Firebase Admin SDK
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY=your-private-key-from-service-account
   FIREBASE_CLIENT_EMAIL=your-client-email
   
   # Gemini AI
   GEMINI_API_KEY=your-gemini-api-key
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=https://your-backend-url.onrender.com/api/google/callback
   
   # CORS (update after deploying frontend)
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```

   **Important**: For `FIREBASE_PRIVATE_KEY`, copy the entire private key from your service account JSON including `\n` characters. Or replace `\n` with actual newlines.

6. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your backend URL: `https://slide-it-backend.onrender.com`

### Step 3: Verify Backend

- Visit `https://your-backend-url.onrender.com/` - should show "Slide-IT API is running"
- Test an endpoint like `/api/test` if you have one

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Prepare Frontend Code

1. **Update API endpoint** in `frontend/src/api.js`:
   ```javascript
   const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
   ```

2. **Create environment variable file** `frontend/.env.production`:
   ```env
   REACT_APP_BACKEND_URL=https://your-backend-url.onrender.com
   REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   ```

3. **Commit changes**:
   ```bash
   git add .
   git commit -m "Configure for Vercel deployment"
   git push origin main
   ```

### Step 2: Deploy to Vercel

1. **Log in to Vercel Dashboard**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)

2. **Import Project**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Select the repository

3. **Configure Project**
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `build` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   ```
   REACT_APP_BACKEND_URL=https://your-backend-url.onrender.com
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-domain.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build (3-5 minutes)
   - Note your frontend URL: `https://your-app.vercel.app`

### Step 3: Update Backend CORS

1. Go back to **Render Dashboard** → Your backend service
2. Update environment variable:
   ```
   CORS_ORIGIN=https://your-app.vercel.app
   ```
3. Save changes (backend will auto-redeploy)

---

## Part 3: Update OAuth Redirect URIs

### Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → Authentication → Settings
3. Add authorized domains:
   - `your-app.vercel.app`
   - `your-backend-url.onrender.com`

### Google Cloud Console (OAuth)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   ```
   https://your-backend-url.onrender.com/api/google/callback
   ```
5. Add to **Authorized JavaScript origins**:
   ```
   https://your-app.vercel.app
   https://your-backend-url.onrender.com
   ```

---

## Part 4: Testing

1. **Test Frontend**
   - Visit `https://your-app.vercel.app`
   - Try logging in
   - Test a conversion (PDF, Word, etc.)

2. **Test Backend**
   - Check backend logs in Render dashboard
   - Verify API calls are successful

3. **Test Features**
   - ✅ User authentication (email/password)
   - ✅ Google OAuth login
   - ✅ PDF to PPT conversion
   - ✅ Word to PPT conversion
   - ✅ Excel to PPT conversion
   - ✅ Text to PPT conversion
   - ✅ AI Generator
   - ✅ Image uploads
   - ✅ Download presentations
   - ✅ History tracking
   - ✅ Admin dashboard

---

## Part 5: Common Issues & Solutions

### Issue: "Network Error" or CORS errors
**Solution**: 
- Verify `CORS_ORIGIN` in Render matches your Vercel URL exactly
- Check backend logs in Render for errors
- Ensure `REACT_APP_BACKEND_URL` is correct in Vercel

### Issue: "Firebase Auth Error"
**Solution**:
- Add your Vercel domain to Firebase authorized domains
- Verify all Firebase environment variables are correct
- Check Firebase console for error details

### Issue: "Module not found" during build
**Solution**:
- Ensure all dependencies are in `package.json`
- Try deleting `node_modules` and `package-lock.json`, then reinstall
- Check for missing polyfills (buffer, process, etc.)

### Issue: Backend deployment fails
**Solution**:
- Check Render build logs for specific errors
- Verify `package.json` has correct Node version (if specified)
- Ensure all environment variables are set

### Issue: "Cold start" slow on Render free tier
**Solution**:
- Free tier spins down after inactivity
- Consider upgrading to paid tier for always-on service
- Or implement a keep-alive ping service

### Issue: File uploads not working
**Solution**:
- Render free tier has limited disk space
- Use Firebase Storage or AWS S3 for file uploads
- Check file size limits

---

## Part 6: Monitoring & Maintenance

### Vercel
- **Analytics**: Enable in project settings
- **Logs**: View in deployment details
- **Domains**: Add custom domain in project settings

### Render
- **Logs**: View in service dashboard
- **Metrics**: Monitor CPU/memory usage
- **Auto-deploy**: Enabled by default on git push

### Performance Tips
1. **Enable caching**: Render → Settings → "Disk" (paid plans)
2. **Use CDN**: Vercel automatically uses CDN
3. **Optimize images**: Use WebP format where possible
4. **Monitor API limits**: Gemini AI, Firebase quotas
5. **Database indexing**: Ensure Firestore indexes are created

---

## Part 7: Environment Variables Checklist

### Backend (Render)
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_PRIVATE_KEY`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `GEMINI_API_KEY`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI`
- [ ] `CORS_ORIGIN` (Vercel URL)

### Frontend (Vercel)
- [ ] `REACT_APP_BACKEND_URL` (Render URL)
- [ ] `REACT_APP_FIREBASE_API_KEY`
- [ ] `REACT_APP_FIREBASE_AUTH_DOMAIN`
- [ ] `REACT_APP_FIREBASE_PROJECT_ID`
- [ ] `REACT_APP_FIREBASE_STORAGE_BUCKET`
- [ ] `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `REACT_APP_FIREBASE_APP_ID`

---

## Part 8: Post-Deployment

1. **Set up custom domain** (optional)
   - Vercel: Settings → Domains
   - Update OAuth redirect URIs with new domain

2. **Enable HTTPS** (automatic on Vercel and Render)

3. **Set up monitoring**
   - Consider using services like:
     - Sentry (error tracking)
     - LogRocket (session replay)
     - Google Analytics (user analytics)

4. **Create a backup strategy**
   - Regular Firestore exports
   - Code backups in GitHub

5. **Document your deployment**
   - Keep a record of all environment variables
   - Document any custom configurations
   - Note any issues encountered and solutions

---

## Useful Commands

### Redeploy Frontend (Vercel)
```bash
# Option 1: Push to GitHub (auto-deploys)
git push origin main

# Option 2: Vercel CLI
npm i -g vercel
vercel --prod
```

### Redeploy Backend (Render)
```bash
# Push to GitHub (auto-deploys)
git push origin main

# Or manually redeploy from Render dashboard
```

### View Logs
```bash
# Vercel CLI
vercel logs

# Render: View in dashboard or use Render CLI
```

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **Create React App**: https://create-react-app.dev/docs/deployment

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Deploy frontend to Vercel
3. ✅ Update OAuth redirect URIs
4. ✅ Test all features
5. ✅ Monitor performance
6. 🎉 Launch!

Good luck with your deployment! 🚀
