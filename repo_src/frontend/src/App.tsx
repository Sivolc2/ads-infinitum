import Products from './pages/Products';
import './styles/App.css';
import './styles/Global.css';

function App() {
  return (
    <div className="app-layout">
      <nav className="top-nav">
        <div className="nav-brand">
          <h1>Ad Infinitum</h1>
          <p>AI-Powered Product Validation Platform</p>
        </div>
      </nav>
      <main className="main-content">
        <Products />
      </main>
    </div>
  );
}

export default App;
