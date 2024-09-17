import { Row, Col, Button, Alert, Form } from 'react-bootstrap';
import { Outlet, Link, useLocation, useOutletContext, Navigate} from 'react-router-dom';
import { useState } from 'react';

import { Navigation } from './Navigation';
import { ConcertTable } from './ConcertList';
import { ConcertMap } from './ConcertMap';
import { useEffect } from 'react';
import { LoginForm } from './Auth';


import API from '../API.js';

function NotFoundLayout() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center' }}>
        <h2>This route is not valid!</h2>
        <Link to={`/`}>
          <Button className="mx-2 custom-button" variant='primary' style={{ marginTop: '40px', fontSize: '30px', borderRadius: '20px' }}>
            <i className="bi bi-house-fill" style={{ padding: '10px' }}></i>
            Main page
          </Button>
        </Link>
      </div>
    </>
  );  
  }

function LoginLayout(props) {
    return (
      <Row>
        <Col>
          <LoginForm login={props.login} />
        </Col>
      </Row>
    );
  }


  function ConcertsLayout(props) {
    //Use the context to access the global state
    const { dirty, setDirty, reservations, setShowDiscount, setMessage, setReservationData } = useOutletContext();
  
    const [concertList, setConcertList] = useState([]);

    // Effect to fetch concerts when entering the page
    useEffect(() => {
      setDirty(true); 
      setReservationData([]); // Clear the reservation data when entering the page
    }, []); // Only once when entering the page
  
    useEffect(() => {
      if (dirty) {
        API.getConcerts()
          .then((concerts) => {
            setConcertList(concerts);
            setDirty(false); 
          })
          .catch((err) => props.handleErrors(err));
      }
    }, [dirty]);
  
    return (
      <>
        <ConcertTable 
          concertList={concertList}  
          loggedIn={props.loggedIn} 
          reservations={reservations}
          isReserved={props.isReserved}
          setShowDiscount={setShowDiscount}
          setMessage={setMessage}
        />
      </>
    );
  }

  
  function DetailedLayout(props) {
    const { dirty, setDirty, reservations,  setShowDiscount, setMessage, authToken, reservationData, setReservationData, setAuthToken } = useOutletContext();
    // Local states
    const [stats, setStats] = useState(null);
    const [theaterSize, setTheaterSize] = useState(null);
    const [occupiedSeats, setOccupiedSeats] = useState([]);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [tempOccupiedSeats, setTempOccupiedSeats] = useState([]);
    const [numSeats, setNumSeats] = useState(1);
    const [concertName, setConcertName] = useState('');
    const location = useLocation(); // Hook to access the location object
    const ConcertID = location?.state?.ConcertID; // Safe access to state and location.state


    if (!ConcertID) {
      return <Navigate to="/" />; // Redirect a una pagina di "Not Found" o a una route di tua scelta
    }
  
    // Effect to fetch theater size and concert name when ConcertID changes
    useEffect(() => {
        Promise.all([
          API.getTheaterSize(ConcertID),
          API.getConcertName(ConcertID)
        ])
        .then(([size, ConcertName]) => {
          setTheaterSize(size);
          setConcertName(ConcertName.ConcertName);
        })
        .catch(err => console.error("Error retrieving theater size or concert name", err));
      }, [ConcertID]);
    
    
    // Effect to fetch stats and occupied seats when dirty is true
    useEffect(() => {
      if (dirty) {
        Promise.all([
          API.getStats(ConcertID),
          API.getOccupiedSeats(ConcertID)
        ])
        .then(([stats, seats]) => {
          setStats(stats);
          setOccupiedSeats(seats.OccupiedSeats || []);
          setDirty(false);  // Reset dirty state after fetching the data
        })
        .catch(err => console.error("Error retrieving stats or occupied seats", err));
      }
    }, [dirty]); // Now it will trigger only when dirty is true

    // Effect to fetch concerts when entering the page
    useEffect(() => {
      setDirty(true); 
    }, []); // Only once when entering the page

  // useEffect to fetch the discount when the reservationData changes
  useEffect(() => {
    if (reservationData.length>0 && reservationData) { // Check if reservationData is available
      if (authToken) { // Check if the authToken is available
        API.getDiscount(authToken, reservationData)
          .then((discountResponse) => {
            props.setDiscount(discountResponse.discount);
            setShowDiscount(true);
          })
          .catch((err) => {
            // If the token is expired, renew it and try again
            API.getAuthToken().then(resp => setAuthToken(resp.token));
          });
      }
    }
  }, [reservationData, authToken]);
    
   
    // Called when the number of seats changes in the form (method one to make a reservation)
    const handleNumSeatsChange = (event) => {
      setNumSeats(event.target.value);
    };

    // Function to search for seats and automatically create a reservation
    const handleSearchSeats = (event) => {
      event.preventDefault();
      API.searchSeats(ConcertID, numSeats)
          .then((response) => {
              if (response.success) {
                setReservationData(response.seatCodes); // Save the reservation data
                // Reservation successful, update the screen
                setDirty(true); // Trigger data reload (changed stats)
                setMessage('Confirmed reservation'); 
              } else {
                  // If not enough seats are available, show an error
                  setMessage(response.error);
              }
          })
          .catch(err => console.error("Error searching for seats", err));
    };

    // Function to manually select seats
    const handleSeatSelect = (seatId) => {
      if (!selectedSeats.includes(seatId)) { //If not present (not selected yet)
          setSelectedSeats([...selectedSeats, seatId]); //Add to the list
      } else {
          setSelectedSeats(selectedSeats.filter(seat => seat !== seatId)); // Remove it from the list (second click)
      }
    };



    // Function to confirm manual reservation
    const handleConfirmReservation = () => {
      API.createReservation(ConcertID, selectedSeats)
          .then((response) => {
              if (response.success) {
                  setDirty(true);  // Trigger data reload
                  setSelectedSeats([]); // Clear the array
                  setReservationData(response.seatCodes);  // Save the reservation data
                  setMessage('Confirmed reservation'); 
              } else if (response.occupiedSeats && response.occupiedSeats.length > 0) { //Some seats are not available
                  // Handle temporarily occupied seats
                  setTempOccupiedSeats(response.occupiedSeats); //Retrieve the occupied seats
                  setTimeout(() => {
                      // After the timeout
                      setOccupiedSeats([...occupiedSeats, ...response.occupiedSeats]); // Place the temporarily occupied seats in the occupied list (see them in red)
                      setSelectedSeats([]);
                      setMessage('Some seats are no longer available. Please try again.');
                      setTempOccupiedSeats([]); // Clear the temporary list
                  }, 5000);  // Clear temporarily occupied seats after 5 seconds
              }
          })
          .catch(err => console.error("Error confirming reservation", err));
    };

    // Function to cancel manual seat selection (cancel button)
    const handleCancelSelection = () => {
      setSelectedSeats([]); 
    };

    // Check if the user already has a reservation for this concert, props from the general layout
    const hasReservation = props.isReserved(ConcertID, reservations);
  
    // Display loading text if the stats or theater size data is not yet available
    if (!stats || !theaterSize) {
      return <p>Loading...</p>;
    }
  
    return (
      <div className="detailed-layout-container" style={{ display: 'flex', height: '100vh' }}>
        {/* Left column with the stats and reservation form */}
        <div className="left-column" style={{ width: '30%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', padding: '50px' }}>
          <h1 style={{marginBottom:'50px'}}>Stats</h1>
          <div>
            <p>Available seats: {stats.availableSeats}</p>
            <p>Occupied seats: {stats.occupiedSeats}</p>
            <p>Total seats: {stats.totalSeats}</p>
            {props.loggedIn && (<p>Requested seats: {selectedSeats.length}</p>)}
          </div>
  
          {/* Show discount message if applicable */}
          {props.discount && props.loggedIn && props.showDiscount && (
            <Alert dismissible variant="info" style={{ marginTop: '20px' }}>
              Congratulations! You've received a discount of {props.discount}% on your reservation!
            </Alert>
          )}
  
          {/* Show form to search and reserve seats if the user is logged in, has no reservation yet, no requested seats with second method and availability */}
          {props.loggedIn && !hasReservation && selectedSeats.length === 0 && stats.availableSeats > 0 && (
            <Form onSubmit={handleSearchSeats} style={{ marginTop: '20px' }}>
              <Form.Group controlId="numSeats">
                <Form.Label>Number of Seats</Form.Label>
                <Form.Control
                  type="number"
                  value={numSeats}
                  onChange={handleNumSeatsChange}
                  min="1"
                  max={stats.availableSeats} 
                  required
                />
              </Form.Group>
              <Button variant="success" type="submit" style={{ marginTop: '10px', borderRadius: '20px' }}>
                Search & Reserve
              </Button> 
            </Form>
          )}
  
          {/* Show buttons to confirm or cancel manual seat selection */}
          {selectedSeats.length > 0 && (
            <>
              <Button variant="success" onClick={handleConfirmReservation} style={{ marginTop: '20px', borderRadius: '20px' }}>
                Confirm Selected Seats
              </Button>
              <Button variant="danger" onClick={handleCancelSelection} style={{ marginTop: '10px', borderRadius: '20px' }}>
                Cancel Selection
              </Button>
            </>
          )}
  
          {/* Allow logged-in users to delete an existing reservation */}
          {props.loggedIn && hasReservation && (
            <Button variant='danger' onClick={() => { props.deleteReservation(ConcertID)}} style={{borderRadius: '20px'}}>
              <i className='bi bi-trash icon-spacing'></i>
              Delete Reservation
            </Button>
          )}
  
          {/* Link to go back to the home page */}
          <Link to={`/`}>
            <Button className="mx-2 custom-button" variant='primary' style={{ marginTop: '20px', fontSize: '30px', borderRadius: '20px' }}>
              <i className="bi bi-house-fill" style={{ padding: '10px' }}></i>
              Home
            </Button>
          </Link>
        </div>
          
        {/* Right column with the concert map */}
        <div className="right-column" style={{ width: '70%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', padding: '50px' }}>
          <h1>{concertName}</h1>
          <ConcertMap
            rows={theaterSize.Rows}
            columns={theaterSize.Columns}
            occupiedSeats={occupiedSeats} 
            selectedSeats={selectedSeats}
            tempOccupiedSeats={tempOccupiedSeats}
            onSeatSelect={handleSeatSelect} 
            disableSelection={hasReservation || !props.loggedIn} // Disable seat selection if the user has a reservation or is not logged in
          />
        </div>
      </div>
    );
  }


  function GenericLayout(props) {

    return (
      <>
        <Row>
          <Col>
            <Navigation loggedIn={props.loggedIn} user={props.user} logout={props.logout} />
          </Col>
        </Row>
        <Row>
          <Col>
            {props.message && (
              <Alert
                onClose={() => props.setMessage('')}
                variant="info"
                dismissible
                style={{ marginTop: '20px', borderRadius: '40px' }}
              >
                {props.message}
              </Alert>
            )}
          </Col>
        </Row>
        <Row>
          <Col>
            {/* Pass the context using Outlet */}
            <Outlet context={{ 
              dirty: props.dirty, 
              setDirty: props.setDirty, 
              reservations: props.reservations, 
              setReservations: props.setReservations, 
              user: props.user, 
              setShowDiscount: props.setShowDiscount, 
              message: props.message,
              setMessage: props.setMessage, 
              handleErrors: props.handleErrors,
              authToken: props.authToken,
              setAuthToken: props.setAuthToken,
              reservationData: props.reservationData,
              setReservationData: props.setReservationData
            }} />
          </Col>
        </Row>
      </>
    );
  }
    

export{ NotFoundLayout, LoginLayout, ConcertsLayout, GenericLayout, DetailedLayout };