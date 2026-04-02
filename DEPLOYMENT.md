# Deployment Guide: Digital Chaos Lab v2

## 🚀 Quick Deploy Checklist

### Prerequisites
- [ ] GitHub account
- [ ] Vercel account (free tier works)
- [ ] Render account (free tier works)
- [ ] Repository pushed to GitHub

---

## 📋 Step-by-Step Deployment

### Phase 1: Prepare Your Repository

1. **Push all changes to GitHub**:
   ```bash
   git add .
   git commit -m "feat: add production deployment configuration"
   git push origin main
   ```

2. **Verify these files exist**:
   - ✅ `vercel.json` (Vercel configuration)
   - ✅ `render.yaml` (Render blueprint)
   - ✅ `backend/.env.example` (Backend env vars)
   - ✅ `frontend/.env.example` (Frontend env vars)
   - ✅ `frontend/src/config.js` (Environment handler)
   - ✅ `frontend/nginx.conf` (Nginx SPA config)

---

### Phase 2: Deploy Backend to Render

#### Option A: Using Render Blueprint (Recommended)

1. Go to **[Render Dashboard](https://dashboard.render.com/)**

2. Click **"New +"** → **"Blueprint"**

3. **Connect GitHub repository**:
   - Select your repository: `kunal202426/System-Design-Simulator`
   - Render will auto-detect `render.yaml`

4. **Review the blueprint**:
   - Service Name: `digital-chaos-lab-api`
   - Runtime: Python 3.11
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

5. **Set environment variables**:
   ```
   SLACK_WEBHOOK_URL = https://hooks.slack.com/services/YOUR/WEBHOOK/URL (optional)
   RUNBOOK_BASE_URL = https://runbooks.example.com
   FRONTEND_URL = (leave empty for now, update after Vercel deployment)
   ```

6. **Click "Apply"** and wait for deployment (5-10 minutes)

7. **Copy your backend URL** after successful deployment:
   ```
   Example: https://digital-chaos-lab-api.onrender.com
   ```
   📝 **Save this URL** - you'll need it for Vercel!

#### Option B: Manual Web Service Creation

1. Go to **[Render Dashboard](https://dashboard.render.com/)**

2. Click **"New +"** → **"Web Service"**

3. **Connect repository** and configure:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Add environment variables** (see above)

5. **Deploy** and copy the URL

---

### Phase 3: Deploy Frontend to Vercel

1. Go to **[Vercel Dashboard](https://vercel.com/dashboard)**

2. Click **"Add New"** → **"Project"**

3. **Import your GitHub repository**:
   - Select `kunal202426/System-Design-Simulator`
   - Vercel will auto-detect `vercel.json`

4. **Configure Build Settings**:
   - Framework Preset: Vite
   - Build Command: `cd frontend && npm ci && npm run build`
   - Output Directory: `frontend/dist`
   - Install Command: `cd frontend && npm ci`

5. **Add Environment Variables** (CRITICAL):
   ```
   VITE_API_URL = https://digital-chaos-lab-api.onrender.com
   VITE_WS_URL = wss://digital-chaos-lab-api.onrender.com
   ```
   ⚠️ **IMPORTANT**: 
   - Use the Render URL from Step 2, Phase 7
   - Use `wss://` (NOT `ws://`) for WebSocket URL
   - No trailing slashes

6. **Click "Deploy"** and wait (2-5 minutes)

7. **Copy your Vercel URL** after deployment:
   ```
   Example: https://your-project.vercel.app
   ```

---

### Phase 4: Update Backend CORS

1. Go back to **Render Dashboard**

2. Select your backend service: `digital-chaos-lab-api`

3. Go to **"Environment"** tab

4. **Add/Update** the `FRONTEND_URL` variable:
   ```
   FRONTEND_URL = https://your-project.vercel.app
   ```

5. **Click "Save Changes"**

6. Render will automatically redeploy with new CORS settings

---

### Phase 5: Verify Deployment

1. **Open your Vercel frontend URL** in browser

2. **Open browser DevTools** (F12) → Console tab

3. **Check for**:
   - ✅ No CORS errors
   - ✅ Environment config logs showing correct URLs
   - ✅ No "localhost:8000" references

4. **Test WebSocket connection**:
   - Create a simulation
   - Start the simulation
   - Check for "WebSocket connected" in console

5. **Test API calls**:
   - Load configuration
   - Inject chaos events
   - Verify real-time updates

---

## 🔧 Configuration Reference

### Backend Environment Variables (Render)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `PORT` | ✅ (auto) | `10000` | Render assigns automatically |
| `FRONTEND_URL` | ✅ | `https://your-app.vercel.app` | Your Vercel domain for CORS |
| `SLACK_WEBHOOK_URL` | ❌ | `https://hooks.slack.com/...` | For Slack alerts |
| `RUNBOOK_BASE_URL` | ❌ | `https://runbooks.example.com` | Runbook link base |

### Frontend Environment Variables (Vercel)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | ✅ | `https://your-api.onrender.com` | Render backend URL (https://) |
| `VITE_WS_URL` | ✅ | `wss://your-api.onrender.com` | Render backend URL (wss://) |

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch" or CORS errors

**Symptoms**: Console shows CORS policy errors

**Solutions**:
1. Verify `FRONTEND_URL` is set correctly in Render
2. Make sure Vercel URL matches exactly (no trailing slash)
3. Redeploy backend after updating `FRONTEND_URL`
4. Check Render logs for CORS middleware initialization

### Issue: WebSocket connection fails

**Symptoms**: "WebSocket connection failed" in console

**Solutions**:
1. ✅ Ensure you're using `wss://` (NOT `ws://`) in Vercel env vars
2. ✅ Verify backend is running (check Render service status)
3. ✅ Check browser mixed content warnings (HTTPS page needs WSS)
4. Test WebSocket URL directly: `wss://your-api.onrender.com/ws/simulation/test`

### Issue: Frontend shows "localhost:8000"

**Symptoms**: App tries to connect to localhost

**Solutions**:
1. Verify `VITE_API_URL` and `VITE_WS_URL` are set in Vercel dashboard
2. Rebuild frontend deployment in Vercel
3. Clear browser cache and hard reload (Ctrl+Shift+R)
4. Check `src/config.js` is being used correctly

### Issue: Backend crashes on startup

**Symptoms**: Render service shows "Deploy failed" or crashes

**Solutions**:
1. Check Render logs for Python errors
2. Verify `requirements.txt` has all dependencies
3. Test locally first: `uvicorn main:app --port 8000`
4. Ensure `PORT` environment variable is being used

### Issue: Build fails on Vercel

**Symptoms**: "Build failed" during deployment

**Solutions**:
1. Check build logs for npm errors
2. Verify `package.json` scripts are correct
3. Ensure `frontend/dist` directory is generated
4. Check Node.js version compatibility

### Issue: 404 on page refresh

**Symptoms**: App works initially but 404 when refreshing non-root routes

**Solutions**:
1. Verify `nginx.conf` is copied in Dockerfile
2. Check nginx config has `try_files $uri /index.html`
3. Rebuild frontend Docker image

---

## 🔄 Updating After Changes

### Update Frontend
```bash
git add .
git commit -m "Update frontend"
git push origin main
```
Vercel will auto-deploy from GitHub (if connected).

### Update Backend
```bash
git add .
git commit -m "Update backend"
git push origin main
```
Render will auto-deploy from GitHub (if auto-deploy enabled).

### Manual Redeploy
- **Vercel**: Dashboard → Your Project → Deployments → Redeploy
- **Render**: Dashboard → Your Service → Manual Deploy → Deploy latest commit

---

## 💰 Cost Estimate

### Free Tier Limits

**Vercel**:
- ✅ Unlimited bandwidth
- ✅ 100 GB-hours compute
- ✅ Custom domains
- ⚠️ 1 concurrent build

**Render**:
- ✅ Free tier: 750 hours/month
- ⚠️ Spins down after 15 min inactivity (cold starts ~30s)
- ⚠️ 512 MB RAM limit
- ✅ Automatic SSL

**Total**: $0/month for both services on free tier

### Upgrade Considerations
- Backend heavy usage → Render Starter ($7/mo) for always-on
- Large team → Vercel Pro ($20/mo) for concurrent builds

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

---

## ✅ Post-Deployment Checklist

- [ ] Backend deployed to Render successfully
- [ ] Backend URL copied and saved
- [ ] Frontend deployed to Vercel successfully
- [ ] Frontend URL copied and saved
- [ ] `VITE_API_URL` set in Vercel (https://)
- [ ] `VITE_WS_URL` set in Vercel (wss://)
- [ ] `FRONTEND_URL` set in Render
- [ ] Backend redeployed after CORS update
- [ ] WebSocket connection tested
- [ ] API calls working
- [ ] No console errors
- [ ] Page refresh works (SPA routing)
- [ ] Slack alerts tested (optional)

---

## 🎉 Success!

Your Digital Chaos Lab is now live! Share your Vercel URL with others to demonstrate your distributed systems observability platform.

**Example URLs**:
- Frontend: https://digital-chaos-lab.vercel.app
- Backend API: https://digital-chaos-lab-api.onrender.com
- Health Check: https://digital-chaos-lab-api.onrender.com/
