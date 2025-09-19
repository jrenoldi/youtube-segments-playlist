# 🚀 Vercel Deployment Guide

This guide will help you deploy your YouTube Segments Playlist project (including the Karaokenator) to Vercel for free.

## 📋 Prerequisites

- GitHub account
- Vercel account (free)
- Your project code pushed to GitHub

## 🛠️ Pre-Deployment Setup

### 1. Ensure Your Project is Ready

Your project has been prepared with the following files:
- ✅ `vercel.json` - Vercel configuration
- ✅ `package.json` - Updated with proper dependencies
- ✅ `.vercelignore` - Optimized deployment files

### 2. Push to GitHub

If you haven't already, push your project to GitHub:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## 🚀 Deploy to Vercel

### Method 1: GitHub Integration (Recommended)

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up/Login** with your GitHub account
3. **Click "New Project"**
4. **Import your repository** from GitHub
5. **Configure deployment**:
   - Framework Preset: `Other`
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (or leave empty)
   - Output Directory: `./` (default)
6. **Click "Deploy"**

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: youtube-segments-playlist
# - Directory: ./
# - Override settings? No
```

## 🎯 Access Your Deployed App

After deployment, you'll get a URL like:
- **Karaokenator (Landing Page)**: `https://your-project-name.vercel.app`
- **Original App**: `https://your-project-name.vercel.app/index.html`

## 🎤 Karaokenator Specific URLs

Once deployed, access these specific features:

- **Karaokenator (Landing Page)**: `/` (root URL)
- **Original App**: `/index.html`
- **Simple UI**: `/examples/simple-ui-example.html`
- **Programmatic Example**: `/examples/programmatic-example.js`

## 🔧 Configuration Details

### Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "functions": {
    "server.js": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Key Features:
- **Serverless Functions**: Your Express server runs as a Vercel function
- **Static File Serving**: All your HTML, CSS, JS, and audio files are served
- **CORS Enabled**: Already configured in your server.js
- **SPA Routing**: Handles client-side routing for your app

## 🎵 Audio Files

Your audio files will be served from:
- `https://your-project.vercel.app/assets/crowd-cheers.wav`

Make sure the `assets/` directory is included in your deployment.

## 🔄 Automatic Deployments

Once connected to GitHub:
- **Automatic**: Every push to main branch triggers a new deployment
- **Preview**: Pull requests get preview deployments
- **Custom Domains**: Add your own domain in Vercel dashboard

## 📊 Monitoring & Analytics

Vercel provides:
- **Performance Analytics**: Page load times, Core Web Vitals
- **Function Logs**: Server-side error tracking
- **Bandwidth Usage**: Monitor your free tier limits

## 🚨 Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check `package.json` dependencies
   - Ensure all required files are committed

2. **Audio Not Playing**:
   - Verify `assets/crowd-cheers.wav` exists
   - Check browser console for CORS errors

3. **YouTube Videos Not Loading**:
   - YouTube API doesn't require keys for embeds
   - Check if videos are publicly accessible

4. **Function Timeouts**:
   - Vercel functions have a 30-second limit (configured in vercel.json)
   - Your app should work fine within this limit

### Debug Steps:

1. **Check Vercel Dashboard**:
   - Go to your project dashboard
   - Check "Functions" tab for server logs
   - Check "Analytics" for performance data

2. **Test Locally**:
   ```bash
   npm start
   # Test at http://localhost:3000
   ```

3. **Check Browser Console**:
   - Open Developer Tools
   - Look for JavaScript errors
   - Check Network tab for failed requests

## 💰 Free Tier Limits

Vercel Free Tier includes:
- **100GB bandwidth/month**
- **100GB-hours function execution**
- **Unlimited deployments**
- **Custom domains**

This should be more than enough for your Karaokenator project!

## 🎉 Success!

Once deployed, you can:
- Share your Karaokenator with friends
- Use it for karaoke parties
- Create and share playlists
- Enjoy professional transitions and audio effects

## 🔗 Quick Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Documentation](https://vercel.com/docs)
- [Your Project Repository](https://github.com/your-username/youtube-segments-playlist)

---

**Ready to rock your karaoke party online!** 🎤🎉
