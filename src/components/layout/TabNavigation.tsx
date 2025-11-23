import { DiagramTab } from '../../types';

interface TabNavigationProps {
  tabs: DiagramTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const TabNavigation = ({ tabs, activeTab, onTabChange }: TabNavigationProps) => {
  return (
    <nav style={{
      background: '#1a1a1a',
      borderBottom: '2px solid #333',
      padding: '1rem 2rem',
      display: 'flex',
      gap: '1rem',
      overflowX: 'auto',
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            background: activeTab === tab.id ? '#667eea' : '#2a2a2a',
            color: 'white',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            transform: activeTab === tab.id ? 'translateY(-2px)' : 'none',
            boxShadow: activeTab === tab.id ? '0 4px 8px rgba(102, 126, 234, 0.3)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.background = '#3a3a3a';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.background = '#2a2a2a';
            }
          }}
        >
          <div>{tab.name}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
            {tab.description}
          </div>
        </button>
      ))}
    </nav>
  );
};
