import React, { useState, useEffect } from 'react';

// --- Calculate Lux from Raw ADC (0-4095) ---
const calculateLuxFromAdc = (rawAdc) => {
  if (rawAdc < 5) return 0;
  if (rawAdc > 4079) return 50000; 

  const VIN = 3.3;       
  const R_FIXED = 10000;  
  const R10 = 15000;      
  const GAMMA = 0.7;      

  const vOut = (rawAdc / 4095) * VIN;
  if (vOut >= VIN) return 50000;

  const rLdr = (VIN * R_FIXED / vOut) - R_FIXED;
  const lux = 10 * Math.pow((R10 / rLdr), (1 / GAMMA));

  return Math.round(lux);
};

// Get Status Colors & Labels ---
const getSensorState = (type, value) => {
  let label = "Unknown";
  let color = "text-gray-500";
  let bgColor = "bg-gray-100";

  if (type === "temp") {
    if (value < 15) { label = "⚠️ Too Cold"; color = "text-blue-600"; bgColor = "bg-blue-100"; }
    else if (value < 20) { label = "Cool"; color = "text-cyan-600"; bgColor = "bg-cyan-50"; }
    else if (value < 30) { label = "✅ Perfect"; color = "text-green-600"; bgColor = "bg-green-100"; }
    else if (value < 35) { label = "Warm"; color = "text-orange-600"; bgColor = "bg-orange-100"; }
    else { label = "⚠️ Too Hot"; color = "text-red-600"; bgColor = "bg-red-100"; }
  } 
  else if (type === "humid") {
    if (value < 30) { label = "⚠️ Too Dry"; color = "text-red-600"; bgColor = "bg-red-100"; }
    else if (value < 50) { label = "Moderate"; color = "text-blue-500"; bgColor = "bg-blue-50"; }
    else if (value < 70) { label = "✅ Perfect"; color = "text-green-600"; bgColor = "bg-green-100"; }
    else { label = "⚠️ Too Humid"; color = "text-cyan-700"; bgColor = "bg-cyan-100"; }
  } 
  else if (type === "soil") {
    if (value < 20) { label = "⚠️ Bone Dry"; color = "text-red-700"; bgColor = "bg-red-200"; }
    else if (value < 40) { label = "⚠️ Dry"; color = "text-orange-600"; bgColor = "bg-orange-100"; }
    else if (value < 70) { label = "✅ Moist"; color = "text-green-600"; bgColor = "bg-green-100"; }
    else { label = "Wet"; color = "text-blue-600"; bgColor = "bg-blue-100"; }
  } 
  else if (type === "light") {
    if (value < 200) { label = "⚠️ Too Dark"; color = "text-gray-600"; bgColor = "bg-gray-200"; }
    else if (value < 800) { label = "Low Light"; color = "text-orange-600"; bgColor = "bg-orange-100"; }
    else if (value < 1600) { label = "Medium Light"; color = "text-yellow-600"; bgColor = "bg-yellow-100"; }
    else { label = "✅ High Light"; color = "text-green-600"; bgColor = "bg-green-100"; }
  }

  return { label, color, bgColor };
};

const SensorDashboard = () => {
  const [data, setData] = useState({ temp: 0, humid: 0, light: 0, soil: 0, lastSeen: "Waiting..." });
  const [deviceStatus, setDeviceStatus] = useState("Checking...");

  const CLIENT_ID = process.env.REACT_APP_NETPIE_CLIENT_ID;
  const DEVICE_TOKEN = process.env.REACT_APP_NETPIE_TOKEN;
  const AUTH_HEADER = `Device ${CLIENT_ID}:${DEVICE_TOKEN}`;

  // 1. Fetch Sensor Data
  const fetchShadow = async () => {
    try {
      const response = await fetch('https://api.netpie.io/v2/device/shadow/data', {
        method: 'GET',
        headers: { 'Authorization': AUTH_HEADER }
      });
      if (!response.ok) throw new Error("Fetch Failed");
      const json = await response.json();
      
      setData({
        temp: json.data.Temperature,
        humid: json.data.Humidity,
        light: json.data.Lightness,
        soil: json.data["Soil Moisture"],
        lastSeen: new Date().toLocaleTimeString()
      });
      setDeviceStatus("Online");
    } catch (err) { setDeviceStatus("Offline"); }
  };


  useEffect(() => { fetchShadow(); const i = setInterval(fetchShadow, 3000); return () => clearInterval(i); }, []);

  // States
  const currentLux = calculateLuxFromAdc(data.light);
  const stTemp = getSensorState("temp", data.temp);
  const stHumid = getSensorState("humid", data.humid);
  const stSoil = getSensorState("soil", data.soil);
  const stLight = getSensorState("light", currentLux);

  return (
    <div className="min-h-screen bg-blue-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🌱 Blue Senate</h1>
          <p className="text-gray-500 text-sm mt-1">Last Update: <span className="font-mono">{data.lastSeen}</span></p>
        </div>
        <div className={`px-4 py-1 rounded-full text-sm font-semibold border ${deviceStatus==="Online"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>
          • {deviceStatus}
        </div>
      </div>

      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        
        {/* TEMP */}
        <div className={`p-6 rounded-xl shadow-sm border ${stTemp.bgColor} border-transparent flex flex-col justify-between h-40`}>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Temperature</p>
              <div className="flex items-baseline gap-1 mt-1">
                <h2 className="text-4xl font-bold text-gray-800">{data.temp}</h2>
                <span className="text-lg text-gray-600">°C</span>
              </div>
            </div>
            <p className={`text-sm font-bold flex items-center gap-1 ${stTemp.color}`}>{stTemp.label}</p>
        </div>

        {/* HUMIDITY */}
        <div className={`p-6 rounded-xl shadow-sm border ${stHumid.bgColor} border-transparent flex flex-col justify-between h-40`}>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Humidity</p>
              <div className="flex items-baseline gap-1 mt-1">
                <h2 className="text-4xl font-bold text-gray-800">{data.humid}</h2>
                <span className="text-lg text-gray-600">%</span>
              </div>
            </div>
            <p className={`text-sm font-bold flex items-center gap-1 ${stHumid.color}`}>{stHumid.label}</p>
        </div>

        {/* SOIL */}
        <div className={`p-6 rounded-xl shadow-sm border ${stSoil.bgColor} border-transparent flex flex-col justify-between h-40`}>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Soil Moisture</p>
              <div className="flex items-baseline gap-1 mt-1">
                <h2 className="text-4xl font-bold text-gray-800">{data.soil}</h2>
                <span className="text-lg text-gray-600">%</span>
              </div>
            </div>
            <p className={`text-sm font-bold flex items-center gap-1 ${stSoil.color}`}>{stSoil.label}</p>
        </div>

        {/* LIGHT */}
        <div className={`p-6 rounded-xl shadow-sm border ${stLight.bgColor} border-transparent flex flex-col justify-between h-40`}>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Light Intensity</p>
              <div className="flex items-baseline gap-1 mt-1">
                <h2 className={`font-bold text-gray-800 ${currentLux >= 50000 ? "text-3xl" : "text-4xl"}`}>
                  {currentLux >= 50000 ? "≥ 50,000" : currentLux.toLocaleString()}
                </h2>
                <span className="text-lg text-gray-600">LUX</span>
              </div>
            </div>
            <p className={`text-sm font-bold flex items-center gap-1 ${stLight.color}`}>{stLight.label}</p>
        </div>

      </div>

    </div>
  );
};

export default SensorDashboard;