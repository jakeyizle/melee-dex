import { HashRouter as Router, Routes, Route } from 'react-router-dom';

import Layout from './Layout';
import { LiveMatchDisplay } from './LiveMatchDisplay';
import { SettingsPage } from './Settings';
// import localforage from 'localforage';

// drop db for testing
// localforage.dropInstance({name: 'db'});
export default function App() {
  return (
    <Router>
      <Layout>
      <Routes>
        <Route path="/" element={<LiveMatchDisplay />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      </Layout>
    </Router>
  );
}
