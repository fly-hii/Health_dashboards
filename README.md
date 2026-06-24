# CarePlus SaaS Workspace

This repository contains the multi-tenant SaaS Health Management Dashboards, including the Admin, Doctor, Patient, Pharma, and Nurse portals.

---

## Nurse Module Implementation Status

This status report details the implemented features, technical architecture, and workflow impacts in the **Nurse Module**.

### 1. Executive Summary of Accomplishments
The **Nurse Module** has been fully implemented with robust frontend interfaces and corresponding backend services. It streamlines patient triage and transitions patients efficiently from check-in to doctor consultation.

*   **Real-Time Patient Queue**: A dynamic dashboard managing waiting, completed, and upcoming appointments. Includes smart text-to-speech audio announcements for calling patients.
*   **Vitals Recording Interface**: A standardized form capturing BP, Temperature, Pulse Rate, SpO2, Respiratory Rate, Blood Sugar, Weight, Height, Pain Scale, and chief complaints.
*   **Automatic BMI Calculator**: Real-time formula computation reducing manual data entry errors.
*   **Vitals & Clinical History Timeline**: Tabbed visual logs aggregating past visits, vitals trends, allergies, chronic conditions, and medical notes.
*   **Pre-Consultation Workflow & Real-Time Sync**: Automated nurse-to-doctor transition that changes appointment status to `In-Progress` and triggers web sockets and system notifications to notify assigned doctors.

---

## 2. Feature-by-Feature Deep Dive

### A. Patient Queue Management
*   **Path**: `nurse-dashboard/nurse-frontend/src/pages/nurse/PatientQueue.jsx` & `nurse-dashboard/nurse-backend/controllers/nurse/nurseController.js`
*   **Key Features**:
    *   **Unified Queue Views**: Tabs to toggle between Today's Active/Waiting list, Today's Completed list, and Tomorrow's Scheduled list.
    *   **Filters & Search**: Multi-parameter filters including Search (by name, ID, or Token), Department, and Patient Status.
    *   **Audio Announcement (TTS)**: Built-in synthesis (`window.speechSynthesis`) to announce called patients (e.g., *"Calling token 5, John Doe"*), reducing physical queue management effort.
    *   **Walk-in Registration**: Integrated modal to instantly register walk-in patients, auto-generate sequential unique IDs (`PATYYYYMMDD00X`), calculate day-specific tokens, and append to the active queue.

### B. Vitals Recording
*   **Path**: `nurse-dashboard/nurse-frontend/src/pages/nurse/VitalsEntry.jsx` & `nurse-dashboard/nurse-backend/controllers/nurse/vitalsController.js`
*   **Key Features**:
    *   **Dynamic Patient Triage Selection**: Allow selecting active queue patients or manually entering vitals for a specific appointment ID.
    *   **Automatic BMI Calculation**: Real-time client-side calculation using height (cm) and weight (kg) which updates the input form dynamically.
    *   **Clinical Safety Range Validation**: Validates vital signs on-the-fly and alerts nurses with color-coded inputs for outliers (e.g. pulse rate <30 or >220 bpm, systolic BP <70 or >250 mmHg).
    *   **Progress Tracking**: Visual progress bar tracking complete entries (BP, Temp, SpO2, BMI) to ensure zero incomplete records.
    *   **Direct Demographics Update**: Interactive modal to update patient details (emergency contact, allergies, chronic conditions) inline.

### C. Vitals & Medical History
*   **Path**: `nurse-dashboard/nurse-frontend/src/pages/nurse/MedicalHistory.jsx` & `nurse-dashboard/nurse-backend/controllers/nurse/nurseController.js`
*   **Key Features**:
    *   **Visits Timeline**: Full list of historical doctor visits, clinical symptoms, and treating departments.
    *   **Vitals Logs**: Chronological table showing past vitals measurements. Automatically highlights critical readings (e.g., elevated BP in red text).
    *   **Aggregated Patient Details**: Grouped panels displaying known Allergies (highlighted by severity), Chronic Conditions (linked with diagnosed dates and ongoing medications), and Emergency Contacts.
    *   **Actionable Data Exports**: Functions to export clinical records to CSV/PDF or print directly.

### D. Pre-Consultation Workflow (Transition)
*   **Path**: `nurse-dashboard/nurse-frontend/src/pages/nurse/AppointmentDetails.jsx` & `nurse-dashboard/nurse-backend/controllers/nurse/vitalsController.js`
*   **Key Features**:
    *   **Automated State Machine**: Saving vital signs automatically transitions the patient status from `Pending`/`Confirmed` to `In-Progress`.
    *   **Immediate Doctor Hand-off**: Triggers a notification (`Notification.create`) for the assigned doctor: *"Patient Vitals Ready. Patient is ready for consultation."*
    *   **Instant Queue Updates**: Emits socket events (`vitals_recorded`, `appointment_status_updated`) to instantly refresh both the nurse's queue and doctor's dashboard without manual page reloads.

---

## 3. Technical Architecture & Tech Stack

### Frontend Stack:
*   **Framework**: React (using Vite).
*   **Styling & Components**: Tailwind CSS, Shadcn-style custom UI primitives (`Button`, `Card`), Lucide Icons.
*   **State & Navigation**: `react-router-dom` (using query parameters and URL params for clean view-state restoration), `react-toastify` for toast feedback.
*   **APIs & Sockets**: Axios-based clean API services, `socket.io-client` for persistent WebSocket listeners.
*   **Web API integrations**: Web Speech Synthesis API (`window.speechSynthesis`) for token announcements, and window printing for token receipts.

### Backend Stack:
*   **Framework**: Node.js + Express.js.
*   **Database ORM**: Sequelize with support for transaction logs and dynamic tenant-scoping (per-hospital isolation).
*   **Sockets**: Socket.io event emitter bound to multi-tenant namespaces (`hospital_${hospitalId}`).
