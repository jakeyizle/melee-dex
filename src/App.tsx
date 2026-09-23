import { HashRouter as Router, Routes, Route } from "react-router-dom";

import Layout from "./Layout";
import { SettingsPage } from "./components/SettingsPage";
import { DashboardPage } from "./components/DashboardPage";
import { LibraryPage } from "./components/LibraryPage";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <Router>
      <Layout>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </ErrorBoundary>
      </Layout>
    </Router>
  );
}
