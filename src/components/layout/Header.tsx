export const Header = () => {
  return (
    <header style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '2rem',
      textAlign: 'center',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    }}>
      <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>
        GUIDER Architecture
      </h1>
      <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', opacity: 0.9 }}>
        Distributed Microservices for Weather Data Collection & Forecasting
      </p>
      <div style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
        <span style={{ margin: '0 1rem' }}>🐹 Go 1.23+</span>
        <span style={{ margin: '0 1rem' }}>🐰 RabbitMQ 4.0</span>
        <span style={{ margin: '0 1rem' }}>🐘 PostgreSQL 17 + PostGIS</span>
        <span style={{ margin: '0 1rem' }}>☸️ Kubernetes</span>
      </div>
    </header>
  );
};
