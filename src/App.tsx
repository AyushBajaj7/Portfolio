
import { Scene } from './components/canvas/Scene';
import { Navbar } from './components/ui/Navbar';
import { SectionGroup } from './components/ui/SectionGroup';
import { Cursor } from './components/ui/Cursor';

function App() {
  return (
    <>
      <Cursor />
      <Navbar />
      <Scene />
      <SectionGroup />
    </>
  );
}

export default App;
