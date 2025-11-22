//   Function to get Location. Returns a promise that resolves into {lat, long}
function getLocation() {
  // Create a new promise
  let locationPromise = new Promise((resolve, reject) => {
    // Access the current position of the user:
    navigator.geolocation.getCurrentPosition((pos) => {
      // Grab the lat and long
      let long = pos.coords.longitude;
      let lat = pos.coords.latitude;
      // If you can get those values: resolve with an object or reject if not
      resolve({ lat, long });
    }, reject);
  });
  //   return the promise
  return locationPromise;
}


// Write your code here:
function loadLogs() {
  const raw = localStorage.getItem("huntingLogs")

  let logs = []
  if (raw) {
    try {
      logs = JSON.parse(raw) || []
    } catch (e) {
      console.error("error parsing huntingLogs from LocalStorage", e);
      logs = [];
    }
  }

  const $container = $("#logs-container");

  if (!logs.length) {
    $container.html("<p>No hunting logs found.</p>");
    return;
  }
  const html = logs
    .map((log) => {
      const sunrise = log.sunriseTime
        ? new Date(log.sunriseTime).toLocaleTimeString()
        : "N/A";
      const sunset = log.sunsetTime
        ? new Date(log.sunsetTime).toLocaleTimeString()
        : "N/A";

      return `
        <article class="log-item" style="border:1px solid #ccc; padding:0.5rem; margin-bottom:0.5rem;">
          <h3>${log.date}</h3>
          <p><strong>Coordinates:</strong> ${log.latitude.toFixed(
        5
      )}, ${log.longitude.toFixed(5)}</p>
          <p><strong>Sunrise:</strong> ${sunrise}</p>
          <p><strong>Sunset:</strong> ${sunset}</p>
          <p><strong>Temperature:</strong> ${log.temperature != null ? log.temperature + " °F" : "N/A"
        }</p>
          <p><strong>Notes:</strong> ${log.notes}</p>
        </article>
      `;
    })
    .join("");

  $container.html(html);
}

$(function () {
  // Call loadLogs() on page load
  loadLogs();

  // TODO 1 — Handle form submission
  $("#hunting-form").on("submit", async function (event) {
    event.preventDefault(); // Step 2

    const formElement = this;

    // Step 3: FormData
    const formData = new FormData(formElement);
    const date = formData.get("date"); // name="date"
    const notes = formData.get("notes"); // name="notes"

    if (!date || !notes) {
      alert("Please fill out both date and notes.");
      return;
    }

    try {
      // Step 4: getLocation()
      const { latitude, longitude } = await getLocation();

      // Step 5: Build URL and fetch weather via Axios
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=sunrise,sunset&current=temperature_2m&timezone=auto&forecast_days=1&temperature_unit=fahrenheit`;

      const response = await axios.get(url);
      const data = response.data;

      const sunriseTime =
        data?.daily?.sunrise && data.daily.sunrise[0]
          ? data.daily.sunrise[0]
          : null;

      const sunsetTime =
        data?.daily?.sunset && data.daily.sunset[0]
          ? data.daily.sunset[0]
          : null;

      // Support both current.temperature_2m and current_weather.temperature
      let temperature = null;
      if (data.current && typeof data.current.temperature_2m === "number") {
        temperature = data.current.temperature_2m;
      } else if (
        data.current_weather &&
        typeof data.current_weather.temperature === "number"
      ) {
        temperature = data.current_weather.temperature;
      }

      // Step 5/6: Build logEntry
      const logEntry = {
        latitude,
        longitude,
        date, // "YYYY-MM-DD" from form
        sunriseTime, // raw string from API
        sunsetTime, // raw string from API
        notes,
        temperature,
      };

      // Step 6: Save to localStorage
      const existing = localStorage.getItem("huntingLogs");
      let logsArray = [];

      if (existing) {
        try {
          logsArray = JSON.parse(existing) || [];
        } catch (e) {
          console.error("Error parsing existing huntingLogs:", e);
          logsArray = [];
        }
      }

      logsArray.push(logEntry);
      localStorage.setItem("huntingLogs", JSON.stringify(logsArray));

      // Optional: reset the form
      formElement.reset();

      // Step 7: Refresh UI
      loadLogs();
    } catch (err) {
      console.error(err);
      alert(
        "There was a problem getting your location or weather data. Check the console for details."
      );
    }
  });
});


