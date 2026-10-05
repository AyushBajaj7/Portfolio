/**
 * @fileoverview Root application component.
 * Assembles the main layout: PageLoader, Cursor, Navbar, Scene (canvas), and content Sections.
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
      <Cursor />
      <Navbar />
      <Scene />
      <SectionGroup />
    </MotionConfig>
  );
}

export default App;
