# 🚀 Render Deployment Guide for Ashok Tex Backend

## Your Current Setup

- ✅ Frontend (Vercel): **https://ashok-tex.vercel.app**
- ⏳ Backend (Render): To be deployed
- ✅ Database (MongoDB Atlas): Configured
- ✅ Code (GitHub): Pushed to `ashok-tex`

---

## 📋 Step-by-Step Render Backend Deployment

### Prerequisites
- Render account (free tier available): https://render.com
- GitHub repository with code pushed: ✅ Done

### Step 1: Create Render Account (if needed)
1. Go to https://render.com
2. Sign up with GitHub (recommended for easy integration)
3. Authorize GitHub access

### Step 2: Create Web Service on Render

1. **Go to Dashboard**: https://dashboard.render.com
2. **Click**: "New +" → "Web Service"
3. **Connect GitHub**:
   - Click "Connect account" 
   - Authorize Render to access GitHub
   - Search for `ashok-tex` repository
   - Select it
4. **Configure Service**:
   - **Name**: `ashok-tex-backend`
   - **Environment**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (or Starter if needed)

### Step 3: Add Environment Variables

In the Render dashboard, go to **Environment** and add these variables:

```
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://ashokbkaa_db_user:KI6zqSMd0WsnV7Js@ashoktex.rgc7wyf.mongodb.net/ashoktex?retryWrites=true&w=majority
JWT_SECRET=ashoktex_super_secret_change_in_production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://ashok-tex.vercel.app
CLIENT_URL=https://ashok-tex.vercel.app
CLOUDINARY_NAME=Root
CLOUDINARY_KEY=147117228816599
CLOUDINARY_SECRET=DCF-Nt0jnq8eQKZ3V3lmf3lxiM4
```

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your GitHub repo
   - Install dependencies
   - Start the server
3. Wait 2-5 minutes for deployment to complete
4. Once deployed, you'll get a URL like: `https://ashok-tex-xxxxx.onrender.com`

---

## 🔗 Your URLs After Deployment

- **Frontend**: https://ashok-tex.vercel.app
- **Backend API**: https://ashok-tex-xxxxx.onrender.com
- **GitHub**: https://github.com/Ashok-Balu/ashok-tex

---

## 🧪 Testing Backend API

After deployment, test your backend:

```bash
# Test health endpoint
curl https://your-render-url.onrender.com/api/health

# Or in browser, visit:
https://your-render-url.onrender.com/api/auth/login
```

---

## 📝 Important Notes

### About Render Free Plan
- ✅ **Pros**: Free, easy setup, auto-deploys from GitHub
- ⚠️ **Cons**: Instances spin down after 15 minutes of inactivity
  - First request takes 30-60 seconds to wake up
  - **Solution**: Upgrade to Starter ($7/month) for always-on services

### Environment Variables
- All variables are securely stored on Render
- Not stored in code (following best practices)
- Update in Render dashboard if needed

### Auto-Deployment
- Every time you push to GitHub main branch
- Render automatically rebuilds and deploys
- No manual deployment needed

---

## 🔄 Future Deployments

After initial setup, every time you update code:

```bash
git add .
git commit -m "Your changes"
git push origin main
# Render automatically redeploys!
```

---

## 🆘 Troubleshooting

### Backend not connecting from frontend
- ✅ Check CORS_ORIGIN matches Vercel URL exactly
- ✅ Check API_URL in frontend `.env` matches Render URL
- ✅ Verify Render environment variables are set correctly

### Service keeps crashing
- Check Render logs: Dashboard → Service → Logs
- Look for MongoDB connection errors
- Verify JWT_SECRET is set

### Slow first request
- This is normal on free tier (instances spin down)
- Upgrade to Starter plan for always-on service

### Environment variables not working
- Make sure you added them in Render dashboard
- Click "Environment" tab, not just in config files
- Click "Save" after adding variables

---

## 📊 Deployment Summary

| Service | Platform | Status | Cost |
|---------|----------|--------|------|
| Frontend | Vercel | ✅ Deployed | Free |
| Backend | Render | ⏳ Deploy now | Free/7/mo |
| Database | MongoDB Atlas | ✅ Configured | Free (M0) |
| CDN | Vercel + Render | ✅ Ready | Included |

---

## 🎉 You're Ready!

Everything is configured. Follow the steps above to deploy your backend to Render!

**Questions?** Check Render documentation: https://render.com/docs