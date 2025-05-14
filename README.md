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

## API Documentation

The application provides a REST API for accessing lead information. All API endpoints are protected with API key authentication.

### Authentication

All API requests require an API key to be passed in the `X-API-Key` header:

```
X-API-Key: your-api-key-here
```

The API key can be set in the `.env` file with the `API_KEY` environment variable.

### Endpoints

#### Get all leads

```http
GET /api/leads
```

Query parameters:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of results per page (default: 10)
- `status` (optional): Filter by status ('pending', 'contacted', 'converted', 'closed')
- `category` (optional): Filter by category ('Loans', 'Insurance', 'Mutual Funds')

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "full_name": "John Smith",
      "contact_number": "+919876543210",
      "category": "Loans",
      "subcategory": "Personal Loan",
      "created_at": "2023-06-15T10:30:00Z",
      "status": "pending"
    },
    // More lead objects...
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

#### Get lead by ID

```http
GET /api/leads/:id
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "full_name": "John Smith",
    "contact_number": "+919876543210",
    "category": "Loans",
    "subcategory": "Personal Loan",
    "created_at": "2023-06-15T10:30:00Z",
    "status": "pending"
  }
}
```

### Error Responses

#### Authentication Error (401 Unauthorized)

```json
{
  "success": false,
  "message": "Unauthorized: Invalid API key"
}
```

#### Not Found Error (404 Not Found)

```json
{
  "success": false,
  "message": "Lead not found"
}
```

#### Server Error (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Failed to fetch leads",
  "error": "Error details here"
}
```

## Frontend Integration Example

```javascript
// Example React code to fetch leads with API key
const fetchLeads = async (page = 1) => {
  try {
    const response = await fetch(`https://your-api-domain.com/api/leads?page=${page}`, {
      headers: {
        'X-API-Key': 'your-api-key-here'
      }
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw error;
  }
};