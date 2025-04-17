import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  MdPowerOff,
  MdFlood,
  MdLocalFireDepartment,
  MdTraffic,
  MdWarning,
} from "react-icons/md";
import { IoCloseCircle } from "react-icons/io5";
import "leaflet/dist/leaflet.css";
import "./App.css";
import "./leaflet.css";

const issueIcons = {
  "Power Outage": "/icons/fuse-box.png",
  Flood: "/icons/flood.png",
  Fire: "/icons/fire.png",
  "Road Hazard": "/icons/hazard.png",
  "Suspicious Activity": "/icons/suspicious-man.png",
};

const DeleteConfirmPopup = ({ isOpen, onConfirm, onCancel, title }) => {
  if (!isOpen) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h3>Delete this alert?</h3>
        <p>"{title}"</p>
        <div className="popup-buttons">
          <button className="popup-confirm" onClick={onConfirm}>
            Confirm
          </button>
          <button className="popup-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [alerts, setAlerts] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Power Outage");
  const [deletePopup, setDeletePopup] = useState({
    isOpen: false,
    alertId: null,
    alertTitle: "",
  });

  //  alerts from Firestore
  const fetchAlerts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "alerts"));
      const alertList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("Fetched alerts:", alertList);
      setAlerts(alertList);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  // Get and watch user's location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationError(null);
        console.log("User location updated:", {
          lat: latitude,
          lng: longitude,
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationError(
          "Please allow location access to use the map and post alerts."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    fetchAlerts();

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Post new alert
  const handleSubmit = async () => {
    if (!title) {
      alert("Title is required");
      return;
    }
    if (!userLocation) {
      alert("Location not available. Please allow location access.");
      return;
    }
    try {
      const newAlert = {
        title,
        description,
        category,
        lat: Number(userLocation.lat),
        lng: Number(userLocation.lng),
        timestamp: new Date(),
      };
      console.log("Posting alert:", newAlert);
      await addDoc(collection(db, "alerts"), newAlert);
      await fetchAlerts();
      setTitle("");
      setDescription("");
    } catch (error) {
      console.error("Error posting alert:", error);
      alert("Failed to post alert: " + error.message);
    }
  };

  const openDeletePopup = (alertId, alertTitle) => {
    setDeletePopup({ isOpen: true, alertId, alertTitle });
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    try {
      console.log("Deleting alert ID:", deletePopup.alertId);
      await deleteDoc(doc(db, "alerts", deletePopup.alertId));
      await fetchAlerts();
      setDeletePopup({ isOpen: false, alertId: null, alertTitle: "" });
    } catch (error) {
      console.error("Error deleting alert:", error);
      alert("Failed to delete alert: " + error.message);
    }
  };

  const cancelDelete = () => {
    setDeletePopup({ isOpen: false, alertId: null, alertTitle: "" });
  };

  //  icon for alerts
  const createAlertIcon = (category) => {
    const iconUrl = issueIcons[category] || issueIcons["Suspicious Activity"];
    console.log("Creating icon for category:", category, "URL:", iconUrl);
    return new L.Icon({
      iconUrl,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
      className: "custom-icon",
    });
  };

  // Create icon for user's location
  const createUserIcon = () => {
    return new L.Icon({
      iconUrl: "/icons/gps.png",
      iconSize: [32, 32],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
      className: "custom-icon",
    });
  };

  return (
    <div className="app">
      <div className="hero">
        <h1>NightPulse</h1>
        <p>Stay aware, stay safe</p>
        <div className="form-container">
          <input
            type="text"
            placeholder="Alert Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.keys(issueIcons).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button onClick={handleSubmit} disabled={!userLocation}>
            Post Alert
          </button>
        </div>
        <div className="map-container">
          {locationError ? (
            <div className="location-error">
              <p>{locationError}</p>
            </div>
          ) : !userLocation ? (
            <div className="location-loading">
              <p>Waiting for location...</p>
            </div>
          ) : (
            <MapContainer
              center={[userLocation.lat, userLocation.lng]}
              zoom={13}
              style={{ height: "500px" }}
              key={`${userLocation.lat}-${userLocation.lng}`}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='© <a href="https://carto.com/attributions">CARTO</a> | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={createUserIcon()}
              >
                <Popup>Your Location</Popup>
              </Marker>
              {alerts.map((alert) => (
                <Marker
                  key={alert.id}
                  position={[Number(alert.lat), Number(alert.lng)]}
                  icon={createAlertIcon(alert.category)}
                >
                  <Popup>
                    {alert.title} - {alert.category}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
        <div className="alerts-grid">
          {alerts.map((alert) => {
            const IconComponent =
              {
                "Power Outage": MdPowerOff,
                Flood: MdFlood,
                Fire: MdLocalFireDepartment,
                "Road Hazard": MdTraffic,
                "Suspicious Activity": MdWarning,
              }[alert.category] || MdWarning;
            return (
              <div key={alert.id} className="alert-card">
                <div style={{ position: "relative" }}>
                  <IconComponent color="#8b0000" size={20} />
                  <IoCloseCircle
                    color="#ff0000"
                    size={20}
                    style={{
                      position: "absolute",
                      top: -10,
                      right: -10,
                      cursor: "pointer",
                    }}
                    onClick={() => openDeletePopup(alert.id, alert.title)}
                  />
                </div>
                <h3>{alert.title}</h3>
                <p>{alert.description}</p>
              </div>
            );
          })}
        </div>
        <DeleteConfirmPopup
          isOpen={deletePopup.isOpen}
          onConfirm={handleDelete}
          onCancel={cancelDelete}
          title={deletePopup.alertTitle}
        />
      </div>
    </div>
  );
}

export default App;
