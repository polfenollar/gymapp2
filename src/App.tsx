import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Splash from './views/Splash';
import Dashboard from './views/Dashboard';
import ConfigFlow from './views/ConfigFlow';
import ActiveWorkout from './views/ActiveWorkout';
import History from './views/History';
import BottomNav from './components/BottomNav';
import { populateInitialExercises } from './services/db';

function App() {
  useEffect(() => {
    populateInitialExercises();
  }, []);

  return (
    <BrowserRouter basename="/gymapp2">
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/config" element={<ConfigFlow />} />
          <Route path="/workout" element={<ActiveWorkout />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
