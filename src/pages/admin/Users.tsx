import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Container,
  Table,
  Button,
  Modal,
  Form,
  Spinner,
  Alert,
  Card,
  Row,
  Col,
} from "react-bootstrap";
import './AdminPageShell.css';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser
} from "../../services/userService";

import type { UserDto } from "../../services/userService";

type UserFormData = {
  username: string;
  role: string;
  email: string;
  password: string;
  active: boolean;
};

const Users: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);

  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    role: "ADMIN",
    email: "",
    password: "",
    active: true,
  });

  // 🔹 Load users
  const loadUsers = async () => {
    console.log("===From Users of method loadUsers: Loading users===");
    try {
      setLoading(true);
      const usersRes = await getUsers();
      setUsers(usersRes);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("===From Users of method useEffect: Loading users===");
    loadUsers();
  }, []);

  // 🔹 Open create modal
  const handleAdd = () => {
    setEditingUser(null);
    setFormData({ username: "", role: "ADMIN", email: "", password: "", active: true });
    setShowModal(true);
  };

  // 🔹 Open edit modal
  const handleEdit = (user: UserDto) => {
    setEditingUser(user);
    setFormData({
      username: user.username ?? "",
      role: user.role ?? "ADMIN",
      email: user.email ?? "",
      password: "",
      active: user.active ?? true,
    });
    setShowModal(true);
  };

  // 🔹 Save (create/update)
  const handleSave = async () => {
    try {
      const payload = {
        username: formData.username,
        role: formData.role,
        email: formData.email,
        password: formData.password,
        active: formData.active,
      };

      if (editingUser?.id) {
        await updateUser(editingUser.id, payload);
      } else {
        await createUser(payload);
      }
      setShowModal(false);
      loadUsers();
    } catch {
      alert(t('users.operationFailed'));
    }
  };

  // 🔹 Delete
  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm(t('users.confirmDelete'))) return;

    await deleteUser(id);
    loadUsers();
  };

  return (
    <div className="admin-page-shell">
      <div className="admin-page-hero">
        <div>
          <p className="section-eyebrow">Access control</p>
          <h2>{t('users.userManagement')}</h2>
          <p>{t('users.createAndManage')}</p>
        </div>
        <Button className="admin-page-hero-button" onClick={handleAdd}>+ {t('users.addUser')}</Button>
      </div>

      <div className="admin-page-metrics">
        <Card className="admin-page-metric-card">
          <div className="metric-label">Total users</div>
          <div className="metric-value">{users.length}</div>
        </Card>
        <Card className="admin-page-metric-card">
          <div className="metric-label">Active users</div>
          <div className="metric-value">{users.filter((u) => u.active).length}</div>
        </Card>
      </div>

      {error && <Alert variant="danger">{error || t('users.failedToLoadUsers')}</Alert>}

      {loading ? (
        <Spinner animation="border" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="d-none d-md-block">
            <Card className="admin-page-card">
              <Card.Body>
            <Table striped hover responsive className="admin-page-table">
              <thead>
                <tr>
                  <th>{t('users.id')}</th>
                  <th>{t('users.username')}</th>
                  <th>{t('users.email')}</th>
                  <th>{t('users.role')}</th>
                  <th>{t('users.active')}</th>
                  <th style={{ width: "180px" }}>{t('users.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.active ? t('users.yes') : t('users.no')}</td>
                    <td>
                      <Button size="sm" variant="warning" className="me-2" onClick={() => handleEdit(u)}>
                        {t('users.edit')}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(u.id)}>
                        {t('users.delete')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
              </Card.Body>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="d-block d-md-none">
            {users.map(u => (
              <Card className="mb-3" key={u.id}>
                <Card.Body>
                  <Row>
                    <Col xs={8}>
                      <div className="fw-semibold">{u.username}</div>
                      <div className="text-muted">{u.email}</div>
                      <div className="text-muted">Role: {u.role}</div>
                    </Col>
                    <Col xs={4} className="text-end">
                      <div className="mb-2">{t('users.active')}: {u.active ? t('users.yes') : t('users.no')}</div>
                      <Button size="sm" variant="warning" className="me-1 mb-1 w-100" onClick={() => handleEdit(u)}>{t('users.edit')}</Button>
                      <Button size="sm" variant="danger" className="w-100" onClick={() => handleDelete(u.id)}>{t('users.delete')}</Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingUser ? t('users.editUser') : t('users.createUser')}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('users.username')}</Form.Label>
              <Form.Control
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>{t('users.email')}</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('users.password')}</Form.Label>
              <Form.Control
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>{t('users.role')}</Form.Label>
              <Form.Select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <option value="ADMIN">{t('users.admin')}</option>
                <option value="TRADER">{t('users.trader')}</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            {t('users.cancel')}
          </Button>
          <Button onClick={handleSave}>
            {editingUser ? t('users.update') : t('users.create')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Users;
