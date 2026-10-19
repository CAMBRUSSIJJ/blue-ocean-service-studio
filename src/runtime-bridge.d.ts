import type { RuntimeRegistry } from './runtime/client';
declare global {
  interface Window {
    BlueOceanRuntime?: RuntimeRegistry;
    RealTalentRuntime?: RuntimeRegistry;
  }
}
export {};

// Collaboration foundation is exposed dynamically through BlueOceanRuntime.api('collaboration').
