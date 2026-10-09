/**
 * @fileoverview Root application component.
 * Assembles navigation, scroll-driven canvas, and the original portfolio sections.
 * @author Ayush Bajaj
 */

import { Scene } from './components/canvas/Scene';
import { Navbar } from './components/ui/Navbar';
import { SectionGroup } from './components/ui/SectionGroup';
import { Cursor } from './components/ui/Cursor';
import { MotionConfig } from 'framer-motion';

/**
 * Main application component that orchestrates all major UI components.
 * @returns {React.ReactElement} The application root
 */
function App() {
  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Cursor />
      <Navbar />
      <Scene />
      <SectionGroup />
    </MotionConfig>
  );
}

export default App;
