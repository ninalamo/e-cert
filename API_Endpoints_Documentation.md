# 📜 API Endpoint Documentation - e-cert Application

This document details all identified API endpoints and services within the `src/app` module, providing schema definitions for migration planning. Usage of these APIs is heavily role-gated and requires specific authentication/authorization.

***

## $\text{1. Authentication Endpoints (Auth)}$

These endpoints handle user identity verification and session management after OAuth flow.

### **Endpoint: `/api/auth/callback`**
*   **Method**: `GET`
*   **Description**: Handles OAuth callback from an identity provider, validating and redirecting the user.
*   **Request Schema**: Query parameter `token` (a JWT or similar string).
*   **Response Schema & Success Logic**: Redirects the user to `/login?confirmed=true` if the token is valid; otherwise, redirects to `/login?error=Confirmation+failed`.

### **Endpoint: `/api/auth/confirm`**
*   **Method**: `GET`
*   **Description**: Acts as a confirmation check for users.
*   **Request Schema**: Query parameter `token`.
*   **Response Schema & Success Logic**: Redirects to `/login?confirmed=true` or an error page if confirmation fails.

---

## $\text{2. Certificate API Endpoints}$ **(Highly Detailed / Role-Gated)**

These endpoints manage the lifecycle, retrieval, and validation of digital certificates.

### **Endpoint: `/api/certificates/[id]/view-data`**
*   **Method**: `GET`
*   **Description**: Fetches the full, rich data structure of a specific certificate.
*   **Request Schema**: Path parameter: `id` (The unique ID of the certificate).
*   **Response Schema**: An object containing:
    *   `certificate`: Full details from the database (`certificate_number`, `issued_at`, `expires_at`, `status`, etc.).
    *   `template`: Linked template data.
    *   `event`: Linked event details.
    *   `qrDataUrl`: Base64 encoded Data URL for QR code display.

### **Endpoint: `/api/certificates/[id]/download`**
*   **Method**: `GET`
*   **Description**: Downloads the PDF version of a certificate, preferring cached files.
*   **Request Schema**: Path parameter: `id`.
*   **Response Schema & Success Logic (Binary)**: Raw binary PDF data with appropriate HTTP headers (`Content-Type: application/pdf`).

### **Endpoint: `/api/certificates/[id]/pdf`**
*   **Method**: `GET`
*   **Description**: Dedicated endpoint to provide the PDF file stream for direct embedding.
*   **Request Schema**: Path parameter: `id`.
*   **Response Schema & Success Logic (Binary)**: Raw binary PDF data with appropriate HTTP headers (`Content-Type: application/pdf`).

### **Endpoint: `/api/certificates/[id]/validate`** $\text{(Simulated Core API)}$
*   **Method**: `GET`
*   **Description**: Validates the existence and status of a certificate using its public number. Ideal for embedding on external websites.
*   **Request Schema**: Path parameter: `number` (The human-readable certificate serial number).
*   **Response Schema & Success Logic**: A boolean object indicating validity (`valid`), plus key identifiers (`certificate_number`, `issued_date`, `status`).

### **Endpoint: `/api/storage/cleanup`**
*   **Method**: `DELETE`
*   **Description**: Admin service to clean up old media files (e.g., generated PDFs) stored in Supabase Storage.
*   **Request Schema**: None. Requires admin authentication.
*   **Response Schema & Success Logic**: `{ removed: number, checked: number }`.

---

## $\text{3. Events API Endpoints}$ **(Admin/Staff Actions)**

These endpoints facilitate batch issuance and event management activities.

### **Endpoint: `/api/events/[id]/bulk-issue`**
*   **Method**: `POST`
*   **Description**: Mass-generates and issues certificates for a list of attendees associated with an event.
*   **Request Schema**: JSON body `{ attendeeIds: string[], sendEmail?: boolean }`. Requires non-empty array of `attendeeIds`.
*   **Response Schema & Success Logic**: An object detailing the batch issuance result (e.g., total success count or error message).

### **Endpoint: `/api/events/[id]/revoke-expired` (\`GET\`)**
*   **Method**: `GET`
*   **Description**: Checks and counts how many certificates linked to a specific event are expired.
*   **Request Schema**: Path parameter: `id` (Event ID).
*   **Response Schema & Success Logic**: `{ expired: number }`.

### **Endpoint: `/api/events/[id]/revoke-expired` (\`POST\`)**
*   **Method**: `POST`
*   **Description**: Action endpoint to initiate the actual revocation process for all expired certificates associated with an event. (Admin Only).
*   **Request Schema**: Path parameter: `id` (Event ID).
*   **Response Schema & Success Logic**: Confirmation object regarding successful batch revocation.

### **Endpoint: `/api/events/[id]/reissue`**
*   **Method**: `POST`
*   **Description**: Admin feature to re-issue certificates for a select group of attendees within an event.
*   **Request Schema**: JSON body `{ attendeeIds: string[] }`. Requires non-empty array of targeted IDs.
*   **Response Schema & Success Logic**: A list detailing the outcomes (success/failure) for all re-issued certificates.

---

## $\text{4. Workflow and General Utility API}$

Endpoints supporting background processes, health checks, and system maintenance.

### **Endpoint: `/api/workflow-status`**
*   **Method**: `GET`
*   **Description**: Checks the status of an asynchronous background process ("Workflow Run").
*   **Request Schema**: Query parameter `runId` (The ID of the workflow execution).
*   **Response Schema & Success Logic**: An object detailing the current `status` (`pending`, `running`, `completed`, `failed`). Includes a `result` if completed.

### **Endpoint: `/api/health` (\`GET\`)**
*   **Method**: `GET`
*   **Description**: Checks basic operational health by attempting to re-seed key user data in Supabase (read-only check).
*   **Request Schema**: None. Requires basic user session.
*   **Response Schema & Success Logic**: HTML page confirmation of seeded user credentials, useful for monitoring validation.

### **Endpoint: `/api/health` (\`POST\`)**
*   **Method**: `POST`
*   **Description**: Utility endpoint to manually force a re-seeding of default administrative and staff users (Admin Master Reset). Overwrites existing records.
*   **Request Schema**: Form data containing administrator credentials (`email`, `password`).
*   **Response Schema & Success Logic**: HTML page showing all seeded user details/validation status.