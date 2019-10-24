// number of ms from 1970/01/01 to 2016/09/13
// used as a base when calculating time since KSA began
var foundingMoment = 1473739200000;

// for retrieving URL query strings
// http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

// calculate the width of text
// https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript
String.prototype.width = function(font) {
  var f = font || '12px arial',
      o = $('<div>' + this + '</div>')
            .css({'position': 'absolute', 'float': 'left', 'white-space': 'nowrap', 'visibility': 'hidden', 'font': f})
            .appendTo($('body')),
      w = o.width();
  o.remove();
  return w;
}

// call up an AJAX query and assign it to a callback function
// https://www.w3schools.com/xml/ajax_xmlhttprequest_response.asp
function loadDB(url, cFunction) {
  console.log(url);
  var xhttp;
  xhttp=new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      cFunction(this);
    }
  };
  xhttp.open("GET", url, true);
  xhttp.send();
}

// take an amount of time in seconds and convert it to years, days, hours, minutes and seconds
// leave out any values that are not necessary (0y, 0d won't show, for example)
// give seconds to 5 significant digits if precision is true
function formatTime(time, precision = false) {
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
    ydhms += hours + "h ";
  }

  if (time >= 60) {
    minutes = Math.floor(time / 60);
    time -= minutes * 60;
    ydhms += minutes + "m ";
  }
  
  if (precision) {
    time = numeral(time).format('0.000');
  } else {
    time = Math.floor(time);
  }
  
  if ( time < 10) {
    seconds = "0" + time
  }
  else seconds = time;

  return ydhms += seconds + "s";
}

// take a date object of a given time and output "mm/dd/yyyy hh:mm:ss"
function formatDateTime(time) {
  var hours = time.getUTCHours(); 
  var day = time.getUTCDate();
  if (hours < 0) { hours += 24; }
  if (hours < 10) { hours = "0" + hours; }
  var minutes = time.getUTCMinutes();
  if (minutes < 10) { minutes = "0" + minutes; }
  var seconds = time.getUTCSeconds();
  if (seconds < 10) { seconds = "0" + seconds; }
  return ((time.getUTCMonth()+1) + '/' + day + '/' + time.getUTCFullYear() + ' @ ' + hours + ':' + minutes + ':' + seconds);
}

// convert a given game UT time into the equivalent "mm/dd/yyyy hh:mm:ss" in UTC
function UTtoDateTime(setUT, local = false, fullYear = true) {
  var d = new Date();
  d.setTime(foundingMoment + (setUT * 1000));
  if (d.toString().search("Standard") >= 0) { d.setTime(foundingMoment + ((setUT + 3600) * 1000)); }

  // if we ask for local time, apply the proper UTC offset
  if (local) d.setUTCHours(d.getUTCHours() - UTC);
  
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
  var d = new Date();
  d.setTime(foundingMoment + (setUT * 1000));
  if (d.toString().search("Standard") >= 0) { d.setTime(foundingMoment + ((setUT + 3600) * 1000)); }
  return d.toString();
}

function dateTimetoUT(dateTime) {
  var setUT = ((dateTime.getTime() - foundingMoment) / 1000);
  if (dateTime.toString().search("Standard") >= 0) { setUT += 3600; }
  return setUT;
}

// https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// makes sure the current UT returned is proper for all considerations
// currently just convert from ms to s
function currUT(round) { 
  if (round) return Math.floor(UT + (tickDelta / 1000)); 
  else return UT + (tickDelta / 1000); 
}

// need to keep original date static so to get the current time we have to just update a new date object
function currTime() { return new Date(clock.getTime() + tickDelta); }

// conversion from true anomaly to mean anomaly in radians
// TRUE ANOMALY PASSED IN AS DEGREES
// referenced from matlab code: https://github.com/Arrowstar/ksptot/blob/master/helper_methods/astrodynamics/computeMeanFromTrueAnom.m
function toMeanAnomaly(truA, ecc) {
  truA *= .017453292519943295;
  if (ecc < 1.0) {
    var EA = (Math.atan2(Math.sqrt(1-(Math.pow(ecc,2)))*Math.sin(truA), ecc+Math.cos(truA)));
    if (truA < 2*Math.PI) {
      EA = Math.abs(EA - (2*Math.PI) * Math.floor(EA / (2*Math.PI)));
    }
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

// put all the fields from a recordset into an object
function rsToObj(data) {
  var object = {};
  var fields = data.split("`");
  if (data == "" || data == "null") return null;
  if (fields.length > 1) {
    fields.forEach(function(item, index) {
    
      // now get the name/value and assign the object
      var pair = item.split("~");
      if (pair[1] == "") {
        object[pair[0]] = null;
      } else {
        
        // check to make sure there are only two pairs
        // if there are more than two we need to combine everything after the first entry because they were separated using the same character
        if (pair.length > 2) {
          for (i=2; i<pair.length; i++) { pair[1] += "~" + pair[i]; }
          object[pair[0]] = pair[1];
        } else {
          if ($.isNumeric(pair[1])) {
            object[pair[0]] = parseFloat(pair[1]);
          } else {
            if (pair[1].toLowerCase() == "false") { object[pair[0]] = false; }
            else if (pair[1].toLowerCase() == "true") { object[pair[0]] = true; }
            else object[pair[0]] = pair[1];
          }
        }
      }
    });
  } else { object = null; }
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

  while (tokens = re.exec(qs))
  { 
    if (decodeURIComponent(tokens[1]) == name)
    params.push(decodeURIComponent(tokens[2]));
  }
  return params;
}

// checks for cookies being enabled
// http://stackoverflow.com/questions/2167310/how-to-show-a-message-only-if-cookies-are-disabled-in-browser
function checkCookies() {
  var cookieEnabled = (navigator.cookieEnabled) ? true : false;
  if (typeof navigator.cookieEnabled == "undefined" && !cookieEnabled)
  { 
    document.cookie="testcookie";
    cookieEnabled = (document.cookie.indexOf("testcookie") != -1) ? true : false;
  }
  return (cookieEnabled);
}

// cookie scripts from http://www.w3schools.com/js/js_cookies.asp
function setCookie(cname, cvalue, bset) {
  var d = new Date();
  var expires;
  
  // if true, the cookie is set for 5 years. If false, the cookie is deleted
  if (bset) { var exdays = 1825; }
  else { var exdays = 0; }
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  if (exdays) { expires = "expires="+d.toUTCString(); }
  else { expires = "expires=Thu, 18 Dec 2013 12:00:00 UTC"; }
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

// flashes some color on the element to bring attention to it when it updates
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
Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};
Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
};

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
    if (strText.split("</br>").length > 1 && strText.split("</br>")[1].length <= 3) {
      return wrapText(limit-15, strText, fontSize);
    } else {
      return strText;
    }
  }
}