# EIC Inspection App

## Complete Food Safety Inspection System

This is a complete web application for managing food safety inspections, exactly matching the design you provided.

## Features

### 🔐 Authentication
- Email/Password login
- Google OAuth integration
- Role-based access (Admin/Employee)

### 👨‍💼 Admin Dashboard
- Perform new inspections
- Review submitted reports
- Administrator options
- User management
- Template management

### 📋 Inspection Checklist
- Interactive checklist with OK/Problem/N/A options
- Notes for problem items
- Photo upload capability
- Real-time form validation

### 📊 Report Management
- Detailed inspection reports
- Status tracking (Pending/Approved/Problem)
- Report approval workflow
- Archive functionality

## Setup Instructions

### 1. Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password
   - Enable Google (optional)
4. Enable Firestore Database:
   - Go to Firestore Database
   - Create database in test mode
5. Get your Firebase config:
   - Go to Project Settings > General
   - Scroll down to "Your apps"
   - Copy the Firebase configuration

### 2. Update Firebase Config
Edit `src/js/firebase-config.js` and replace the placeholder config with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 3. Set Up Local Server
You MUST run this on a local server (not by opening index.html directly).

**Option 1: Python**
```bash
# Navigate to the EIC_Complete folder
cd EIC_Complete

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Option 2: Node.js**
```bash
# Install http-server globally
npm install -g http-server

# Navigate to EIC_Complete folder and run
cd EIC_Complete
http-server -p 8000
```

**Option 3: VS Code Live Server**
- Install "Live Server" extension
- Right-click on index.html
- Select "Open with Live Server"

### 4. Access the Application
Open your browser and go to:
- `http://localhost:8000` (if using Python/Node.js)
- Or the URL provided by Live Server

### 5. Firebase Security Rules (Important!)
Add these rules to your Firestore Database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'superadmin'];
    }

    // Reports can be created by authenticated users, read/write by admins
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'superadmin'];
    }
  }
}
```

### 6. Add Authorized Domains
In Firebase Console:
1. Go to Authentication > Settings
2. Scroll to "Authorized domains"
3. Add `localhost` (without http:// or port)

## Default Admin Account
The first user with email `admin@eic.com` will automatically be assigned admin role.

## Troubleshooting

### Common Issues:

1. **Blank Screen**: Check browser console for errors
2. **Firebase Auth Error**: Verify Firebase config and authorized domains
3. **CORS Errors**: Make sure you're using a local server, not opening HTML directly
4. **Module Import Errors**: Ensure you're using a modern browser that supports ES6 modules

### Browser Console:
Press F12 to open developer tools and check the Console tab for any error messages.

## File Structure
```
EIC_Complete/
├── index.html              # Main HTML file
├── src/
│   ├── css/
│   │   └── styles.css      # Custom styles
│   └── js/
│       ├── app.js          # Main application logic
│       ├── auth.js         # Authentication functions
│       └── firebase-config.js # Firebase configuration
├── assets/                 # Images and other assets
└── README.md              # This file
```

## Support
If you encounter any issues, check:
1. Browser console for JavaScript errors
2. Firebase console for authentication/database errors
3. Network tab in developer tools for failed requests

The application is designed to match exactly the screenshots you provided, with full functionality for inspection management.
