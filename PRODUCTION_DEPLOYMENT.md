# Production Deployment Guide

## Environment Variables Setup

### Frontend (Vercel)
In your Vercel dashboard for the **frontend** project:

1. Go to Project Settings → Environment Variables
2. Add these variables:

```
VITE_API_BASE_URL=https://your-backend-domain.vercel.app
```

### Backend (Vercel)
In your Vercel dashboard for the **backend** project:

1. Go to Project Settings → Environment Variables
2. Add these variables:

```
# Required
NEXT_PUBLIC_BASE_URL=https://your-frontend-domain.vercel.app
JWT_SECRET=your-super-secret-jwt-key-here
DATABASE_URL=your-supabase-database-url

# Email Service (choose one)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Or AWS SES
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Or SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Storage (if using R2)
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# API Keys for AI providers
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
BFL_API_KEY=your-bfl-key
IDEOGRAM_API_KEY=your-ideogram-key
# ... other provider keys
```

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
2. Update `NEXT_PUBLIC_BASE_URL` to point to a working frontend
3. Check Vercel function logs for errors
