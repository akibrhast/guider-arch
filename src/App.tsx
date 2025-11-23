import { useState } from 'react';
import { Header } from './components/layout/Header';
import { TabNavigation } from './components/layout/TabNavigation';
import { SystemOverview } from './components/diagrams/SystemOverview';
import { MessageFlow } from './components/diagrams/MessageFlow';
import { CorrelationFlow } from './components/diagrams/CorrelationFlow';
import { KubernetesInfra } from './components/diagrams/KubernetesInfra';
import { DIAGRAM_TABS } from './types';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderDiagram = () => {
    switch (activeTab) {
      case 'overview':
        return <SystemOverview />;
      case 'message-flow':
        return <MessageFlow />;
      case 'correlation':
        return <CorrelationFlow />;
      case 'kubernetes':
        return <KubernetesInfra />;
      default:
        return <SystemOverview />;
    }
  };

  return (
    <div className="app">
      <Header />
      <TabNavigation
        tabs={DIAGRAM_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <main className="diagram-container">
        <div className="diagram-info">
          <h2>{DIAGRAM_TABS.find(t => t.id === activeTab)?.name}</h2>
          <p>{DIAGRAM_TABS.find(t => t.id === activeTab)?.description}</p>
        </div>
        {renderDiagram()}
      </main>
      <footer className="footer">
        <p>
          GUIDER - Distributed Microservices for Weather Data |
          <a href="https://github.com/excet" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '0.5rem' }}>
            © 2025 EXCET, Inc.
          </a>
        </p>
        <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem' }}>
          Use controls to zoom, pan, and explore the architecture diagrams
        </p>
      </footer>
    </div>
  );
}

export default App;
