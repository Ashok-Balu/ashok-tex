# Git & GitHub Setup Guide for Windows

## Step 1: Install Git for Windows

### Option A: Using Installer (Recommended)
1. Go to https://git-scm.com/download/win
2. Download the latest Git installer for Windows
3. Run the installer and follow these settings:
   - ✓ Use Git from Git Bash only (or "Use Git and optional Unix tools")
   - ✓ Use the default options for line endings
   - ✓ Install Git Credential Manager
4. Restart your terminal/VS Code after installation

### Option B: Using Windows Package Manager
```powershell
winget install Git.Git
```

### Option C: Using Chocolatey
```powershell
choco install git
```

## Step 2: Configure Git Locally

After Git is installed, open PowerShell/Command Prompt and run:

```bash
git config --global user.name "Ashok Balu"
git config --global user.email "your-email@example.com"
git config --global core.autocrlf true
```

Verify installation:
```bash
git --version
```

## Step 3: Setup GitHub Repository

### Create Repository on GitHub
1. Go to https://github.com/new
2. Repository name: `ashok-tex`
3. Description: "Powerloom Business Management System - Tamil-first Vue 3 + Node.js + MongoDB"
4. Choose "Public" or "Private"
5. ✗ Don't initialize with README (we have one)
6. Click "Create repository"

### Commands to Push Code

```bash
cd "e:\Ashok Tex\ashok-tex 2"
git init
git add .
git commit -m "Initial commit: Ashok Tex full-stack application"
git branch -M main
git remote add origin https://github.com/Ashok-Balu/ashok-tex.git
git push -u origin main
```

**If asked for credentials:**
- Use GitHub username: `Ashok-Balu`
- Use Personal Access Token (not password):
  1. Go to https://github.com/settings/tokens
  2. Click "Generate new token (classic)"
  3. Give it repo access
  4. Copy and paste when prompted

## Step 4: Verify Push Success

```bash
git log --oneline
git remote -v
```

## Troubleshooting

### "git is not recognized"
- Restart VS Code and terminal
- Reinstall Git ensuring PATH is configured

### "Permission denied"
- Use GitHub Personal Access Token
- Ensure Git Credential Manager is installed

### "fatal: not a git repository"
- Make sure you're in the correct directory
- Run `git init` first

## Next Steps
After pushing to GitHub, proceed with:
1. **Frontend Deployment**: https://vercel.com/new
2. **Backend Deployment**: https://railway.app
3. **Database**: https://www.mongodb.com/cloud/atlas
