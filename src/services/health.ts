/**
 * Get application health status
 * @returns Health check information
 */
export function getHealthStatus() {
  try {
    const healthInfo = {
      uptime: process.uptime(),
      message: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: true  // We could add actual DB health check here
      }
    };
    
    return healthInfo;
  } catch (error) {
    throw error;
  }
} 