# Balan - Loan Management System

A comprehensive loan management system with WhatsApp integration for loan applications and referrals.

## Features

- WhatsApp chatbot for direct loan applications
- WhatsApp chatbot for referral-based applications
- Admin dashboard for application management
- Real-time updates and notifications
- Secure document management
- Analytics and reporting

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Supabase account
- WhatsApp Business API access

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd balan
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development server:
```bash
npm run dev
```

## Project Structure

```
balan/
├── src/
│   ├── api/     # Backend API
│   ├── bot/     # WhatsApp bot logic
│   └── web/     # Frontend dashboard
├── config/      # Configuration files
└── tests/       # Test files
```

## Development

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run test`: Run tests
- `npm run lint`: Lint code
- `npm run format`: Format code

## License

ISC 