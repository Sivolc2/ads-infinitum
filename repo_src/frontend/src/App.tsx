import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Experiments from './pages/Experiments';
import AdVariants from './pages/AdVariants';
import LandingPages from './pages/LandingPages';
import Leads from './pages/Leads';
import BuildContracts from './pages/BuildContracts';
import './styles/App.css';
import './styles/Global.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/ads" element={<AdVariants />} />
          <Route path="/landing-pages" element={<LandingPages />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/builds" element={<BuildContracts />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
