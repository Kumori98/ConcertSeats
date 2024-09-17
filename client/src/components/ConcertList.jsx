import { Table, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import '../App.css';

function ConcertTable(props) {
  const concertList = props.concertList;

  useEffect(() => {
    // To cancel messages when out from detailed layout
    props.setShowDiscount(false);
    props.setMessage('');
  }, []); // It runs once after the initial render

  return (
    <div className="table-container"> {/* To center */}
      <Table className="table table-borderless">
        <thead>
          <tr>
            <th style={{ textAlign: 'center' }}>Name</th>
            <th style={{ textAlign: 'center' }}>Theater</th>
            <th style={{ textAlign: 'center' }}>Available Seats</th>
            <th style={{ textAlign: 'center' }}>Details</th>
            {props.loggedIn && (
              <th style={{ textAlign: 'center' }}>Status</th>
            )}
          </tr>
        </thead>
        <tbody>
          {concertList.map((concert) => (
            <ConcertRow
              concert={concert}
              key={concert.ConcertID}
              loggedIn={props.loggedIn}
              reservations={props.reservations} // List of concertList reserved by the user
              isReserved={props.isReserved} // Function to check if a concert is reserved
            />
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function ConcertRow(props) {
  return (
    <tr>
      <td style={{ textAlign: 'center' }}>{props.concert.ConcertName}</td>
      <td style={{ textAlign: 'center' }}>{props.concert.TheaterID}</td>
      <td style={{ textAlign: 'center' }}>
        <i className="bi bi-ticket-fill icon-spacing"></i>
        {props.concert.AvailableSeats}
      </td>
      <td style={{ textAlign: 'center' }}>
        <Link to="/details" 
          state={{ ConcertID: props.concert.ConcertID }} >{/* Redirect to detailed layout and pass the ID as state*/}
          <Button className="mx-2 custom-button" style={{ fontSize: 15 }}>
            <i className="bi bi-info-circle-fill"></i>
          </Button>
        </Link>
      </td>
      {props.loggedIn && (
        <td style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px' }}>
            {props.isReserved(props.concert.ConcertID, props.reservations) ? ( // Check if the concert is reserved by the user
              <>
                <i
                  className="bi bi-patch-check-fill icon-spacing"
                  style={{ color: 'green' }} 
                ></i>
                Reserved
              </>
            ) : props.concert.AvailableSeats === 0 ? ( // If not, check if it is sold out
              <>
                <i
                  className="bi bi-patch-exclamation-fill icon-spacing"
                  style={{ color: 'red' }}
                ></i>
                Sold Out
              </>
            ) :  // If not, it is available
              <>
                <i
                  className="bi bi-patch-plus-fill icon-spacing"
                  style={{ color: 'orange' }} 
                ></i>
                Available
              </>
            }
          </div>
        </td>
      )}
    </tr>
  );
}


export { ConcertTable };

