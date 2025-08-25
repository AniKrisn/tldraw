# Deploying the Workflow Template to Vercel

This guide explains how to deploy the tldraw workflow template as a web application using Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com)
2. The [Vercel CLI](https://vercel.com/cli) installed globally: `npm i -g vercel`
3. Node.js and yarn installed locally

## Quick Deploy Options

### Option 1: Deploy from GitHub (Recommended)

1. **Fork or copy this template** to your own GitHub repository
2. **Connect to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
3. **Configure the project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `templates/workflow` (if deploying from the tldraw monorepo)
   - **Build Command**: `yarn build`
   - **Output Directory**: `dist`
   - **Install Command**: `yarn install`

### Option 2: Deploy with Vercel CLI

1. **Navigate to the workflow directory**:
   ```bash
   cd templates/workflow
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   ```

3. **Build the project**:
   ```bash
   yarn build
   ```

4. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

5. **Follow the CLI prompts**:
   - Set up and deploy: `Y`
   - Which scope: Select your account/team
   - Link to existing project: `N` (for first deploy)
   - Project name: Enter a name (e.g., `tldraw-workflow`)
   - Directory: `.` (current directory)

## Configuration Files

The template includes the following Vercel configuration:

### `vercel.json`
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public,max-age=31536000,immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

This configuration:
- Sets proper cache headers for static assets
- Enables client-side routing for the SPA

## Environment Variables

The workflow template doesn't require any environment variables by default. If you customize it and need environment variables:

1. **In Vercel Dashboard**: Go to Project Settings → Environment Variables
2. **With Vercel CLI**: Use `vercel env add`

## Custom Domain

To use a custom domain:

1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Domains
3. Add your custom domain
4. Configure your DNS settings as instructed

## Troubleshooting

### Build Issues

If you encounter build errors:

1. **Check Node.js version**: Ensure you're using Node.js 18+
2. **Clear dependencies**: 
   ```bash
   rm -rf node_modules yarn.lock
   yarn install
   ```
3. **Local build test**:
   ```bash
   yarn build
   yarn preview
   ```

### Deployment Issues

1. **Check build logs** in the Vercel Dashboard
2. **Verify file paths** are correct for monorepo setup
3. **Ensure all dependencies** are in `package.json` (not just devDependencies)

## Performance Optimization

The template is already optimized for production with:

- **Vite build optimization**: Tree-shaking and code splitting
- **Asset caching**: Long-term caching for static assets
- **TypeScript compilation**: Type checking during build

## Development vs Production

- **Development**: Run `yarn dev` for local development with hot reload
- **Production**: The deployed version uses the optimized build from `yarn build`

## Scaling Considerations

For high-traffic applications, consider:

1. **Vercel Pro plan** for better performance and analytics
2. **CDN optimization** for global asset delivery
3. **Edge functions** for dynamic functionality if needed

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [tldraw Documentation](https://tldraw.dev)
- [GitHub Issues](https://github.com/tldraw/tldraw/issues) for tldraw-specific problems
