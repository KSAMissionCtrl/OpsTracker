// refactor complete (for launch events only)

function loadEventsAJAX(xhttp) {

  // stop both spinners
  $("#launch").spin(false);
  $("#maneuver").spin(false);
  
  // separate the launch & maneuver event returns
  var events = xhttp.responseText.split("^");

  // is there an upcoming launch?
  var launches = events[0].split("|");
  if (launches[0] != "null") {

    // load the launches into a list, already sorted by name and UT
    var launchEventList = [];
    var vesselFinalLaunchTimes = [];
    var strCurrVesselDB = "";
    var finalLaunchTime = 0;
    launches.forEach(function(launchEvent) {
      var launchDetails = launchEvent.split(";");
      launchEventList.push({UT: parseFloat(launchDetails[0]),
                            LaunchTime: parseFloat(launchDetails[1]),
                            db: launchDetails[2],
                            Title: launchDetails[3],
                            Desc: launchDetails[4]});

      // track whether the vessel name has changed and if so, assign the final launch time
      if (!strCurrVesselDB.length) strCurrVesselDB = launchDetails[2]
      if (strCurrVesselDB != launchDetails[2]) {
        vesselFinalLaunchTimes.push({name: strCurrVesselDB,
                                     time: finalLaunchTime });
        strCurrVesselDB = launchDetails[2]
      } 
      finalLaunchTime = parseFloat(launchDetails[1]);
    });

    // add the last final vessel launch time
    vesselFinalLaunchTimes.push({name: strCurrVesselDB,
                                 time: finalLaunchTime });

    // now we need to loop through the event listing again to find the next launch
    strCurrentLaunchVessel = "";
    var firstLaunchTime = 9999999999;
    launchEventList.forEach(function(vessel) {

      // decide if this vessel still has yet to launch and is launching first
      // be sure to compare to final launch time in the event that the launch was moved up and this time is later but now expired
      if (strCurrentLaunchVessel != vessel.db && vessel.LaunchTime < firstLaunchTime && vessel.LaunchTime > currUT() && vesselFinalLaunchTimes.find(o => o.name === vessel.db).time >= vessel.LaunchTime) {
        strCurrentLaunchVessel = vessel.db;
        firstLaunchTime = vessel.LaunchTime;
      }
    });

    // find the current launch event attributed to the launch vessel, if there is one that still hasn't launched
    var launchData = null;
    if (strCurrentLaunchVessel.length) {
      launchEventList.forEach(function(vessel) {
        if (vessel.UT <= currUT() && vessel.db == strCurrentLaunchVessel && 
        (vessel.LaunchTime > currUT() || vessel.LaunchTime == vessel.UT))   // also check that this is a hold
        launchData = vessel;
      });
    }
    writeLaunchInfo(launchData);

    // find the next update attributed to the launch vessel
    launchEventList.forEach(function(vessel) {
      if (vessel.UT > currUT() && vessel.db == strCurrentLaunchVessel && ops.updatesList.length == ops.updatesListSize) ops.updatesList.push({ type: "event", UT: vessel.UT });
    });

    // if we didn't find a future update for the current launch vehicle, try to find any future update
    if (ops.updatesList.length == ops.updatesListSize) {
      launchEventList.forEach(function(vessel) {
        if (vessel.UT > currUT() && ops.updatesList.length == ops.updatesListSize) ops.updatesList.push({ type: "event", UT: vessel.UT });
      }); 
    }
  } else writeLaunchInfo();

  // is there an upcoming maneuver?
  var maneuvers = events[1].split("|");
  if (maneuvers[0] != "null") {

    // to be completed once the launch selection works as intended
    strCurrentManeuverVessel = "";

  } else writeManeuverinfo();
  
  // if this is a crew page, no need to wait for GGB to load
  if (ops.pageType.includes("crew")) activateEventLinks();
}

function writeLaunchInfo(data) {
  var size = w2utils.getSize("#launch", 'height');
  var currHTML = $("#launch").html();
  if (launchRefreshTimeout) {
    clearTimeout(launchRefreshTimeout);
    launchRefreshTimeout = null;
  }
  if (data) {
    var strHTML = "<strong>Next Launch</strong><br>";
    strHTML += "<span id='launchLink' db='" + data.db + "'>" + wrapText(140, data.Title, 14) + "</span><br>";
    
    // regular launch, or hold event?
    if (data.LaunchTime != data.UT) {
      strHTML += "<span id='launchTime'>" + UTtoDateTime(data.LaunchTime, true, false) + "</span><br>"
      strHTML += "<span id='launchCountdown'>" + formatTime(data.LaunchTime - currUT()) + "</span>";
      launchCountdown = data.LaunchTime;
    } else {
      strHTML += "<span id='launchTime'>COUNTDOWN HOLD</span><br><span id='launchCountdown'>Awaiting new L-0 time</span>";
      launchCountdown = "null";

      // if we are actively viewing the vessel, update the launch text
      if (ops.currentVessel && ops.currentVessel.Catalog.DB == strCurrentLaunchVessel && ops.pageType == "vessel") {
        flashUpdate("#dataField0", "#77C6FF", "#FFF");
        $("#dataField0").html("<b>" + ops.currentVessel.CraftData.MissionStartTerm + ":</b><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'metTip', maxWidth: 300\"> <u>To Be Determined</u>");
        $("#metTip").html("launch time currently being assessed");
        if (is_touch_device()) { showOpt = 'click'; }
        else { showOpt = 'mouseenter'; }
        Tipped.create('.tip-update', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
      }
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
    $('#menuBox').css("height", (ops.maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px"); 
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
}

function writeManeuverinfo(data) {
  var size = w2utils.getSize("#maneuver", 'height');
  var currHTML = $("#maneuver").html();
  if (maneuverRefreshTimeout) {
    clearTimeout(maneuverRefreshTimeout);
    maneuverRefreshTimeout = null;
  }
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
    $('#menuBox').css("height", (ops.maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px"); 
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