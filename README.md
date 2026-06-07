# Vaultt — Second-Hand Marketplace

Vaultt is a full-stack, production-deployed web platform for buying and selling second-hand goods. It was built as the take-home assignment for the Software Developer Intern role at Equitable Technologies. The platform is designed around a niche audience — curated luxury, archive, and streetwear — but the architecture and feature set are general-purpose enough to support any category of second-hand commerce.

The name "Vaultt" is a reference to the idea of a vault: a secure, curated archive of valuable things.

---

## Live Deployment

| Service    | URL                                                  |
|------------|------------------------------------------------------|
| Frontend   | https://vaultt-marketplace.vercel.app                |
| Backend    | https://vaultt-marketplace.onrender.com              |
| Repository | https://github.com/BlozerX/vaultt-marketplace        |
| Demo Video | https://drive.google.com/drive/folders/19G7m1bvbp-FMyH-zMJ-CsG6iEKiDUTQ1 |

---

## Tech Stack

| Layer          | Technology                                                              |
|----------------|-------------------------------------------------------------------------|
| Frontend       | Next.js 15 (React), TypeScript, Tailwind CSS, Lucide React             |
| Backend        | Node.js, Express.js (ES Modules)                                        |
| Database       | MongoDB with Mongoose ODM                                               |
| Authentication | JSON Web Tokens (JWT), bcryptjs                                         |
| File Storage   | Cloudinary (unsigned client-side POST — no SDK dependency)             |
| Search         | MongoDB Atlas Search (Lucene-backed, fuzzy full-text index)             |
| Deployment     | Vercel (frontend), Render (backend), MongoDB Atlas (database)           |

---

## Features Built

### Authentication
- User signup and login with password hashing via bcryptjs.
- JWT-based stateless authentication. The token is stored in `sessionStorage` and attached as a Bearer token on every authenticated API call.
- A `/api/auth/me` endpoint bootstraps the client's auth state on page load, ensuring the session is always in sync with the server without requiring a persistent cookie.

### Listings Management
- Create, view, edit, and delete listings. All mutations are gated to the authenticated owner of the listing.
- Rich metadata per listing: title, description, brand, size, price, condition (Deadstock / VNDS / Gently Used / Worn), category, location, and a negotiable flag.
- Multi-image support. Listings can have multiple images stored as an array of Cloudinary URLs.
- Image upload is performed client-side via a native `fetch` POST directly to the Cloudinary unsigned upload endpoint. No `cloudinary` npm package is used.
- A drag-and-drop upload component is built from scratch using the HTML `drag` event API.
- Sellers can mark their own listings as sold.
- A virtual `imageUrl` field on the Mongoose schema ensures backward compatibility for any code that still references a single image.

### Browse and Discovery
- A paginated listing feed on the homepage. Defaults to 12 items per page.
- Filtering by category, price range (min/max), and listing status.
- Sorting by newest, price ascending, price descending, and most viewed.
- View count tracking: each time a listing's detail page is loaded, a `$inc` operation increments its `views` counter atomically.

### Search
- Keyword search is powered by **MongoDB Atlas Search**, which uses an underlying Apache Lucene index.
- When a search query is present, the backend constructs a MongoDB aggregation pipeline with a `$search` stage that queries across the `title`, `brand`, `category`, and `description` fields simultaneously.
- **Fuzzy matching** is enabled with `maxEdits: 1`, which allows a Levenshtein edit distance of 1. This means single-character typos (e.g., "nik" matching "nike") are handled gracefully without any client-side library.
- All other active filters (category, price, status) are applied after the `$search` stage via a `$match` stage within the same aggregation pipeline.
- A separate count pipeline runs in parallel to compute the total result count for accurate pagination.

### Offer and Chat System
- Buyers initiate contact by submitting a structured offer: a proposed price and an opening message. This creates an `Offer` document in the database that anchors the entire thread to a specific listing and a specific price proposal.
- After the initial offer, both parties can exchange follow-up messages within the offer thread. The thread stores all messages as an embedded array within the `Offer` document.
- Sellers can Accept or Reject an offer at any point. Accepting sets the offer status to `accepted` and changes the listing status to `sold` automatically.
- Users can delete a conversation from their inbox without affecting the other party's view (implemented via a `deletedBy` field on the `Offer` document).
- An Inbox view aggregates all offer threads (as buyer and as seller) for the authenticated user.

### User Profiles and Wishlist
- Each user has a profile page displaying their active listings, bio, location, and seller rating.
- Public seller profiles are accessible by any visitor without login.
- Wishlist feature: authenticated users can save listings to a personal wishlist. The wishlist is stored as an array of `ObjectId` references on the `User` document.
- Users can edit their own profile including name, bio, location, phone, and avatar (uploaded to Cloudinary).

### Trust, Safety, and Moderation

**Verified Reviews:**
Reviews are fully gatekept. The backend cross-references the `Offer` collection before allowing a review to be submitted. A review can only be created if a verified `accepted` offer exists between the specific buyer and seller on the specific listing. The `Review` schema also enforces a unique compound index on `(buyerId, listingId)`, making it impossible to review the same transaction more than once.

**Block and Unblock:**
Users can block other users. The block is bidirectional: the blocked user's listings are hidden from the blocker's feed, and the blocker's listings are hidden from the blocked user. Communication via the offer system is prevented. The backend enforces this by filtering out blocked user IDs using a MongoDB `$nin` query on the `sellerId` field.

**Reporting:**
Users can file a report against a listing or another user. Reports are stored as `Report` documents and are intended as a foundation for a moderation workflow.

---

## Design Decisions and Assumptions

### UI and Visual Direction
**Decision:** The platform uses a stark, monochromatic design system with sharp borders, uppercase letter-spacing, and monospace fonts for numerical data (prices, metadata). There are no rounded cards or pastel palettes.

**Reasoning:** The target audience (luxury and archive resale) expects an aesthetic closer to a high-end editorial magazine or a fashion house's digital presence than a typical e-commerce app. Standard component library defaults would have produced a generic result. Every design token was defined manually.

### Offer-Based Chat Instead of Open Messaging
**Decision:** Buyers cannot send a free-form message to a seller. They must submit a structured offer with a price as the entry point to any conversation.

**Reasoning:** In second-hand marketplaces, a majority of initial buyer messages are unactionable ("Is this still available?", "Can you do lower?"). By requiring a price proposal upfront, the platform forces intent. Both parties immediately know the financial context of the negotiation without needing to dance around it. This also makes the entire conversation thread queryable and stateful — the system knows whether a deal was struck.

### Review Gatekeeping via Transaction Verification
**Decision:** The review system does not allow any user to leave any review on any seller. The backend enforces that an `accepted` offer must exist between the buyer and the seller for the specific listing before a review can be written.

**Reasoning:** Open review systems on peer-to-peer marketplaces are trivially abused. By tying reviews to verified transactions in the database, review integrity is enforced at the data layer rather than relying on UI-level friction or manual moderation.

### Client-Side Image Upload to Cloudinary
**Decision:** Images are uploaded directly from the browser to Cloudinary using an unsigned upload preset. The backend never handles binary file data.

**Reasoning:** Routing image uploads through the Node.js server would add latency, increase memory pressure, and require additional middleware (multer, etc.). Cloudinary's unsigned upload endpoint allows a secure, direct client-to-CDN pipeline. The only data the backend receives is the resulting URL string, which is appended to the listing's `imageUrls` array.

### Session Storage for Auth State
**Decision:** JWT tokens are stored in `sessionStorage` rather than `localStorage` or HTTP-only cookies.

**Reasoning:** `sessionStorage` is scoped to the browser tab, which provides a reasonable security boundary without the complexity of implementing server-side session management or cookie refresh logic. On sensitive pages (like the Inbox), an initial `GET /api/auth/me` call is made to re-hydrate the client's user object, ensuring that any server-side state changes (such as being blocked) are reflected immediately.

### Monorepo Structure
**Decision:** The frontend (`client/`) and backend (`server/`) live in a single GitHub repository.

**Reasoning:** For a project of this scope and a solo developer, a monorepo simplifies version control, code review, and deployment tracking. The `package.json` at the root exposes concurrently-powered `npm run dev` and `npm run build` scripts for running both applications simultaneously.

---

## Data Models

**User:** `name`, `email`, `passwordHash`, `bio`, `location`, `avatar`, `phone`, `wishlist[]`, `blockedUsers[]`, `blockedBy[]`

**Listing:** `title`, `description`, `brand`, `size`, `price`, `condition`, `category`, `imageUrls[]`, `status`, `location`, `negotiable`, `views`, `sellerId`

**Offer:** `listingId`, `buyerId`, `offerPrice`, `message`, `status`, `messages[]`, `deletedBy[]`, `blockedBy[]`

**Review:** `sellerId`, `buyerId`, `listingId`, `rating`, `comment` — unique index on `(buyerId, listingId)`

**Report:** `reporterId`, `targetId`, `targetType`, `reason`

---

## Local Setup

### Prerequisites
- Node.js v18 or higher
- A MongoDB Atlas cluster (free tier is sufficient)
- A Cloudinary account with an unsigned upload preset configured

### Repository Structure

```
vaultt/
  client/       # Next.js frontend
  server/       # Express.js backend
  package.json  # Root-level scripts for running both concurrently
```

### Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory with the following variables:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=<your_secure_random_string>
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

Start the development server:

```bash
npm run dev
```

The backend will be available at `http://localhost:5000`.

> **Note:** For the keyword search feature to work, you must create an Atlas Search index named `default` on your `listings` collection in MongoDB Atlas. The default configuration (with dynamic field mapping enabled) is sufficient.

### Frontend Setup

```bash
cd client
npm install
```

Create a `.env.local` file in the `client/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<your_unsigned_upload_preset_name>
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Running Both Simultaneously (from root)

```bash
npm run dev
```

This uses `concurrently` to start both the frontend and backend in a single terminal session.

---

## What Was Not Built

Due to the two-day time constraint, the following were scoped out:

- Real-time messaging via WebSockets (Socket.io). The current implementation uses a polling or refetch model on the inbox page.
- Email notifications for offer activity.
- An administrative moderation dashboard for processing reports.
- Full-text search across user profiles (search currently covers listings only).

---