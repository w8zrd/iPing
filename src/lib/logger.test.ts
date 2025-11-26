import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';
import { toast } from '@/components/ui/use-toast';

// Mock the toast function
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.mocked(toast).mockClear(); // Clear mock calls
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log info messages', () => {
    logger.info('test info');
    expect(console.info).toHaveBeenCalled();
  });

  it('should log warning messages', () => {
    logger.warn('test warn');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    logger.error('test error');
    expect(console.error).toHaveBeenCalled();
  });

  it('should log debug messages', () => {
    logger.debug('test debug');
    expect(console.debug).toHaveBeenCalled();
  });

  it('should show toast for error logs when userMessage is provided', () => {
    logger.error('test error with toast', null, { userMessage: 'Error' });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      title: 'Error',
    }));
  });

  it('should show toast for warning logs when userMessage is provided', () => {
    logger.warn('test warn with toast', null, { userMessage: 'Warning' });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      title: 'Warning',
    }));
  });

  it('should not show toast for debug logs by default', () => {
    logger.debug('test debug no toast');
    expect(toast).not.toHaveBeenCalled();
  });

  it('should show toast when explicitly requested', () => {
    logger.info('test info with toast', null, { showToast: true, userMessage: 'Info Toast' });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Info Toast',
      description: 'test info with toast',
    }));
  });
});