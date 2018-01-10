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
  }
  
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
  }
  
  // do the menu load after event load so the event box is always sized before the menu
  isEventDataLoaded = true;
  loadDB("loadMenuData.asp?UT=" + (currUT()), loadMenuAJAX);
}

function writeLaunchInfo(data) {
  if (data) {
    var fields = data.split(";");
    var strHTML = "<strong>Next Launch</strong><br>";
    strHTML += "<span id='launchLink' class='fauxLink' onclick=\"swapContent('vessel', '" + fields[2] + "')\">" + fields[3] + "</span><br>";
    
    // regular launch, or hold event?
    if (fields[2] != "hold") {
      strHTML += "<span id='launchTime'>" + UTtoDateTime(parseFloat(fields[1]), true) + "</span><br>"
      strHTML += "<span id='launchCountdown'>" + formatTime(parseFloat(fields[1]) - (currUT())) + "</span>";
      launchCountdown = parseFloat(fields[1]) - (currUT());
    } else {
      strHTML += "<span id='launchTime'>COUNTDOWN HOLD</span><br><span id='launchCountdown'>Awaiting new L-0 time</span>";
    }
    $("#launch").html(strHTML);
    if (w2utils.getSize("#launch", 'height') > w2utils.getSize("#maneuver", 'height')) {
      if (isMenuDataLoaded) $('#twitterBox').hide();
      $("#eventBox").css("height", ((w2utils.getSize("#eventBox", 'height')-17) + (w2utils.getSize("#launch", 'height')-39)) + "px");
      $('#menuBox').css("height", (maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px"); 
      setTimeout(function() { 
        if (isMenuDataLoaded) {
          w2ui['menu'].refresh();
          if ($('#menuResize').html().includes("Expand")) $('#twitterBox').show();
        }
      }, 250);
    }
    
    // add an info tooltip
    Tipped.create("#launchLink", fields[4], { offset: { y: -10 }, maxWidth: 150, position: 'top' });
  } else {
    $("#launch").html("<strong>Next Launch</strong><br>None Scheduled");
    if (w2utils.getSize("#launch", 'height') <= w2utils.getSize("#maneuver", 'height')) {
      $("#eventBox").css("height", ((w2utils.getSize("#eventBox", 'height')-17) + (w2utils.getSize("#maneuver", 'height')-39)) + "px");
      $('#menuBox').css("height", (maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px"); 
      setTimeout(function() { if (isMenuDataLoaded) w2ui['menu'].refresh(); }, 250);
    }
  }
}

function writeManeuverinfo(data) {
  if (data) {
    var fields = data.split(";");
    strHTML = "<strong>Next Maneuver</strong><br>";
    strHTML += "<a id='maneuverLink' href='http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + fields[2] + "'>" + fields[3] + "</a><br>";
    strHTML += "<span id='maneuverTime'>" + UTtoDateTime(parseFloat(fields[1]), true) + "</span><br>"
    strHTML += "<span id='maneuverCountdown'>" + formatTime(parseFloat(fields[1]) - (currUT())) + "</span>";
    maneuverCountdown = parseFloat(data[1]) - (currUT());
    $("#maneuver").html(strHTML);
    if (w2utils.getSize("#maneuver", 'height') > w2utils.getSize("#launch", 'height')) {
      if (isMenuDataLoaded) $('#twitterBox').hide();
      $("#eventBox").css("height", ((w2utils.getSize("#eventBox", 'height')-17) + (w2utils.getSize("#maneuver", 'height')-39)) + "px");
      $('#menuBox').css("height", (maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px"); 
      setTimeout(function() { 
        if (isMenuDataLoaded) {
          w2ui['menu'].refresh();
          if ($('#menuResize').html().includes("Expand")) $('#twitterBox').show();
        }
      }, 250);
    }
    
    // add an info tooltip
    Tipped.create("#maneuverLink", fields[4], { offset: { y: -10 }, maxWidth: 150, position: 'top' });
  } else {
    $("#maneuver").html("<strong>Next Maneuver</strong><br>None Scheduled");
    if (w2utils.getSize("#maneuver", 'height') <= w2utils.getSize("#launch", 'height')) {
      $("#eventBox").css("height", ((w2utils.getSize("#eventBox", 'height')-17) + (w2utils.getSize("#launch", 'height')-39)) + "px");
      $('#menuBox').css("height", (maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px"); 
      setTimeout(function() { if (isMenuDataLoaded) w2ui['menu'].refresh(); }, 250);
    }
  }
}