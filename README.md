# Favorcito Mailer (Beta)

Favorcito Mailer is a monolith application designed for sending personalized mass emails. It features a React frontend and an Express backend, containerized with Docker for easy deployment on Google Cloud Run. This tool allows users to upload a list of recipients, compose a dynamic email template, and send customized emails in bulk.

## Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
  - [1. Firestore Database](#1-firestore-database)
  - [2. Google Cloud Authentication](#2-google-cloud-authentication)
- [Running the Application Locally](#running-the-application-locally)
- [Application Workflow](#application-workflow)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)

---

## About the Project

This application is built for users who need to send personalized emails to a list of contacts. It provides a simple step-by-step interface to:

1.  **Upload recipient data** from a spreadsheet (CSV/XLSX).
2.  **Compose a rich-text email** with dynamic placeholders.
3.  **Preview** the email with actual recipient data.
4.  **Send a test email** to verify the setup.
5.  **Execute and monitor** the mass mailing process in real-time.

---

## Features

-   **User Authentication**: Secure login for registered users.
-   **Data Intake**: Upload recipient data via CSV or XLSX files.
-   **Dynamic Email Composer**: A rich-text editor (WYSIWYG) that allows the use of placeholders (e.g., `{{column_name}}`) to personalize emails.
-   **Live Preview**: Preview how the email will look for each recipient with their actual data.
-   **Test Email Functionality**: Send a test email to a specific address before starting the mass mailing.
-   **Real-time Sending Status**: Monitor the email sending process with a live progress bar and status updates.
-   **Monolithic Architecture**: Simplified development and deployment with a single codebase for both frontend and backend.
-   **Containerized**: Ready for deployment on any container-based platform using Docker.

---

## Technical Stack

### Backend

-   **[Node.js](https://nodejs.org/)**: JavaScript runtime environment.
-   **[Express.js](https://expressjs.com/)**: Web framework for Node.js.
-   **[Nodemailer](https://nodemailer.com/)**: For sending emails.
-   **[@google-cloud/firestore](https://www.npmjs.com/package/@google-cloud/firestore)**: To interact with Google Firestore.
-   **[xlsx](https://www.npmjs.com/package/xlsx)**: For parsing spreadsheet files.

### Frontend

-   **[React](https://reactjs.org/)**: A JavaScript library for building user interfaces.
-   **[Vite](https://vitejs.dev/)**: Frontend build tool.
-   **[Tailwind CSS](https://tailwindcss.com/)**: A utility-first CSS framework.
-   **[React Router](https://reactrouter.com/)**: For routing in the React application.
-   **[Quill](https://quilljs.com/)**: Rich text editor.
-   **[React Dropzone](https://react-dropzone.js.org/)**: For file uploads.

### Database

-   **[Google Firestore](https://cloud.google.com/firestore)**: NoSQL document database.

### Deployment

-   **[Docker](https://www.docker.com/)**: For containerization.
-   **[Google Cloud Run](https://cloud.google.com/run)**: Serverless platform for deploying containerized applications.

---

## Project Structure

The project is organized as a monolith with two main directories:

```
/
├── client/         # Vite + React Frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── context/    # AppStateContext for global state
│   │   └── ...
│
├── server/         # Express.js Backend
│   ├── routes/     # API routes (auth.js, mailer.js)
│   ├── services/   # Business logic (Firestore.js, Mailer.js)
│   ├── utils/      # Utility functions
│   └── index.js    # Server entry point
│
├── Dockerfile      # Configuration for Cloud Run deployment
└── package.json    # Scripts and dependencies for the server
```

---

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (for authentication)
- Access to a Google Cloud project with Firestore enabled.

---

## Configuration

### 1. Firestore Database

The application uses Firestore to authenticate users and retrieve their email sending configurations.

-   **Create a Firestore Database:** In your Google Cloud project, navigate to the Firestore section and create a database.
-   **Create a Collection:** Create a collection named `email_sender_users`.
-   **Add User Documents:** Add a new document for each user with the following schema:

    ```json
    {
      "email": "user@example.com",
      "password": "your_plain_text_password",
      "config": {
        "gmail_app_pss": "xxxx-xxxx-xxxx-xxxx",
        "from_name": "Your Name"
      }
    }
    ```
    - `email`: The email address used for logging in.
    - `password`: The password for the application login.
    - `gmail_app_pss`: A 16-character [Google App Password](https://support.google.com/accounts/answer/185833) for the account you want to send emails from.
    - `from_name`: The name that will appear as the sender.

### 2. Google Cloud Authentication

The server needs to authenticate with Google Cloud to access Firestore. The recommended method for local development is to use the `gcloud` CLI.

1.  **Login with gcloud:**
    Run this command and follow the prompts to log in with your Google account.
    ```bash
    gcloud auth application-default login
    ```
    This command saves your credentials locally, and the Firestore client library will automatically detect and use them.

---

## Running the Application Locally

1.  **Install Root Dependencies:**
    These dependencies are for the Express server and for running both client and server concurrently.

    ```bash
    npm install
    ```

2.  **Install Client Dependencies:**
    This installs all the necessary packages for the React frontend.

    ```bash
    npm install --prefix client
    ```

3.  **Run the Application:**
    To run both the server and the client development server simultaneously, use the `start` script from the root directory.

    ```bash
    npm start
    ```

    This will:
    -   Start the Express server on `http://localhost:8080`.
    -   Start the React Vite development server, typically on `http://localhost:5173`.

You can now open your browser and navigate to the client's address (e.g., `http://localhost:5173`) to use the application.

---

## Application Workflow

1.  **Login**: The user authenticates using their email and password.
2.  **Upload Data (`Subir Datos`)**: The user uploads a CSV or XLSX file containing recipient data. The application will display the headers and the first few rows of the data. The user must select the column that contains the recipient emails.
3.  **Compose Email (`Construccion de Mail`)**: The user writes the email subject and body in a rich-text editor. They can use placeholders like `{{column_name}}` to insert dynamic data from the uploaded file.
4.  **Preview & Test (`Preview & Test`)**: The user can preview the email for each recipient, with the placeholders filled in. They can also send a test email to a specified address.
5.  **Send (`Envio`)**: The user starts the mass mailing process. A progress bar shows the status in real-time.

---

## API Endpoints

The backend exposes the following REST API endpoints:

-   `POST /api/auth/login`: Authenticates a user.
    -   **Body**: `{ "email": "user@example.com", "password": "your_password" }`
    -   **Response**: `{ "user": { ... } }` or an error message.
-   `POST /api/mailer/send`: Sends mass emails.
    -   **Body**: `{ "csvData": [ ... ], "emailTemplate": { "subject": "...", "body": "..." }, "userConfig": { ... } }`
    -   **Response**: A summary of the sending process.
-   `POST /api/mailer/send-test`: Sends a single test email.
    -   **Body**: `{ "testEmail": "test@example.com", "emailTemplate": { ... }, "dataRow": { ... }, "userConfig": { ... } }`
    -   **Response**: A success or error message.

---

## Deployment

This application is designed to be deployed on **Google Cloud Run**. The `Dockerfile` in the root directory is configured to build and run the application in a container.

**NOT YET DEPLOYED - WILL USE GITHUB ACTIONS**

