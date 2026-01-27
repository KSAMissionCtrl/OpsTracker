// refactor complete

// ==============================================================================
// ERROR HANDLING UTILITIES
// ==============================================================================

/**
 * Central error handler for logging and displaying errors
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {boolean} showUser - Whether to show error to user
 */
function handleError(error, context = 'Unknown', showUser = false) {
  const errorMsg = `[${context}] ${error.message || error}`;
  console.error(errorMsg, error);
  
  // Log stack trace if available
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  
  // Optionally show user-friendly message
  if (showUser) {
    showUserError(`An error occurred: ${context}. Please try refreshing the page.`);
  }
  
  // TODO: In production, send to error tracking service (e.g., Sentry)
  // logErrorToServer(errorMsg, error.stack);
}

/**
 * Displays error message to user
 * @param {string} message - User-friendly error message
 */
function showUserError(message) {
  // Could be enhanced with a modal or notification system
  alert(message);
}

/**
 * Safely parses JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {string} context - Context for error reporting
 * @returns {object|null} Parsed object or null on error
 */
function safeJSONParse(jsonString, context = 'JSON Parse') {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    handleError(error, context);
    return null;
  }
}

/**
 * Validates that a value is not null or undefined
 * @param {*} value - Value to check
 * @param {string} varName - Variable name for error message
 * @param {string} context - Context for error reporting
 * @returns {boolean} True if valid
 */
function validateNotNull(value, varName = 'value', context = 'Validation') {
  if (value === null || value === undefined) {
    handleError(new Error(`${varName} is null or undefined`), context);
    return false;
  }
  return true;
}

/**
 * Sanitizes HTML to prevent XSS attacks
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
  if (typeof html !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Safely sets text content (use instead of innerHTML when possible)
 * @param {string} selector - jQuery selector
 * @param {string} text - Text to set
 */
function safeSetText(selector, text) {
  try {
    $(selector).text(text || '');
  } catch (error) {
    handleError(error, `safeSetText: ${selector}`);
  }
}

/**
 * Safely sets HTML content with sanitization
 * @param {string} selector - jQuery selector
 * @param {string} html - HTML to set (will be sanitized)
 */
function safeSetHTML(selector, html) {
  try {
    // For security, prefer using text() when possible
    // This function sanitizes but complex HTML may need DOMPurify library
    $(selector).html(sanitizeHTML(html || ''));
  } catch (error) {
    handleError(error, `safeSetHTML: ${selector}`);
  }
}

/**
 * Builds HTML string from template safely
 * Escapes all values to prevent XSS
 * @param {string} template - Template string with placeholders
 * @param {object} values - Object with values to substitute
 * @returns {string} Sanitized HTML string
 */
function buildSafeHTML(template, values) {
  try {
    let result = template;
    for (const [key, value] of Object.entries(values)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, sanitizeHTML(String(value)));
    }
    return result;
  } catch (error) {
    handleError(error, 'buildSafeHTML');
    return '';
  }
}

// ==============================================================================
// EXISTING UTILITIES
// ==============================================================================

/**
 * Normalizes longitude values to be within the range of -180 to 180 degrees
 * @param {number} longitude - Longitude value to normalize (can be any value >= 0)
 * @returns {number} Normalized longitude between -180 and 180
 */
function normalizeLongitude(longitude) {
  if (longitude >= 180) {
    return longitude - 360;
  }
  return longitude;
}

// https://stackoverflow.com/questions/11887934/how-to-check-if-the-dst-daylight-saving-time-is-in-effect-and-if-it-is-whats
Date.prototype.stdTimezoneOffset = function () {
  var jan = new Date(this.getFullYear(), 0, 1);
  var jul = new Date(this.getFullYear(), 6, 1);
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}
Date.prototype.isDstObserved = function () {
  return this.getTimezoneOffset() < this.stdTimezoneOffset();
}

//https://stackoverflow.com/questions/4959975/generate-random-number-between-two-numbers-in-javascript
function randomIntFromInterval(min, max) { 
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// for retrieving URL query strings
// http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
function getParameterByName(name) {
  try {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(window.location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  } catch (error) {
    handleError(error, 'getParameterByName');
    return "";
  }
}

// calculate the width of text
// https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript
String.prototype.width = function(font) {
  try {
    var f = font || '12px arial',
        o = $('<div>' + this + '</div>')
              .css({'position': 'absolute', 'float': 'left', 'white-space': 'nowrap', 'visibility': 'hidden', 'font': f})
              .appendTo($('body')),
        w = o.width();
    o.remove();
    return w;
  } catch (error) {
    handleError(error, 'String.width');
    return 0;
  }
}

/**
 * Intermediate handler for AJAX responses
 * Calls the original callback and removes URL from the load queue
 * @param {XMLHttpRequest} xhttp - The XMLHttpRequest object
 * @param {string} url - The URL that was requested
 * @param {function} cFunction - Callback function to execute
 * @param {*} data - Optional data to pass to callback
 */
function dbResponse(xhttp, url, cFunction, data) {
  try {
    // Call the original callback function
    cFunction(xhttp, data);
    
    // Remove the URL from the data load queue
    var index = KSA_UI_STATE.dataLoadQueue.indexOf(url);
    if (index > -1) {
      KSA_UI_STATE.dataLoadQueue.splice(index, 1);
    }
  } catch (error) {
    handleError(error, `dbResponse: ${url}`, true);
  }
}

/**
 * Call up an AJAX query and assign it to a callback function
 * Enhanced with error handling
 * @param {string} url - The URL to request
 * @param {function} cFunction - Callback function on success
 * @param {*} data - Optional data to pass to callback
 */
function loadDB(url, cFunction, data) {
  console.log(url);
  KSA_UI_STATE.dataLoadQueue.push(url);
  var xhttp;
  
  try {
    xhttp = new XMLHttpRequest();
    
    xhttp.onreadystatechange = function() {
      try {
        if (this.readyState == 4) {
          if (this.status == 200) {
            dbResponse(this, url, cFunction, data);
          } else if (this.status >= 400) {
            handleError(
              new Error(`HTTP ${this.status}: ${this.statusText}`),
              `loadDB: ${url}`,
              true
            );
          }
        }
      } catch (error) {
        handleError(error, `loadDB callback: ${url}`, true);
      }
    };
    
    xhttp.onerror = function() {
      handleError(
        new Error('Network request failed'),
        `loadDB: ${url}`,
        true
      );
    };
    
    xhttp.ontimeout = function() {
      handleError(
        new Error('Request timeout'),
        `loadDB: ${url}`,
        true
      );
    };
    
    xhttp.open("GET", url, true);
    xhttp.timeout = 30000; // 30 second timeout
    xhttp.send();
    
  } catch (error) {
    handleError(error, `loadDB initialization: ${url}`, true);
  }
}

// take an amount of time in seconds and convert it to years, days, hours, minutes and seconds
// leave out any values that are not necessary (0y, 0d won't show, for example)
// give seconds to 3 significant digits if precision is true
// format allows to include spaces between hms ( ) and a leading 0 for seconds (0)
function formatTime(time, precision = false, format = "0 ") {
  var years = 0;
  var days = 0;
  var hours = 0;
  var minutes = 0;
  var seconds = "";
  var ydhms = "";
  time = Math.abs(time);

  if (time >= 86400) {
    days = Math.floor(time / 86400);
    time -= days * 86400;
    ydhms = days + "d, ";
  }

  if (days >= 365) {
    years = Math.floor(days / 365);
    days -= years * 365;
    ydhms = years + "y " + days + "d, ";
  }

  if (time >= 3600) {
    hours = Math.floor(time / 3600);
    time -= hours * 3600;
    if (format.includes(" ")) ydhms += hours + "h ";
    else ydhms += hours + "h";
  }

  if (time >= 60) {
    minutes = Math.floor(time / 60);
    time -= minutes * 60;
    if (format.includes(" ")) ydhms += minutes + "m ";
    else ydhms += minutes + "m";
  }
  
  if (precision) {
    time = numeral(time).format('0.000');
  } else {
    time = Math.floor(time);
  }
  
  if ( time < 10 && format.includes("0")) {
    seconds = "0" + time
  }
  else seconds = time;

  return ydhms += seconds + "s";
}

// take a date object of a given time and output "mm/dd/yyyy hh:mm:ss"
function formatDateTime(time) {
  var hours = time.hour; 
  var day = time.day;
  if (hours < 0) hours += 24;
  if (hours < 10) hours = "0" + hours;
  var minutes = time.minute;
  if (minutes < 10) minutes = "0" + minutes;
  var seconds = time.second;
  if (seconds < 10) seconds = "0" + seconds;
  return ((time.month) + '/' + day + '/' + time.year + ' @ ' + hours + ':' + minutes + ':' + seconds);
}

// convert a given game UT time into the equivalent "mm/dd/yyyy hh:mm:ss" in UTC
function UTtoDateTime(setUT, local = false, fullYear = true) {
  var d = KSA_CONSTANTS.FOUNDING_MOMENT.plus({seconds: setUT});

  // if we ask for KSC time, apply the proper UTC offset
  if (local) d = d.setZone("America/New_York");
  
  // take off the first two digits of the year?
  if (!fullYear) {
    var strDateTime = formatDateTime(d);
    var strDateTrunc = strDateTime.substr(0, strDateTime.lastIndexOf("/")+1);
    var strDateYear = strDateTime.split("/")[2].split(" ")[0];
    strDateYear = strDateYear.substr(2, 2);
    var strTime = strDateTime.split("@")[1];
    return strDateTrunc + strDateYear + " @" + strTime;
  } else return formatDateTime(d);
}

// convert a given game UT time into the local date time for the end user
function UTtoDateTimeLocal(setUT) {
  var d = KSA_CONSTANTS.FOUNDING_MOMENT.plus({seconds: setUT}).toLocal();
  return d.toLocaleString(luxon.DateTime.DATETIME_HUGE_WITH_SECONDS);
}

/**
 * Opens the time picker dialog to set a custom UT for viewing past events
 * @param {number} currentUT - The current UT to pre-populate the dialog with
 */
function openTimePicker(currentUT) {
  // Stop the tick timer while dialog is open
  if (KSA_TIMERS.tickTimer) {
    clearTimeout(KSA_TIMERS.tickTimer);
    KSA_TIMERS.tickTimer = null;
  }
  
  // Convert current UT to local date/time for display (as UTC)
  var d = KSA_CONSTANTS.FOUNDING_MOMENT.plus({seconds: currentUT});
  
  // Helper function to update the display of local time and UTC offset
  function updateTimeDisplay() {
    try {
      var month = parseInt($("#timePickerMonth").val()) || d.month;
      var day = parseInt($("#timePickerDay").val()) || d.day;
      var year = parseInt($("#timePickerYear").val()) || d.year;
      var hour = parseInt($("#timePickerHour").val()) || 0;
      var minute = parseInt($("#timePickerMinute").val()) || 0;
      var second = parseInt($("#timePickerSecond").val()) || 0;
      
      // Create UTC DateTime from inputs
      var utcDateTime = luxon.DateTime.utc(year, month, day, hour, minute, second);
      
      // Convert to New York time zone
      var nyDateTime = utcDateTime.setZone("America/New_York");
      
      // Format the display string
      var displayStr = "UTC: " + utcDateTime.toLocaleString(luxon.DateTime.DATETIME_FULL_WITH_SECONDS);
      displayStr += "<br>KSC Local: " + nyDateTime.toLocaleString(luxon.DateTime.DATETIME_FULL_WITH_SECONDS);
      displayStr += " (UTC" + (nyDateTime.offset >= 0 ? "+" : "") + (nyDateTime.offset / 60) + ")";
      
      $("#timePickerDisplay").html(displayStr);
    } catch (e) {
      $("#timePickerDisplay").html("Invalid date/time");
    }
  }
  
  // Build the dialog HTML with input fields
  var dialogHTML = "<div style='padding: 10px;'>";
  dialogHTML += "<p>Enter a date and time to view:</p>";
  dialogHTML += "<div style='margin-bottom: 15px;'>";
  dialogHTML += "<label style='display: inline-block; width: 80px;'>Date:</label>";
  dialogHTML += "<input type='number' id='timePickerMonth' style='width: 50px;' min='1' max='12' value='" + d.month + "' /> / ";
  dialogHTML += "<input type='number' id='timePickerDay' style='width: 50px;' min='1' max='31' value='" + d.day + "' /> / ";
  dialogHTML += "<input type='number' id='timePickerYear' style='width: 70px;' value='" + d.year + "' />";
  dialogHTML += "</div>";
  dialogHTML += "<div>";
  dialogHTML += "<label style='display: inline-block; width: 80px;'>Time:</label>";
  dialogHTML += "<input type='number' id='timePickerHour' style='width: 50px;' min='0' max='23' value='" + d.hour + "' /> : ";
  dialogHTML += "<input type='number' id='timePickerMinute' style='width: 50px;' min='0' max='59' value='" + d.minute + "' /> : ";
  dialogHTML += "<input type='number' id='timePickerSecond' style='width: 50px;' min='0' max='59' value='" + d.second + "' /> UTC";
  dialogHTML += "</div>";
  dialogHTML += "<p id='timePickerDisplay' style='margin-top: 15px; font-size: 11px; color: #666; text-align: center;'></p>";
  dialogHTML += "</div>";
  
  // Set dialog content and configure
  $("#siteDialog").html(dialogHTML);
  
  // Add input event listeners to update the display
  $("#timePickerMonth, #timePickerDay, #timePickerYear, #timePickerHour, #timePickerMinute, #timePickerSecond").on("input change", updateTimeDisplay);
  
  // Initial display update
  updateTimeDisplay();
  $("#siteDialog").dialog("option", "title", "Set Time");
  $("#siteDialog").dialog("option", "width", 400);
  $("#siteDialog").dialog("option", "buttons", [{
    text: "Apply",
    click: function() {
      try {
        // Get values from inputs
        var month = parseInt($("#timePickerMonth").val());
        var day = parseInt($("#timePickerDay").val());
        var year = parseInt($("#timePickerYear").val());
        var hour = parseInt($("#timePickerHour").val());
        var minute = parseInt($("#timePickerMinute").val());
        var second = parseInt($("#timePickerSecond").val());
        
        // Validate inputs
        if (isNaN(month) || isNaN(day) || isNaN(year) || isNaN(hour) || isNaN(minute) || isNaN(second)) {
          alert("Please enter valid numbers for all fields");
          return;
        }
        
        if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
          alert("Please enter valid date/time values");
          return;
        }
        
        // Create a luxon DateTime object from the input values (as UTC)
        var inputDateTime = luxon.DateTime.utc(year, month, day, hour, minute, second);
        
        // Convert to UT
        var newUT = dateToUT(inputDateTime);

        // don't let us go before the start of the Agency
        if (isNaN(newUT)) {
          newUT = 0;
        }
        
        // Build new URL with ut parameter
        var newUrl = window.location.href;
        if (!getParameterByName("ut")) {
          // Add ut parameter
          if (newUrl.includes("?")) newUrl += "&ut=" + Math.floor(newUT);
          else newUrl += "?ut=" + Math.floor(newUT);
        } else {
          // Replace existing ut parameter
          newUrl = newUrl.replace(/([?&])ut=[^&]*/, "$1ut=" + Math.floor(newUT));
        }
        newUrl += "&live";

        // Reload page with new URL
        window.location.href = newUrl;
        
      } catch (error) {
        handleError(error, "openTimePicker Apply", true);
      }
    }
  }, {
    text: "Cancel",
    click: function() {
      $("#siteDialog").dialog("close");
      KSA_TIMERS.tickTimer = setTimeout(tick, 1);
      if (ops.ascentData) ops.ascentData.isPaused = false;
    }
  }]);
  
  // Open the dialog
  $("#siteDialog").dialog("open");
}

function dateToUT(dateTime) {
  return luxon.Interval.fromDateTimes(KSA_CONSTANTS.FOUNDING_MOMENT, dateTime).count("milliseconds")/1000;
}

// https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript
function capitalizeFirstLetter(string) { return string.charAt(0).toUpperCase() + string.slice(1); }

// makes sure the current UT returned is proper for all considerations
// currently just convert from ms to s
function currUT(round = true) { 
  if (round) return Math.floor(ops.UT + (ops.tickDelta / 1000)); 
  else return ops.UT + (ops.tickDelta / 1000); 
}

// need to keep original date static so to get the current time we have to just update a new date object
function currTime() { return new Date(ops.clock.getTime() + ops.tickDelta); }

// conversion from true anomaly to mean anomaly in radians
// TRUE ANOMALY PASSED IN AS RADIANS
// referenced from matlab code: https://github.com/Arrowstar/ksptot/blob/master/helper_methods/astrodynamics/computeMeanFromTrueAnom.m
function toMeanAnomaly(truA, ecc) {
  if (ecc < 1.0) {
    var EA = (Math.atan2(Math.sqrt(1-(Math.pow(ecc,2)))*Math.sin(truA), ecc+Math.cos(truA)));
    if (truA < 2*Math.PI) EA = Math.abs(EA - (2*Math.PI) * Math.floor(EA / (2*Math.PI)));
    var mean = EA - ecc*Math.sin(EA);
    mean = Math.abs(mean - (2*Math.PI) * Math.floor(mean / (2*Math.PI)));
  } else {
    var num = Math.tan(truA/2);
    var denom = Math.pow((ecc+1)/(ecc-1),(1/2));
    var HA = 2*Math.atanh(num/denom);
    var mean = ecc*Math.sinh(HA)-HA;
  }
  return mean;
}

// convert from hex to RGB values
// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

// put all the fields from a recordset into an object
function rsToObj(data) {
  var object = {};
  var fields = data.split("`");
  if (data == "" || data == "null") return null;
  if (fields.length > 1) {
    fields.forEach(function(item) {
    
      // now get the name/value and assign the object
      var pair = item.split("~");
      if (pair[1] == "") {
        object[pair[0]] = null;
      } else {
        
        // check to make sure there are only two pairs
        // if there are more than two we need to combine everything after the first entry because they were separated using the same character
        if (pair.length > 2) {
          for (i=2; i<pair.length; i++) pair[1] += "~" + pair[i];
          object[pair[0]] = pair[1];
        } else {
          if ($.isNumeric(pair[1])) {
            object[pair[0]] = parseFloat(pair[1]);
          } else {
            if (pair[1].toLowerCase() == "false") object[pair[0]] = false;
            else if (pair[1].toLowerCase() == "true") object[pair[0]] = true;
            else object[pair[0]] = pair[1];
          }
        }
      }
    });
  } else object = null;
  return object;
}

// determine whether this is a touchscreen device 
// http://ctrlq.org/code/19616-detect-touch-screen-javascript
function is_touch_device() {
  return (('ontouchstart' in window)
          || (navigator.MaxTouchPoints > 0)
          || (navigator.msMaxTouchPoints > 0));
}

// gets values for URL parameters of the same name and returns them in an array
// http://stackoverflow.com/questions/22209307/how-to-get-multiple-parameters-with-same-name-from-a-url-in-javascript
function getQueryParams(name) {
  qs = location.search;
  var params = [];
  var tokens;
  var re = /[?&]?([^=]+)=([^&]*)/g;
  while (tokens = re.exec(qs)) { 
    if (decodeURIComponent(tokens[1]) == name)
    params.push(decodeURIComponent(tokens[2]));
  }
  return params;
}

// checks for cookies being enabled
// http://stackoverflow.com/questions/2167310/how-to-show-a-message-only-if-cookies-are-disabled-in-browser
function checkCookies() {
  var cookieEnabled = (navigator.cookieEnabled) ? true : false;
  if (typeof navigator.cookieEnabled == "undefined" && !cookieEnabled) { 
    document.cookie = "testcookie";
    cookieEnabled = (document.cookie.indexOf("testcookie") != -1) ? true : false;
  }
  return (cookieEnabled);
}

// cookie scripts from http://www.w3schools.com/js/js_cookies.asp
function setCookie(cname, cvalue, bset) {
  var d = new Date();
  var expires;
  
  // if true, the cookie is set for 5 years. If false, the cookie is deleted
  if (bset) var exdays = 1825;
  else var exdays = 0;
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  if (exdays) expires = "expires="+d.toUTCString();
  else expires = "expires=Thu, 18 Dec 2013 12:00:00 UTC";
  document.cookie = "ksaOps_" + cname + "=" + cvalue + "; " + expires +"; path=/";
}
function getCookie(cname) {
  var name = "ksaOps_" + cname + "=";
  var ca = document.cookie.split(';');
  for(var i=0; i<ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1);
    if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
  }
  return "";
}

// flashes some color on the element to bring attention to it
// https://stackoverflow.com/questions/38370854/making-a-div-flash-just-once
function flashUpdate(element, startColor, endColor) {
  $(element).animate({
    "background-color": startColor
  }, 50, function () {
    $(element).animate({
      "background-color": endColor
    }, 500);
  });
}

// http://cwestblog.com/2012/11/12/javascript-degree-and-radian-conversion/
Math.radians = function(degrees) { return degrees * Math.PI / 180; };
Math.degrees = function(radians) { return radians * 180 / Math.PI; };

// ==============================================================================
// MAP UTILITIES
// ==============================================================================

/**
 * Gets only the polyline layers from a Leaflet layer group, filtering out popups and other non-polyline layers
 * This is needed because popups added to layers affect the _layers collection
 * @param {L.LayerGroup|L.FeatureGroup} layerGroup - The layer group to filter
 * @returns {Array} Array of polyline layers
 */
function getPolylinesFromLayer(layerGroup) {
  return Object.values(layerGroup._layers).filter(function(layer) {
    return layer instanceof L.Polyline && !(layer instanceof L.Polygon);
  });
}

/**
 * Calculates the geodesic horizon radius for a given altitude
 * L.GeodesicCircle uses Earth's radius (6371 km), so we scale by ratio: Earth radius / Current Body radius
 * 
 * @param {number} altitude - Altitude in meters
 * @param {boolean} capAtMaxHorizon - Whether to cap at max visible distance (default: true)
 * @returns {number} The horizon radius for use with L.GeodesicCircle
 */
function calculateHorizonRadius(altitude, capAtMaxHorizon = true) {
  // Get current body radius from the catalog
  var bodyRadius = ops.bodyCatalog.find(o => o.selected === true).Radius;
  var scaleFactor = 6371 / bodyRadius;
  
  // Calculate horizon distance based on altitude
  // Formula: √(h * (2R + h)) where h is altitude and R is body radius
  var horizonRadius = Math.sqrt(altitude * (bodyRadius * 1000 * 2 + altitude)) * scaleFactor;
  
  // Cap at maximum theoretical visible distance if requested (default: true)
  // Half circumference = π * radius, reduced by 50.1% to avoid map projection artifacts
  if (capAtMaxHorizon) {
    var maxHorizon = Math.PI * bodyRadius * 1000 * scaleFactor * 0.499;
    if (horizonRadius > maxHorizon) horizonRadius = maxHorizon;
  }
  
  return horizonRadius;
}

/**
 * Creates a geodesic circle (horizon) around a marker at a given altitude
 * 
 * @param {L.LatLng|Array} latLng - The center point (marker position or [lat, lng])
 * @param {number} altitude - Altitude in meters
 * @param {object} options - Optional styling options
 * @param {string} options.color - Circle color (default: "#00ff3c")
 * @param {number} options.weight - Line weight (default: 2)
 * @param {boolean} options.fill - Whether to fill the circle (default: false)
 * @param {boolean} options.capAtMaxHorizon - Whether to cap at max visible distance (default: true)
 * @returns {L.GeodesicCircle} The created geodesic circle
 */
function addHorizonCircle(latLng, altitude, options = {}) {
  // Calculate the horizon radius
  var horizonRadius = calculateHorizonRadius(altitude, options.capAtMaxHorizon !== false);
  
  // Calculate steps based on radius - larger circles need more segments (min 50, ~1 step per 50km)
  // cap at 500 steps to avoid performance issues
  var steps = Math.max(50, Math.min(500, Math.floor(horizonRadius / 5000)));
  
  // Create the geodesic circle with provided or default options
  return new L.GeodesicCircle(latLng, {
    radius: horizonRadius,
    color: options.color || "#00ff3c",
    weight: options.weight !== undefined ? options.weight : 2,
    fill: options.fill !== undefined ? options.fill : false,
    steps: steps
  });
}

// recursive function to shorten text word by word until it all fits on two lines
function wrapText(limit, strText, fontSize) {

  // check if the text is too long for the length limit
  // take into account whether a line break has already been inserted or not
  if (strText.split("</br>")[0].width(fontSize + 'px arial') > limit) {

    // get all the words from the first line
    var words = strText.split("</br>")[0].split(" ");

    // put the first line back together except the last word
    var strModifiedText = words[0];
    for (word=1; word<words.length-1; word++) { strModifiedText += " " + words[word]; }

    // add the last word after re-inserting the break
    strModifiedText += "</br>" + words[words.length-1];

    // add whatever else may have already been wrapped on the second line
    if (strText.split("</br>").length > 1) strModifiedText += " " + strText.split("</br>")[1];

    // keep wrapping as needed
    return wrapText(limit, strModifiedText, fontSize);

  // no wrapping needed
  } else {

    // if there is a second line and it's only got 2-3 characters (likely a number) shorten the length to bring down one more word
    if (strText.split("</br>").length > 1 && strText.split("</br>")[1].length <= 3) return wrapText(limit-15, strText, fontSize);
    else return strText;
  }
}

// ==============================================================================
// IMAGE LOADING UTILITIES
// ==============================================================================

/**
 * Smoothly transitions an image by only changing its src attribute
 * Uses a crossfade effect where the new image fades in over the old one
 * Preserves all existing HTML attributes, classes, and event handlers
 * @param {string} elementSelector - jQuery selector for the container element or the img element itself
 * @param {string} newImageSrc - URL of the new image to load
 * @param {function} onComplete - Optional callback function after transition completes
 */
function loadImageWithTransition(elementSelector, newImageSrc, onComplete) {
  const $element = $(elementSelector);
  
  if (!$element.length) {
    console.warn(`Element ${elementSelector} not found`);
    return;
  }
  
  // Find the img element - either the element itself or within a container
  let $img = $element.is('img') ? $element : $element.find('img');
  
  if (!$img.length) {
    console.warn(`No img element found in ${elementSelector}`);
    return;
  }
  
  // Preload the new image
  const preloadImg = new Image();
  
  preloadImg.onload = function() {
    // Clone the current image to create the old layer
    const $oldImg = $img.clone();
    
    // Get the parent container of the image
    const $imgParent = $img.parent();
    
    // Make sure the immediate parent has relative positioning for absolute positioning to work
    const originalPosition = $imgParent.css('position');
    if (originalPosition === 'static') {
      $imgParent.css('position', 'relative');
    }
    
    // Get the actual computed position and dimensions of the image
    const imgOffset = $img.offset();
    const parentOffset = $imgParent.offset();
    
    // Position the old image absolutely on top (without z-index to preserve stacking context)
    $oldImg.css({
      'position': 'absolute',
      'top': (imgOffset.top - parentOffset.top) + 'px',
      'left': (imgOffset.left - parentOffset.left) + 'px',
      'width': $img.width() + 'px',
      'height': $img.height() + 'px'
    });
    
    // Insert the old image clone after the original
    $img.after($oldImg);
    
    // Update the original image src (it's now behind the clone)
    $img.attr('src', newImageSrc);
    $img.css('opacity', '0');
    
    // Trigger reflow to ensure the opacity change is registered
    $img[0].offsetHeight;
    
    // Fade in the new image and fade out the old one
    $img.css('opacity', '1');
    $oldImg.addClass('image-loading');
    
    // Remove the old image after transition completes
    setTimeout(function() {
      $oldImg.remove();
      
      // Callback after transition
      if (onComplete && typeof onComplete === 'function') {
        onComplete();
      }
    }, 300); // Match CSS transition duration
  };
  
  preloadImg.onerror = function() {
    console.error(`Failed to load image: ${newImageSrc}`);
    // Keep existing image on error
  };
  
  // Start loading the image
  preloadImg.src = newImageSrc;
}

/**
 * Smoothly transitions HTML content containing images with a crossfade effect
 * Useful when you need to replace entire container HTML that includes multiple images
 * @param {string} containerSelector - jQuery selector for the container element
 * @param {string} newHTML - New HTML content to insert
 * @param {function} onComplete - Optional callback function after transition completes
 */
function loadHTMLWithTransition(containerSelector, newHTML, onComplete) {
  const $container = $(containerSelector);
  
  if (!$container.length) {
    console.warn(`Container ${containerSelector} not found`);
    return;
  }
  
  // Count images in current content
  const currentImageCount = $container.find('img').length;
  
  // Extract image URLs from the new HTML to preload them
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = newHTML;
  const imageSrcs = Array.from(tempDiv.querySelectorAll('img')).map(img => img.src || img.getAttribute('src'));
  const newImageCount = imageSrcs.length;
  
  // If the number of images is changing, just replace without crossfade
  if (currentImageCount !== newImageCount) {
    $container.html(newHTML);
    if (onComplete && typeof onComplete === 'function') {
      onComplete();
    }
    return;
  }
  
  // If no images to preload, just do a simple fade transition
  if (imageSrcs.length === 0) {
    $container.fadeOut(150, function() {
      $container.html(newHTML);
      $container.fadeIn(150, onComplete);
    });
    return;
  }
  
  // Preload all images
  let loadedCount = 0;
  let hasError = false;
  
  const checkAllLoaded = function() {
    loadedCount++;
    if (loadedCount === imageSrcs.length && !hasError) {
      performTransition();
    }
  };
  
  const performTransition = function() {
    // Clone the current container content
    const $oldContent = $container.clone();
    
    // Get container position info
    const containerOffset = $container.offset();
    const containerPosition = $container.css('position');
    
    // Ensure container has relative or absolute positioning
    if (containerPosition === 'static') {
      $container.css('position', 'relative');
    }
    
    // Position the old content absolutely on top
    $oldContent.css({
      'position': 'absolute',
      'top': '0',
      'left': '0',
      'width': $container.width() + 'px',
      'height': $container.height() + 'px',
      'pointer-events': 'none'
    });
    
    // Insert new HTML (it will be behind the clone)
    $container.html(newHTML);
    $container.css('opacity', '0');
    
    // Add the old content on top
    $container.append($oldContent);
    
    // Trigger reflow
    $container[0].offsetHeight;
    
    // Fade in new content and fade out old content
    $container.css('opacity', '1');
    $oldContent.addClass('image-loading');
    
    // Remove old content after transition
    setTimeout(function() {
      $oldContent.remove();
      
      if (onComplete && typeof onComplete === 'function') {
        onComplete();
      }
    }, 300);
  };
  
  // Start preloading all images
  imageSrcs.forEach(function(src) {
    const img = new Image();
    img.onload = checkAllLoaded;
    img.onerror = function() {
      hasError = true;
      console.error(`Failed to preload image: ${src}`);
      // Fall back to immediate update on error
      $container.html(newHTML);
      if (onComplete && typeof onComplete === 'function') {
        onComplete();
      }
    };
    img.src = src;
  });
}

function openObjectTags(url, delimiter, urlAppend = "") {
  var strTags = null;
  if (ops.pageType == "vessel" && ops.currentVessel && ops.currentVessel.Catalog) {
     if (ops.currentVessel.Catalog.SiteTags) strTags = ops.currentVessel.Catalog.SiteTags;
     else strTags = ops.currentVessel.Catalog.DB;
  }
  else if (ops.pageType == "crew" && ops.currentCrew) strTags = ops.currentCrew.Background.Kerbal;
  else if (ops.pageType == "crewFull") {
    var arrTags = [];
    ops.crewMenu.forEach(function(kerbal) {
      arrTags.push(kerbal.db);
    });
    strTags = arrTags.join(delimiter);
  }
  else if (ops.pageType == "body" && ops.bodyCatalog) {

    // check if the body details dialog is open
    if ($("#figureDialog").dialog("isOpen")) {

      // load just the tags for that body
      strTags = $("#figureDialog").dialog("option", "title");
    
    // otherwise just use the selected body
    } else {
      var currBody = ops.bodyCatalog.find(o => o.selected === true);
      strTags = currBody.Body;

      // if this is a system, add all the names of the bodies in the system as tags too
      if ($("#contentTitle").html().includes("System")) {
        
        // Kerbol is a special case since planets do not have reference numbers
        if (currBody.Body == "Kerbol") {

          // add all bodies that don't have a Ref property (i.e., planets)
          ops.bodyCatalog.filter(o => !o.Ref).forEach(function(body) {
            if (body.Body !== "Kerbol") strTags += delimiter + body.Body;
          });
        } else {

          // add all bodies whose Ref matches the array index of the current body
          ops.bodyCatalog.filter(o => o.Ref == ops.bodyCatalog.findIndex(o => o.selected === true)).forEach(function(body) {
            strTags += delimiter + body.Body;
          });
        }
      }
    }
  }
  if (strTags) window.open(url + strTags + urlAppend, '_blank');
}