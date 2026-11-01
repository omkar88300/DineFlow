# DineFlow – QR-Based Restaurant Ordering System

A digital restaurant management and ordering platform designed to simplify restaurant operations through QR-based menus, online ordering, and kitchen order management.

## Overview

DineFlow is a web-based restaurant management system that connects customers, waiters, kitchen staff, and administrators through a centralized platform.

Customers can access the digital menu, while restaurant staff can manage orders and track their progress.

## Key Features

- **QR-Based Menu:** Customers can scan a QR code to access the restaurant menu.
- **Digital Ordering:** Browse menu items and place orders digitally.
- **Admin Dashboard:** Manage restaurant operations and menu information.
- **Kitchen Management:** Track orders and update preparation status.
- **Waiter Management:** Manage customer orders and service operations.
- **Billing:** Access order and billing information.
- **Authentication:** Login and role-based application access.

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend framework |
| React.js | User interface |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Supabase | Backend and database |
| PostgreSQL | Relational database |
| Git & GitHub | Version control |

## Application Modules

- Customer Menu
- Admin Dashboard
- Kitchen Dashboard
- Waiter Dashboard
- Staff Management
- Table Management
- Billing
- Authentication

## Project Structure

```text
DineFlow/
├── app/
│   ├── admin/
│   ├── api/
│   ├── auth/
│   ├── billing/
│   ├── dashboard/
│   ├── kitchen/
│   ├── login/
│   ├── menu/
│   ├── reset-password/
│   ├── staff/
│   ├── tables/
│   └── waiter/
├── public/
├── utils/
│   └── supabase/
├── middleware.ts
├── package.json
└── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/omkar88300/DineFlow.git
```

### 2. Navigate to the project

```bash
cd DineFlow
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env.local` file in the project root and add your Supabase project credentials.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Check the variable names used in `utils/supabase/client.ts` and configure any additional server-side variables required by the project.

**Never upload `.env.local` or private service-role keys to GitHub.**

### 5. Start the development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Production Build

```bash
npm run build
npm run start
```

## Future Improvements

- Online payment gateway integration
- Sales and revenue analytics
- Real-time order notifications
- Improved restaurant reporting
- Cloud deployment

## Author

**Omkar Bhisade**

AI & Data Science Engineering Graduate

GitHub: [omkar88300](https://github.com/omkar88300)

---

*DineFlow – Making restaurant ordering and management simpler through technology.*
