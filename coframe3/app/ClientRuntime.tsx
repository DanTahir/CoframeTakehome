'use client';

/**
 * Mounts the ported inline-script behaviours once the markup is in the DOM.
 *
 * The page itself is a server component so the HTML ships fully rendered (as
 * Webflow's static export does); this component contributes no markup and
 * exists purely to own the runtime's lifecycle.
 *
 * `useEffect` runs after paint, which is the React equivalent of the original
 * scripts' `DOMContentLoaded`. `reactStrictMode` double-invokes effects in
 * development, so every initializer returns a teardown and this cleanly
 * unwinds between the two passes.
 */

import { useEffect } from 'react';
import { startRuntime } from './lib/runtime';

export default function ClientRuntime() {
  useEffect(() => startRuntime(), []);
  return null;
}
