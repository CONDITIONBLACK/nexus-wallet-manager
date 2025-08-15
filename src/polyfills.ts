import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer and process available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  window.process = process;
  window.global = window;
}

// Export for use in modules
export { Buffer, process };