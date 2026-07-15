# 📋 Bill Manager Pro

A lightweight, offline-first React application for organizing bills, maintaining a personal ledger, and tracking gift records — all in one place, with full bilingual (Hindi/English) support.

**🔗 Live Demo:** [https://folder-manager-seven.vercel.app/](https://folder-manager-seven.vercel.app/)

---

## ✨ Overview

Bill Manager Pro helps individuals and small business owners keep track of three distinct types of records without needing a backend server or database:

- **Bills** – Upload and organize bill/receipt photos by date, with search and sort.
- **Ledger** – Record money given to or received from people, with running totals and an optional receipt photo per entry.
- **Gifts** – Log gifts given or received for specific occasions, with an optional photo and value.

All data — including uploaded photos — is stored locally on the user's device using the browser's `localStorage`, so the app works entirely offline after the first load and requires no sign-up or account.

---

## 🚀 Features

- **Three independent sections** (Bills, Ledger, Gifts), each with its own data, its own add/delete logic, and its own local storage key — switching tabs never mixes or loses data from another section.
- **Photo upload from Camera or Gallery** on every section, powered by native `<input type="file">` capture.
- **Persistent photo storage** — every photo is compressed and converted to a Base64 data URL before saving, so images remain fully intact and viewable even after a page refresh or browser restart (no reliance on temporary blob URLs).
- **Click-to-view photo modal** — tap any thumbnail to view the full-size image with a download option.
- **Search & filter** — find bills by name/date, ledger entries by person, and gifts by person or occasion.
- **Automatic balance summary** in the Ledger section (Total Given, Total Received, Net Balance).
- **Bilingual UI** — instantly switch between Hindi and English using the language toggle.
- **Storage-safety handling** — if the device's local storage becomes full, the app shows a clear warning instead of silently losing data.
- **Responsive design** — optimized for both mobile and desktop screens.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React](https://react.dev/) |
| Icons | [lucide-react](https://lucide.dev/) |
| Styling | Inline CSS-in-JS (no external CSS framework) |
| Data Persistence | Browser `localStorage` (client-side only) |
| Hosting | [Vercel](https://vercel.com/) |

No backend, database, or external API is required — the entire application runs client-side.

---

## 📂 Project Structure

```
Folder_Manager/
├── src/
│   ├── BillManager.jsx     # Main application component (Bills, Ledger & Gifts)
│   └── ...
├── public/
├── package.json
└── README.md
```

The application is intentionally built as a single, self-contained component (`BillManager.jsx`) with internal sub-components for each tab (`BillsSection`, `LedgerSection`, `GiftsSection`) and shared helpers (`PhotoPicker`, `PhotoModal`, `compressImage`). This avoids cross-file state/import issues while still keeping each section's logic cleanly separated.

---

## 💾 How Data Is Stored

| Section | localStorage Key | Structure |
|---|---|---|
| Bills | `billManager_bills` | Object keyed by date → array of bill entries |
| Ledger | `billManager_ledger` | Array of ledger entries |
| Gifts | `billManager_gifts` | Array of gift entries |

Each section saves independently, so an issue in one section's data never affects the others. Photos are stored as compressed Base64 image strings directly inside these entries, ensuring they persist reliably across page reloads.

---

## 🖥️ Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or later recommended)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/mo-arman/Folder_Manager.git
cd Folder_Manager

# Install dependencies
npm install

# Start the development server
npm start
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

This generates an optimized production build in the `build/` folder, ready to deploy to any static hosting provider (Vercel, Netlify, etc.).

---

## 🚢 Deployment

This project is deployed on **Vercel** and automatically rebuilds on every push to the `main` branch.

**Live URL:** [https://folder-manager-seven.vercel.app/](https://folder-manager-seven.vercel.app/)

---

## 📱 Usage

1. Open the app and select a language (Hindi/English) using the toggle in the top-right corner.
2. Choose a tab — **Bills**, **Ledger**, or **Gifts**.
3. Fill in the relevant details and attach a photo via **Gallery** or **Camera** (optional for Ledger/Gifts, required for Bills).
4. Tap **Add Entry** to save.
5. Tap any photo thumbnail to view it full-screen or download it.
6. Use the search and filter controls to quickly locate past entries.

All entries remain saved on the device even after closing the browser or refreshing the page.

---

## 📄 License

This project is provided as-is for personal and educational use.

---

## 🙋 Support

For issues or feature requests, please open an issue on the [GitHub repository](https://github.com/mo-arman/Folder_Manager).
