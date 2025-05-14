// Configuration for the Andromeda Loans Dashboard
const CONFIG = {
  // API Base URL - Update this with your actual API endpoint
  API_URL: '/api',
  
  // API endpoints
  ENDPOINTS: {
    LEADS: '/leads',
    STATS: '/leads/stats'
  },
  
  // Default pagination settings
  PAGINATION: {
    ITEMS_PER_PAGE: 10
  },
  
  // Status color mappings for visual representation
  STATUS_CLASSES: {
    'pending': 'status-pending',
    'contacted': 'status-contacted',
    'converted': 'status-converted',
    'closed': 'status-closed'
  },
  
  // Status text display mapping
  STATUS_TEXT: {
    'pending': 'Pending',
    'contacted': 'Contacted',
    'converted': 'Converted',
    'closed': 'Closed'
  }
}; 