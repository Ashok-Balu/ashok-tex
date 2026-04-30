# 🚀 FINAL DEPLOYMENT GUIDE - Ashok Tex

## ✅ Your Credentials (Ready to Use)

### Backend Environment Variables (Railway):
```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://ashokbkaa_db_user:KI6zqSMd0WsnV7Js@ashoktex.rgc7wyf.mongodb.net/ashoktex?retryWrites=true&w=majority
JWT_SECRET=ashoktex_super_secret_change_in_production
CORS_ORIGIN=https://ashok-tex.vercel.app
CLOUDINARY_NAME=Root
CLOUDINARY_KEY=147117228816599
CLOUDINARY_SECRET=DCF-Nt0jnq8eQKZ3V3lmf3lxiM4
```

### Frontend Environment Variables (Vercel):
```
VITE_API_URL=https://ashok-tex.up.railway.app
VITE_APP_NAME=Ashok Tex
```

---

## 🎯 STEP-BY-STEP DEPLOYMENT

### Step 1: Deploy Frontend to Vercel (5 minutes)

1. **Go to Vercel**: https://vercel.com/new
2. **Click**: "Continue with GitHub"
3. **Search for**: `ashok-tex`
4. **Select**: `ashok-tex` repository
5. **Configure**:
   - **Root Directory**: `frontend/`
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`
6. **Environment Variables**:
   ```
   VITE_API_URL=https://ashok-tex.up.railway.app
   VITE_APP_NAME=Ashok Tex
   ```
7. **Click**: "Deploy"
8. **Wait**: 2-3 minutes for deployment
9. **Save your URL**: `https://ashok-tex-xxxxx.vercel.app`

### Step 2: Deploy Backend to Railway (5 minutes)

1. **Go to Railway**: https://railway.app
2. **Create New Project** → **"Deploy from GitHub"**
3. **Connect GitHub** → Select `ashok-tex`
4. **Configure**:
   - **Root Directory**: `backend/`
   - **Environment**: Node.js
5. **Environment Variables** (copy-paste all):
   ```
   PORT=5000
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://ashokbkaa_db_user:KI6zqSMd0WsnV7Js@ashoktex.rgc7wyf.mongodb.net/ashoktex?retryWrites=true&w=majority
   JWT_SECRET=ashoktex_super_secret_change_in_production
   CORS_ORIGIN=https://ashok-tex.vercel.app
   CLOUDINARY_NAME=Root
   CLOUDINARY_KEY=147117228816599
   CLOUDINARY_SECRET=DCF-Nt0jnq8eQKZ3V3lmf3lxiM4
   ```
6. **Click**: "Deploy"
7. **Wait**: 3-5 minutes for deployment
8. **Save your URL**: `https://ashok-tex-xxxxx.up.railway.app`

### Step 3: Update Frontend API URL (2 minutes)

1. **Go back to Vercel Dashboard**
2. **Select your project**: `ashok-tex`
3. **Settings** → **Environment Variables**
4. **Update**: `VITE_API_URL` with your Railway URL
5. **Deployments** → **Redeploy** latest deployment

---

## 🔗 Your Live URLs Will Be:

- **Frontend**: https://ashok-tex.vercel.app
- **Backend API**: https://ashok-tex.up.railway.app
- **GitHub Code**: https://github.com/Ashok-Balu/ashok-tex

---

## 🧪 Testing Your Deployment

### Test Backend API:
```bash
curl https://your-railway-url.up.railway.app/api/health
```

### Test Frontend:
- Visit your Vercel URL
- Try logging in with default credentials:
  - Username: `admin`
  - Password: `admin123`

---

## 📋 Deployment Checklist

- [ ] GitHub repository created and code pushed
- [ ] Vercel account created
- [ ] Railway account created
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway
- [ ] Environment variables configured
- [ ] Frontend API URL updated
- [ ] Applications tested and working

---

## 🚨 Important Notes

1. **CORS_ORIGIN**: Make sure it matches your Vercel URL exactly
2. **VITE_API_URL**: Make sure it matches your Railway URL exactly
3. **MongoDB URI**: Already configured and working
4. **Cloudinary**: Credentials are ready to use

---

## 🎉 You're All Set!

Follow the 3 steps above and your application will be live! 🚀

**Need help?** Each step has exact values to copy-paste.