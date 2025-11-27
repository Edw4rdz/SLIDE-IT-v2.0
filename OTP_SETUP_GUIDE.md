# OTP Email Verification System - Setup Guide

## 📧 Gmail SMTP Configuration

To enable OTP email sending, you need to configure Gmail SMTP credentials:

### Step 1: Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click on **2-Step Verification**
3. Follow the prompts to enable it

### Step 2: Generate App Password
1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter "SLIDE-IT" as the name
5. Click **Generate**
6. Copy the 16-digit password (displayed without spaces)

### Step 3: Configure Environment Variables
1. In the `backend` folder, create a `.env` file (or copy from `.env.example`)
2. Add the following variables:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
```

**Example:**
```env
EMAIL_USER=slideit.noreply@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

⚠️ **Important:** Remove spaces from the app password when pasting.

### Step 4: Test the Configuration
1. Start your backend server:
   ```bash
   cd backend
   npm start
   ```

2. Register a new account on the frontend
3. Check if the OTP email is sent to your inbox

---

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Already added to `.gitignore`
2. **Use a dedicated email account** - Don't use your personal Gmail
3. **Rotate credentials regularly** - Change app passwords every 90 days
4. **Use environment variables in production** - Don't hardcode credentials

---

## 🚀 Testing OTP Flow

### 1. Send OTP
**POST** `http://localhost:5000/api/otp/send`
```json
{
  "email": "user@example.com",
  "userName": "John Doe"
}
```

### 2. Verify OTP
**POST** `http://localhost:5000/api/otp/verify`
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### 3. Resend OTP
**POST** `http://localhost:5000/api/otp/resend`
```json
{
  "email": "user@example.com",
  "userName": "John Doe"
}
```

---

## 📋 Features Implemented

✅ **OTP Generation** - 6-digit secure random OTP  
✅ **Email Sending** - Beautiful HTML email template  
✅ **OTP Expiration** - Expires after 10 minutes  
✅ **Rate Limiting** - 1-minute cooldown between requests  
✅ **Resend Functionality** - Users can resend OTP  
✅ **Verification Status** - Tracks email verification in Firestore  
✅ **Frontend UI** - Modern OTP input interface with timer  
✅ **Auto-focus** - Automatically moves to next input field  
✅ **Paste Support** - Can paste 6-digit code directly  

---

## 🛠️ Troubleshooting

### Email not sending?
1. Check if `EMAIL_USER` and `EMAIL_PASS` are set correctly
2. Verify 2-Step Verification is enabled on your Google Account
3. Make sure you're using an App Password, not your regular Gmail password
4. Check backend console for error messages

### "Invalid credentials" error?
- Your app password might be incorrect
- Make sure there are no spaces in the password
- Try generating a new app password

### OTP expired?
- OTPs expire after 10 minutes
- Click "Resend OTP" to get a new code

### Rate limit error?
- Wait 1 minute between OTP requests
- Maximum 5 resend attempts allowed

---

## 📝 Database Structure

### OTPs Collection
```javascript
otps/{email} = {
  otp: "123456",
  email: "user@example.com",
  createdAt: Timestamp,
  expiresAt: Timestamp,
  verified: false,
  resendCount: 1
}
```

### Users Collection Update
```javascript
users/{userId} = {
  ...existingFields,
  emailVerified: true  // Added after OTP verification
}
```

---

## 🔄 Production Deployment

For production (Render, Vercel, etc.):

1. Add environment variables in your hosting platform:
   - `EMAIL_USER`
   - `EMAIL_PASS`

2. Update CORS settings in `backend/App.js` if needed

3. Update API URLs in frontend pages:
   - Replace `http://localhost:5000` with your production API URL
   - Or use environment variables: `process.env.REACT_APP_API_URL`

---

## 📞 Support

If you encounter any issues:
1. Check the backend console logs
2. Verify your Gmail SMTP credentials
3. Test with Postman or Thunder Client first
4. Contact support with error logs

---

**Last Updated:** November 27, 2025
