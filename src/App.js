import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [slots, setSlots] = useState([]);

  const fetchData = async () => {
    try {
      const res = await axios.get(
        "https://api.thingspeak.com/channels/3317554/feeds.json?results=1"
      );

      const data = res.data.feeds[0];

      setSlots([
        data.field1,
        data.field2,
        data.field3,
        data.field4,
        data.field5,
        data.field6,
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container">
      <h1>🚗 Smart Parking System</h1>

      <div className="grid">
        {slots.map((slot, index) => (
          <div
            key={index}
            className={`card ${slot === "1" ? "occupied" : "free"}`}
          >
            <h2>Slot {index + 1}</h2>
            <p>{slot === "1"   ? "Occupied 🔴" : "Available 🟢"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;