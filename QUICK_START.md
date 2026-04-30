# 🚀 Quick Start - From Zero to Deployed

## Phase 1️⃣: Install Git (5 minutes)

**If you haven't installed Git yet:**
1. Download: https://git-scm.com/download/win
2. Run installer, use default options
3. Restart VS Code/Terminal
4. Verify: `git --version`

**Configure Git:**
```powershell
git config --global user.name "Ashok Balu"
git config --global user.email "your-email@example.com"
```

## Phase 2️⃣: Push to GitHub (10 minutes)

**In your project terminal:**
```powershell
cd "e:\Ashok Tex\ashok-tex 2"
git init
git add .
git commit -m "Initial commit: Ashok Tex full-stack application"
git branch -M main
git remote add origin https://github.com/Ashok-Balu/ashok-tex.git
git push -u origin main
```

**First time pushing?** Create the repository first:
1. Go to https://github.com/new
2. Name it: `ashok-tex`
3. Click "Create repository" (don't initialize)
4. Then run the commands above

## Phase 3️⃣: Setup Accounts (15 minutes)

Create free accounts if you don't have them:
- [ ] **Vercel**: https://vercel.com/signup (for frontend)
- [ ] **Railway**: https://railway.app/login (for backend)
- [ ] **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas (for database)
- [ ] **Cloudinary**: https://cloudinary.com/users/register/free (for image uploads)

## Phase 4️⃣: Deploy Frontend (5 minutes)

1. Go to https://vercel.com/new
2. Select "GitHub" and search for "ashok-tex"
3. Set project root: `frontend`
4. Click "Deploy"
5. Wait for green checkmark ✅

**Save your Vercel URL** (looks like: `https://ashok-tex-xxxxx.vercel.app`)

## Phase 5️⃣: Setup Database (5 minutes)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create new project: "Ashok Tex"
3. Create cluster (free tier is fine)
4. Create database user (save password!)
5. Get connection string (looks like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/ashok-tex?retryWrites=true&w=majority
   ```

## Phase 6️⃣: Deploy Backend (5 minutes)

1. Go to https://railway.app
2. Create new project → "Deploy from GitHub"
3. Select "ashok-tex" → backend folder
4. Add these environment variables:
   ```
   MONGODB_URI=mongodb+srv://...     (from Atlas)
   JWT_SECRET=any-random-secret-string-here
   CORS_ORIGIN=https://ashok-tex-xxxxx.vercel.app
   CLOUDINARY_NAME=your-cloudinary-name
   CLOUDINARY_KEY=your-api-key
   CLOUDINARY_SECRET=your-secret
   NODE_ENV=production
   PORT=5000
   ```
5. Deploy!

**Save your Railway URL** (looks like: `https://ashok-tex-xxxxx.up.railway.app`)

## Phase 7️⃣: Complete Frontend Setup (2 minutes)

1. Go to Vercel Dashboard
2. Select your project → Settings → Environment Variables
3. Add/Update:
   ```
   VITE_API_URL=https://ashok-tex-xxxxx.up.railway.app
   VITE_APP_NAME=Ashok Tex
   ```
4. Go to Deployments → Redeploy latest

## ✅ Done! Your app is live!

- **Frontend**: https://ashok-tex-xxxxx.vercel.app
- **API**: https://ashok-tex-xxxxx.up.railway.app
- **Code**: https://github.com/Ashok-Balu/ashok-tex

## 🔄 Making Updates

After this setup, whenever you update code:

```powershell
git add .
git commit -m "Your change description"
git push origin main
```

**Vercel & Railway automatically redeploy!** ⚡

---

## 📚 For More Details
- **GIT_SETUP.md** - Detailed Git installation guide
- **DEPLOYMENT.md** - Environment variables reference
- **DEPLOYMENT_CHECKLIST.md** - Complete step-by-step checklist

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "git not found" | Restart terminal after installing Git |
| Deploy fails | Check environment variables match exactly |
| API 404 errors | Verify VITE_API_URL in Vercel settings |
| Images not uploading | Check Cloudinary credentials in Railway |
| Database connection error | Verify MongoDB URI and user password |

---

**Need help?** See the detailed guides in this repository!
