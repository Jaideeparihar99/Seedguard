# SeedGuard MVP

A mobile-first seed purchase risk triage demo with a modular FastAPI backend and SQLite check history.

## Run locally

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Open the localhost address printed by the startup script (usually http://127.0.0.1:8000; it tries ports 8001–8003 if needed). The API health endpoint is `/api/health`.

If the dependencies are already installed in `work/python-packages`, start the server from a PowerShell window opened in this project folder. The script checks the health endpoint, runs the server in the background, and lets you close PowerShell after it reports the URL:

```powershell
.\start_seedguard.ps1
```

## Current behavior

- The form accepts a packet image and purchase/label details.
- The app can be installed as a PWA in supported browsers. Its service worker caches the static app shell for offline opening, and packet/SATHI text drafts autosave in browser storage on that device. Image files are not stored in drafts. Seed analysis and SATHI comparison still require a live backend connection; the interface reports that and keeps the text draft for later.
- The interface and generated check guidance can be switched between English and Hindi; the selected language is remembered in the browser.
- Key result panels include a read-aloud control that uses the device's English or Hindi speech voice, based on the selected interface language. Audio stays in the browser; Hindi playback depends on a Hindi voice being installed on the device.
- The selected photo is previewed and checked for small dimensions, low light/glare, and low contrast/detail. These are advisory checks and do not block analysis.
- English OCR runs in the browser through Tesseract.js. It suggests crop, brand, variety, batch, validity/packing/test dates, weight, and certification text with field confidence; suggestions are never applied without the user's click.
- A photo-based visual review checklist lets the user report visible packet or seed concerns. These user observations can affect the score, but the app does not automatically detect package damage or seed defects.
- The backend checks image type and size, evaluates label completeness, compares the entered price with demo ranges, and applies a source category signal.
- The purchase form loads the selected crop's configured range from the backend as the user enters a price. The comparison is labeled as demo data and notes that pack sizes and local prices vary.
- Results show a 0–100 indicator score, reasons, and suggested next steps.
- Check metadata is saved in `work/seedguard.sqlite3`; uploaded image bytes are validated but not stored.
- Saved checks can be opened from the history section, and two to four checks can be compared by label details, photo presence, source, price, and demo score.
- The guided SATHI record review opens the official public tag/lot lookup and lets the farmer enter packet details alongside values shown in the SATHI result. On browsers with BarcodeDetector and camera support, QR/barcode scanning can prefill a packet tag or lot value; the farmer must review it. The backend compares crop, variety, lot, tag, and producer fields and reports matches, differences, or missing values. Farmers may also add quality fields reported by SATHI (such as normal germination, weed/other-crop seed, dead/hard seed, and damage/health indicators) to a plain-language detail panel. The app preserves these values as entered and does not infer pass/fail or predict field performance. Comparisons are saved in SQLite and can be reopened from recent SATHI checks. This is a user-entered comparison; SeedGuard does not connect to or authenticate SATHI records automatically.
- Farmers can optionally choose a SATHI result screenshot and get OCR suggestions for crop, variety, lot, tag, producing agency, and available test values. Suggestions are never applied automatically; the image is processed in the browser and is not uploaded with the text comparison. OCR uses English labels, so the farmer should check every suggestion against the official result.
- A lab-report reference checker compares entered measurements with the 2013 Central Seed Certification Board manual for wheat, cotton, pearl millet, tomato, paddy, maize, soybean, chickpea, and rapeseed/mustard. The choices adjust by crop so unavailable type/class combinations are hidden. It compares each entered value separately and never creates a quality score or certifies a lot. The manual is an educational reference; users must confirm the current applicable rule, units, and full certification requirements with an authorized laboratory or agency.
- The sowing planner calculates seed quantity, whole packs to buy, surplus after rounding to full packs, and an estimated total cost from the farmer-entered field area, seed rate, pack weight, and price. It converts acres and hectares when the entered seed-rate unit differs. The farmer can save plans to SQLite and reopen recent plans. SeedGuard supplies no recommended seed-rate defaults: the farmer should use the packet or local agriculture guidance because rates depend on crop, variety, sowing method, and location. Plan form drafts are also saved locally in the browser; the calculation needs the backend.
- A farmer can log a small seed-sample observation by entering the sample size and normal seedlings counted. SeedGuard calculates the observed sample percentage, optionally compares it with the packet statement in percentage points, and can save dated logs in SQLite. It does not score the observation or treat it as a lab result. The guide links an ICAR soybean example and tells farmers that sample size and timing vary by crop.
- A farmer can keep a dated follow-up record when packet details, a SATHI lookup, or a small sample observation raises a concern. It records the farmer's own description, seller/receipt references, lot/tag numbers, district, and which evidence they already have; it provides practical evidence-preservation steps and a printable report. A SATHI mismatch can prefill the follow-up form. The app does not upload photos, file an official complaint, or determine that seed is counterfeit. The form links to SATHI's official tag lookup and directory of state contacts. Saved records are stored in the local SQLite database without accounts or access control, so this is a single-device demo and should not be deployed publicly with personal information.
- A state-aware testing-pathway guide identifies the Central Seed Testing Laboratory at NSRTC Varanasi and the two regional centres named in the Government of India Gazette notification (NSC Bhopal and NSC Secunderabad), and links to SATHI's state contact directory. It does not claim to find the nearest lab or confirm farmer service-sample acceptance; farmers are told to contact the authority/lab first and confirm sampling procedure, quantity, packaging, fees, and timing.
- Seed checks and SATHI comparisons can be printed or saved as PDF from the browser's print dialog. Reports preserve entered values and disclaimers; they are not certificates.

## Backend layout

- `backend/main.py` creates the FastAPI app and serves the frontend.
- `backend/routes.py` defines the health, crops, price check, analysis, and saved-check endpoints.
- `backend/services/risk_engine.py` calculates the explainable demo score and next steps.
- `backend/database.py` initializes SQLite and stores or retrieves seed checks.
- `backend/config.py` holds crop price ranges and upload limits.
- `backend/schemas.py` validates API response shapes.

API endpoints include `GET /api/price-check?crop=Mustard&price=900`, `GET /api/seed-checks/{id}`, `POST /api/compare` with a JSON body such as `{"check_ids":["id-1","id-2"]}`, `GET /api/seed-standard-options`, `GET /api/seed-standards?crop=maize&seed_type=hybrid&seed_class=certified`, `POST /api/seed-standard-check`, `POST /api/sowing-plan`, `GET /api/sowing-plans`, `POST /api/germination-log`, `GET /api/germination-logs`, `GET /api/germination-logs/{id}`, `POST /api/concern-record`, `GET /api/concern-records`, `GET /api/concern-records/{id}`, and `GET /api/testing-pathways?state=Telangana`.

## Important limitations

The photo readability checks use basic image heuristics and do not confirm focus or packet authenticity. Visual concern scoring is based on user-selected observations, not automated computer vision. Hindi translates the interface and guidance; OCR currently reads English text only, may misread seed labels, and needs internet access on first use. Users must review every OCR suggestion. The backend does not perform automated visual seed analysis, seller verification, certification, or germination testing. SATHI lookup is an official-portal handoff followed by manual entry, not a live integration; a missing or mismatched result is not proof of fraud. Price ranges are placeholders for the demo and need locally sourced data. The score is a configurable demonstration rule set, not a validated agricultural risk model. The sowing planner is arithmetic only; it does not validate the farmer's chosen rate or provide agronomic advice. The home sample log is a farmer observation only and cannot establish the quality of a complete seed lot or predict field emergence; formal results require an authorized seed testing laboratory. The testing-pathway guide is a sourced shortcut to three central/regional centres and a state contact directory, not a complete or live state laboratory finder.
