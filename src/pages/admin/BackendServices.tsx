import React, { useMemo, useState } from 'react';
import { Badge, Button, Card, Form, Modal, Table } from 'react-bootstrap';
import './BackendServices.css';

interface BackendService {
  id: number;
  name: string;
  category: string;
  endpoint: string;
  environment: string;
  status: 'Active' | 'Maintenance' | 'Offline';
  owner: string;
  description: string;
  lastUpdated: string;
}

const initialServices: BackendService[] = [
  {
    id: 1,
    name: 'Trade User Service',
    category: 'Core API',
    endpoint: 'https://api.trade.local/user',
    environment: 'Production',
    status: 'Active',
    owner: 'Admin Team',
    description: 'Handles user onboarding, auth and profile updates.',
    lastUpdated: '2 mins ago',
  },
  {
    id: 2,
    name: 'Trade Market Service',
    category: 'Market Data',
    endpoint: 'https://api.trade.local/market',
    environment: 'Staging',
    status: 'Maintenance',
    owner: 'Operations',
    description: 'Serves live market feeds and pricing snapshots.',
    lastUpdated: '15 mins ago',
  },
  {
    id: 3,
    name: 'Trade Broker Service',
    category: 'Execution',
    endpoint: 'https://api.trade.local/broker',
    environment: 'Development',
    status: 'Offline',
    owner: 'Integration',
    description: 'Routes trade execution requests to connected brokers.',
    lastUpdated: '1 hour ago',
  },
];

const emptyForm = {
  name: '',
  category: '',
  endpoint: '',
  environment: 'Production',
  status: 'Active' as BackendService['status'],
  owner: '',
  description: '',
};

const BackendServices: React.FC = () => {
  const [services, setServices] = useState<BackendService[]>(initialServices);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<BackendService | null>(null);
  const [form, setForm] = useState(emptyForm);

  const stats = useMemo(() => {
    const active = services.filter((s) => s.status === 'Active').length;
    const maintenance = services.filter((s) => s.status === 'Maintenance').length;
    const offline = services.filter((s) => s.status === 'Offline').length;

    return { total: services.length, active, maintenance, offline };
  }, [services]);

  const openCreate = () => {
    setEditingService(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (service: BackendService) => {
    setEditingService(service);
    setForm({
      name: service.name,
      category: service.category,
      endpoint: service.endpoint,
      environment: service.environment,
      status: service.status,
      owner: service.owner,
      description: service.description,
    });
    setShowModal(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name || !form.endpoint || !form.owner) {
      return;
    }

    if (editingService) {
      setServices((current) =>
        current.map((service) =>
          service.id === editingService.id
            ? {
                ...service,
                ...form,
                lastUpdated: 'just now',
              }
            : service,
        ),
      );
    } else {
      const newService: BackendService = {
        id: Date.now(),
        ...form,
        lastUpdated: 'just now',
      };
      setServices((current) => [newService, ...current]);
    }

    setShowModal(false);
    setEditingService(null);
    setForm(emptyForm);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('Delete this backend service from the admin list?')) {
      return;
    }

    setServices((current) => current.filter((service) => service.id !== id));
  };

  return (
    <div className="admin-services-page">
      <div className="admin-services-shell">
        <div className="services-hero-card">
          <div>
            <p className="section-eyebrow">Admin control center</p>
            <h2>Backend services</h2>
            <p className="section-copy">
              Monitor and manage the trading platform services from a single, secure view.
            </p>
          </div>
          <Button className="services-create-btn" onClick={openCreate}>
            + Create service
          </Button>
        </div>

        <div className="services-metrics-grid">
          <Card className="metric-card">
            <p>Total services</p>
            <h3>{stats.total}</h3>
          </Card>
          <Card className="metric-card">
            <p>Active</p>
            <h3>{stats.active}</h3>
          </Card>
          <Card className="metric-card">
            <p>Maintenance</p>
            <h3>{stats.maintenance}</h3>
          </Card>
          <Card className="metric-card">
            <p>Offline</p>
            <h3>{stats.offline}</h3>
          </Card>
        </div>

        <Card className="services-table-card">
          <Card.Body>
            <div className="table-header">
              <div>
                <h4>Service registry</h4>
                <p className="table-subtext">Create, edit and review service health in one place.</p>
              </div>
            </div>

            <Table responsive hover className="services-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Environment</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <div className="service-name-cell">
                        <strong>{service.name}</strong>
                        <span>{service.endpoint}</span>
                      </div>
                    </td>
                    <td>{service.category}</td>
                    <td>{service.environment}</td>
                    <td>
                      <Badge bg={service.status === 'Active' ? 'success' : service.status === 'Maintenance' ? 'warning' : 'danger'}>
                        {service.status}
                      </Badge>
                    </td>
                    <td>{service.owner}</td>
                    <td>{service.lastUpdated}</td>
                    <td>
                      <div className="actions-cell">
                        <Button variant="outline-primary" size="sm" onClick={() => openEdit(service)}>
                          Edit
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(service.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingService ? 'Update service' : 'Create service'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Service name</Form.Label>
              <Form.Control
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Trade Auth Service"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Control
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="Core API"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Endpoint</Form.Label>
              <Form.Control
                value={form.endpoint}
                onChange={(event) => setForm((current) => ({ ...current, endpoint: event.target.value }))}
                placeholder="https://api.trade.local/service"
                required
              />
            </Form.Group>

            <div className="row g-3">
              <Form.Group className="col-md-6">
                <Form.Label>Environment</Form.Label>
                <Form.Select
                  value={form.environment}
                  onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value }))}
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Development">Development</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="col-md-6">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as BackendService['status'] }))}
                >
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Offline">Offline</option>
                </Form.Select>
              </Form.Group>
            </div>

            <Form.Group className="mb-3 mt-3">
              <Form.Label>Owner</Form.Label>
              <Form.Control
                value={form.owner}
                onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))}
                placeholder="Operations / Engineering"
                required
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short description of the service"
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingService ? 'Update service' : 'Create service'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default BackendServices;
