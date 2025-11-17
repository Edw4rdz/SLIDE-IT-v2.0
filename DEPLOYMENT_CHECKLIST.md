# Quick Start Deployment Checklist

## 🎯 Prerequisites
- [ ] GitHub account with repository pushed
- [ ] Vercel account (free tier OK)
- [ ] Render account (free tier OK)
- [ ] Firebase project set up
- [ ] All API keys ready (Gemini, Google OAuth)

## 📦 Backend Deployment (Render) - Do This First

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Create New Web Service**: New + → Web Service
3. **Connect GitHub**: Select your repository
4. **Configure Service**:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. **Add Environment Variables**: Copy from `backend/.env` or `backend/.env.production.example`
   - FIREBASE_PROJECT_ID
   - FIREBASE_PRIVATE_KEY (entire key with \n)
   - FIREBASE_CLIENT_EMAIL
   - GEMINI_API_KEY
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GOOGLE_REDIRECT_URI (will be: https://YOUR-BACKEND.onrender.com/api/google/callback)
   - CORS_ORIGIN (will update later with Vercel URL)
6. **Deploy**: Click "Create Web Service"
7. **Wait 5-10 minutes** for deployment
8. **Copy Backend URL**: Example: `https://slide-it-backend.onrender.com`

## 🎨 Frontend Deployment (Vercel) - Do This Second

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Import Project**: Add New... → Project → Import from GitHub
3. **Select Repository**: Choose your SLIDE-IT repository
4. **Configure Project**:
   - Framework Preset: Create React App
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`
5. **Add Environment Variables**:
   - REACT_APP_BACKEND_URL=https://YOUR-BACKEND.onrender.com (from step above)
   - REACT_APP_FIREBASE_API_KEY=...
   - REACT_APP_FIREBASE_AUTH_DOMAIN=...
   - REACT_APP_FIREBASE_PROJECT_ID=...
   - REACT_APP_FIREBASE_STORAGE_BUCKET=...
   - REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
   - REACT_APP_FIREBASE_APP_ID=...
6. **Deploy**: Click "Deploy"
7. **Wait 3-5 minutes** for build
8. **Copy Frontend URL**: Example: `https://slide-it.vercel.app`

## 🔄 Update Backend CORS - Do This Third

1. **Go back to Render** → Your backend service
2. **Update Environment Variable**:
   - CORS_ORIGIN=https://YOUR-FRONTEND.vercel.app
3. **Save** (service will auto-redeploy)

## 🔐 Update OAuth Settings - Do This Fourth

### Firebase Console
1. Go to: https://console.firebase.google.com
2. Your Project → Authentication → Settings → Authorized domains
3. Add: `your-frontend.vercel.app`
4. Add: `your-backend.onrender.com`

### Google Cloud Console
1. Go to: https://console.cloud.google.com
2. APIs & Services → Credentials
3. Edit OAuth 2.0 Client ID
4. Authorized redirect URIs → Add:
   - `https://your-backend.onrender.com/api/google/callback`
5. Authorized JavaScript origins → Add:
   - `https://your-frontend.vercel.app`
   - `https://your-backend.onrender.com`

## ✅ Testing - Do This Last

1. **Visit Your App**: https://your-frontend.vercel.app
2. **Test Features**:
   - [ ] Login/Signup works
   - [ ] Google OAuth login works
   - [ ] PDF to PPT conversion works
   - [ ] AI Generator works
   - [ ] Download presentations works
   - [ ] Admin dashboard accessible (if admin user)

## 🚨 Troubleshooting

### "Network Error" or CORS issues
→ Check CORS_ORIGIN in Render matches your Vercel URL exactly

### "Firebase Auth Error"
→ Verify authorized domains in Firebase Console

### Backend not responding
→ Check Render logs for errors
→ Verify all environment variables are set

### Build fails on Vercel
→ Check build logs for specific error
→ Ensure all dependencies are in package.json

## 📝 Important Notes

- **Free Tier Limitations**:
  - Render: Server sleeps after 15 min of inactivity (30s wake time)
  - Vercel: 100GB bandwidth/month, 100 deployments/day
  
- **Environment Variables**: Never commit `.env` files! Use `.env.example` as template

- **Updates**: Push to GitHub → auto-deploys on both platforms

## 🎉 You're Done!

Your SLIDE-IT app is now live:
- Frontend: https://your-app.vercel.app
- Backend: https://your-backend.onrender.com

For detailed instructions, see `DEPLOYMENT_GUIDE.md`
