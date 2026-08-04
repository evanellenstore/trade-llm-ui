import { Row, Col, Card, Button } from 'react-bootstrap';
import { useContext } from 'react';
import { AuthContext } from '../../auth/AuthContext';
import './AdminDashboard.css';
import './AdminPageShell.css';

const AdminDashboard = () => {
  const auth = useContext(AuthContext);
  const username = auth?.user?.username || 'Admin';

  const stats = [
    { label: 'Total Tenants', value: '12', icon: '🏢', gradient: 'gradient-blue' },
    { label: 'Total Users', value: '85', icon: '👥', gradient: 'gradient-green' },
    { label: 'Total Documents', value: '1,540', icon: '📄', gradient: 'gradient-purple' },
    { label: 'EDI Jobs', value: '5,245', icon: '🔄', gradient: 'gradient-orange' },
    { label: 'Indexed Docs', value: '950', icon: '✓', gradient: 'gradient-teal' },
    { label: 'Failed Jobs', value: '5', icon: '❌', gradient: 'gradient-red' },
    { label: 'Storage Used', value: '42 GB', icon: '💾', gradient: 'gradient-pink' },
    { label: 'Active Users', value: '18', icon: '🟢', gradient: 'gradient-cyan' },
  ];

  const chartData = [
    { title: 'Documents Uploaded', value: '1,540', trend: '+12%' },
    { title: 'EDI Processed', value: '5,245', trend: '+8%' },
    { title: 'Success Rate', value: '99.8%', trend: '+0.2%' },
    { title: 'Storage Usage', value: '42 GB', trend: '+5%' },
  ];

  return (
    <div className="admin-page-shell">
      <div className="admin-page-hero">
        <div>
          <p className="section-eyebrow">Trading operations</p>
          <h2>Admin dashboard</h2>
          <p>Welcome back, <strong>{username}</strong>. Your platform health is tracking normally.</p>
        </div>
        <Button className="admin-page-hero-button">+ Quick action</Button>
      </div>

      <div className="admin-page-metrics">
        {stats.map((stat) => (
          <Card key={stat.label} className={`admin-page-metric-card ${stat.gradient}`}>
            <div className="metric-label">{stat.label}</div>
            <div className="metric-value">{stat.value}</div>
          </Card>
        ))}
      </div>

      <Row className="g-3">
        <Col md={8}>
          <Card className="admin-page-card h-100">
            <Card.Body>
              <h5 className="section-title mb-3">📊 Performance overview</h5>
              <Row className="g-3">
                {chartData.map((chart) => (
                  <Col key={chart.title} md={6}>
                    <div className="p-3 rounded-4" style={{ background: '#f8fafc' }}>
                      <div className="mb-2 text-muted">{chart.title}</div>
                      <div className="fs-4 fw-bold mb-2">{chart.value}</div>
                      <div style={{ color: '#16a34a', fontSize: '0.9rem' }}>{chart.trend} from last month</div>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="admin-page-card h-100">
            <Card.Body>
              <h5 className="section-title mb-3">🚀 Quick actions</h5>
              <div className="d-flex flex-column gap-2">
                <Button variant="outline-primary">+ Create Tenant</Button>
                <Button variant="outline-primary">+ Add User</Button>
                <Button variant="outline-primary">📤 Upload Document</Button>
                <Button variant="outline-primary">🔄 Transform EDI</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;