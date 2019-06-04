function loadEventsAJAX(xhttp) {

  // stop both spinners
  $("#launch").spin(false);
  $("#maneuver").spin(false);
  
  // separate the launch & maneuver event returns
  var events = xhttp.responseText.split("^");

  // is there an upcoming launch?
  var launches = events[0].split("|");
  if (launches[0] != "null") {
    var currLaunchIndex = -1.
    var futureLaunchIndex = -1.
    launches.forEach(function(item, index) {
      
      // is this launch date still in the future?
      if (item.split(";")[1] > currUT()) {

        // if a current launch is already set, does this launch date come after it?
        if (currLaunchIndex >= 0 && item.split(";")[1] > launches[currLaunchIndex].split(";")[1]) {

          // is it the same vessel?
          if (item.split(";")[2] == launches[currLaunchIndex].split(";")[2]) {

            // if this later launch date is viewable, make it the current launch date
            if (item.split(";")[0] <= currUT()) currLaunchIndex = index;
          }
        } else

        // if a current launch is already set, does this launch date come before it?
        if (currLaunchIndex >= 0 && item.split(";")[1] < launches[currLaunchIndex].split(";")[1]) {

          // if it's a different vessel, update the current launch
          if (item.split(";")[2] != launches[currLaunchIndex].split(";")[2]) currLaunchIndex = index;

        // if no current launch set, this is the current launch
        } else currLaunchIndex = index;
      }
    });

    // was there a current launch found?
    if (currLaunchIndex >= 0) {
      launches.forEach(function(item, index) {
        
        // is this update date still in the future and does it come after the current launch update?
        if (item.split(";")[0] > currUT() && item.split(";")[0] > launches[currLaunchIndex].split(";")[0]) {

          // we only care about updates to the current launching vehicle
          if (item.split(";")[2] == launches[currLaunchIndex].split(";")[2]) {

            // if there is already a future launch and this update comes before it, then it's the new future update
            if (futureLaunchIndex >= 0 && item.split(";")[0] < launches[futureLaunchIndex].split(";")[0]) {
              futureLaunchIndex = index;

            // otherwise set this as the future launch update
            } else futureLaunchIndex = index;
          }
        }
      });

      // is this launch scheduled to appear already?
      if (launches[currLaunchIndex].split(";")[0] <= currUT()) {
        writeLaunchInfo(launches[currLaunchIndex]);
        
        // if there is another launch scheduled after this one, schedule the update
        if (futureLaunchIndex >= 0) updatesList.push({ Type: "event", ID: "launch", UT: parseFloat(launches[futureLaunchIndex].split(";")[0]), Data: launches[futureLaunchIndex] });
      
      // otherwise this is an update that will happen in the future
      } else {
        updatesList.push({ Type: "event", ID: "launch", UT: parseFloat(launches[currLaunchIndex].split(";")[0]), Data: launches[currLaunchIndex] });
        writeLaunchInfo();
      }
    } else writeLaunchInfo();
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
    } else {
      updatesList.push({ Type: "event", ID: "maneuver", UT: parseFloat(fields[0]), Data: maneuvers[0] });
      writeManeuverinfo();
    }
  } else writeManeuverinfo();
  
  // do the menu load after event load so the event box is always sized before the menu
  isEventDataLoaded = true;
  if (!isMenuDataLoaded) loadDB("loadMenuData.asp?UT=" + (currUT()), loadMenuAJAX);
}

function writeLaunchInfo(data) {
  if (isLaunchEventCoolingDown) return;
  var size = w2utils.getSize("#launch", 'height');
  var currHTML = $("#launch").html();
  if (data) {
    var fields = data.split(";");
    var strHTML = "<strong>Next Launch</strong><br>";

    strHTML += "<span id='launchLink' db='" + fields[2] + "'>" + wrapText(150, fields[3], 16) + "</span><br>";
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
        if (w2ui['menu'].find({selected: true}).length) w2ui['menu'].scrollIntoView(w2ui['menu'].find({selected: true})[0].id);
      }
    }, 250);
  }
  
  // if the menu data is already loaded this was a refresh, so highlight the box and activate the links
  // also check if any change has been made to the contents
  if (isMenuDataLoaded && data && currHTML != $("#launch").html()) {
    flashUpdate("#launch", "#FF0000", "#77C6FF");
    activateEventLinks();
  }

  // don't let another update happen for 2 seconds in case there are some rapid-fire events of the same vessel
  isLaunchEventCoolingDown = true;
  setTimeout(function() { isLaunchEventCoolingDown = false; }, 2000);
}

function writeManeuverinfo(data) {
  if (isManeuverEventCoolingDown) return;
  var size = w2utils.getSize("#maneuver", 'height');
  var currHTML = $("#maneuver").html();
  if (data) {
    var fields = data.split(";");
    strHTML = "<strong>Next Maneuver</strong><br>";
    strHTML += "<span id='manueverLink' db='" + fields[2] + "'>" + wrapText(150, fields[3], 16) + "</span><br>";
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
        if (w2ui['menu'].find({selected: true}).length) w2ui['menu'].scrollIntoView(w2ui['menu'].find({selected: true})[0].id);
      }
    }, 250);
  }
  
  // if the menu data is already loaded this was a refresh, so highlight the box and activate the links
  // also check if any change has been made to the contents
  if (isMenuDataLoaded && data && currHTML != $("#maneuver").html()) {
    flashUpdate("#maneuver", "#FF0000", "#77C6FF");
    activateEventLinks();
  }

  // don't let another update happen for 2 seconds in case there are some rapid-fire events of the same vessel
  isManeuverEventCoolingDown = true;
  setTimeout(function() { isManeuverEventCoolingDown = false; }, 2000);
}

// called once the GGB figure is done loading so switching to a vessel doesn't cut off the load
function activateEventLinks() {
  $("#manueverLink").addClass("fauxLink");
  $("#manueverLink").click(function() {
    swapContent('vessel', $("#manueverLink").attr("db"));
  });
  $("#launchLink").addClass("fauxLink");
  $("#launchLink").click(function() {
    swapContent('vessel', $("#launchLink").attr("db"));
  });
}