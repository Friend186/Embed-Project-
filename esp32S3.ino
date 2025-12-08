#include <WiFi.h>
#include <PubSubClient.h>
#include <HardwareSerial.h> // <--- REQUIRED for S3

const char* ssid = "your_internet_name";
const char* password = "your_internet_password";

// NETPIE Config
const char* mqtt_server = "broker.netpie.io";
const int mqtt_port = 1883;
const char* mqtt_Client = "Youe ClientID";
const char* mqtt_username = "Your Token";
const char* mqtt_password = "Your Secret(Password)";

WiFiClient espClient;
PubSubClient client(espClient);
char msg[250];

// <--- DEFINE THE STM32 PORT --->
// UART1, RX Pin 18, TX Pin 17
HardwareSerial STM32Serial(1);
#define RX_PIN 18
#define TX_PIN 17

void reconnect() {
  while (!client.connected()) {
    Serial.print("Sensor MQTT connection…");
    if (client.connect(mqtt_Client, mqtt_username, mqtt_password)) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  // 1. Start USB Serial (For Computer Debugging)
  Serial.begin(115200);

  // 2. Start STM32 Serial (For Sensor Data)
  // IMPORTANT: We use 9600 because of your extension wires!
  STM32Serial.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);

  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // <--- LISTEN TO STM32 --->
  if (STM32Serial.available()) {
    String data = STM32Serial.readStringUntil('\n'); // Listen to Pin 18
    data.trim(); // Remove spaces

    // Debug: Print to computer so you can see it
    Serial.print("Received from STM32: ");
    Serial.println(data);

    // Only process if data is not empty
    if (data.length() > 0) {
      int firstComma  = data.indexOf(',');
      int secondComma = data.indexOf(',', firstComma + 1);
      int thirdComma  = data.indexOf(',', secondComma + 1);

      // Only send if we have 3 commas (Valid Format)
      if (firstComma > 0 && secondComma > 0 && thirdComma > 0) {
        String value1 = data.substring(0, firstComma);
        String value2 = data.substring(firstComma + 1, secondComma);
        String value3 = data.substring(secondComma + 1, thirdComma);
        String value4 = data.substring(thirdComma + 1);

        // Construct JSON
        String json = "{"
          "\"data\": {"
            "\"Temperature\":" + value1 + ","
            "\"Humidity\":" + value2 + ","
            "\"Lightness\":" + value3 + ","
            "\"Soil Moisture\":" + value4 +
          "}"
        "}";

        json.toCharArray(msg, (json.length() + 1));
        client.publish("@shadow/data/update", msg);
        Serial.println("Sent to NETPIE!");
      }
    }
  }
}