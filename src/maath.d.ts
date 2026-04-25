/**
 * Type declarations for maath library - Math utilities for Three.js.
 * Provides TypeScript support for the maath/random module used in 3D positioning.
 * @fileoverview Type definitions for maath random distribution functions
 */

declare module 'maath/random/dist/maath-random.esm' {
  /**
   * Distributes points uniformly within a sphere.
   * Used for 3D particle positioning and random point generation.
   * 
   * @param {Float32Array} buffer - Array to fill with position data (x,y,z triplets)
   * @param {Object} [options] - Configuration options
   * @param {number} [options.radius=1] - Sphere radius for point distribution
   * @returns {Float32Array} The filled buffer with sphere-distributed points
   */
  export function inSphere(buffer: Float32Array, options?: { radius: number }): Float32Array;
}
