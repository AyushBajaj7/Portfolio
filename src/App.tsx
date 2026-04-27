/**
 * @fileoverview Root application component.
 * Assembles the main layout: PageLoader, Cursor, Navbar, Scene (canvas), and content Sections.
 * @author Ayush Bajaj
 */

import { Scene } from './components/canvas/Scene';
import { Navbar } from './components/ui/Navbar';
import { SectionGroup } from './components/ui/SectionGroup';
import { Cursor } from './components/ui/Cursor';
import { PageLoader } from './components/ui/PageLoader';

/**
 * Main application component that orchestrates all major UI components.
 * @returns {React.ReactElement} The application root
 */
function App() {
  return (
    <>
      <PageLoader />
      <Cursor />
      <Navbar />
      <Scene />
      <SectionGroup />
    </>
  );
}

export default App;
