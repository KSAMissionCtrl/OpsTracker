function loadEventsAJAX(xhttp) {

  // stop both spinners
  $("#launch").spin(false);
  $("#maneuver").spin(false);
  
  // separate the launch & maneuver event returns
  var events = xhttp.responseText.split("^");

  // is there an upcoming launch?
  var launches = events[0].split("|");
  if (launches[0] != "null") {
  
    // is this launch scheduled to appear already?
    var fields = launches[0].split(";");
    if (fields[0] <= currUT()) {
      writeLaunchInfo(launches[0]);
      
      // if there is another launch scheduled after this one, schedule the update
      if (launches[1] != "null") updatesList.push({ Type: "event", ID: "launch", UT: parseFloat(launches[1].split(";")[0]), Data: launches[1] });
    
    // otherwise this is an update that will happen in the future
    } else updatesList.push({ Type: "event", ID: "launch", UT: parseFloat(fields[0]), Data: launches[0] });
  } else writeLaunchInfo();
  
  // is there an upcoming maneuver?
  var maneuvers = events[1].split("|");
  if (maneuvers[0] != "null") {
  
    // is this maneuver scheduled to appear already?
    fields = maneuvers[0].split(";");
    if (fields[0] <= currUT()) {
      writeManeuverinfo(maneuvers[0]);
      
      // if there is another maneuver scheduled after this one, schedule the update
      if (maneuvers[1] != "null") updatesList.push({ Type: "event", ID: "maneuver", UT: parseFloat(maneuvers[1].split(";")[0]), Data: maneuvers[1] });
    
    // otherwise this is an update that will happen in the future
    } else updatesList.push({ Type: "event", ID: "maneuver", UT: parseFloat(fields[0]), Data: maneuvers[0] });
  } else writeManeuverinfo();
  
  // do the menu load after event load so the event box is always sized before the menu
  isEventDataLoaded = true;
  if (!isMenuDataLoaded) loadDB("loadMenuData.asp?UT=" + (currUT()), loadMenuAJAX);
}

function writeLaunchInfo(data) {
  var size = w2utils.getSize("#launch", 'height');
  if (data) {
    var fields = data.split(";");
    var strHTML = "<strong>Next Launch</strong><br>";
    strHTML += "<span id='launchLink' class='fauxLink' onclick=\"swapContent('vessel', '" + fields[2] + "')\">" + fields[3] + "</span><br>";
    strCurrentLaunchVessel = fields[2];
    
    // regular launch, or hold event?
    if (fields[1] != "hold") {
      strHTML += "<span id='launchTime'>" + UTtoDateTime(parseFloat(fields[1]), true) + "</span><br>"
      strHTML += "<span id='launchCountdown'>" + formatTime(parseFloat(fields[1]) - (currUT())) + "</span>";
      launchCountdown = parseFloat(fields[1]);
    } else {
      strHTML += "<span id='launchTime'>COUNTDOWN HOLD</span><br><span id='launchCountdown'>Awaiting new L-0 time</span>";
      launchCountdown = "null";
    }
    $("#launch").html(strHTML);
    
    // add an info tooltip
    Tipped.create("#launchLink", fields[4], { offset: { y: -10 }, maxWidth: 150, position: 'top' });
  } else $("#launch").html("<strong>Next Launch</strong><br>None Scheduled");
  
  // if there was a change in height with the new text update the box using the default size with no launches or maneuvers
  // make sure we don't shrink smaller than the maneuver text
  if (size != w2utils.getSize("#launch", 'height')) {
    size = w2utils.getSize("#launch", 'height');
    if (size < w2utils.getSize("#maneuver", 'height')) size = w2utils.getSize("#maneuver", 'height');
    $("#eventBox").css("height", (37 + size) + "px");
    $('#menuBox').css("height", (maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px"); 
    setTimeout(function() { 
      if (isMenuDataLoaded) {
        w2ui['menu'].refresh();
        w2ui['menu'].scrollIntoView(w2ui['menu'].find({selected: true})[0].id);
      }
    }, 250);
  }
  
  // if the menu data is already loaded this was a refresh, so highlight the box
  if (isMenuDataLoaded && data) flashUpdate("#launch", "#FF0000", "#77C6FF");
}

function writeManeuverinfo(data) {
  var size = w2utils.getSize("#maneuver", 'height');
  if (data) {
    var fields = data.split(";");
    strHTML = "<strong>Next Maneuver</strong><br>";
    strHTML += "<a id='maneuverLink' href='http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + fields[2] + "'>" + fields[3] + "</a><br>";
    strCurrentManeuverVessel = fields[2];
    strHTML += "<span id='maneuverTime'>" + UTtoDateTime(parseFloat(fields[1]), true) + "</span><br>"
    strHTML += "<span id='maneuverCountdown'>" + formatTime(parseFloat(fields[1]) - (currUT())) + "</span>";
    maneuverCountdown = parseFloat(data[1]);
    $("#maneuver").html(strHTML);
    
    // add an info tooltip
    Tipped.create("#maneuverLink", fields[4], { offset: { y: -10 }, maxWidth: 150, position: 'top' });
  } else $("#maneuver").html("<strong>Next Maneuver</strong><br>None Scheduled");
  if (size != w2utils.getSize("#maneuver", 'height')) {
    size = w2utils.getSize("#maneuver", 'height');
    if (size < w2utils.getSize("#launch", 'height')) size = w2utils.getSize("#launch", 'height');
    $("#eventBox").css("height", (37 + size) + "px");
    $('#menuBox').css("height", (maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px"); 
    setTimeout(function() { 
      if (isMenuDataLoaded) {
        w2ui['menu'].refresh();
        w2ui['menu'].scrollIntoView(w2ui['menu'].find({selected: true})[0].id);
      }
    }, 250);
  }
  
  // if the menu data is already loaded this was a refresh, so highlight the box
  if (isMenuDataLoaded && data) flashUpdate("#maneuver", "#FF0000", "#77C6FF");
}