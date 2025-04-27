# Balan - WhatsApp Loan Application Bot

A WhatsApp-based chatbot that helps users apply for loans through a conversational interface. Built with Node.js, TypeScript, and Twilio.

## Features

- Conversational loan application process
- Step-by-step form completion
- Input validation
- Progress tracking
- WhatsApp integration via Twilio
- Data persistence with Supabase

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Twilio account with WhatsApp capability
- Supabase account and project

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/balan.git
cd balan
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template:
```bash
cp src/config/env.example .env
```

4. Configure environment variables in `.env`:
- Set your Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`)
- Set your Supabase credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- Configure the webhook URL for production
- Adjust other settings as needed

5. Build the project:
```bash
npm run build
```

6. Start the server:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment (development/production) | production |
| SUPABASE_URL | Supabase project URL | https://xxx.supabase.co |
| SUPABASE_ANON_KEY | Supabase anonymous key | your-key |
| TWILIO_ACCOUNT_SID | Twilio account SID | ACxxxxxxxx |
| TWILIO_AUTH_TOKEN | Twilio auth token | your-token |
| TWILIO_PHONE_NUMBER | Twilio WhatsApp number | +1234567890 |
| WEBHOOK_URL | Production webhook URL | https://your-domain.com/api/webhook |

## Project Structure

```
src/
├── config/         # Configuration files
├── services/       # Core business logic
│   ├── chatbot.ts    # Chatbot message handling
│   └── conversation.ts # Conversation state management
├── types/         # TypeScript type definitions
└── index.ts      # Application entry point
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 