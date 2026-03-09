import {
  MemoryRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import AppLayout from './components/AppLayout';
import CoursesPage from './pages/CoursesPage';
import SubSubjectContentPage from './pages/SubSubjectContentPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/courses" replace />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route
            path="/courses/:id/content"
            element={<SubSubjectContentPage />}
          />
          <Route
            path="/courses/:id/content/:mainIdx/:subIdx"
            element={<SubSubjectContentPage />}
          />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
