import React from "react";
import { Navbar, Container, Button, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../LanguageSwitcher";
import { useMode } from "../../context/ModeContext";

const AppNavbar: React.FC = () => {
  const { user, logout } = useAuth(); // get user and logout from context
  const { mode, setMode } = useMode();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();           // clear user state and localStorage
    navigate("/login"); // redirect to login page
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand={false}>
        <Container className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <Navbar.Brand as={Link} to="/">AI Trading Platform</Navbar.Brand>
            <Form.Select
              size="sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'backtest' | 'live')}
              className="w-auto bg-dark text-light border-light"
              aria-label="Mode"
            >
              <option value="backtest">Backtest</option>
              <option value="live">Live</option>
            </Form.Select>
          </div>

          <div className="d-flex align-items-center gap-2">
            <LanguageSwitcher />
            {user ? (
              <div className="d-flex align-items-center">
                <span className="text-light me-3">Welcome, {user.username}</span>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>{t('common.logout')}</Button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-outline-light btn-sm">{t('login.loginButton')}</Link>
            )}
          </div>
        </Container>
      </Navbar>
    </>
  );
};

export default AppNavbar;


