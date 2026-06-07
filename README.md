# VAULTT // Second-Hand Marketplace

Vaultt is a minimalist, modern web platform for buying and selling second-hand luxury, streetwear, and curated goods. Built as a lightweight alternative to traditional classifieds, Vaultt emphasizes a high-end, "clinical" design aesthetic and robust buyer-seller interactions.

## 🚀 Live Links
- **Frontend (Live):** [Insert Vercel URL Here]
- **Backend (Live):** [Insert Render URL Here]
- **Demo Video:** [Insert Video URL Here]

## 🛠️ Tech Stack
- **Frontend:** Next.js (React), Tailwind CSS, TypeScript, Lucide React (Icons)
- **Backend:** Node.js, Express.js, MongoDB (Mongoose)
- **Authentication:** JSON Web Tokens (JWT), bcryptjs
- **File Storage:** Cloudinary (Native unsigned POST uploads)
- **Deployment:** Vercel (Frontend), Render (Backend)

## ✨ Core Features
- **Authentication:** Secure user signup and login with JWT and session-based state management.
- **Listings Management:** Create, view, edit, and delete listings. Mark items as sold. Support for rich metadata (Category, Size, Condition, Price, Brand).
- **Native Image Uploads:** Direct-to-Cloudinary image uploads for listings without relying on heavy external SDKs.
- **Advanced Browse & Discovery:** Dynamic filtering by Category, Price Range, Search query, and Sorting parameters.
- **Robust Offer & Chat System:** Instead of basic inquiry forms, Vaultt features an interactive Offer system. Buyers initiate a thread by submitting an offer and message. Sellers can Accept, Reject, or Renegotiate, creating a seamless chat-like negotiation flow.
- **Trust & Moderation:** 
  - **Block/Unblock System:** Users can block others. The backend instantly severs communication, returning `403 Forbidden` on blocked endpoints, and dynamically hides listings and chat interfaces.
  - **Verified Reviews:** Users can leave a 1-5 star rating and review on a seller's profile *only* if they share an accepted transaction history, preventing review spam.
  - **Reporting:** Built-in reporting for moderation.

## 🧠 System Design & Assumptions
When building Vaultt, several design decisions were made to prioritize UX and data integrity:

### 1. Aesthetic & UI/UX
The platform intentionally uses a stark, monochromatic "clinical" design system. It avoids generic UI components in favor of sharp borders, uppercase tracking, and monospace typography for metadata to mimic high-end fashion and archive platforms.

### 2. The Negotiation (Chat) System
*Assumption:* In second-hand marketplaces, pure open-ended chat often leads to unstructured "Is this available?" spam.
*Decision:* We built a structured **Offer-based Chat**. A buyer must propose an offer price alongside their initial message. This contextualizes the chat thread directly to a financial transaction, allowing the seller to cleanly "Accept" or "Renegotiate" within the thread.

### 3. Review Gatekeeping
*Assumption:* Open review systems are easily abused by trolls or competitors.
*Decision:* The backend cross-references the `Offer` collection. A user can only submit a `Review` if the backend verifies an `accepted` offer exists between the buyer and the seller.

### 4. Cross-Tab Authentication
*Assumption:* Users often open multiple listings in different tabs.
*Decision:* Auth state is persisted in `sessionStorage` and bootstrapped via an initial `/api/auth/me` fetch on sensitive pages (like the Inbox) to instantly sync block-lists and ensure the user's security state is up-to-date across all tabs without manual refreshes.

## 💻 Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster (or local instance)
- Cloudinary account

### Backend Setup
1. `cd server`
2. `npm install`
3. Create a `.env` file based on `.env.example`:
   ```
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   ```
4. `npm run dev`

### Frontend Setup
1. `cd client`
2. `npm install`
3. Create a `.env.local` file:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
   ```
4. `npm run dev`
