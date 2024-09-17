import 'bootstrap-icons/font/bootstrap-icons.css';

import { Navbar, Nav, Form, Container } from 'react-bootstrap';
import '../App.css';

import { LoginButton, LogoutButton } from './Auth';

const Navigation = (props) => {
  return (
    <Navbar expand="md" variant="dark" className="navbar-padding navbar-custom">
      <Container>
        <Navbar.Brand
          style={{ fontSize: '30px', display: 'flex', alignItems: 'center' }}
        >
          <i className="bi bi-music-note-beamed icon-spacing" />
          Concert Seats
        </Navbar.Brand>
        <Navbar id="basic-navbar-nav">
          <Nav className="ms-auto" style={{ display: 'flex', alignItems: 'center' }}>
            <Navbar.Text
              className="me-1 text-white"
              style={{ display: 'flex', alignItems: 'center' }}
            >
              {props.user &&
                (props.user.Level === 'Loyal' ? (
                  <i
                    className="bi bi-award-fill"
                    style={{ fontSize: '30px', color: 'gold' }}
                  ></i>
                ) : null)}
            </Navbar.Text>
            <Navbar.Text className="me-3 text-white" style={{ fontSize: '20px' }}>
              <i className="bi bi-person-fill icon-spacing"></i>
              {props.user && props.user.Name && `${props.user.Name}`}
            </Navbar.Text>
            <Form>
              {props.loggedIn ? (
                <LogoutButton logout={props.logout} />
              ) : (
                <LoginButton />
              )}
            </Form>
          </Nav>
        </Navbar>
      </Container>
    </Navbar>
  );
};

export { Navigation };
