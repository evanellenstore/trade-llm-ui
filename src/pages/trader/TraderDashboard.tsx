import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../auth/AuthContext';
import './TraderDashboard.css';
import { runLive } from '../../services/marketService';

const TraderDashboard = () => {
  const auth = useContext(AuthContext);
  const { t } = useTranslation();
  const username = auth?.user?.username || 'Trader';
  const [liveRunId, setLiveRunId] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const menuItems = [
    {
      title: t('admin.products'),
      description: t('admin.products'),
      icon: '📦',
      link: '/trader/products',
      badge: 'View',
      color: 'primary'
    },
    {
      title: t('trader.inventory'),
      description: t('trader.inventory'),
      icon: '📊',
      link: '/trader/inventory',
      badge: 'Check',
      color: 'info'
    },
    {
      title: 'Strategy Config',
      description: 'Manage trading strategies',
      icon: '📈',
      link: '/trader/strategy-config',
      badge: 'Manage',
      color: 'secondary'
    },
    {
      title: 'Billing',
      description: 'Create invoices & payments',
      icon: '💳',
      link: '/trader/billing',
      badge: 'Create',
      color: 'success'
    },
    {
      title: 'Rewards',
      description: 'Customer loyalty & points',
      icon: '🎁',
      link: '/trader/rewards',
      badge: 'Rewards',
      color: 'warning'
    }
  ];

  return (
    <Container fluid className="trader-dashboard-container py-4">

      {/* Header */}
      <div className="header-section mb-4">
        <Row className="align-items-center">
          <Col>
            <Badge bg="dark" className="mb-2 px-3 py-2">
              {t('trader.store')}
            </Badge>
            <h2 className="header-title">
              {t('trader.welcome')}, <span>{username}</span>
            </h2>
            <p className="header-subtitle">
              {t('trader.title')}
            </p>
          </Col>

          <Col className="text-end d-none d-md-block">
            <p className="date-value">
              {new Date().toLocaleDateString('en-IN')}
            </p>
          </Col>
        </Row>
      </div>

      {/* Modules */}
      <div className="menu-section">
        <h5 className="section-title mb-3">Store Management</h5>

        {/* Live Run Trigger */}
        <div className="mb-3 d-flex align-items-center gap-3">
          <Button
            variant="danger"
            onClick={async () => {
              setLiveLoading(true);
              setLiveError(null);
              try {
                const res = await runLive();
                const runId = res?.data?.runId || null;
                setLiveRunId(runId);
              } catch (err: any) {
                setLiveError(err?.response?.data?.error || err.message || 'Unknown error');
                setLiveRunId(null);
              } finally {
                setLiveLoading(false);
              }
            }}
            disabled={liveLoading}
          >
            {liveLoading ? 'Starting...' : 'Trigger Live Run'}
          </Button>

          <div>
            {liveRunId && (
              <div className="text-success">Live run started: {liveRunId}</div>
            )}
            {liveError && (
              <div className="text-danger">Failed to start live run: {liveError}</div>
            )}
          </div>
        </div>

        <Row xs={1} md={2} lg={4} className="g-3">
          {menuItems.map((item, index) => (
            <Col key={index}>
              <Link to={item.link} className="text-decoration-none">
                <Card className="menu-card h-100">
                  <Card.Body className="p-3 d-flex flex-column">

                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="menu-icon">{item.icon}</span>
                      <Badge bg={item.color}>{item.badge}</Badge>
                    </div>

                    <Card.Title className="menu-title">
                      {item.title}
                    </Card.Title>

                    <Card.Text className="menu-description">
                      {item.description}
                    </Card.Text>

                    <Button variant="outline-dark" size="sm" className="mt-auto">
                      Open →
                    </Button>

                  </Card.Body>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </div>

      {/* Footer */}
      <Row className="footer-section mt-4">
        <Col md={12}>
          <div className="footer-content">
            <Row className="text-center">

              <Col md={4}>
                <div className="footer-item">
                  <div className="footer-icon">🏪</div>
                  <div className="footer-label">Store</div>
                  <div className="footer-value">AI Trading Platform</div>
                </div>
              </Col>

              <Col md={4}>
                <div className="footer-item">
                  <div className="footer-icon">👤</div>
                  <div className="footer-label">Account</div>
                  <div className="footer-value">{username}</div>
                </div>
              </Col>

              <Col md={4}>
                <div className="footer-item">
                  <div className="footer-icon">⏰</div>
                  <div className="footer-label">Last Activity</div>
                  <div className="footer-value">
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </Col>

            </Row>
          </div>
        </Col>
      </Row>

    </Container>
  );
};

export default TraderDashboard;
