import { useState } from 'react';
import { Form, Button, Alert, Col, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function LoginForm(props) {
  const [username, setUsername] = useState('Gianni');
  const [password, setPassword] = useState('password');

  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();

  //Login function
  const handleSubmit = (event) => {
    event.preventDefault();
    const credentials = { username, password };

    if (!username) {
      setErrorMessage('Username cannot be empty');
    } else if (!password) {
      setErrorMessage('Password cannot be empty');
    } else {
      props.login(credentials)
        .then( () => navigate( "/" ) )
        .catch((err) => { 
          setErrorMessage(err.error); 
        });
    }
  };

  return (
    <Row>
      <Col xs={4}></Col>
      <Col xs={4}>
        <h1 className="pb-3">Login</h1>

        <Form onSubmit={handleSubmit}>
          {errorMessage? <Alert dismissible onClose={() => setErrorMessage('')} variant="danger">{errorMessage}</Alert> : null}
          <Form.Group className="mb-3">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="Username"
              value={username} placeholder="Example: Alessandro"
              onChange={(ev) => setUsername(ev.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password} placeholder="Enter your password"
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </Form.Group>
          <Button className="mt-3 custom-button" type="submit">Login</Button>
        </Form>
      </Col>
      <Col xs={4}></Col>
    </Row>

  )
};

function LogoutButton(props) {
  return (
    <Button variant="outline-light" onClick={props.logout}>Logout</Button>
  )
}

function LoginButton(props) {
  const navigate = useNavigate();
  return (
    <Button variant="outline-light" onClick={()=> navigate('/login')}>Login</Button>
  )
}

export { LoginForm, LogoutButton, LoginButton };
