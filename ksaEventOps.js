function loadEventsAJAX(xhttp) {

  // stop both spinners
  $("#launch").spin(false);
  $("#maneuver").spin(false);
  
  // separate the launch & maneuver event returns
  var events = xhttp.responseText.split("|");

  // is there an upcoming launch?
  var fields = events[0].split("~");
  if (fields[0] != "null") {
    
    // output the launch information
    var strHTML = "<strong>Next Launch</strong><br>";
    strHTML += "<a id='launchLink' href='http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + fields[0] + "'>" + fields[1] + "</a><br>";
    
    // regular launch, or hold event?
    if (fields[2] != "hold") {
      strHTML += "<span id='launchTime'>" + UTtoDateTime(fields[2], true) + "</span><br>"
      strHTML += "<span id='launchCountdown'>" + formatTime(fields[2] - (currUT()), false) + "</span>";
      launchCountdown = fields[2] - (currUT());
    } else {
      strHTML += "<span id='launchTime'>COUNTDOWN HOLD</span><br><span id='launchCountdown'>Awaiting new L-0 time</span>";
    }
    $("#launch").html(strHTML);
    $("#eventBox").css("height", "110px");
    
    // do we add an info tooltip?
    if (fields[3] != "null") { Tipped.create("#launchLink", fields[3], { offset: { y: -10 }, maxWidth: 150, position: 'top' }); }
  }
  
  // upcoming event?
  if (fields[4] != "null") { updatesList.push({ Type: "event", ID: "launch", UT: parseInt(fields[4]) }); }
  
  // is there an upcoming maneuver?
  fields = events[1].split("~");
  if (fields[0] != "null") {
    var strHTML = "<strong>Next Maneuver</strong><br>";
    strHTML += "<a id='maneuverLink' href='http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + fields[0] + "'>" + fields[1] + "</a><br>";
    if (fields[2] != "hold") {
      strHTML += "<span id='maneuverTime'>" + UTtoDateTime(fields[2], true) + "</span><br>"
      strHTML += "<span id='maneuverCountdown'>" + formatTime(fields[2] - (currUT()), false) + "</span>";
      maneuverCountdown = fields[2] - (currUT());
    } else {
      strHTML += "<span id='maneuverTime'>COUNTDOWN HOLD</span><br><span id='maneuverCountdown'>Awaiting new time</span>";
    }
    $("#maneuver").html(strHTML);
    $("#eventBox").css("height", "110px");
    if (fields[3] != "null") { Tipped.create("#maneuverLink", fields[3], { offset: { y: -10 }, maxWidth: 150, position: 'top' }); }
  }
  if (fields[4] != "null") { updatesList.push({ Type: "event", ID: "maneuver", UT: parseInt(fields[4]) }); }
  
  // do the menu load after event load so the event box is always sized before the menu
  isEventDataLoaded = true;
  loadDB("loadMenuData.asp?UT=" + (currUT()), loadMenuAJAX);
}