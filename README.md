# Campaign Mailer (Beta)

Campaign Mailer is a monolith application for sending personalized mass emails. React frontend + Express backend, containerized with Docker.

## Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
  - [1. Environment Variables](#1-environment-variables)
  - [2. Firestore Database](#2-firestore-database)
  - [3. Firebase Storage](#3-firebase-storage)
- [Running the Application Locally](#running-the-application-locally)
- [Application Workflow](#application-workflow)
- [API Endpoints](#api-endpoints)

---

## About the Project

Built for users who need to send personalized emails to a list of contacts. Provides a step-by-step interface to:

1. **Upload recipient data** from a spreadsheet (CSV/XLSX).
2. **Compose a rich-text email** with dynamic placeholders.
3. **Preview** the email with actual recipient data.
4. **Send a test email** to verify the setup.
5. **Execute and monitor** the mass mailing process in real-time.

---

## Features

- **User Authentication**: Secure login for registered users.
- **Data Intake**: Upload recipient data via CSV or XLSX files.
- **Dynamic Email Composer**: Rich-text editor (WYSIWYG) with placeholders (e.g., `{{column_name}}`).
- **Live Preview**: Preview emails for each recipient with their actual data.
- **Test Email Functionality**: Send a test email before starting the mass mailing.
- **Real-time Sending Status**: Monitor progress with a live progress bar.
- **Campaign Management**: Save, load, and manage email campaigns.
- **Attachment Support**: Upload and attach files to campaigns (stored in Firebase Storage).
- **CC/BCC Support**: Add CC and BCC recipients to campaigns.

---

## Technical Stack

### Backend

- **[Node.js](https://nodejs.org/)** (v18+): JavaScript runtime.
- **[Express.js](https://expressjs.com/)**: Web framework.
- **[Nodemailer](https://nodemailer.com/)**: Email sending.
- **[@google-cloud/firestore](https://www.npmjs.com/package/@google-cloud/firestore)**: Firestore client.
- **[@google-cloud/storage](https://www.npmjs.com/package/@google-cloud/storage)**: Firebase Storage client.
- **[xlsx](https://www.npmjs.com/package/xlsx)**: Spreadsheet parsing.
- **[multer](https://www.npmjs.com/package/multer)**: File upload handling.

### Frontend

- **[React](https://reactjs.org/)**: UI library.
- **[Vite](https://vitejs.dev/)**: Build tool.
- **[Tailwind CSS](https://tailwindcss.com/)**: Styling.
- **[React Router](https://reactrouter.com/)**: Routing.
- **[Quill](https://quilljs.com/)**: Rich text editor.
- **[React Dropzone](https://react-dropzone.js.org/)**: File uploads.

### Cloud Services

- **[Google Firestore](https://cloud.google.com/firestore)**: NoSQL database (users + campaigns).
- **[Firebase Storage](https://firebase.google.com/docs/storage)**: File storage for email attachments.

---

## Project Structure

```
/
├── client/         # Vite + React Frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── context/    # AppStateContext for global state
│   │   └── ...
│
├── server/         # Express.js Backend
│   ├── routes/     # API routes (auth, mailer, campaigns, attachments)
│   ├── services/   # Business logic (Firestore, Mailer, StorageService)
│   ├── utils/      # Utility functions
│   └── index.js    # Server entry point
│
├── Dockerfile      # Container configuration
└── package.json    # Root dependencies and scripts
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [npm](https://www.npmjs.com/)
- A Google Cloud / Firebase project with:
  - Firestore enabled
  - Firebase Storage enabled
  - A Service Account with Firestore and Storage access

---

## Configuration

### 1. Environment Variables

Create a `.env` file in the **root** of the project:

```env
# Firebase / Google Cloud credentials (from your Service Account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Firebase Storage bucket (optional — defaults to {project_id}.appspot.com)
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# Server port (optional — defaults to 8080)
PORT=8080
```

To get these values:
1. Go to [Firebase Console](https://console.firebase.google.com/) → Project Settings → Service Accounts.
2. Click **Generate new private key** to download a JSON file.
3. Copy the values: `project_id` → `FIREBASE_PROJECT_ID`, `client_email` → `FIREBASE_CLIENT_EMAIL`, `private_key` → `FIREBASE_PRIVATE_KEY`.

> **Important:** Paste `FIREBASE_PRIVATE_KEY` with the surrounding quotes and keep all `\n` as literal `\n` characters (do not replace with real newlines).

### 2. Firestore Database

The app uses two Firestore collections.

#### Collection: `email_sender_users`

Create this collection manually. Add one document per user:

```json
{
  "email": "user@example.com",
  "password": "your_plain_text_password",
  "config": {
    "gmail_app_pss": "xxxx xxxx xxxx xxxx",
    "from_name": "Your Name"
  }
}
```

- `email`: Login email.
- `password`: Application login password (plain text).
- `gmail_app_pss`: 16-character [Gmail App Password](https://support.google.com/accounts/answer/185833) for the sending account. This is **not** your regular Gmail password — generate one at Google Account → Security → App Passwords.
- `from_name`: Sender name shown in emails.

#### Collection: `campaigns`

Created automatically by the app. No manual setup needed.

### 3. Firebase Storage

1. In Firebase Console, go to **Storage** and create a bucket.
2. The bucket name defaults to `{project_id}.appspot.com`. If you use a different name, set `FIREBASE_STORAGE_BUCKET` in `.env`.
3. The Service Account must have the **Storage Object Admin** role (or equivalent) to upload, read, and delete files.

---

## Running the Application Locally

**1. Install root dependencies** (Express server + concurrently):

```bash
npm install
```

**2. Install client dependencies:**

```bash
npm install --prefix client
```

**3. Create `.env` file** as described in [Configuration](#1-environment-variables).

**4. Run the application:**

```bash
npm start
```

This starts:
- Express server on `http://localhost:8080`
- React Vite dev server on `http://localhost:5173`

Open `http://localhost:5173` and log in with credentials from your Firestore `email_sender_users` collection.

---

## Application Workflow

1. **Login**: Authenticate with email and password stored in Firestore.
2. **Upload Data (`Subir Datos`)**: Upload a CSV or XLSX file. Select the column containing recipient email addresses.
3. **Compose Email (`Construccion de Mail`)**: Write the subject and body. Use `{{column_name}}` placeholders to insert dynamic data from the uploaded file.
4. **Preview & Test (`Preview & Test`)**: Preview the email for each recipient. Send a test email to a specified address to verify layout and placeholders.
5. **Send (`Envio`)**: Start the mass mailing. A progress bar shows real-time status.

Campaigns are saved to Firestore automatically and can be reloaded in future sessions.

---

## API Endpoints

### Auth

- `POST /api/auth/login` — Authenticate user.
  - Body: `{ "email": "user@example.com", "password": "your_password" }`
  - Response: `{ "user": { ... } }` (includes campaigns list)

### Mailer

All mailer endpoints require `userConfig` in the body (returned from login as `user.config`).

- `POST /api/mailer/send` — Send mass emails.
  - Body: `{ "csvData": [...], "emailTemplate": { "subject": "...", "body": "..." }, "userConfig": {...}, "cc": [...], "bcc": [...], "attachments": [...] }`
  - Response: `{ "status": "completed", "results": [...] }`

- `POST /api/mailer/send-test` — Send a single test email.
  - Body: `{ "testEmail": "test@example.com", "emailTemplate": {...}, "dataRow": {...}, "userConfig": {...}, "cc": [...], "bcc": [...], "attachments": [...] }`
  - Response: `{ "message": "Test email successfully sent to ..." }`

### Campaigns

All campaign endpoints require `userId` (the user's email) in body or query params.

- `GET /api/campaigns?userId=...` — List all campaigns for a user.
- `GET /api/campaigns/:id?userId=...` — Get full campaign data.
- `POST /api/campaigns` — Create or save a campaign.
  - Body: `{ "userId": "...", "name": "...", "emailTemplate": {...}, "headers": [...], "attachments": [...], "cc": [...], "bcc": [...], "status": "draft" }`
- `PUT /api/campaigns/:id` — Update a campaign.
- `DELETE /api/campaigns/:id` — Delete a campaign and its attachments from storage.

### Attachments

All attachment endpoints require `userId` in body or query params.

- `POST /api/attachments/:campaignId` — Upload a file attachment (`multipart/form-data`, field: `file`). Use `campaignId=temp` before a campaign is saved.
- `GET /api/attachments/:campaignId/:attachmentId?userId=...` — Get signed download URL (valid 1 hour).
- `GET /api/attachments/:campaignId/:attachmentId?userId=...&download=true` — Download file directly.
- `DELETE /api/attachments/:campaignId/:attachmentId` — Delete attachment from storage and campaign.
