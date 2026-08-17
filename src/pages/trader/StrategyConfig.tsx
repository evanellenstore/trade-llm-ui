import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Form,
  InputGroup,
  Modal,
  Alert,
  Table,
  Spinner,
  ToggleButton,
  ToggleButtonGroup
} from "react-bootstrap";
import TraderHeader from "../../components/TraderHeader";
import strategyService, { StrategyConfig, StrategyConfigRequest } from "../../services/strategyService";
import "./StrategyConfig.css";

/* =======================
   Interfaces
======================= */

interface StrategyFormData {
  strategyName: string;
  timeframe: string;
  priority: number;
  enabled: boolean;
}

/* =======================
   Component
======================= */

const StrategyConfigPage: React.FC = () => {
  const [strategies, setStrategies] = useState<StrategyConfig[]>([]);
  const [filteredStrategies, setFilteredStrategies] = useState<StrategyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyConfig | null>(null);
  const [formData, setFormData] = useState<StrategyFormData>({
    strategyName: "",
    timeframe: "1H",
    priority: 1,
    enabled: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "priority" | "status">("priority");
  const [filterEnabled, setFilterEnabled] = useState<"all" | "enabled" | "disabled">("all");

  /* =======================
     Load Strategies
  ======================= */

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await strategyService.getAllStrategies();
      setStrategies(data);
    } catch (err) {
      setError("Failed to load strategies. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     Filter & Sort Logic
  ======================= */

  useEffect(() => {
    let filtered = strategies.filter(strategy => {
      const matchesSearch = strategy.strategyName.toLowerCase().includes(search.toLowerCase()) ||
                           strategy.timeframe.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterEnabled === "all" ||
                           (filterEnabled === "enabled" && strategy.enabled) ||
                           (filterEnabled === "disabled" && !strategy.enabled);
      return matchesSearch && matchesFilter;
    });

    // Sort
    if (sortBy === "priority") {
      filtered.sort((a, b) => b.priority - a.priority);
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.strategyName.localeCompare(b.strategyName));
    } else if (sortBy === "status") {
      filtered.sort((a, b) => (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0));
    }

    setFilteredStrategies(filtered);
  }, [search, strategies, sortBy, filterEnabled]);

  /* =======================
     Modal Operations
  ======================= */

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedStrategy(null);
    setFormData({
      strategyName: "",
      timeframe: "1H",
      priority: 1,
      enabled: false
    });
    setShowModal(true);
  };

  const openEditModal = (strategy: StrategyConfig) => {
    setModalMode("edit");
    setSelectedStrategy(strategy);
    setFormData({
      strategyName: strategy.strategyName,
      timeframe: strategy.timeframe,
      priority: strategy.priority,
      enabled: strategy.enabled
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      strategyName: "",
      timeframe: "1H",
      priority: 1,
      enabled: false
    });
  };

  /* =======================
     Form Handlers
  ======================= */

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.currentTarget;
    if (type === "checkbox") {
      setFormData(prev => ({
        ...prev,
        [name]: (e.currentTarget as HTMLInputElement).checked
      }));
    } else if (type === "number") {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.strategyName.trim()) {
      setError("Strategy name is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (modalMode === "create") {
        await strategyService.createStrategy(formData as StrategyConfigRequest);
      } else if (selectedStrategy) {
        await strategyService.updateStrategy(selectedStrategy.strategyName, formData);
      }

      await loadStrategies();
      closeModal();
    } catch (err) {
      setError("Failed to save strategy configuration");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================
     Strategy Actions
  ======================= */

  const handleToggleStrategy = async (strategy: StrategyConfig) => {
    try {
      if (strategy.enabled) {
        await strategyService.disableStrategy(strategy.strategyName);
      } else {
        await strategyService.enableStrategy(strategy.strategyName);
      }
      await loadStrategies();
    } catch (err) {
      setError(`Failed to toggle strategy: ${strategy.strategyName}`);
      console.error(err);
    }
  };

  const handleDeleteStrategy = async (strategyName: string) => {
    if (window.confirm(`Are you sure you want to delete ${strategyName}?`)) {
      try {
        await strategyService.deleteStrategy(strategyName);
        await loadStrategies();
      } catch (err) {
        setError(`Failed to delete strategy: ${strategyName}`);
        console.error(err);
      }
    }
  };

  /* =======================
     Render
  ======================= */

  return (
    <>
      <TraderHeader />
      <Container fluid className="strategy-config-container">
        {/* Header Section */}
        <div className="strategy-header mb-4">
          <Row className="align-items-center">
            <Col>
              <h1 className="strategy-title">📊 Strategy Configuration</h1>
              <p className="strategy-subtitle">Manage and configure your trading strategies</p>
            </Col>
            <Col xs="auto">
              <Button 
                variant="success" 
                size="lg" 
                onClick={openCreateModal}
                className="create-strategy-btn"
              >
                + Add Strategy
              </Button>
            </Col>
          </Row>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Controls Section */}
        <Card className="controls-card mb-4">
          <Card.Body>
            <Row className="g-3">
              {/* Search */}
              <Col md={6}>
                <InputGroup>
                  <InputGroup.Text>🔍</InputGroup.Text>
                  <Form.Control
                    placeholder="Search by strategy name or timeframe..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </InputGroup>
              </Col>

              {/* Filter by Status */}
              <Col md={3}>
                <Form.Select
                  value={filterEnabled}
                  onChange={(e) => setFilterEnabled(e.target.value as "all" | "enabled" | "disabled")}
                  className="filter-select"
                >
                  <option value="all">All Strategies</option>
                  <option value="enabled">Enabled Only</option>
                  <option value="disabled">Disabled Only</option>
                </Form.Select>
              </Col>

              {/* Sort By */}
              <Col md={3}>
                <Form.Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "name" | "priority" | "status")}
                  className="sort-select"
                >
                  <option value="priority">Sort by Priority</option>
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                </Form.Select>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" className="loading-spinner">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3 text-muted">Loading strategies...</p>
          </div>
        )}

        {/* Strategies Table */}
        {!loading && filteredStrategies.length > 0 && (
          <Card className="strategies-card">
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0 strategies-table">
                  <thead className="table-header">
                    <tr>
                      <th>Strategy Name</th>
                      <th>Status</th>
                      <th>Timeframe</th>
                      <th>Priority</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStrategies.map((strategy) => (
                      <tr key={strategy.strategyName} className="strategy-row">
                        <td className="strategy-name-cell">
                          <strong>{strategy.strategyName}</strong>
                        </td>
                        <td>
                          <Badge
                            bg={strategy.enabled ? "success" : "secondary"}
                            className="status-badge"
                          >
                            {strategy.enabled ? "✓ Active" : "✗ Inactive"}
                          </Badge>
                        </td>
                        <td>
                          <span className="timeframe-badge">{strategy.timeframe}</span>
                        </td>
                        <td>
                          <div className="priority-display">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={`priority-star ${i < strategy.priority ? "filled" : ""}`}
                              >
                                ★
                              </span>
                            ))}
                            <span className="priority-value">({strategy.priority}/5)</span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <Button
                              variant={strategy.enabled ? "warning" : "success"}
                              size="sm"
                              onClick={() => handleToggleStrategy(strategy)}
                              title={strategy.enabled ? "Disable" : "Enable"}
                              className="action-btn toggle-btn"
                            >
                              {strategy.enabled ? "⊘ Disable" : "✓ Enable"}
                            </Button>
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() => openEditModal(strategy)}
                              title="Edit"
                              className="action-btn edit-btn"
                            >
                              ✏ Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteStrategy(strategy.strategyName)}
                              title="Delete"
                              className="action-btn delete-btn"
                            >
                              🗑 Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Empty State */}
        {!loading && filteredStrategies.length === 0 && (
          <Card className="empty-state-card">
            <Card.Body className="text-center py-5">
              <div className="empty-icon">📭</div>
              <h4>No Strategies Found</h4>
              <p className="text-muted">
                {search || filterEnabled !== "all"
                  ? "Try adjusting your search filters"
                  : "Get started by creating your first strategy"}
              </p>
              {!search && filterEnabled === "all" && (
                <Button
                  variant="primary"
                  onClick={openCreateModal}
                  className="mt-3"
                >
                  + Create First Strategy
                </Button>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Stats Footer */}
        <div className="stats-footer mt-4">
          <Row>
            <Col md={3}>
              <div className="stat-box">
                <div className="stat-label">Total Strategies</div>
                <div className="stat-value">{strategies.length}</div>
              </div>
            </Col>
            <Col md={3}>
              <div className="stat-box">
                <div className="stat-label">Active Strategies</div>
                <div className="stat-value text-success">
                  {strategies.filter(s => s.enabled).length}
                </div>
              </div>
            </Col>
            <Col md={3}>
              <div className="stat-box">
                <div className="stat-label">Inactive Strategies</div>
                <div className="stat-value text-secondary">
                  {strategies.filter(s => !s.enabled).length}
                </div>
              </div>
            </Col>
            <Col md={3}>
              <div className="stat-box">
                <div className="stat-label">Avg Priority</div>
                <div className="stat-value text-info">
                  {strategies.length > 0
                    ? (strategies.reduce((sum, s) => sum + s.priority, 0) / strategies.length).toFixed(1)
                    : 0}
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </Container>

      {/* Modal for Create/Edit */}
      <Modal show={showModal} onHide={closeModal} size="lg" className="strategy-modal">
        <Modal.Header closeButton className="modal-header-custom">
          <Modal.Title>
            {modalMode === "create" ? "➕ Create New Strategy" : "✏ Edit Strategy"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="modal-body-custom">
          <Form onSubmit={handleSubmit}>
            {/* Strategy Name */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">
                <strong>Strategy Name</strong>
              </Form.Label>
              <Form.Control
                type="text"
                name="strategyName"
                value={formData.strategyName}
                onChange={handleInputChange}
                placeholder="e.g., ADX Strategy, MACD Strategy"
                disabled={modalMode === "edit"}
                className="form-control-custom"
              />
              <Form.Text className="text-muted d-block mt-1">
                Unique identifier for this strategy
              </Form.Text>
            </Form.Group>

            {/* Timeframe */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">
                <strong>Timeframe</strong>
              </Form.Label>
              <Form.Select
                name="timeframe"
                value={formData.timeframe}
                onChange={handleInputChange}
                className="form-control-custom"
              >
                <option value="1M">1 Minute</option>
                <option value="5M">5 Minutes</option>
                <option value="15M">15 Minutes</option>
                <option value="30M">30 Minutes</option>
                <option value="1H">1 Hour</option>
                <option value="4H">4 Hours</option>
                <option value="1D">1 Day</option>
                <option value="1W">1 Week</option>
              </Form.Select>
              <Form.Text className="text-muted d-block mt-1">
                Candle interval for strategy analysis
              </Form.Text>
            </Form.Group>

            {/* Priority */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">
                <strong>Priority Level</strong>
              </Form.Label>
              <Form.Range
                name="priority"
                min="1"
                max="5"
                value={formData.priority}
                onChange={handleInputChange}
                className="priority-slider"
              />
              <div className="priority-display-inline">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`priority-star-large ${i < formData.priority ? "filled" : ""}`}
                  >
                    ★
                  </span>
                ))}
                <span className="priority-text ms-2">{formData.priority} / 5</span>
              </div>
            </Form.Group>

            {/* Enabled */}
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                name="enabled"
                id="enabledSwitch"
                label={
                  <span className="form-label-custom">
                    <strong>Enable this strategy</strong>
                  </span>
                }
                checked={formData.enabled}
                onChange={handleInputChange}
                className="enable-switch"
              />
              <Form.Text className="text-muted d-block mt-1">
                {formData.enabled
                  ? "This strategy is enabled and will run automatically"
                  : "This strategy is disabled and will not run"}
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="modal-footer-custom">
          <Button variant="secondary" onClick={closeModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
            className="submit-btn"
          >
            {submitting ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Saving...
              </>
            ) : modalMode === "create" ? (
              "Create Strategy"
            ) : (
              "Save Changes"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default StrategyConfigPage;
