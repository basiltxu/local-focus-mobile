import { EventEmitter } from 'events';

// This is a simple event emitter that we can use to decouple error producers from consumers.
export const errorEmitter = new EventEmitter();
