function loadEventsAJAX(xhttp) {

  // stop both spinners
  $("#launch").spin(false);
  $("#maneuver").spin(false);
  
  // separate the launch & maneuver event returns
  var events = xhttp.responseText.split("^");

  // by default, there are no future events
  writeLaunchInfo();
  writeManeuverinfo();

  // reset the cooldown so we can write any new data
  isLaunchEventCoolingDown = false;
  isManeuverEventCoolingDown = false;

  // is there an upcoming launch?
  var launches = events[0].split("|");
  if (launches[0] != "null") {

    // load the launches into a list and sort it smallest to largest visible UT
    var launchEventList = [];
    launches.forEach(function(launchEvent) {
      var launchDetails = launchEvent.split(";");
      launchEventList.push({UT: parseFloat(launchDetails[0]),
                            LaunchTime: parseFloat(launchDetails[1]),
                            DB: launchDetails[2],
                            Title: launchDetails[3],
                            Desc: launchDetails[4]
                          });
    });
    launchEventList.sort(function(a,b) {return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0);} );
    console.log(launchEventList)

    // start with the closest launch time and work forwards
    var launchEvent;
    for (launchEvent=0; launchEvent<launchEventList.length; launchEvent++) {

      // holds are only for current launches, so jump straight through to the display
      if (launchEventList[launchEvent].LaunchTime == 0) {
        writeLaunchInfo(launchEventList[launchEvent]);
        break;
      }
      else {

        // if this launch date announcement is still forthcoming, stash the update info
        if (launchEventList[launchEvent].UT > currUT()) {
          updatesList.push({ Type: "event", UT: launchEventList[launchEvent].UT });
          break;
        } 
        
        // if the launch date announcement is already visible...
        else if (launchEventList[launchEvent].UT < currUT()) {

          // if the launch is still to come, display it
          if (launchEventList[launchEvent].LaunchTime > currUT()) {
            writeLaunchInfo(launchEventList[launchEvent]);
            break;
          }
        }
      }
    }

    // if we didn't work through the whole list or already added a future update, find the next one
    if (launchEvent < launchEventList.length-1 && updatesList.length == updatesListSize) {
      for (launchEvent++; launchEvent<launchEventList.length; launchEvent++){
        if (launchEventList[launchEvent].UT > currUT()) {
          updatesList.push({ Type: "event", UT: launchEventList[launchEvent].UT });
          break;
        }
      }
    }
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
  console.log(data)
  if (isLaunchEventCoolingDown) return;
  var size = w2utils.getSize("#launch", 'height');
  var currHTML = $("#launch").html();
  if (data) {
    var strHTML = "<strong>Next Launch</strong><br>";

    strHTML += "<span id='launchLink' db='" + data.DB + "'>" + wrapText(150, data.Title, 16) + "</span><br>";
    strCurrentLaunchVessel = data.DB;
    
    // regular launch, or hold event?
    if (data.LaunchTime > 0) {
      strHTML += "<span id='launchTime'>" + UTtoDateTime(data.LaunchTime, true, false) + "</span><br>"
      strHTML += "<span id='launchCountdown'>" + formatTime(data.LaunchTime - currUT()) + "</span>";
      launchCountdown = data.LaunchTime;
    } else {
      strHTML += "<span id='launchTime'>COUNTDOWN HOLD</span><br><span id='launchCountdown'>Awaiting new L-0 time</span>";
      launchCountdown = "null";
    }
    $("#launch").html(strHTML);
    
    // add an info tooltip
    Tipped.create("#launchLink", data.Desc, { offset: { y: -10 }, maxWidth: 150, position: 'top' });
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
    strHTML += "<span id='maneuverTime'>" + UTtoDateTime(parseFloat(fields[1]), true, false) + "</span><br>"
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

  // if this is a crew page, no need to wait for GGB to load
  if (pageType == "crew") activateEventLinks();
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