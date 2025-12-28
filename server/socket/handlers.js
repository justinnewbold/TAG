/**
 * Socket handlers main entry point
 * Composes all feature-specific handlers
 */

import { setupGameHandlers } from './gameHandlers.js';
import { setupLocationHandlers } from './locationHandlers.js';
import { setupTagHandlers } from './tagHandlers.js';
import { setupConnectionHandlers } from './connectionHandlers.js';

/**
 * Setup all socket handlers for a connected client
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Connected socket
 * @param {GameManager} gameManager - Game manager instance
 */
export function setupSocketHandlers(io, socket, gameManager) {
  const user = socket.user;

  // Setup feature-specific handlers
  setupGameHandlers(io, socket, gameManager, user);
  setupLocationHandlers(io, socket, gameManager, user);
  setupTagHandlers(io, socket, gameManager, user);
  setupConnectionHandlers(io, socket, gameManager, user);
}
