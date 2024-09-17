
const getColumnLetter = (col) => {
  return String.fromCharCode(65 + col); // From number to ASCII, 65 is 'A'
};

function ConcertMap({
  rows,
  columns,
  occupiedSeats,
  selectedSeats,
  onSeatSelect,
  disableSelection,
  tempOccupiedSeats,
}) {
  const renderSeats = () => {
    let seats = []; // Array of rows
    for (let row = 0; row < rows; row++) {
      let seatRow = []; // Array of seats in a row (columns)
      for (let col = 0; col < columns; col++) {
        const seatId = `${row + 1}${getColumnLetter(col)}`; // 1A, 1B, 1C, ...
        // Check of the status of the seat based on the three arrays
        const isOccupied = occupiedSeats.includes(seatId);
        const isSelected = selectedSeats.includes(seatId);
        const isTempOccupied = tempOccupiedSeats.includes(seatId);

        seatRow.push(
          // Adding one seat to the row
          <div
            key={seatId}
            style={{ textAlign: 'center', margin: '5px', display: 'inline-block' }}
          >
            <div
              className={`seat ${
                isTempOccupied
                  ? 'temp-occupied'
                  : isOccupied
                  ? 'occupied'
                  : isSelected
                  ? 'requested'
                  : 'available'
              }`} // Based on the status of the seat (which one is TRUE)
              onClick={() =>
                !isOccupied && !disableSelection && onSeatSelect(seatId)
              } // If the seat is occupied or the selection is disabled (view page), the seat cannot be selected
            ></div>
            <span className="seat-code">{seatId}</span>
          </div>
        );
      }
      // Now I can push the full computed row and start with the next one (adding space)
      seats.push(
        <div key={row} style={{ marginBottom: '5px' }}>
          {seatRow}
        </div>
      );
    }
    return seats;
  };

  return <div className="concert-map table-container">{renderSeats()}</div>;
}

export { ConcertMap };
