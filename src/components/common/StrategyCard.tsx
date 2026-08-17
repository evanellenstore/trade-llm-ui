import React from "react";
import { Card, Badge, Button, Row, Col } from "react-bootstrap";
import { StrategyConfig } from "../../services/strategyService";
import "./StrategyCard.css";

interface StrategyCardProps {
  strategy: StrategyConfig;
  onToggle: (strategy: StrategyConfig) => void;
  onEdit: (strategy: StrategyConfig) => void;
  onDelete: (strategyName: string) => void;
  isLoading?: boolean;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  onToggle,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  const getStatusColor = (enabled: boolean) => {
    return enabled ? "success" : "secondary";
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? "✓" : "✗";
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 1) return "#6c757d";
    if (priority <= 2) return "#17a2b8";
    if (priority <= 3) return "#ffc107";
    if (priority <= 4) return "#fd7e14";
    return "#dc3545";
  };

  return (
    <Card className="strategy-card">
      <Card.Body>
        {/* Header with name and status */}
        <div className="card-header-section">
          <div>
            <Card.Title className="strategy-card-title">
              {strategy.strategyName}
            </Card.Title>
            <Badge
              bg={getStatusColor(strategy.enabled)}
              className="status-badge-card"
            >
              {getStatusIcon(strategy.enabled)} {strategy.enabled ? "Active" : "Inactive"}
            </Badge>
          </div>
          <Badge bg="info" className="timeframe-badge-card">
            {strategy.timeframe}
          </Badge>
        </div>

        {/* Priority display */}
        <div className="priority-section">
          <div className="priority-label">Priority</div>
          <div className="priority-stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`priority-star-card ${i < strategy.priority ? "filled" : ""}`}
                style={{
                  color: i < strategy.priority ? getPriorityColor(strategy.priority) : "#ddd"
                }}
              >
                ★
              </span>
            ))}
            <span className="priority-score">({strategy.priority}/5)</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="card-actions">
          <Button
            variant={strategy.enabled ? "warning" : "success"}
            size="sm"
            onClick={() => onToggle(strategy)}
            disabled={isLoading}
            className="action-btn-card"
            title={strategy.enabled ? "Disable" : "Enable"}
          >
            {strategy.enabled ? "⊘ Disable" : "✓ Enable"}
          </Button>
          <Button
            variant="info"
            size="sm"
            onClick={() => onEdit(strategy)}
            disabled={isLoading}
            className="action-btn-card"
            title="Edit"
          >
            ✏ Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(strategy.strategyName)}
            disabled={isLoading}
            className="action-btn-card"
            title="Delete"
          >
            🗑 Delete
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default StrategyCard;
