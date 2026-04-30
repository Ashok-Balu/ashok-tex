# Ashok Tex Deployment Guide

## Prerequisites
- Node.js 18+
- Git installed and configured
- GitHub account (Ashok-Balu)
- Vercel account (for frontend)
- Railway account (for backend)

## Local Development

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure with your values
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env  # Configure with your values
npm run dev
```

## Deployment Steps

### 1. Git Setup
```bash
git init
git add .
git commit -m "Initial commit: Ashok Tex full-stack application"
git branch -M main
git remote add origin https://github.com/Ashok-Balu/ashok-tex.git
git push -u origin main
```

### 2. Frontend Deployment (Vercel)
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Set framework to "Vite"
4. Add environment variables:
   - VITE_API_URL: Your Railway backend URL
5. Deploy

### 3. Backend Deployment (Railway)
1. Go to https://railway.app
2. Create new project
3. Connect GitHub repository
4. Select backend folder
5. Add environment variables:
   - MONGODB_URI: Your MongoDB connection string
   - JWT_SECRET: Your secret key
   - CORS_ORIGIN: Your Vercel frontend URL
   - CLOUDINARY_NAME: Your Cloudinary account
   - CLOUDINARY_KEY: Your API key
   - CLOUDINARY_SECRET: Your API secret
6. Deploy

## Environment Variables Reference

### Backend (.env)
```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
NODE_ENV=production
CORS_ORIGIN=https://your-vercel-app.vercel.app
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_KEY=your_cloudinary_key
CLOUDINARY_SECRET=your_cloudinary_secret
```

### Frontend (.env)
```
VITE_API_URL=https://your-railway-app.up.railway.app
VITE_APP_NAME=Ashok Tex
```

## Database Setup
- Create MongoDB Atlas cluster
- Get connection string
- Use in MONGODB_URI environment variable

## File Structure
- `/backend` - Express.js REST API
- `/frontend` - Vue 3 + Vite application

## Support Resources
- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
