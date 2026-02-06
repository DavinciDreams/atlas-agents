import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from './events';
import type { STTEvents } from './events';

describe('createEventBus', () => {
  it('should emit and receive events', () => {
    const bus = createEventBus<STTEvents>();
    const handler = vi.fn();

    bus.on('stt:final-transcript', handler);
    bus.emit('stt:final-transcript', { text: 'hello', confidence: 0.95 });

    expect(handler).toHaveBeenCalledWith({ text: 'hello', confidence: 0.95 });
  });

  it('should support unsubscribe via returned function', () => {
    const bus = createEventBus<STTEvents>();
    const handler = vi.fn();

    const unsubscribe = bus.on('stt:started', handler);
    bus.emit('stt:started', {});
    expect(handler).toHaveBeenCalledTimes(1);

    unsubscribe();
    bus.emit('stt:started', {});
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support once listeners', () => {
    const bus = createEventBus<STTEvents>();
    const handler = vi.fn();

    bus.once('stt:stopped', handler);
    bus.emit('stt:stopped', {});
    bus.emit('stt:stopped', {});

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support removeAllListeners', () => {
    const bus = createEventBus<STTEvents>();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('stt:started', handler1);
    bus.on('stt:stopped', handler2);
    bus.removeAllListeners();

    bus.emit('stt:started', {});
    bus.emit('stt:stopped', {});

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should not throw when emitting with no listeners', () => {
    const bus = createEventBus<STTEvents>();
    expect(() => bus.emit('stt:started', {})).not.toThrow();
  });

  it('should catch errors in handlers without breaking other handlers', () => {
    const bus = createEventBus<STTEvents>();
    const errorHandler = vi.fn(() => { throw new Error('test'); });
    const goodHandler = vi.fn();

    bus.on('stt:started', errorHandler);
    bus.on('stt:started', goodHandler);

    bus.emit('stt:started', {});

    expect(errorHandler).toHaveBeenCalled();
    expect(goodHandler).toHaveBeenCalled();
  });
});
