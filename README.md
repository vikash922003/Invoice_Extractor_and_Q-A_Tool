# Invoice Intelligence — AI-Powered Invoice Extractor & Q&A Tool

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-green.svg)](https://www.mongodb.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-blue.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Google Gemini API](https://img.shields.io/badge/AI-Google%20Gemini%20API-orange.svg)](https://aistudio.google.com/)
[![Tests](https://img.shields.io/badge/Tests-13%2F13%20Passing-brightgreen.svg)]()
[![Extraction Accuracy](https://img.shields.io/badge/Field%20Accuracy-100%25-success.svg)]()

> A production-grade document intelligence platform designed to ingest 1–20 invoices simultaneously in PDF or image format (PNG, JPG, JPEG, WEBP), extract structured fields adhering to a strict schema, validate calculations with decimal-safe arithmetic, and answer natural-language questions across the invoice repository with verifiable citations.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Architecture & Directory Structure](#2-monorepo-architecture--directory-structure)
3. [Prerequisites](#3-prerequisites)
4. [Step-by-Step Setup & Installation](#4-step-by-step-setup--installation)
5. [Running the Application](#5-running-the-application)
6. [Core System Features](#6-core-system-features)
   - [Document Processing Pipeline](#document-processing-pipeline)
   - [Strict Schema LLM Extraction](#strict-schema-llm-extraction)
   - [Decimal-Safe Financial Validation](#decimal-safe-financial-validation)
   - [Dual-Scope Conversational Q&A](#dual-scope-conversational-qa)
   - [Ground-Truth Benchmark Suite](#ground-truth-benchmark-suite)
7. [REST API Documentation](#7-rest-api-documentation)
8. [Testing & Evaluation](#8-testing--evaluation)
9. [Configuration & Environment Variables](#9-configuration--environment-variables)
10. [Troubleshooting & FAQ](#10-troubleshooting--faq)

---

## 1. Project Overview

**Invoice Intelligence** is built on a unified **MERN monorepo** (MongoDB + Mongoose, Express.js + TypeScript, React 18 + Vite + Tailwind CSS, and Node.js v20+) powered by the **Google Gemini API** (`gemini-3.1-flash-lite`).

### Key Capabilities
- **Batch Document Ingestion**: Upload 1 to 20 files per batch in PDF, PNG, JPG, JPEG, or WEBP format.
- **Strict Schema Enforcement**: Extraction strictly conforms to the required logical invoice JSON schema without hallucinations or undeclared properties.
- **Decimal-Safe Financial Rules**: IEEE-754 floating-point drift elimination via `BigNumber.js` validating line-item sums (Rule A), subtotal + tax = total (Rule B), and Indian CGST + SGST tax consistency (Rule C).
- **Dual-Scope Q&A Engine**:
  - **Global Mode**: Query across the entire invoice repository (aggregations, sums, vendor comparisons, cross-invoice search).
  - **Invoice-Specific Mode**: Isolate and query a single selected invoice for line items, quantities, tax breakdowns, or audit explanations.
  - **Interactive Citations**: Clickable source citations open a full invoice inspection modal with line-item breakdowns, audit logs, and original file downloads.
- **Standalone Accuracy Evaluation Framework**: CLI and API benchmark tool comparing extraction output against ground truth (`fixtures/expected_values.json`), achieving **100% field accuracy** and correctly identifying intentional validation failures.

---

## 2. Monorepo Architecture & Directory Structure

Both frontend and backend are housed in this single repository for unified development, type safety, and deployment.

```
vks/                                   # Repository Root
├── .env.example                       # Root template environment variables
├── .gitignore                         # Comprehensive monorepo gitignore
├── package.json                       # Root orchestration scripts (dev, build, test, eval)
├── README.md                          # Production project documentation
├── evaluation-report.json             # Benchmark accuracy evaluation output
│
├── backend/                           # Node.js + Express + TypeScript API Server
│   ├── .env.example                   # Backend environment template
│   ├── package.json                   # Backend dependencies & scripts
│   ├── tsconfig.json                  # TypeScript compiler configuration
│   ├── vitest.config.ts               # Vitest configuration for unit & API tests
│   ├── uploads/                       # Secure local storage for original uploaded files (.gitkeep)
│   ├── scripts/                       # Maintenance & evaluation runner scripts
│   │   ├── evaluate-extraction.ts     # CLI extraction accuracy evaluation tool
│   │   ├── generate-sample-invoices.ts# Synthetic test invoice generator (PDF + PNG)
│   │   └── seed-extracted-invoices.ts # Test seeding utility
│   ├── src/
│   │   ├── app.ts                     # Express app setup, CORS, JSON parsing, error middleware
│   │   ├── server.ts                  # Server entry point & MongoDB connection
│   │   ├── config/index.ts            # Environment variables & runtime settings
│   │   ├── types/index.ts             # Global TypeScript interfaces & schemas
│   │   ├── validators/invoiceSchema.ts# Strict Zod schema for invoice extraction
│   │   ├── models/                    # Mongoose database models & indexes
│   │   │   ├── Document.ts            # Raw uploaded file metadata & processing state
│   │   │   ├── Invoice.ts             # Extracted invoice record & validation results
│   │   │   ├── InvoiceLineItem.ts     # Relational-style line items subdocument
│   │   │   ├── ExtractionAttempt.ts   # Extraction audit log & error tracking
│   │   │   └── QAHistory.ts           # Conversational Q&A audit trail & citations
│   │   ├── providers/                 # Modular LLM providers
│   │   │   ├── llmProvider.ts         # Generic ILlmProvider interface
│   │   │   └── geminiProvider.ts      # Google Gemini multimodal & structured output integration
│   │   ├── services/                  # Business logic services
│   │   │   ├── documentService.ts     # Upload handling, SHA-256 hashing & async queue
│   │   │   ├── extractionService.ts   # PDF/Image text extraction & Gemini pipeline
│   │   │   ├── validationEngine.ts    # Decimal-safe BigNumber financial validation
│   │   │   ├── invoiceService.ts      # Invoices filtering, sorting & stats aggregation
│   │   │   ├── qaService.ts           # Dual-scope Q&A engine with citations
│   │   │   └── evaluationService.ts   # Benchmark scoring & ground truth comparison
│   │   ├── controllers/               # Thin HTTP controllers
│   │   ├── routes/                    # Versioned Express routes (/api/v1/...)
│   │   └── middleware/                # Multer file upload & global error handler
│   └── tests/                         # Automated test suite
│       ├── api.test.ts                # REST API endpoint integration tests
│       └── validationEngine.test.ts   # Financial validation engine unit tests
│
├── frontend/                          # React 18 + Vite + Tailwind CSS Client SPA
│   ├── index.html                     # HTML5 application entry point
│   ├── package.json                   # Frontend dependencies & scripts
│   ├── vite.config.ts                 # Vite config with API proxy to port 5001
│   ├── tailwind.config.js             # Tailwind CSS design system configuration
│   └── src/
│       ├── main.tsx                   # React root mount & TanStack Query client
│       ├── App.tsx                    # React Router configuration & layout
│       ├── api/client.ts              # Axios HTTP client communicating with /api/v1
│       ├── components/                # Reusable UI components
│       │   ├── Navbar.tsx             # Responsive navigation bar
│       │   ├── StatusBadge.tsx        # Processing & validation status badges
│       │   └── InvoiceDetailModal.tsx # Full invoice inspection modal & line-item view
│       └── pages/                     # Main view pages
│           ├── DashboardPage.tsx      # Metrics, spend by currency, validation rates
│           ├── UploadPage.tsx         # Drag-and-drop batch upload with status tracking
│           ├── InvoicesPage.tsx       # Searchable, filterable repository table
│           ├── QAPage.tsx             # Dual-mode Q&A chat (Global + Specific Invoice)
│           ├── EvaluationPage.tsx     # Accuracy benchmark dashboard & evaluation runner
│           └── SettingsPage.tsx       # System health & Gemini configuration status
│
└── fixtures/                          # Test Fixtures & Ground Truth Data
    ├── expected_values.json           # Ground-truth expected values for evaluation
    └── invoices/                      # 8 benchmark invoices (7 PDFs + 1 PNG receipt)
```

---

## 3. Prerequisites

Before installing, ensure your environment has the following installed:

1. **Node.js**: `v20.0.0` or higher ([Download Node.js](https://nodejs.org/))
2. **npm**: `v10.0.0` or higher (bundled with Node.js)
3. **MongoDB**: `v7.0` or `v8.0` running locally on port `27017` (or a remote [MongoDB Atlas](https://www.mongodb.com/atlas) connection URI)
4. **Google Gemini API Key**: Free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## 4. Step-by-Step Setup & Installation

### Step 1: Clone the Repository
```bash
git clone <your-repository-url>
cd vks
```

### Step 2: Configure Environment Variables
Copy the example environment configuration into `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` in your text editor and ensure your credentials are set:
```env
# Backend Server Port
PORT=5001

# MongoDB Connection String (Local or Atlas)
MONGODB_URI=mongodb://127.0.0.1:27017/invoice_intelligence

# Google Gemini API Key (Required for AI extraction & Q&A)
GEMINI_API_KEY=your_google_gemini_api_key_here

# Gemini Model Name
GEMINI_MODEL=gemini-3.1-flash-lite

# Upload Storage Directory
UPLOAD_DIR=uploads

# File Constraints
MAX_FILE_SIZE=10485760
MAX_FILES_PER_BATCH=20
```

> **Note on Frontend Configuration**: The frontend uses Vite's development proxy (`frontend/vite.config.ts`) which automatically forwards all `/api` requests to `http://localhost:5001`. No frontend `.env` is required. The Gemini API key is **never** exposed to the frontend browser bundle.

### Step 3: Install Dependencies
From the repository root, install dependencies for the root, backend, and frontend with a single command:
```bash
npm run install:all
```

Alternatively, install individually:
```bash
# Root
npm install

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
cd ..
```

---

## 5. Running the Application

### Option A: Running from Repository Root (Recommended)

Open two terminal windows in the project root:

**Terminal 1 — Start Backend Server:**
```bash
npm run dev:backend
```
* Backend starts at: **`http://localhost:5001`**
* Health check: **`http://localhost:5001/api/v1/health`**

**Terminal 2 — Start Frontend Application:**
```bash
npm run dev:frontend
```
* Vite dev server starts at: **`http://localhost:3000`**
* Open **`http://localhost:3000`** in your browser.

---

### Option B: Running from Individual Folders

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

---

## 6. Core System Features

### Document Processing Pipeline
1. **Multi-File Upload**: Drag-and-drop or select 1 to 20 documents simultaneously.
2. **Strict MIME & Size Validation**: Checks file headers for `application/pdf`, `image/png`, `image/jpeg`, and `image/webp`. Enforces a 10MB per-file limit.
3. **Storage & Deduplication**: Files are written to `backend/uploads/` using secure UUID filenames. A SHA-256 checksum is computed to prevent accidental duplicate processing.
4. **Batch Isolation**: Per-document tracking (`QUEUED` → `PROCESSING` → `EXTRACTED` / `VALIDATION_FAILED` / `FAILED`). A single corrupted or unreadable invoice never halts the processing of valid invoices in the same batch.
5. **Retry Mechanism**: Documents that fail extraction can be retried at any time via `POST /api/v1/documents/:id/retry`.

### Strict Schema LLM Extraction
Extracted invoices strictly conform to the required JSON schema without extra properties:
```json
{
  "vendor_name": "string",
  "invoice_number": "string",
  "invoice_date": "YYYY-MM-DD",
  "currency": "INR | USD | EUR",
  "line_items": [
    {
      "description": "string",
      "quantity": 1,
      "unit_price": 100.00,
      "amount": 100.00
    }
  ],
  "subtotal": 100.00,
  "tax": 18.00,
  "total": 118.00
}
```
- Validated at runtime by Zod (`.strict()`).
- Anti-prompt-injection isolation using `<document_content>` tags.
- Bounded repair loop (max 2 attempts) for self-healing JSON responses.

### Decimal-Safe Financial Validation
Built using `BigNumber.js` to eliminate JavaScript IEEE-754 floating-point drift:
- **Rule A (Line Items vs Subtotal)**: $|\sum \text{line\_items.amount} - \text{subtotal}| \le 0.05$
- **Rule B (Subtotal + Tax vs Total)**: $|(\text{subtotal} + \text{tax}) - \text{total}| \le 0.05$
- **Rule C (Indian CGST + SGST vs Tax)**: $|(\text{CGST} + \text{SGST}) - \text{tax}| \le 0.05$
- **Suspicious Fields**: Identifies unit price $\times$ quantity mismatches and flags them for manual review.

### Dual-Scope Conversational Q&A
Accessible at **`http://localhost:3000/qa`**:
1. **All Invoices (Global Repository Mode)**:
   - Queries translate into safe, parameterized query plans (`ISafeQueryPlan`).
   - Executes allowlisted MongoDB aggregations (`$match`, `$group`, `$sort`) or tokenized line-item keyword searches.
   - Computes multi-invoice metrics (*"What is our total spend in INR?"*, *"How much did we spend on Google LLC?"*).
2. **Specific Invoice Mode**:
   - Allows users to select any invoice from an interactive dropdown.
   - Formats the selected invoice's exact metadata, line items, taxes, and validation discrepancies into the prompt.
   - Provides targeted auditing (*"List all line items with quantity & unit price"*, *"Why did this invoice fail validation?"*).
3. **Source Citations**:
   - Citations show vendor name, invoice number, date, currency, total, and evidence snippet.
   - Clicking any citation immediately opens the full `InvoiceDetailModal`.

### Ground-Truth Benchmark Suite
Automated accuracy evaluation against 8 supplied sample invoices and `fixtures/expected_values.json`:
- Evaluates field-by-field accuracy: `vendor_name`, `invoice_number`, `invoice_date`, `currency`, `subtotal`, `tax`, `total`, `line_items`, and `validation_status`.
- Verifies that intentional calculation flaws (e.g., `invoice_08_faulty_math.pdf`) are detected as `FAIL`.
- Run via terminal: `npm run evaluate:extraction`
- Run via UI: Navigate to **`http://localhost:3000/evaluation`** and click **Run Extraction Benchmark**.

---

## 7. REST API Documentation

All API endpoints are versioned under `/api/v1`.

### Documents API (`/api/v1/documents`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/documents/upload` | Upload 1–20 PDF or image files (multipart/form-data, field `files`) |
| `GET` | `/api/v1/documents` | List uploaded documents with pagination & status filters |
| `GET` | `/api/v1/documents/:id` | Get document metadata, extracted raw text & linked invoice |
| `GET` | `/api/v1/documents/:id/status`| Poll processing status (`QUEUED`, `PROCESSING`, `EXTRACTED`, `FAILED`) |
| `POST` | `/api/v1/documents/:id/retry` | Re-queue and re-process a failed document |
| `GET` | `/api/v1/documents/:id/file` | Download the original uploaded PDF or image file |

### Invoices API (`/api/v1/invoices`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/invoices` | Search & filter invoices (`vendor`, `currency`, `validationStatus`, `dateFrom`, `dateTo`, `search`, pagination) |
| `GET` | `/api/v1/invoices/:id` | Get single invoice details, line items, validation errors, and audit attempts |
| `GET` | `/api/v1/invoices/stats` | Dashboard statistics (total spend by currency, pass/fail counts, document counts) |
| `GET` | `/api/v1/invoices/filters`| Available filter options (unique vendors, currencies, status options) |

### Q&A API (`/api/v1/qa`)
| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/qa/ask` | Ask a question across all invoices or scoped to an invoice | `{"question": "...", "invoice_id": "optional_id"}` |
| `GET` | `/api/v1/qa/history` | Retrieve recent Q&A history with citations | None |

### Evaluation & System Health API
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Health check, server uptime, and Gemini configuration status |
| `GET` | `/api/v1/evaluation/report` | Retrieve the latest benchmark accuracy evaluation report |
| `POST` | `/api/v1/evaluation/run` | Execute live extraction accuracy evaluation against `fixtures/` |

---

## 8. Testing & Evaluation

### Run Automated Unit & Integration Tests
The test suite includes 13 Vitest tests verifying financial validation rules, upload constraints, API controllers, and query safety:
```bash
npm test
```

Expected output:
```
 ✓ tests/validationEngine.test.ts (6 tests)
 ✓ tests/api.test.ts (7 tests)
 Test Files  2 passed (2)
 Tests       13 passed (13)
```

### Run Accuracy Evaluation Benchmark
Execute the automated accuracy benchmark tool against the 8 test invoices:
```bash
npm run evaluate:extraction
```

The script processes each invoice in `fixtures/invoices/`, validates the extraction against `fixtures/expected_values.json`, outputs field-level matches, and produces `evaluation-report.json`:
```
=============================================================
         INVOICE INTELLIGENCE EXTRACTION BENCHMARK
=============================================================
Total Invoices Evaluated: 8
Overall Field Accuracy:   100.0%

Field-by-Field Accuracy:
  • vendor_name:        8/8 (100.0%)
  • invoice_number:     8/8 (100.0%)
  • invoice_date:       8/8 (100.0%)
  • currency:           8/8 (100.0%)
  • subtotal:           8/8 (100.0%)
  • tax:                8/8 (100.0%)
  • total:              8/8 (100.0%)
  • line_items:         8/8 (100.0%)
  • validation_status:  8/8 (100.0%)
=============================================================
```

---

## 9. Configuration & Environment Variables

All settings are managed via `backend/.env`.

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `5001` | Port on which the Express REST API listens |
| `MONGODB_URI` | String | `mongodb://127.0.0.1:27017/invoice_intelligence` | MongoDB connection URI (local instance or MongoDB Atlas) |
| `GEMINI_API_KEY` | String | *Required* | API key from Google AI Studio |
| `GEMINI_MODEL` | String | `gemini-3.1-flash-lite` | Gemini model (`gemini-3.1-flash-lite` or `gemini-1.5-flash`) |
| `UPLOAD_DIR` | String | `uploads` | Folder inside `backend/` where uploaded files are saved |
| `MAX_FILE_SIZE` | Number | `10485760` | Maximum allowed file size in bytes (10MB) |
| `MAX_FILES_PER_BATCH` | Number | `20` | Maximum number of files permitted in a single upload request |

---

## 10. Troubleshooting & FAQ

### 1. "API key not valid. Please pass a valid API key."
- Ensure your Google Gemini key is active in [Google AI Studio](https://aistudio.google.com/app/apikey).
- Paste the key into `backend/.env` as `GEMINI_API_KEY=your_key`.
- Restart the backend server (`npm run dev:backend`).

### 2. "Model not found" (404)
- Google Gemini periodically updates supported models. Ensure `GEMINI_MODEL=gemini-3.1-flash-lite` is set in `backend/.env`.

### 3. "Cannot connect to MongoDB"
- Verify that your local MongoDB daemon is running:
  ```bash
  mongosh --eval "db.runCommand({ ping: 1 })"
  ```
- If MongoDB is installed as a systemd service:
  ```bash
  sudo systemctl start mongod
  ```
- Alternatively, use a free cloud MongoDB Atlas cluster and set `MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/invoice_intelligence` in `backend/.env`.

### 4. Port Conflicts (5001 or 3000 already in use)
- Change `PORT=5002` in `backend/.env`.
- If modifying the backend port, update the proxy target in `frontend/vite.config.ts`:
  ```typescript
  proxy: {
    '/api': {
      target: 'http://localhost:5002',
      changeOrigin: true
    }
  }
  ```

---

## License

This project is licensed under the MIT License.
#   I n v o i c e _ E x t r a c t o r _ a n d _ Q - A _ T o o l  
 #   I n v o i c e _ E x t r a c t o r _ a n d _ Q - A _ T o o l  
 "# Invoice_Extractor_and_Q-A_Tool" 
"# Invoice_Extractor_and_Q-A_Tool" 
"# Invoice_Extractor_and_Q-A_Tool" 
"# Invoice_Extractor_and_Q-A_Tool" 
"# Invoice_Extractor_and_Q-A_Tool" 
