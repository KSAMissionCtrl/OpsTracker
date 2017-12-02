// number of ms from 1970/01/01 to 2016/09/13
// used as a base when calculating time since KSA began
var foundingMoment = 1473742800000;

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
function formatTime(time, precision) {
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
function formatUTCTime(time, local) {
  if (local) { var hours = time.getUTCHours() - UTC; }
  else { var hours = time.getUTCHours(); }
  if (hours < 0) { hours += 24; }
  if (hours < 10) { hours = "0" + hours; }
  var minutes = time.getUTCMinutes();
  if (minutes < 10) { minutes = "0" + minutes; }
  var seconds = time.getUTCSeconds();
  if (seconds < 10) { seconds = "0" + seconds; }
  return time.toLocaleDateString() + ' ' + hours + ':' + minutes + ':' + seconds;
}

// convert a given game UT time into the equivalent "mm/dd/yyyy hh:mm:ss"
// don't forget to account for fact that UT 0 was started during DST
function UTtoDateTime(UT, local) {
  var d = new Date();
  d.setTime(foundingMoment + (UT * 1000));
  if (d.toString().search("Standard") == 0) { d.setTime(foundingMoment + (UT - 3600) * 1000) }
  return formatUTCTime(d, local);
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
function currUT() { return UT + (tickDelta / 1000); }

// need to keep original date static so to get the current time we have to just update a new date object
function currTime() { return new Date(clock.getTime() + tickDelta); }

// conversion from true anomaly to mean anomaly in radians
// referenced from matlab code: https://github.com/Arrowstar/ksptot/blob/master/helper_methods/astrodynamics/computeMeanFromTrueAnom.m
function toMeanAnomaly(truA, ecc) {
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
  if (fields.length > 1) {
    fields.forEach(function(item, index) {
    
      // now get the name/value and assign the object
      var pair = item.split("~");
      if (pair[1] == "") {
        object[pair[0]] = null;
      } else if ($.isNumeric(pair[1])) {
        object[pair[0]] = parseFloat(pair[1]);
      } else {
        object[pair[0]] = pair[1];
      }
    });
  } else { object = null; }
  return object;
}