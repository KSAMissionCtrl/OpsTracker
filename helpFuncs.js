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
  if (html === null || html === undefined) return '';
  if (typeof html !== 'string') html = String(html);
  
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// ==============================================================================
// CHANGE DETECTION UTILITIES
// ==============================================================================

/**
 * Generates a hash for content to detect changes
 * @param {*} content - Content to hash (will be stringified)
 * @returns {string|null} Hash string or null if no content
 */
function hashContent(content) {
  if (!content && content !== 0) return null;
  let hash = 0;
  const str = String(content);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Checks if content has changed since last visit (read-only, doesn't modify storage)
 * @param {string} itemId - Unique identifier for the item (vessel/crew DB)
 * @param {string} fieldId - Field identifier
 * @param {*} currentContent - Current content to check
 * @returns {boolean} True if content has changed, false if no change or first visit
 */
function checkContentChanged(itemId, fieldId, currentContent) {
  try {
    const storageKey = `ksaOps_hashes_${itemId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) return false; // First visit, no stored hashes
    
    const hashes = JSON.parse(stored);
    if (!hashes[fieldId]) return false; // First time seeing this field
    
    const currentHash = hashContent(currentContent);
    return hashes[fieldId] !== currentHash; // Return true only if different
  } catch (error) {
    handleError(error, 'checkContentChanged');
    return false;
  }
}

/**
 * Updates a single field hash to mark it as seen
 * @param {string} itemId - Unique identifier for the item (vessel/crew DB)
 * @param {string} fieldId - Field identifier
 * @param {*} currentContent - Current content to save
 */
function updateContentHash(itemId, fieldId, currentContent) {
  try {
    const storageKey = `ksaOps_hashes_${itemId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      const hashes = JSON.parse(stored);
      hashes[fieldId] = hashContent(currentContent);
      localStorage.setItem(storageKey, JSON.stringify(hashes));
    }
  } catch (error) {
    handleError(error, 'updateContentHash');
  }
}

/**
 * Clears all temporary hash storage used for past UT viewing
 * Called when loading the site with isLivePastUT flag
 */
function clearTempHashStorage() {
  try {
    const keysToRemove = [];
    
    // Find all temp hash keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ksaOps_hashes_temp_')) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all temp hash keys
    // and the temp lastVisit key
    keysToRemove.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('ksaOps_lastVisit_temp');
  } catch (error) {
    handleError(error, 'clearTempHashStorage');
  }
}

/**
 * Adds change indicator icon to an element if content has changed
 * Routes to crew or vessel specific implementation
 * @param {string} elementId - jQuery selector for the element
 * @param {string} itemId - Unique identifier for the item (vessel/crew DB)
 * @param {string} fieldId - Field identifier for hash lookup
 * @param {*} currentContent - Current content to check against stored hash
 * @returns {boolean} - True if content has changed, false otherwise
 */
function addChangeIndicator(elementId, itemId, fieldId, currentContent) {
  // Route to appropriate implementation
  if (ops.currentVessel && ops.currentVessel.Catalog && itemId === ops.currentVessel.Catalog.DB) {
    return addVesselChangeIndicator(elementId, itemId, fieldId, currentContent);
  } else {
    return addCrewChangeIndicator(elementId, itemId, fieldId, currentContent);
  }
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
        o = $('<div>').text(String(this))
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
 * Fetches and parses a line-delimited JSON.txt archive file.
 * Each JSON object spans multiple lines, opening with '{' and closing with '},' or '}]'.
 * (.json.txt extension is used to avoid MIME type issues on the server.)
 *
 * @param {string}   url              - Full URL to the .json.txt file
 * @param {function} callback         - Called with (err, objects[]) on completion
 * @param {function} [progressCallback] - Optional: called with (loaded, total, lengthComputable) during download
 * @param {function} [itemCallback]   - Optional: called with each parsed object as it is decoded
 *                                      during download, before the full file has arrived.
 *                                      When provided, incremental parsing is active; otherwise
 *                                      the full response is parsed in one pass after download.
 */
function loadJsonTxt(url, callback, progressCallback, itemCallback) {
  // Date-based cache busting so same-day visits share the browser cache
  var cacheBuster = new Date().toISOString().split('T')[0];
  var urlWithCacheBuster = url + (url.indexOf('?') !== -1 ? '&_=' : '?_=') + cacheBuster;

  var xhr = new XMLHttpRequest();
  xhr.open('GET', urlWithCacheBuster, true);

  var objects = [];

  if (itemCallback) {
    // ── Incremental parse path ───────────────────────────────────────────────
    // State shared across onprogress calls.
    var _parseBuffer     = '';
    var _insideObject    = false;
    var _insideSubobj    = false;
    var _processedLength = 0;
    var _lineRemainder   = '';   // incomplete line held over from the previous chunk

    // Run one raw line through the same state machine as the original batch parser.
    function _processLine(line) {
      var trimmed = line.trim();

      if (trimmed.indexOf('{') === 0 && !_insideObject) {
        _insideObject = true;
        _parseBuffer  = '';
      }

      if (trimmed.indexOf('[') !== -1 && trimmed.indexOf(']') === -1 && _insideObject) {
        _insideSubobj = true;
      }

      if (trimmed.indexOf(']') !== -1 && _insideSubobj) {
        _insideSubobj = false;
      }

      if (!_insideSubobj && _insideObject && (trimmed === '},' || trimmed === '}]')) {
        _parseBuffer += '}';
        try {
          var obj = JSON.parse(_parseBuffer);
          objects.push(obj);
          itemCallback(obj);
        } catch (e) {
          console.error('[loadJsonTxt] Parse error:', e, _parseBuffer.substring(0, 100));
        }
        _insideObject = false;
        _parseBuffer  = '';
      } else {
        _parseBuffer += line;
      }
    }

    // Process only the newly arrived text since the last onprogress call.
    // Prepend any partial line left over from before, then hold the new tail.
    function _processNewText(newText) {
      var combined = _lineRemainder + newText;
      var lines    = combined.split('\n');
      _lineRemainder = lines.pop();            // last element may be an incomplete line
      for (var i = 0; i < lines.length; i++) {
        _processLine(lines[i]);
      }
    }

    xhr.onprogress = function(e) {
      if (progressCallback) progressCallback(e.loaded, e.total, e.lengthComputable);
      var newText      = xhr.responseText.slice(_processedLength);
      _processedLength = xhr.responseText.length;
      _processNewText(newText);
    };

    xhr.onload = function() {
      if (xhr.status !== 200) {
        callback(new Error('Failed to load: ' + url + ' (HTTP ' + xhr.status + ')'), null);
        return;
      }
      // Flush text that arrived after the last onprogress event.
      var remaining = xhr.responseText.slice(_processedLength);
      _processNewText(remaining);
      // Flush any trailing incomplete line (e.g. closing `}]` with no trailing newline).
      if (_lineRemainder.trim()) _processLine(_lineRemainder);
      callback(null, objects);
    };

  } else {
    // ── Original batch-parse path (unchanged; used by all existing callers) ──
    if (progressCallback) {
      xhr.onprogress = function(e) {
        progressCallback(e.loaded, e.total, e.lengthComputable);
      };
    }

    xhr.onload = function() {
      if (xhr.status !== 200) {
        callback(new Error('Failed to load: ' + url + ' (HTTP ' + xhr.status + ')'), null);
        return;
      }

      var lines = xhr.responseText.split('\n');
      var buffer = '';
      var insideObject = false;
      var insideSubobj = false;

      for (var i = 0; i < lines.length; i++) {
        var trimmed = lines[i].trim();

        if (trimmed.indexOf('{') === 0 && !insideObject) {
          insideObject = true;
          buffer = '';
        }

        if (trimmed.indexOf('[') !== -1 && trimmed.indexOf(']') === -1 && insideObject) {
          insideSubobj = true;
        }

        if (trimmed.indexOf(']') !== -1 && insideSubobj) {
          insideSubobj = false;
        }

        if (!insideSubobj && insideObject && (trimmed === '},' || trimmed === '}]')) {
          buffer += '}';
          try {
            objects.push(JSON.parse(buffer));
          } catch (e) {
            console.error('[loadJsonTxt] Parse error:', e, buffer.substring(0, 100));
          }
          insideObject = false;
        } else {
          buffer += lines[i];
        }
      }

      callback(null, objects);
    };
  }

  xhr.onerror = function() {
    callback(new Error('Network error loading: ' + url), null);
  };

  xhr.send();
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
  return time.toFormat("M/d/yyyy '@' HH:mm:ss");
}

// convert a given game UT time into the equivalent "mm/dd/yyyy hh:mm:ss" in UTC
function UTtoDateTime(setUT, local = false, fullYear = true) {
  var d = KSA_CONSTANTS.FOUNDING_MOMENT.plus({seconds: setUT});

  // if we ask for KSC time, apply the proper UTC offset
  if (local) d = d.setZone("America/New_York");
  
  // take off the first two digits of the year?
  if (!fullYear) return d.toFormat("M/d/yy '@' HH:mm:ss");
  else return formatDateTime(d);
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
      
      // Format the display string with validity check
      var utcStr = utcDateTime.isValid
        ? utcDateTime.toLocaleString(luxon.DateTime.DATETIME_FULL_WITH_SECONDS)
        : '<strong style="color: red;">Invalid DateTime</strong>';
      var nyStr = nyDateTime.isValid
        ? nyDateTime.toLocaleString(luxon.DateTime.DATETIME_FULL_WITH_SECONDS)
        : '<strong style="color: red;">Invalid DateTime</strong>';
      var offsetValue = nyDateTime.isValid
        ? (nyDateTime.offset >= 0 ? "+" : "") + (nyDateTime.offset / 60)
        : '<strong style="color: red;">NaN</strong>';
      
      var displayStr = "UTC: " + utcStr;
      displayStr += "<br>KSC Local: " + nyStr;
      displayStr += " (UTC" + offsetValue + ")";
      
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
  $("#siteDialog").dialog("option", {
    title: "Set Time",
    width: 400,
    buttons: [{
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
        if (isNaN(newUT) || newUT < 0) {
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

        // only attach a reload if the time we are jumping to is in the future
        if (newUT >= currUT()) newUrl += "&reload";

        // reshow the map if it is open
        if (KSA_UI_STATE.isMapShown) newUrl += "&map";

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
  }]});
  
  // Open the dialog
  $("#siteDialog").dialog("open");
}

function dateToUT(dateTime) {
  return Math.floor(dateTime.diff(KSA_CONSTANTS.FOUNDING_MOMENT, "seconds").seconds);
}

// Check if any elements have an active spinner
// Only checks elements with jQuery data attached for efficiency
function stillSpinning() {
  var hasSpinner = false;
  $('*').each(function() {
    var data = $(this).data();

    // Check if spinner exists and is active (has an el property)
    if (data && data.spinner && data.spinner.el) {
      hasSpinner = true;
      return false; // break out of each() loop early
    }
  });
  
  return hasSpinner;
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

// ---------------------------------------------------------------------------
// Phase 2: Kepler / orbit math for Three.js scene
// ---------------------------------------------------------------------------

// Solve Kepler's equation M = E - e*sin(E) for eccentric anomaly E
// using Newton-Raphson iteration (mirrors the GGB spreadsheet logic).
// meanAnomaly and return value are in radians.
function solveKeplerEquation(meanAnomaly, eccentricity, iterations) {
  if (iterations === undefined) iterations = 20;
  var M = meanAnomaly;
  var e = eccentricity;

  if (e >= 1) {
    // Hyperbolic Kepler equation: e·sinh(F) − F = Mh
    // Robust initial guess for large |Mh| (avoids overflow in sinh for bad starts)
    var F = (Math.abs(M) < 1) ? M : Math.sign(M) * Math.log(2 * Math.abs(M) / e + 1.8);
    for (var i = 0; i < iterations; i++) {
      var denom = e * Math.cosh(F) - 1;
      if (Math.abs(denom) < 1e-12) break;
      F = F - (e * Math.sinh(F) - F - M) / denom;
    }
    return F;
  }

  var E = M; // initial guess (elliptic)
  for (var i = 0; i < iterations; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

// Return current mean anomaly given initial mean anomaly, mean motion (rad/s),
// current universal time and the epoch at which mean anomaly was recorded.
// For elliptic orbits (ecc < 1) the result is wrapped to [0, 2π).
// For hyperbolic orbits (ecc >= 1) the hyperbolic mean anomaly is unbounded — no wrapping.
function computeMeanAnomalyAtUT(mean0, meanMotion, UT, epoch, ecc) {
  var M = mean0 + meanMotion * (UT - epoch);
  if (!ecc || ecc < 1) {
    M = M - (2 * Math.PI) * Math.floor(M / (2 * Math.PI));
    if (M < 0) M += 2 * Math.PI;
  }
  return M;
}

// Build the rotation matrix for an orbit defined by inc, raan, arg.
// Returns a THREE.Matrix4 that transforms a point in the orbital plane
// (X = along periapsis direction, Y = 90° ahead) into the world frame.
// Rotation sequence matches GGB: Z-rotation by RAAN, then X-rotation by inc,
// then Z-rotation by arg (argument of periapsis).
function _orbitRotationMatrix(inc, raan, arg) {
  var m = new THREE.Matrix4();
  // THREE.js Euler order 'ZXZ' isn't a built-in preset so we compose manually.
  var mRaan = new THREE.Matrix4().makeRotationZ(raan);
  var mInc  = new THREE.Matrix4().makeRotationX(inc);
  var mArg  = new THREE.Matrix4().makeRotationZ(arg);
  m.multiplyMatrices(mRaan, mInc);
  m.multiplyMatrices(m, mArg);
  return m;
}

// Sample an orbit ellipse into an array of THREE.Vector3 world-space points.
// Uses adaptive sampling: for eccentric orbits, points are distributed uniformly
// in true anomaly (θ) rather than eccentric anomaly (E).  This concentrates
// samples near periapsis—where the ellipse has the tightest curvature—ensuring
// the PE node marker sits accurately on the rendered curve.  The total point
// count is scaled up by TWO independent factors so that both high eccentricity
// and small SMA are properly handled:
//
//   eccScale  = 1 + 2·ecc²   — pure eccentricity factor; ensures high-ecc
//                               large-SMA orbits (e.g. comet-like) stay smooth.
//   rhoScale  = √(ρ_ref / ρ_pe) where ρ_pe = sma·(1−ecc²)
//                             — periapsis radius-of-curvature factor; a tighter
//                               nose (smaller ρ_pe) needs more samples.
//                               ρ_ref = 2000 km is the baseline: any orbit with
//                               ρ_pe ≥ 2000 km gets rhoScale ≤ 1 (no boost from
//                               this term), while low-SMA or extreme-ecc orbits
//                               get proportionally more points.
//
// The larger of the two scales is used, capped at 6× numPoints.
// Near-circular orbits (ecc ≤ 0.05) use uniform eccentric anomaly directly
// (identical to uniform θ for a circle) but still benefit from the SMA scaling.
//
// sma: semi-major axis (scene units / km), ecc: eccentricity, inc/raan/arg: radians.
// soiR (optional): SOI radius in km.  When provided for hyperbolic orbits, the arc is
// clipped to the SOI sphere boundary rather than extending to near-infinity.
function orbitalElementsToEllipsePoints(sma, ecc, inc, raan, arg, numPoints, soiR) {
  if (!numPoints) numPoints = 128;
  var rot = _orbitRotationMatrix(inc, raan, arg);
  var points = [];

  if (ecc >= 1) {
    // ── Hyperbolic orbit: open arc ────────────────────────────────────────────
    // KSP stores hyperbolic SMA as negative; all geometry uses the magnitude.
    var absSma = Math.abs(sma);
    var b      = absSma * Math.sqrt(ecc * ecc - 1); // semi-conjugate axis

    // Arc limit F_max — prefer SOI-derived, fall back to 99% of asymptote.
    // From r = absSma·(ecc·cosh F − 1) = soiR  →  cosh F = (soiR/absSma + 1) / ecc
    var FMax;
    if (soiR > 0) {
      var coshFMax = (soiR / absSma + 1) / ecc;
      if (coshFMax >= 1) FMax = Math.acosh(coshFMax);
    }
    if (!FMax) {
      // Fallback: cover 99% of the asymptote angle
      var thetaMax  = Math.acos(-1 / ecc) * 0.99;
      var sqrtRatio = Math.sqrt((ecc - 1) / (ecc + 1));
      FMax = 2 * Math.atanh(sqrtRatio * Math.tan(thetaMax / 2));
    }

    for (var i = 0; i <= numPoints; i++) {
      var F = -FMax + (2 * FMax * i) / numPoints;
      // Orbital-plane position (focus at origin, periapsis on +x):
      //   x = absSma·(ecc − cosh F),   y = b·sinh F
      var v = new THREE.Vector3(absSma * ecc - absSma * Math.cosh(F), b * Math.sinh(F), 0);
      v.applyMatrix4(rot);
      points.push(v);
    }
    return points;
  }

  // ── Elliptic orbit: closed loop ───────────────────────────────────────────
  // ρ_pe = radius of curvature of the ellipse at periapsis = sma·(1−ecc²).
  // Larger scale factors → more vertices → smoother periapsis nose.
  var _RHO_REF_KM = 2000;
  var rhoPe    = Math.max(sma * (1 - ecc * ecc), 1);
  var eccScale = 1 + 2 * ecc * ecc;                      // ≥ 1 always
  var rhoScale = Math.sqrt(_RHO_REF_KM / rhoPe);         // > 1 when ρ_pe < ρ_ref
  var count    = Math.min(Math.round(numPoints * Math.max(eccScale, rhoScale)), numPoints * 6);

  var b   = sma * Math.sqrt(1 - ecc * ecc); // semi-minor axis
  var c   = sma * ecc;                       // focus → ellipse-centre distance
  var sqrtOnePlusEcc  = Math.sqrt(1 + ecc);
  var sqrtOneMinusEcc = Math.sqrt(1 - ecc);

  for (var i = 0; i <= count; i++) {
    var E;
    if (ecc <= 0.05) {
      // Near-circular: uniform eccentric anomaly (identical to uniform θ here).
      E = (2 * Math.PI * i) / count;
    } else {
      // Eccentric orbit: sample uniformly in true anomaly θ, then convert to E.
      // tan(E/2) = sqrt((1-ecc)/(1+ecc)) · tan(θ/2)
      // Using atan2 for full-quadrant correctness across [0, 2π).
      var theta     = (2 * Math.PI * i) / count;
      var halfTheta = theta / 2;
      E = 2 * Math.atan2(
        sqrtOneMinusEcc * Math.sin(halfTheta),
        sqrtOnePlusEcc  * Math.cos(halfTheta)
      );
    }

    // Position in orbital plane (focus at origin):
    //   x = sma·cos(E) − c,   y = b·sin(E)
    var v = new THREE.Vector3(sma * Math.cos(E) - c, b * Math.sin(E), 0);
    v.applyMatrix4(rot);
    points.push(v);
  }
  return points;
}

// Return the world-space THREE.Vector3 position for a single point on the orbit.
// For elliptic orbits (ecc < 1) the anomaly argument is the eccentric anomaly E.
// For hyperbolic orbits (ecc >= 1) it is the hyperbolic anomaly F.
function positionOnOrbit(sma, ecc, inc, raan, arg, eccentricAnomaly) {
  var rot = _orbitRotationMatrix(inc, raan, arg);
  var v;
  if (ecc >= 1) {
    // Hyperbolic: x = |a|·(ecc − cosh F),  y = |a|·√(ecc²−1)·sinh F
    var absSma = Math.abs(sma);
    var b = absSma * Math.sqrt(ecc * ecc - 1);
    var F = eccentricAnomaly;
    v = new THREE.Vector3(absSma * ecc - absSma * Math.cosh(F), b * Math.sinh(F), 0);
  } else {
    // Elliptic: x = sma·cos(E) − c,  y = b·sin(E)
    var b = sma * Math.sqrt(1 - ecc * ecc);
    var c = sma * ecc;
    var E = eccentricAnomaly;
    v = new THREE.Vector3(sma * Math.cos(E) - c, b * Math.sin(E), 0);
  }
  v.applyMatrix4(rot);
  return v;
}

// Compute key orbital node positions in world space.
// Returns { periapsis, apoapsis, ascendingNode, descendingNode } as THREE.Vector3.
// apoapsis is null for hyperbolic orbits (ecc >= 1).
// ascendingNode / descendingNode are null when the node lies outside the physical arc
// of a hyperbolic trajectory (i.e. the orbit never crosses the reference plane).
function computeNodePositions(sma, ecc, inc, raan, arg) {
  var rot    = _orbitRotationMatrix(inc, raan, arg);
  var absSma = (ecc >= 1) ? Math.abs(sma) : sma; // KSP stores hyperbolic SMA as negative

  // Semi-latus rectum (always positive regardless of orbit type)
  var p = absSma * Math.abs(1 - ecc * ecc);

  // Periapsis: at F=0 (hyperbolic) or E=0 (elliptic)
  //   Hyperbolic: x = |a|*(ecc−1)   Elliptic: x = sma*(1−ecc)
  var peX = (ecc >= 1) ? absSma * (ecc - 1) : sma * (1 - ecc);
  var pe  = new THREE.Vector3(peX, 0, 0).applyMatrix4(rot);

  // Apoapsis: elliptic only (E = π → x = −sma*(1+ecc))
  var ap = (ecc < 1) ? new THREE.Vector3(-(absSma * (1 + ecc)), 0, 0).applyMatrix4(rot) : null;

  // Ascending / descending nodes: where orbit crosses the reference plane (Z=0).
  // True anomaly of AN = −arg, DN = π − arg (in the orbital plane before RAAN/inc rotation).
  // For hyperbolic orbits these nodes may lie outside the physical arc; return null in that case.
  var an = null, dn = null;
  if (inc === 0) {
    // Coplanar — nodes are degenerate; callers should hide them
    an = pe.clone();
    dn = ap ? ap.clone() : pe.clone();
  } else {
    // Valid arc limit: for hyperbolic, |θ| must be < arccos(−1/ecc)
    var thetaLimit = (ecc >= 1) ? Math.acos(-1 / ecc) : Math.PI;

    // Normalise angles to (−π, π] so the limit check is straightforward
    function normalise(a) { return a - 2 * Math.PI * Math.round(a / (2 * Math.PI)); }
    var thetaAN = normalise(-arg);
    var thetaDN = normalise(Math.PI - arg);

    function nodeAt(theta) {
      if (Math.abs(theta) > thetaLimit) return null; // outside hyperbolic arc
      var r = p / (1 + ecc * Math.cos(theta));
      if (r <= 0 || !isFinite(r)) return null;
      return new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), 0).applyMatrix4(rot);
    }

    an = nodeAt(thetaAN);
    dn = nodeAt(thetaDN);
  }
  return { periapsis: pe, apoapsis: ap, ascendingNode: an, descendingNode: dn };
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

// shared Tipped onShow callback - dismisses change indicators when a tooltip is opened
function onTooltipShow(content, element) {
  $(element).closest('[id^="dataField"]').find('.change-indicator').animate({
    opacity: 0,
    right: '-20px'
  }, 300, function() {
    $(this).remove();
  });
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
  return layerGroup.getLayers().filter(function(layer) {
    return layer instanceof L.Polyline && !(layer instanceof L.Polygon);
  });
}

/**
 * Mirrors L.Rrose's internal direction logic to determine which way it would open at a given position.
 * Used to avoid recreating the popup unless the opening direction actually needs to change.
 * @param {L.Map} map - The Leaflet map instance
 * @param {L.LatLng} latlng - The position to evaluate
 * @returns {string} Direction string: 'n', 's', 'ne', 'nw', 'se', or 'sw'
 */
function getRroseDirection(map, latlng) {
  var x_bound = 80, y_bound = 80;
  var pt = map.latLngToContainerPoint(latlng);
  var pos = 'n';
  if (y_bound - pt.y > 0) pos = 's';
  var x_diff = pt.x - (map.getSize().x - x_bound);
  if (x_diff > 0) pos += 'w';
  else if (x_bound - pt.x > 0) pos += 'e';
  return pos;
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
      'pointer-events': 'none',
      'opacity': '1',
      'transition': 'opacity 0.3s ease-in-out'
    });
    
    // Insert new HTML (it will be behind the clone)
    $container.html(newHTML);
    
    // Add the old content on top
    $container.append($oldContent);
    
    // Trigger reflow to ensure the transition is registered
    $oldContent[0].offsetHeight;
    
    // Fade out old content (new content is already visible underneath)
    $oldContent.css('opacity', '0');
    
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

    // this de-generalizes the function a bit by expecting certain URLs
     if (url.includes(".agency")) {
      if (ops.currentVessel.Catalog.SiteTags) strTags = ops.currentVessel.Catalog.SiteTags;
      else strTags = ops.currentVessel.Catalog.DB;
     }
     else if (url.includes("flickr")) {
      if (ops.currentVessel.Catalog.ImgTags) strTags = ops.currentVessel.Catalog.ImgTags;
      else strTags = ops.currentVessel.Catalog.DB.replace("-", "");
     }
  }
  else if (ops.pageType == "crew" && ops.currentCrew) strTags = ops.currentCrew.Background.Kerbal;
  else if (ops.pageType == "crewFull") {
    var arrTags = [];
    ops.crewMenu.forEach(function(kerbal) {
      arrTags.push(kerbal.db);
    });
    strTags = arrTags.join(delimiter);
  }
  else if (ops.pageType == "atn") {
    strTags = "atn";
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

// allows the use of a full URL to an image or just a name that can be appended to a base URL
// if the source has an imgur link it will pull from a local cache
// this is just for backwards DB compatibility so no changes need to be made
function imageURLFromDB(urlTarget, urlSource) {
  if (!urlSource.includes("http")) return urlTarget + urlSource + ".png";
  else {
    if (urlSource.includes("imgur")) return "http://www.kerbalspace.agency/Tracker/images/imgur/" + urlSource.split("/").pop();
    else return urlSource;
  }
}