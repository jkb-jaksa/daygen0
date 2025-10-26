# [Archived] Production Deployment Guide

For the concise frontend guide, see `./FRONTEND_GUIDE.md`. Keep this file for detailed Cloudflare Pages and Cloud Run notes.

## 🚀 Frontend Deployment (Cloudflare Pages)

### Environment Variables Setup

In your Cloudflare Pages dashboard for the **frontend** project:

1. Go to Settings → Environment Variables
2. Add these variables:

```bash
# Backend API URL
VITE_API_BASE_URL=https://your-backend-domain.run.app

# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# Optional: Analytics
VITE_GOOGLE_ANALYTICS_ID=your-ga-id
```

### Deployment Steps

1. **Connect Repository**:
   - Connect your GitHub repository to Cloudflare Pages
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Framework preset: `Vite`

2. **Configure Domain**:
   - Add custom domain in Cloudflare Pages dashboard
   - Update DNS records as instructed

3. **Deploy**:
   - Push to main branch triggers automatic deployment
   - Monitor build logs for any issues

4. **Wrangler Configuration**:
   - The project includes `wrangler.jsonc` for Cloudflare Pages configuration
   - Ensure environment variables are properly set in `vars` section

## 🚀 Backend Deployment (Google Cloud Run)

### Environment Variables Setup

In your Google Cloud Run service configuration:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:pass@host:port/db
DIRECT_URL=postgresql://user:pass@host:port/db
SHADOW_DATABASE_URL=postgresql://user:pass@host:port/shadow_db

# Authentication
JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Storage Configuration
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Payment Processing
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
FRONTEND_URL=https://your-frontend-domain.pages.dev

# Google Cloud Tasks
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=/app/service-account-key.json

# AI Provider API Keys
BFL_API_KEY=your-bfl-api-key
GEMINI_API_KEY=your-gemini-api-key
IDEOGRAM_API_KEY=your-ideogram-api-key
DASHSCOPE_API_KEY=your-dashscope-api-key
RUNWAY_API_KEY=your-runway-api-key
OPENAI_API_KEY=your-openai-api-key
REVE_API_KEY=your-reve-api-key
RECRAFT_API_KEY=your-recraft-api-key
LUMA_API_KEY=your-luma-api-key

# Optional: Email Service
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### Deployment Steps

1. **Build Docker Image**:
   ```bash
   cd daygen-backend
   docker build -t gcr.io/your-project/daygen-backend .
   ```

2. **Push to Google Container Registry**:
   ```bash
   docker push gcr.io/your-project/daygen-backend
   ```

3. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy daygen-backend \
     --image gcr.io/your-project/daygen-backend \
     --platform managed \
     --region europe-central2 \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 2 \
     --max-instances 10
   ```

4. **Set up Custom Domain**:
   - Configure custom domain in Cloud Run
   - Update DNS records

## 🔧 Database Setup

### Supabase (Recommended)

1. **Create Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note down URL and API keys

2. **Run Migrations**:
   ```bash
   cd daygen-backend
   npx prisma db push
   ```

3. **Set up RLS Policies**:
   - Enable Row Level Security
   - Configure policies for data access

### Alternative: Cloud SQL

1. **Create PostgreSQL Instance**:
   - Go to Google Cloud Console
   - Create Cloud SQL PostgreSQL instance
   - Note connection details

2. **Configure Connection**:
   - Update DATABASE_URL with Cloud SQL details
   - Run migrations

## 📊 Storage Setup (Cloudflare R2)

1. **Create R2 Bucket**:
   - Go to Cloudflare dashboard
   - Create R2 bucket
   - Configure public access

2. **Generate API Keys**:
   - Create R2 API token
   - Configure CORS for your domain

3. **Test Upload**:
   - Verify file uploads work
   - Check public URL access

## 💳 Payment Setup (Stripe)

1. **Create Stripe Account**:
   - Go to [stripe.com](https://stripe.com)
   - Complete account setup
   - Get API keys

2. **Configure Webhooks**:
   - Add webhook endpoint: `https://your-backend-domain.run.app/webhooks/stripe`
   - Select events: `checkout.session.completed`, `invoice.payment_succeeded`, etc.

3. **Test Payments**:
   - Use Stripe test mode
   - Verify webhook delivery

## 🔐 Security Configuration

1. **CORS Setup**:
   - Configure allowed origins
   - Set up proper headers

2. **Rate Limiting**:
   - Implement rate limiting for API endpoints
   - Use Google Cloud Armor if needed

3. **SSL/TLS**:
   - Ensure HTTPS everywhere
   - Configure proper certificates

## 📈 Monitoring & Logging

1. **Google Cloud Logging**:
   - Monitor application logs
   - Set up alerts for errors

2. **Health Checks**:
   - Configure health check endpoints
   - Set up uptime monitoring

3. **Performance Monitoring**:
   - Monitor response times
   - Track error rates

## 🧪 Testing Production

1. **Smoke Tests**:
   - Test authentication flow
   - Verify image generation
   - Check payment processing

2. **Load Testing**:
   - Test with multiple concurrent users
   - Monitor resource usage

3. **Security Testing**:
   - Test for common vulnerabilities
   - Verify input validation

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

1. **Frontend Deployment**:
   ```yaml
   # .github/workflows/deploy-frontend.yml
   name: Deploy Frontend
   on:
     push:
       branches: [main]
       paths: ['daygen0/**']
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: cd daygen0 && npm ci && npm run build
         - uses: cloudflare/wrangler-action@v3
           with:
             apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
             accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
   ```

2. **Backend Deployment**:
   ```yaml
   # .github/workflows/deploy-backend.yml
   name: Deploy Backend
   on:
     push:
       branches: [main]
       paths: ['daygen-backend/**']
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: cd daygen-backend && npm ci && npm run build
         - uses: google-github-actions/setup-gcloud@v0
         - run: gcloud run deploy daygen-backend --source=daygen-backend
   ```

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check CORS configuration in backend
   - Verify frontend URL is allowed

2. **Database Connection**:
   - Verify DATABASE_URL format
   - Check network connectivity

3. **File Upload Issues**:
   - Verify R2 configuration
   - Check bucket permissions

4. **Payment Failures**:
   - Verify Stripe webhook configuration
   - Check API key validity

### Monitoring Commands

```bash
# Check backend health
curl https://your-backend-domain.run.app/health

# Check logs
gcloud logs read --service=daygen-backend --limit=50

# Check Cloud Run service
gcloud run services describe daygen-backend --region=europe-central2
```

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check CORS configuration in backend
   - Verify frontend URL is allowed in backend settings
   - Ensure VITE_API_BASE_URL is correct

2. **Authentication Issues**:
   - Verify Supabase configuration is correct
   - Check that Google OAuth is properly configured
   - Ensure JWT secret is set in backend

3. **File Upload Issues**:
   - Verify R2 configuration in backend
   - Check bucket permissions and CORS settings
   - Ensure R2_PUBLIC_URL is accessible

4. **Payment Failures**:
   - Verify Stripe webhook configuration
   - Check API key validity and environment
   - Ensure webhook endpoint is accessible

5. **Build Failures**:
   - Check environment variables are set correctly
   - Verify all dependencies are installed
   - Check for TypeScript errors

### Debug Commands

```bash
# Test backend connection
curl https://your-backend-domain.run.app/health

# Check frontend build locally
npm run build

# Test environment variables
npm run dev
```

## 📚 Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Integration Guide](https://stripe.com/docs)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)

## Email Integration Implementation

### Option 1: SendGrid (Recommended)

1. **Install SendGrid**:
   ```bash
   cd /Users/jakubst/Desktop/daygen-backend
   npm install @sendgrid/mail
   ```

2. **Create Email Service**:
   ```typescript
   // src/email/email.service.ts
   import { Injectable } from '@nestjs/common';
   import * as sgMail from '@sendgrid/mail';

   @Injectable()
   export class EmailService {
     constructor() {
       sgMail.setApiKey(process.env.SENDGRID_API_KEY);
     }

     async sendPasswordResetEmail(email: string, resetUrl: string) {
       const msg = {
         to: email,
         from: process.env.SENDGRID_FROM_EMAIL,
         subject: 'Reset Your Password - DayGen',
         html: `
           <h2>Reset Your Password</h2>
           <p>Click the link below to reset your password:</p>
           <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
           <p>This link expires in 1 hour.</p>
           <p>If you didn't request this, please ignore this email.</p>
         `,
       };

       await sgMail.send(msg);
     }
   }
   ```

3. **Update AuthService**:
   ```typescript
   // Replace the console.log with:
   await this.emailService.sendPasswordResetEmail(user.email, resetUrl);
   ```

### Option 2: AWS SES

1. **Install AWS SDK**:
   ```bash
   npm install @aws-sdk/client-ses
   ```

2. **Create Email Service**:
   ```typescript
   // src/email/email.service.ts
   import { Injectable } from '@nestjs/common';
   import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

   @Injectable()
   export class EmailService {
     private sesClient: SESClient;

     constructor() {
       this.sesClient = new SESClient({
         region: process.env.AWS_REGION,
         credentials: {
           accessKeyId: process.env.AWS_ACCESS_KEY_ID,
           secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
         },
       });
     }

     async sendPasswordResetEmail(email: string, resetUrl: string) {
       const command = new SendEmailCommand({
         Source: process.env.SENDGRID_FROM_EMAIL,
         Destination: { ToAddresses: [email] },
         Message: {
           Subject: { Data: 'Reset Your Password - DayGen' },
           Body: {
             Html: {
               Data: `
                 <h2>Reset Your Password</h2>
                 <p>Click the link below to reset your password:</p>
                 <a href="${resetUrl}">Reset Password</a>
                 <p>This link expires in 1 hour.</p>
               `,
             },
           },
         },
       });

       await this.sesClient.send(command);
     }
   }
   ```

### Option 3: SMTP (Nodemailer)

1. **Install Nodemailer**:
   ```bash
   npm install nodemailer @types/nodemailer
   ```

2. **Create Email Service**:
   ```typescript
   // src/email/email.service.ts
   import { Injectable } from '@nestjs/common';
   import * as nodemailer from 'nodemailer';

   @Injectable()
   export class EmailService {
     private transporter;

     constructor() {
       this.transporter = nodemailer.createTransporter({
         host: process.env.SMTP_HOST,
         port: parseInt(process.env.SMTP_PORT),
         secure: false,
         auth: {
           user: process.env.SMTP_USER,
           pass: process.env.SMTP_PASS,
         },
       });
     }

     async sendPasswordResetEmail(email: string, resetUrl: string) {
       await this.transporter.sendMail({
         from: process.env.SMTP_USER,
         to: email,
         subject: 'Reset Your Password - DayGen',
         html: `
           <h2>Reset Your Password</h2>
           <p>Click the link below to reset your password:</p>
           <a href="${resetUrl}">Reset Password</a>
           <p>This link expires in 1 hour.</p>
         `,
       });
     }
   }
   ```

## Security Considerations

1. **JWT Secret**: Use a strong, random secret (32+ characters)
2. **Rate Limiting**: Implement rate limiting for password reset requests
3. **Token Expiry**: Keep the 1-hour expiry for reset tokens
4. **HTTPS Only**: Ensure all URLs use HTTPS in production
5. **Email Validation**: Validate email addresses before sending

## Testing in Production

1. **Test the complete flow**:
   - Request password reset
   - Check email delivery
   - Click reset link
   - Set new password
   - Login with new password

2. **Monitor logs** for any errors
3. **Test with different email providers** (Gmail, Outlook, etc.)

## Rollback Plan

If issues arise:
1. Revert to console.log for password reset
2. Update `VITE_API_BASE_URL` to point to a working backend
3. Check Cloudflare Pages deployment logs for errors
