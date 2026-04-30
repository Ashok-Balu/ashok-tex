# 🚀 Ashok Tex - Deployment & Hosting Quick Reference Card

## PHASE-BY-PHASE CHECKLIST

```
╔════════════════════════════════════════════════════════════════╗
║                  DEPLOYMENT QUICK REFERENCE                    ║
║                     (Print This Page)                          ║
╚════════════════════════════════════════════════════════════════╝

┌─ PHASE 1: GIT SETUP (10 min) ──────────────────────────────────┐
│                                                                  │
│  [ ] 1. Download Git: https://git-scm.com/download/win         │
│  [ ] 2. Install with default options                           │
│  [ ] 3. Restart terminal/VS Code                               │
│  [ ] 4. Verify: type "git --version"                           │
│  [ ] 5. Configure:                                             │
│        git config --global user.name "Ashok Balu"              │
│        git config --global user.email "your@email.com"         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌─ PHASE 2: GITHUB SETUP (5 min) ────────────────────────────────┐
│                                                                  │
│  [ ] 1. Go to: https://github.com/new                          │
│  [ ] 2. Repository name: ashok-tex                             │
│  [ ] 3. Description: "Powerloom Business Management System"    │
│  [ ] 4. Select: Public                                         │
│  [ ] 5. Don't initialize with README                           │
│  [ ] 6. Click "Create repository"                              │
│  [ ] 7. Copy the HTTPS URL from the next page                  │
│                                                                  │
│  YOUR REPO URL: https://github.com/Ashok-Balu/ashok-tex.git    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌─ PHASE 3: PUSH TO GITHUB (5 min) ──────────────────────────────┐
│                                                                  │
│  [ ] 1. Open PowerShell/Terminal                               │
│  [ ] 2. cd "e:\Ashok Tex\ashok-tex 2"                          │
│  [ ] 3. Copy-paste these commands:                             │
│                                                                  │
│        git init                                                 │
│        git add .                                                │
│        git commit -m "Initial commit: Ashok Tex"               │
│        git branch -M main                                       │
│        git remote add origin PASTE_YOUR_REPO_URL               │
│        git push -u origin main                                  │
│                                                                  │
│  [ ] 4. If prompted for credentials:                           │
│        - Username: Ashok-Balu                                   │
│        - Password: Use Personal Access Token                    │
│          (Generate at: https://github.com/settings/tokens)      │
│                                                                  │
│  [ ] 5. Verify at: https://github.com/Ashok-Balu/ashok-tex    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌─ PHASE 4: CREATE ACCOUNTS (15 min) ────────────────────────────┐
│                                                                  │
│  Create FREE accounts at:                                       │
│                                                                  │
│  [ ] Vercel      → https://vercel.com/signup                  │
│  [ ] Railway     → https://railway.app/login                  │
│  [ ] MongoDB     → https://www.mongodb.com/cloud/atlas        │
│  [ ] Cloudinary  → https://cloudinary.com/users/register/free │
│                                                                  │
│  Keep these tabs/passwords safe!                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌─ PHASE 5: DEPLOY FRONTEND (5 min) ────────────────────────────┐
│                                                                  │
│  [ ] 1. Go to: https://vercel.com/new                          │
│  [ ] 2. Click "Continue with GitHub"                           │
│  [ ] 3. Search for: ashok-tex                                  │
│  [ ] 4. Click "Import"                                         │
│  [ ] 5. Root Directory: frontend/                              │
│  [ ] 6. Build Command: npm run build                           │
│  [ ] 7. Environment Variables:                                 │
│        VITE_API_URL=http://localhost:5000  (update later)     │
│        VITE_APP_NAME=Ashok Tex                                 │
│  [ ] 8. Click "Deploy"                                         │
│  [ ] 9. Wait for deployment to complete ✓                      │
│  [ ] 10. Save your Vercel URL:                                 │
│                                                                  │
│      VERCEL_URL: ___________________________________            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌─ PHASE 6: SETUP DATABASE (5 min) ──────────────────────────────┐
│                                                                  │
│  [ ] 1. Go to: https://cloud.mongodb.com                       │
│  [ ] 2. Sign in (or create account)                            │
│  [ ] 3. Create new Project: "Ashok Tex"                        │
│  [ ] 4. Create Cluster (Free tier)                             │
│  [ ] 5. Create Database User:                                  │
│        Username: ________________________                        │
│        Password: ________________________ (save securely!)      │
│  [ ] 6. Add IP Access: 0.0.0.0/0 (allow all)                  │
│  [ ] 7. Get Connection String:                                 │
│        - Click "Connect"                                        │
│        - Choose "Connect your application"                      │
│        - Copy connection string                                 │
│                                                                  │
│      MONGODB_URI: ________________________________              │
│                                                                  │
│  [ ] 8. Replace <password> with your password                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌─ PHASE 7: DEPLOY BACKEND (5 min) ──────────────────────────────┐
│                                                                  │
│  [ ] 1. Go to: https://railway.app                             │
│  [ ] 2. Sign in (or sign up with GitHub)                       │
│  [ ] 3. Create new Project                                     │
│  [ ] 4. "Deploy from GitHub"                                   │
│  [ ] 5. Select: ashok-tex repository                           │
│  [ ] 6. Root Directory: backend/                               │
│  [ ] 7. Add Environment Variables (8 total):                   │
│                                                                  │
│     PORT=5000                                                   │
│     NODE_ENV=production                                         │
│     MONGODB_URI=(paste from Phase 6)                            │
│     JWT_SECRET=(any random string, e.g., asdf1234asdf)         │
│     CORS_ORIGIN=(your Vercel URL from Phase 5)                 │
│     CLOUDINARY_NAME=your-cloudinary-name                       │
│     CLOUDINARY_KEY=your-api-key                                │
│     CLOUDINARY_SECRET=your-api-secret                          │
│                                                                  │
│  [ ] 8. Deploy                                                  │
│  [ ] 9. Wait for deployment complete ✓                         │
│  [ ] 10. Save your Railway URL:                                │
│                                                                  │
│      RAILWAY_URL: ________________________________              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌─ PHASE 8: FINALIZE (2 min) ────────────────────────────────────┐
│                                                                  │
│  [ ] 1. Go back to Vercel Dashboard                            │
│  [ ] 2. Select ashok-tex project                               │
│  [ ] 3. Settings → Environment Variables                       │
│  [ ] 4. Update VITE_API_URL:                                   │
│        (paste your RAILWAY_URL from Phase 7)                   │
│  [ ] 5. Go to "Deployments" tab                                │
│  [ ] 6. Click "Redeploy" on latest deployment                  │
│  [ ] 7. Wait for redeployment to complete ✓                    │
│                                                                  │
│  ✅ YOUR APP IS NOW LIVE!                                       │
│                                                                  │
│  Frontend: https://ashok-tex.vercel.app                         │
│  API: https://ashok-tex.up.railway.app                          │
│  Code: https://github.com/Ashok-Balu/ashok-tex                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 📊 IMPORTANT VARIABLES TO SAVE

```
┌──────────────────────────────────────────────────────────────┐
│  SAVE THESE IMMEDIATELY - YOU'LL NEED THEM!                 │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  GitHub Repository:                                            │
│  https://github.com/Ashok-Balu/ashok-tex                      │
│                                                                │
│  Frontend (Vercel):                                            │
│  https://ashok-tex-[random].vercel.app                         │
│                                                                │
│  Backend (Railway):                                            │
│  https://ashok-tex-[random].up.railway.app                     │
│                                                                │
│  Database (MongoDB):                                           │
│  mongodb+srv://user:pass@cluster.mongodb.net/ashok-tex         │
│                                                                │
│  Cloudinary Credentials:                                       │
│  Cloud Name: ____________________________                       │
│  API Key: ____________________________                          │
│  API Secret: ____________________________                       │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

## 🆘 TROUBLESHOOTING

```
Problem                          Solution
─────────────────────────────────────────────────────────────
"git not found"                  Restart terminal after installing Git
"GitHub push fails"              Use Personal Access Token (not password)
"Vercel deploy fails"            Check root dir = "frontend/"
"API returns 404"                Verify VITE_API_URL is correct
"MongoDB connection error"       Check URI & password in Railway
"Images don't upload"            Verify Cloudinary credentials in Railway
```

## ⚡ AFTER DEPLOYMENT - FUTURE UPDATES

```
When you want to update your application:

1. Make changes to code
2. cd "e:\Ashok Tex\ashok-tex 2"
3. git add .
4. git commit -m "Your change description"
5. git push origin main

🎉 Vercel & Railway automatically redeploy!
```

## 📞 QUICK LINKS

```
GitHub:     https://github.com/Ashok-Balu
Vercel:     https://vercel.com/dashboard
Railway:    https://railway.app/dashboard
MongoDB:    https://cloud.mongodb.com
Cloudinary: https://cloudinary.com/console
```

---

**⏱️ Total time to deployment: ~50 minutes**

**📚 For detailed guides, see DOCUMENTATION_INDEX.md**

**🎉 Good luck with your deployment!**