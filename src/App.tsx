import { HashRouter as Router, Routes, Route } from "react-router-dom";

import Layout from "./Layout";
import { SettingsPage } from "./Settings";
import { DashboardPage } from "./DashboardPage";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
