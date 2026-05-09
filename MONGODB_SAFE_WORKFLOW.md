# 🔒 Safe MongoDB Atlas Workflow Guide

## Overview

This guide implements a **safe, production-ready workflow** for MongoDB Atlas that prevents accidental data loss and ensures proper backups.

---

## 📋 Phase 1: Local Development Setup

### 1.1 Install MongoDB Community Edition (Local)

**Windows:**
1. Download: https://www.mongodb.com/try/download/community
2. Run installer → Accept defaults
3. MongoDB will run as a Windows Service
4. Verify: Open PowerShell and run `mongosh`

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install mongodb-org
sudo systemctl start mongod
```

### 1.2 Verify Local MongoDB

```bash
# Check connection
mongosh

# Should show: test>
```

### 1.3 Use Local Environment

Development uses **local MongoDB only** - no credentials needed:

```bash
# .env.development uses local database
MONGO_URI=mongodb://localhost:27017/ashoktex_dev
```

This prevents ANY risk to production.

---

## 🔧 Phase 2: MongoDB Atlas Setup

### 2.1 Create Three Databases in Atlas Cluster

Login to MongoDB Atlas → Your Cluster → Collections:

```
Database Name          Purpose
─────────────────────────────────────────
ashoktex_dev          Dev work (never used in production)
ashoktex_test         Testing & staging
ashoktex_prod         ⚠️  PRODUCTION - NEVER develop here
```

### 2.2 Create Database Users

In MongoDB Atlas → Database Access → Add Database User:

**User 1: App User (Read/Write)**
- Username: `ashok_app_user`
- Password: `[strong-password]`
- Permissions: `readWrite` on all databases

**User 2: Admin User (Admin Only)**
- Username: `ashok_admin_user`
- Password: `[very-strong-password]`
- Permissions: `dbOwner` on all databases

⚠️ **NEVER use Admin credentials in your application**

### 2.3 Get Connection Strings

For each database, MongoDB Atlas provides a URI:

```
mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
```

Copy the URIs for `.env.test` and `.env.production`

---

## 📁 Phase 3: Environment File Setup

### Files Structure

```
backend/
├── .env.development    ← Local MongoDB (safe)
├── .env.test          ← Atlas test database (safe to delete)
├── .env.production    ← Atlas prod database (⚠️  DANGEROUS)
├── .env.example       ← Template (safe to commit)
└── .gitignore         ← Prevents accidental commits
```

### Load Correct Environment

**Development:**
```bash
npm run dev
# Uses .env.development (local)
```

**Testing:**
```bash
NODE_ENV=test npm run dev
# Uses .env.test (Atlas)
```

**Production:**
```bash
NODE_ENV=production node server.js
# Uses .env.production (Atlas)
```

---

## 💾 Phase 4: Install MongoDB Database Tools

Required for backup/restore.

### Download

https://www.mongodb.com/try/download/database-tools

### Windows Installation

1. Download `.msi` file
2. Run installer
3. Add to PATH:
   - Right-click "This PC" → Properties
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Add MongoDB Tools bin folder to PATH
   - Restart terminal

### Verify

```bash
mongodump --version
mongorestore --version
```

---

## 🔐 Phase 5: Backup Strategy

### 5.1 Before ANY Risky Operation

Always backup:
- Before deployment
- Before running seed scripts
- Before migrations
- Before bulk updates

### 5.2 Create Backup (One-Click Windows)

**Option 1: Double-click BACKUP.bat**
```
backend/BACKUP.bat
```

**Option 2: Terminal**
```bash
npm run db:backup
```

This creates:
```
backups/
└── production/
    └── 2024-05-09T10-30-45/
        ├── admin/
        ├── config/
        ├── users/
        └── BACKUP_INFO.json
```

### 5.3 View Backup Info

```bash
cat backups/production/2024-05-09T10-30-45/BACKUP_INFO.json
```

Shows:
- Backup timestamp
- Database name
- File size
- Restore command

### 5.4 Restore from Backup

```bash
npm run db:restore backups/production/2024-05-09T10-30-45
```

---

## 🌱 Phase 6: Safe Seeding

### 6.1 Dangerous vs Safe

❌ **Dangerous (Never use):**
```javascript
await User.deleteMany({})        // Deletes ALL users
await User.insertMany(data)      // Inserts new ones
```

Problem: If script crashes, all data is lost!

✅ **Safe (Always use):**
```javascript
await User.updateOne(
  { email: user.email },
  { $set: user },
  { upsert: true }               // Update if exists, insert if not
)
```

Benefit: Updates existing, inserts missing, keeps old data safe

### 6.2 Run Safe Seed

```bash
npm run seed:safe -- --force
```

Output:
```
📝 Processing users...
  ✅ Created: admin
  🔄 Updated: ashok
  ⊘ Already exists: arvinth
```

### 6.3 Production Protection

Seed script prevents running in production:

```bash
NODE_ENV=production npm run seed:safe -- --force

# Error: Cannot run seed in production environment
```

---

## 🚀 Phase 7: Safe Deployment Workflow

### Step 1: Backup (Before Anything!)

```bash
npm run db:backup
```

### Step 2: Test Locally

```bash
npm run dev
# Test all features
```

### Step 3: Push Code

```bash
git add .
git commit -m "feature: add new endpoint"
git push
```

### Step 4: Deploy

```bash
# Using your deployment platform (Vercel, Railway, etc)
git push production main
```

### Step 5: Verify

- Check application
- Monitor logs
- Ensure no errors

### Step 6: Keep Backup Safe

Move to external storage:
```
Google Drive
OneDrive
External USB
```

---

## 📋 Dangerous Commands (NEVER USE)

```javascript
// ❌ NEVER do this:
db.dropDatabase()              // Deletes entire database
db.collection.deleteMany({})   // Deletes all documents
db.collection.drop()           // Deletes entire collection
db.collection.remove({})       // (Deprecated, but still dangerous)
```

---

## ✅ Safety Checklist

Before each deployment:

- [ ] Created backup: `npm run db:backup`
- [ ] Tested locally: `npm run dev`
- [ ] Used safe seed: `npm run seed:safe -- --force`
- [ ] Never used `deleteMany({})` in code
- [ ] No `.env.production` in git commit
- [ ] Backup stored safely (Google Drive, USB, etc)

---

## 🆘 Emergency Recovery

### If Data Was Accidentally Deleted

**Step 1:** Panic slightly (it happens!)

**Step 2:** Stop the application
```bash
# Kill any running processes
```

**Step 3:** Check for backups
```bash
ls backups/production/
```

**Step 4:** Restore from backup
```bash
npm run db:restore backups/production/[LATEST]
```

**Step 5:** Verify data
```bash
mongosh
use ashoktex_prod
db.users.find()
```

---

## 📚 Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (local MongoDB) |
| `npm run start` | Start production server |
| `npm run seed:safe -- --force` | Safe seed with upsert |
| `npm run db:backup` | Create backup of database |
| `npm run db:restore [path]` | Restore from backup |
| `npm run db:clear -- --force` | Delete all collections (test only!) |

---

## 🔗 Useful Links

- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Database Tools: https://www.mongodb.com/try/download/database-tools
- Mongoose Docs: https://mongoosejs.com/
- MongoDB Docs: https://docs.mongodb.com/

---

## 💡 Best Practices Summary

1. **Local First** → Always develop locally
2. **Backup Always** → Before risky operations
3. **Test First** → Use test database for testing
4. **Safe Scripts** → Use upsert, never deleteMany
5. **Production Safe** → Prevent seed in production
6. **Separate Creds** → App user ≠ Admin user
7. **Version Control** → Never commit `.env` files
8. **Monitor Logs** → Check for errors after deployment

---

## 🎯 30-Day Safety Habit

| Week | Action |
|------|--------|
| Week 1 | Set up 3 databases & backup scripts |
| Week 2 | Create first backup & test restore |
| Week 3 | Implement safe seed in your scripts |
| Week 4 | Do one complete safe deployment cycle |

After 30 days, this becomes automatic! 🚀

---

**Questions?** Contact your database administrator or refer to MongoDB docs.

**Last Updated:** May 2026
