import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import { React, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';

import { NotFoundLayout, LoginLayout, ConcertsLayout, GenericLayout, DetailedLayout } from './components/Layout';
import API from './API.js';

function App() {
  return (
    <BrowserRouter>
      <AppWithRouter />
    </BrowserRouter>
  );
}

function AppWithRouter(props) {
  const [message, setMessage] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [user, setUser] = useState(null);
  const [dirty, setDirty] = useState(true);
  const [discount, setDiscount] = useState(null);
  const [authToken, setAuthToken] = useState(undefined);
  const [reservationData, setReservationData] = useState([]);

  const handleErrors = (err) => {
    let msg = '';
    if (err.error) msg = err.error;
    else if (err.errors) {
      if (err.errors[0].msg) msg = err.errors[0].msg + ' : ' + err.errors[0].path;
    } else if (Array.isArray(err)) msg = err[0].msg + ' : ' + err[0].path;
    else if (typeof err === 'string') msg = String(err);
    else msg = 'Unknown Error';
    setMessage(msg);
    console.log(err);
    setTimeout(() => setDirty(true), 2000);
  };

  const renewToken = () => {
    API.getAuthToken()
      .then((resp) => setAuthToken(resp.token))
      .catch((err) => console.log('DEBUG: renewToken err: ', err));
  };

  // Check if the user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await API.getUserInfo();
        setLoggedIn(true);
        setUser(user);
        API.getAuthToken().then((resp) => { setAuthToken(resp.token); })
      } catch (err) {
        // NO need to do anything: user is simply not yet authenticated
        //handleError(err);
      }
    };
    checkAuth();
  }, []);

  // Login function
  const handleLogin = async (credentials) => {
    try {
      const user = await API.logIn(credentials);
      setUser(user);
      setLoggedIn(true);
      renewToken();
    } catch (err) {
      throw err;
    }
  };

  // Logout function
  const handleLogout = async () => {
    await API.logOut();
    setLoggedIn(false);
    setReservations([]);
    setShowDiscount(false);
    setMessage('');
    setUser(null);
    setAuthToken(undefined);
  };

  // Delete a reservation
  const deleteReservation = (ConcertID) => {
    API.cancelReservation(ConcertID)
      .then(() => {
        //Reset status
        setMessage('Reservation cancelled correctly');
        setShowDiscount(false);
        setDiscount(null);
        setReservationData([]);
        setDirty(true); // Reload concerts and reservations
      })
      .catch((err) => handleErrors(err));
  };

  // Load reservations to change buttons
  useEffect(() => {
    if (loggedIn && dirty) {
      API.getReservations(user.userID)
        .then((reservations) => {
          setReservations(reservations.Concerts);
          setDirty(false);
        })
        .catch((err) => handleErrors(err));
    }
  }, [dirty, loggedIn]);

  //Check if a concert is reserved by a user
  const isReserved = (concertID, reservations) => {
    if (!reservations || reservations.length === 0) return false;
    return reservations.some((reservation) => reservation === concertID);
  };

  return (
    <Container fluid>
      <Routes>
        <Route
          path="/"
          element={
            <GenericLayout
              loggedIn={loggedIn}
              user={user}
              logout={handleLogout}
              reservations={reservations}
              setReservations={setReservations}
              dirty={dirty}
              setDirty={setDirty}
              authToken={authToken}
              setAuthToken={setAuthToken}
              message={message}
              setMessage={setMessage}
              handleErrors={handleErrors}
              setShowDiscount={setShowDiscount}
              setReservationData={setReservationData}
              reservationData={reservationData}
            />
          }
        >
          <Route
            index
            element={
              <ConcertsLayout
                isReserved={isReserved}
                handleErrors={handleErrors}
                loggedIn={loggedIn}
              />
            }
          />
          <Route path="*" element={<NotFoundLayout />} />
          <Route
            path="/details"
            element={
              <DetailedLayout
                showDiscount={showDiscount}
                loggedIn={loggedIn}
                discount={discount}
                setDiscount={setDiscount}
                isReserved={isReserved}
                deleteReservation={deleteReservation}
              />
            }
          />
        </Route>
        <Route
          path="/login"
          element={!loggedIn ? <LoginLayout login={handleLogin} /> : <Navigate replace to="/" />}
        />
      </Routes>
    </Container>
  );
}

export default App;


