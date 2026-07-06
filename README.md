# Rwanda Trad — Traditional Attire E-Commerce Platform

![CI/CD](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/main.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-green)

A full-stack e-commerce web application for **Rwanda Trad**, a boutique selling authentic Rwandan traditional attire including Mushanana, Kitenge, Umutara, and ceremonial regalia. Built with Vanilla HTML/CSS/JS on the frontend, Node.js serverless functions on the backend, Supabase (PostgreSQL) as the database, and deployed on Vercel.

---

## Live URL

> [https://your-project.vercel.app](https://your-project.vercel.app)

---

## Architecture

```
Browser (HTML/CSS/JS)
        │
        ▼
  Vercel CDN (Static Frontend)
        │
        ▼
  Vercel Serverless Functions (/api/*)
        │
        ▼
  Supabase (PostgreSQL + Auth)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6) |
| Backend | Node.js, Vercel Serverless Functions |
| Database | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth (JWT + bcrypt) |
| Deployment | Vercel |
| CI/CD | GitHub Actions |
| Containerization | Docker + docker-compose |

---

## Features

- Responsive design — mobile, tablet, desktop
- Dynamic product listing with search, filtering, sorting, and pagination
- Product detail pages with image gallery
- Full shopping cart — add, update quantity, remove, auto-calculate totals
- Guest cart (session-based) and authenticated cart with merge on login
- Complete checkout flow with form validation
- Order confirmation page
- User registration and login (Supabase Auth)
- User profile with order history
- Admin dashboard — overview stats, manage orders, products, and customers
- VAT (18%) and shipping fee calculation
- JWT-protected API routes
- Role-based access control (customer / admin)

---

## Project Structure

```
├── api/                    # Vercel Serverless Functions
│   ├── _lib/               # Shared utilities (Supabase client, middleware, validators)
│   ├── auth/               # Register, Login, Me
│   ├── products/           # CRUD + search/filter
│   ├── categories/         # Category listing
│   ├── cart/               # Cart management
│   ├── orders/             # Order history
│   ├── checkout/           # Checkout processing
│   └── admin/              # Admin-only endpoints
├── src/
│   ├── css/main.css        # Global styles
│   ├── css/admin.css       # Admin dashboard styles
│   └── js/                 # Frontend modules (api, auth, cart, products, checkout, admin)
├── database/
│   ├── schema.sql          # Full PostgreSQL schema
│   └── seed.sql            # 16 products + 5 categories
├── images/                 # All product and UI images
├── tests/
│   ├── unit/               # Validator unit tests
│   └── integration/        # API handler tests
├── .github/workflows/      # CI/CD pipeline
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Local development
└── vercel.json             # Vercel routing configuration
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- Docker Desktop

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
# Edit .env and fill in your Supabase credentials
```

### 4. Set up Supabase database
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open **SQL Editor** → **New Query**
3. Paste and run `database/schema.sql`
4. Paste and run `database/seed.sql`

### 5. Run locally with Docker
```bash
docker compose up --build
```
Frontend available at: [http://localhost:8080](http://localhost:8080)

### 6. Run tests
```bash
npm test
```

---

## Deployment (Vercel)

### 1. Push to GitHub
```bash
git add .
git commit -m "feat: initial full-stack implementation"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Add the following **Environment Variables** in Vercel project settings:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_URL` (your Vercel URL)
3. Deploy

### 3. CI/CD — GitHub Actions Secrets
Add these secrets in GitHub → Settings → Secrets and Variables → Actions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_TOKEN` (from vercel.com → Account Settings → Tokens)

Every push to `main` automatically: installs → tests → builds Docker → deploys to Vercel.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Products
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List products (search, filter, sort, paginate) |
| GET | `/api/products/:id` | Get product by ID or slug |
| POST | `/api/products` | Create product (admin) |
| PUT | `/api/products/:id` | Update product (admin) |
| DELETE | `/api/products/:id` | Soft-delete product (admin) |

### Cart
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cart` | Get cart |
| POST | `/api/cart/items` | Add item |
| PUT | `/api/cart/items/:id` | Update quantity |
| DELETE | `/api/cart/items/:id` | Remove item |
| DELETE | `/api/cart` | Clear cart |

### Checkout & Orders
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/checkout` | Place order |
| GET | `/api/orders` | User order history |
| GET | `/api/orders/:id` | Single order by ID or order number |

### Admin (requires admin role)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/dashboard` | Stats overview |
| GET/PUT | `/api/admin/orders` | List / update order status |
| GET | `/api/admin/products` | All products |
| GET/PUT | `/api/admin/users` | List / toggle user status |

---

## Database Schema

See `database/schema.sql` for the full schema.

**Tables:** `categories`, `products`, `users`, `carts`, `cart_items`, `orders`, `order_items`, `transactions`

---

## Security

- Supabase Auth handles password hashing (bcrypt) and JWT issuance
- All protected routes verify JWT via `authMiddleware.js`
- Admin routes additionally verify role via `adminMiddleware.js`
- Row Level Security (RLS) enabled on all Supabase tables
- Input validation on every API endpoint
- XSS prevention via string sanitization
- HTTPS enforced automatically by Vercel
- Security headers set in `vercel.json` and `nginx.conf`
- `.env` is in `.gitignore` — secrets never committed

---

## Business: Rwanda Trad

- Location: KN 2 Ave, Kigali City Tower, Nyarugenge, Kigali, Rwanda
- Currency: Rwandan Franc (RWF)
- VAT: 18% (Rwanda standard)
- Shipping: 2,000 RWF (Kigali) / 5,000 RWF (other provinces)
- Contact: contact@rwandatrad.rw

---

## License

MIT © Rwanda Trad, 2024
