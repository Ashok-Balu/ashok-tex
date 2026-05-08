# Deployment Checklist

## Live URLs
- Frontend: https://ashok-tex.vercel.app
- Backend: https://ashok-tex-1.onrender.com
- Vercel frontend dashboard: https://vercel.com/ashokbkaa-1314s-projects/ashok-tex
- Render backend dashboard: https://dashboard.render.com/web/srv-d7pgm4n7f7vs739jr4ig

## 1) Vercel frontend environment
Set these environment variables in Vercel for the `frontend/` app:

```env
VITE_API_URL=https://ashok-tex-1.onrender.com
VITE_APP_NAME=Ashok Tex
```

> Note: Do not include `/api` in `VITE_API_URL`; the frontend app appends `/api` automatically.

## 2) Render backend environment
Set these environment variables in Render for the `backend/` service:

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/ashok-tex
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://ashok-tex.vercel.app
CLIENT_URL=https://ashok-tex.vercel.app
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_KEY=your-cloudinary-key
CLOUDINARY_SECRET=your-api-secret
RENDER_EXTERNAL_URL=https://ashok-tex-1.onrender.com
```

> Make sure these variable names are exact in Render: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `CLIENT_URL`, `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET`, `RENDER_EXTERNAL_URL`.

## 3) MongoDB password
If you rotate the Atlas database user password, update the full `MONGODB_URI` value in Render immediately.

> Atlas path: Database Access → Edit user → Generate new password → update env and Render environment variables.
>
> Example:
> `mongodb+srv://dbuser:newPassword@cluster.mongodb.net/ashok-tex?retryWrites=true&w=majority`
>
> Then redeploy the backend if Render does not automatically detect the env var change.
>
> After redeploy, verify the backend is healthy by visiting:
> `https://ashok-tex-1.onrender.com/api/health`
> It should return JSON with `status: ok`.
>
> Keep the password secret and do not commit it to source control.

## 4) Cloudinary
If the app uses Cloudinary uploads, make sure all three values are configured:
- `CLOUDINARY_NAME`
- `CLOUDINARY_KEY`
- `CLOUDINARY_SECRET`

## 5) CORS
The backend CORS whitelist must include your frontend origin. Use:

```env
CORS_ORIGIN=https://ashok-tex.vercel.app
```

## 6) Verify deployment
- Vercel frontend should successfully build and deploy the `frontend/` code.
- Render backend should start using `npm start` from `backend/`.
- Confirm the frontend can reach the backend URL from the browser.

## 7) Local development
- Backend: `cd backend && npm install && npm run dev`
- Frontend: `cd frontend && npm install && npm run dev`
- Local front-end `.env` should keep `VITE_API_URL=` blank so Vite proxies to `http://localhost:5000`.
