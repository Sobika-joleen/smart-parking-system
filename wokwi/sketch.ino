#include <HTTPClient.h>
#include <WiFi.h>


#define NUM_SLOTS 6

// WiFi credentials
const char *ssid = "Wokwi-GUEST";
const char *password = "";

// ThingSpeak API Key
String apiKey = "2Y54O69A6Z59DWPC";

// Pin configuration
int trigPins[NUM_SLOTS] = {13, 14, 26, 4, 5, 18};
int echoPins[NUM_SLOTS] = {12, 27, 25, 16, 17, 19};
int ledPins[NUM_SLOTS] = {33, 32, 23, 22, 21, 2};

long duration;
int distance;

// Function to measure distance
int getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  duration = pulseIn(echoPin, HIGH, 30000); // timeout added

  if (duration == 0)
    return 999; // no object detected

  distance = duration * 0.034 / 2;
  return distance;
}

void setup() {
  Serial.begin(115200);

  // Pin setup
  for (int i = 0; i < NUM_SLOTS; i++) {
    pinMode(trigPins[i], OUTPUT);
    pinMode(echoPins[i], INPUT);
    pinMode(ledPins[i], OUTPUT);
  }

  // WiFi connect
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
}

void loop() {

  int slotStatus[NUM_SLOTS];

  // Read all sensors
  for (int i = 0; i < NUM_SLOTS; i++) {

    int dist = getDistance(trigPins[i], echoPins[i]);

    Serial.print("Slot ");
    Serial.print(i + 1);
    Serial.print(" Distance: ");
    Serial.println(dist);

    if (dist < 10) { // 🚗 Car detected
      digitalWrite(ledPins[i], HIGH);
      slotStatus[i] = 1;
    } else {
      digitalWrite(ledPins[i], LOW);
      slotStatus[i] = 0;
    }
  }

  // Send to ThingSpeak
  if (WiFi.status() == WL_CONNECTED) {

    HTTPClient http;

    String url = "http://api.thingspeak.com/update?api_key=" + apiKey;

    for (int i = 0; i < NUM_SLOTS; i++) {
      url += "&field" + String(i + 1) + "=" + String(slotStatus[i]);
    }

    Serial.println("Sending Data:");
    Serial.println(url);

    http.begin(url);
    int response = http.GET();

    Serial.print("Response: ");
    Serial.println(response);

    http.end();
  }

  Serial.println("------");
  delay(15000); // ThingSpeak limit
}