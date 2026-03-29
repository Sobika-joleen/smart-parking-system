# 🚗 Smart Parking System

## 📌 Overview

The Smart Parking System is an IoT-based solution designed to monitor parking slot availability in real time.
It uses ESP32 with ultrasonic sensors (simulated using Wokwi), sends data to ThingSpeak cloud, and displays parking status on a React-based web dashboard.

This project helps reduce time spent searching for parking and demonstrates integration of IoT, cloud, and web technologies.

---

## 🛠️ Technologies Used

* 🔌 ESP32 (Wokwi Simulation)
* 📡 Ultrasonic Sensors (HC-SR04)
* ☁️ ThingSpeak (Cloud Platform)
* 🌐 React.js (Frontend)
* ⚡ Axios (API calls)
* 🧑‍💻 VS Code

---

## ⚙️ Features

* ✅ Real-time parking slot detection
* ✅ 6 parking slots monitoring
* ✅ LED indication (occupied/free)
* ✅ Cloud data storage using ThingSpeak
* ✅ Live dashboard using React
* ✅ Auto-refresh every 15 seconds
* ✅ Simulation-based (no physical hardware required)

---

## 🚀 System Architecture

Wokwi Simulation → ESP32 → ThingSpeak Cloud → React Dashboard

---

## 🔌 Wokwi Simulation

This project uses Wokwi to simulate ESP32 and ultrasonic sensors.

👉 Simulation Link:
https://wokwi.com/projects/YOUR_PROJECT_LINK

📁 Wokwi files are included in:

```
/wokwi/
```

---

## ☁️ ThingSpeak Configuration

* Channel ID: 3317554
* Fields:

  * Field1 → Slot1
  * Field2 → Slot2
  * Field3 → Slot3
  * Field4 → Slot4
  * Field5 → Slot5
  * Field6 → Slot6

⚠️ Note:
Do NOT expose your Write API key publicly.

---

## 🌐 React Dashboard

The frontend displays real-time parking availability.

### 📊 Status Indicators:

* 🔴 Occupied
* 🟢 Available

### 🔄 Auto Update:

* Fetches data every 15 seconds from ThingSpeak API

---

## 📸 Screenshots

### 🔌 Wokwi Simulation

![Wokwi](screenshots/wokwi.png)

### ☁️ ThingSpeak Dashboard

![ThingSpeak](screenshots/thingspeak.png)

### 🌐 React Dashboard

![Dashboard](screenshots/dashboard.png)

---

## 🧪 How to Run the Project

### 1️⃣ Clone the Repository

```
git clone https://github.com/YOUR_USERNAME/smart-parking-system.git
cd smart-parking-system
```

### 2️⃣ Install Dependencies

```
npm install
```

### 3️⃣ Run React App

```
npm start
```

---

## 🔗 API Used

ThingSpeak API:

```
https://api.thingspeak.com/channels/3317554/feeds.json?results=1
```

---

## 📂 Project Structure

```
smart-parking-system/
│
├── wokwi/
│   ├── diagram.json
│   └── sketch.ino
│
├── src/
├── public/
├── package.json
└── README.md
```

---

## 🧠 Key Concepts Used

* Internet of Things (IoT)
* Sensor Data Processing
* Cloud Integration
* REST API
* Frontend Development

---

## 🚀 Future Enhancements

* 📱 Mobile app integration
* 📊 Analytics dashboard
* 🔔 Notification system
* 🎥 Camera-based detection (YOLO)
* 🅿️ Slot booking system

---



## 🧪 Simulation Note

This project uses Wokwi simulation instead of physical hardware, ensuring easy testing and reproducibility.

---

## ⭐ Acknowledgement

This project was developed as part of an academic IoT-based smart system implementation.

---
