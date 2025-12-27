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
 * Call up an AJAX query and assign it to a callback function
 * Enhanced with error handling
 * @param {string} url - The URL to request
 * @param {function} cFunction - Callback function on success
 * @param {*} data - Optional data to pass to callback
 */
function loadDB(url, cFunction, data) {
  console.log(url);
  var xhttp;
  
  try {
    xhttp = new XMLHttpRequest();
    
    xhttp.onreadystatechange = function() {
      try {
        if (this.readyState == 4) {
          if (this.status == 200) {
            cFunction(this, data);
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

// convert a given date object to game UT
function dateObjtoUT(dateTime) {
  var setUT = ((dateTime.getTime() - KSA_CONSTANTS.FOUNDING_MOMENT) / 1000);
  if (ops.UTC == 5) setUT += 3600;
  return setUT;
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