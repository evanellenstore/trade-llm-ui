import { Link } from 'react-router-dom';
import './TraderHeader.css';

interface TraderHeaderProps {
  title: string;
  description?: string;
  showDashboardButton?: boolean;
  showActions?: boolean;
}

const TraderHeader: React.FC<TraderHeaderProps> = ({
  title,
  description,
  showDashboardButton = true,
  showActions = true
}) => {
  return (
    <div className="trader-header-wrapper">
      <div className="trader-header sticky">
        
        {/* LEFT SECTION */}
        <div className="header-left">
          {showDashboardButton && (
            <Link to="/trader" className="back-button">
              ←
            </Link>
          )}

          <div className="header-title-group">
            <h1 className="trader-title">{title}</h1>
            {description && (
              <p className="trader-description">{description}</p>
            )}
          </div>
        </div>

        {/* RIGHT SECTION */}
        {showActions && (
          <div className="header-right">
            <button className="header-btn">Help</button>

            <div className="header-divider"></div>

            <button className="header-btn primary">
              Scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TraderHeader;