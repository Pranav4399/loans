import ngrok from 'ngrok';
import { spawn } from 'child_process';
import logger from '../config/logger';

async function startDevServer() {
  try {
    // Start the Express server
    const server = spawn('npm', ['run', 'dev'], { stdio: 'inherit' });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Start ngrok tunnel
    const url = await ngrok.connect({
      addr: process.env.PORT || 3000,
      region: 'us',
    });

    logger.info('Development server started');
    logger.info(`Local URL: http://localhost:${process.env.PORT || 3000}`);
    logger.info(`Webhook URL: ${url}/api/webhook`);
    logger.info('Use this webhook URL in your Twilio WhatsApp configuration');
    logger.info('Press Ctrl+C to stop the server');

    // Handle server shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down development server...');
      await ngrok.kill();
      server.kill();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start development server:', { error });
    process.exit(1);
  }
}

startDevServer(); 