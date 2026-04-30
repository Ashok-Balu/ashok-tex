# Ashok Tex - Complete Deployment Checklist

## ✅ Phase 1: Local Git Setup (Do This First)

### Prerequisites
- [ ] Git installed (follow GIT_SETUP.md)
- [ ] Git configured with your name and email
- [ ] GitHub account created (username: Ashok-Balu)

### Git Initialization
- [ ] Navigate to project root: `cd "e:\Ashok Tex\ashok-tex 2"`
- [ ] Initialize git: `git init`
- [ ] Add all files: `git add .`
- [ ] Create initial commit: `git commit -m "Initial commit: Ashok Tex full-stack app"`
- [ ] Rename branch: `git branch -M main`
- [ ] Add remote: `git remote add origin https://github.com/Ashok-Balu/ashok-tex.git`
- [ ] Push to GitHub: `git push -u origin main`

## ✅ Phase 2: Create GitHub Repository

- [ ] Go to https://github.com/new
- [ ] Repository name: `ashok-tex`
- [ ] Description: "Powerloom Business Management System"
- [ ] Select: Public
- [ ] Don't initialize with README
- [ ] Create repository
- [ ] Copy HTTPS URL and use in `git remote add` command

## ✅ Phase 3: Frontend Deployment (Vercel)

### Prerequisites
- [ ] Code pushed to GitHub
- [ ] Vercel account created at https://vercel.com/signup

### Deployment Steps
1. [ ] Go to https://vercel.com/new
2. [ ] Click "Continue with GitHub"
3. [ ] Search for "ashok-tex" repository
4. [ ] Select `frontend/` as root directory
5. [ ] Set build command: `npm run build`
6. [ ] Set install command: `npm install`
7. [ ] Add environment variables:
   - [ ] `VITE_API_URL`: (your Railway backend URL - add after backend deployed)
   - [ ] `VITE_APP_NAME`: `Ashok Tex`
8. [ ] Click "Deploy"
9. [ ] Wait for deployment to complete
10. [ ] Note your Vercel URL: `https://ashok-tex-xxxxx.vercel.app`

## ✅ Phase 4: Database Setup (MongoDB Atlas)

### Create MongoDB Cluster
1. [ ] Go to https://www.mongodb.com/cloud/atlas
2. [ ] Sign up/Login
3. [ ] Create new project: "Ashok Tex"
4. [ ] Create cluster (Free tier)
5. [ ] Create database user with strong password
6. [ ] Get connection string
7. [ ] Format: `mongodb+srv://username:password@cluster.mongodb.net/ashok-tex?retryWrites=true&w=majority`
8. [ ] Save this connection string

## ✅ Phase 5: Backend Deployment (Railway)

### Prerequisites
- [ ] MongoDB connection string ready
- [ ] Vercel frontend URL
- [ ] Cloudinary account (for image uploads)

### Deployment Steps
1. [ ] Go to https://railway.app
2. [ ] Click "Create New Project"
3. [ ] Select "Deploy from GitHub"
4. [ ] Connect GitHub account
5. [ ] Select `ashok-tex` repository
6. [ ] Add service:
   - [ ] Select "Node" as template
   - [ ] Enter root directory: `backend`
7. [ ] Configure environment variables:
   ```
   PORT=5000
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ashok-tex?retryWrites=true&w=majority
   JWT_SECRET=your-super-secret-key-generate-a-random-string
   CORS_ORIGIN=https://ashok-tex-xxxxx.vercel.app
   CLOUDINARY_NAME=your-cloudinary-name
   CLOUDINARY_KEY=your-cloudinary-api-key
   CLOUDINARY_SECRET=your-cloudinary-api-secret
   ```
8. [ ] Click "Deploy"
9. [ ] Note your Railway URL: `https://ashok-tex-xxxxxx.up.railway.app`

### Get Cloudinary Credentials (If not set up)
1. [ ] Go to https://cloudinary.com/users/register/free
2. [ ] Sign up for free account
3. [ ] Go to Dashboard
4. [ ] Copy:
   - Cloud Name
   - API Key
   - API Secret
5. [ ] Add to Railway environment variables

## ✅ Phase 6: Complete Frontend Deployment

### Update Frontend Environment Variables
1. [ ] Go to Vercel Dashboard
2. [ ] Select your `ashok-tex` project
3. [ ] Go to Settings → Environment Variables
4. [ ] Update `VITE_API_URL` with your Railway URL:
   ```
   VITE_API_URL=https://your-railway-app.up.railway.app
   ```
5. [ ] Redeploy (Deployments → Redeploy)

## ✅ Phase 7: Testing

### Backend Testing
```bash
# Test API endpoint
curl https://your-railway-app.up.railway.app/api/health
```

### Frontend Testing
- [ ] Visit https://ashok-tex-xxxxx.vercel.app
- [ ] Test login functionality
- [ ] Check if API calls work correctly
- [ ] Test file uploads (uses Cloudinary)

## ✅ Phase 8: Post-Deployment

### GitHub Repository Settings
- [ ] Go to Settings → Secrets and variables
- [ ] Store sensitive data (not pushed to repo)
- [ ] Add branch protection rules

### Monitoring
- [ ] Set up Vercel Analytics
- [ ] Set up Railway alerts
- [ ] Monitor MongoDB Atlas metrics

### Documentation
- [ ] Update README.md with:
  - Deployed URLs
  - How to contribute
  - Environment setup
  - Troubleshooting

## 🚨 Important Notes

### Security
- Never commit `.env` files to GitHub
- Always use strong JWT_SECRET
- Regenerate Cloudinary secrets if exposed
- Use HTTPS only

### Scaling (Future)
- Upgrade MongoDB Atlas tier if needed
- Add Redis for caching (Railway)
- Implement CI/CD pipeline with GitHub Actions

### Troubleshooting
- Check Railway/Vercel logs if deployment fails
- Verify environment variables are correct
- Ensure MongoDB connection string is accessible
- Check CORS_ORIGIN matches frontend URL

## Quick Reference Commands

```bash
# Check git status
git status

# Pull latest changes
git pull origin main

# Push new changes
git add .
git commit -m "Descriptive message"
git push origin main

# View deployment logs (after setup)
# Vercel: Dashboard → Deployments → Logs
# Railway: Dashboard → Deployments → Logs
```

## Support Resources
- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- MongoDB Atlas: https://docs.mongodb.com/atlas/
- Cloudinary Docs: https://cloudinary.com/documentation/api_reference
