# Serverless Full-Stack Application (Angular + Python on Firebase)

This project is a serverless full-stack application that uses **Angular** for the frontend and **Python Cloud Functions** for the backend, all hosted on **Firebase**.

## Architecture

-   **Frontend**: Angular v19, hosted on Firebase Hosting.
-   **Backend**: Python 3.11 Cloud Functions (2nd Gen), handles API requests via Firebase rewrites.
-   **Database**: (Optional) Firestore (not yet configured).

## Prerequisites

-   [Node.js](https://nodejs.org/) (for Angular CLI and Firebase tools)
-   [Python 3.11](https://www.python.org/downloads/) (for Cloud Functions)
-   [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`

## Project Structure

```text
.
├── firebase.json              # Firebase configuration (Hosting + Functions)
├── .firebaserc                # Firebase project aliases
├── angular.json               # Angular CLI configuration
├── src/                       # Angular source code
└── functions/                 # Python Cloud Functions
    ├── main.py                # Backend logic
    └── requirements.txt       # Python dependencies
```

## Setup & Local Development

1.  **Install Frontend Dependencies**:
    ```bash
    npm install
    ```

2.  **Install Backend Dependencies** (Optional for local dev, handled automatically on deploy):
    Navigate to `functions/` and create a virtual environment:
    ```bash
    cd functions
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

3.  **Run Locally**:
    Use the Angular CLI for frontend development:
    ```bash
    ng serve
    ```
    To test functions locally, use the Firebase Emulator Suite:
    ```bash
    firebase emulators:start
    ```

## Deployment

To deploy the entire application to Firebase:

1.  **Build the Angular App**:
    ```bash
    ng build
    ```

2.  **Deploy**:
    ```bash
    firebase deploy
    ```

## Backend API

The backend is accessible at `/api/`. Example endpoint:

-   `GET /api/api_python`: Returns a "Hello from Python" message.
