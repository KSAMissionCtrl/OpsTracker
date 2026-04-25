function loadEventsAJAX(result) {

  // stop both spinners
  $("#launch").spin(false);
  $("#maneuver").spin(false);

  // is there an upcoming launch?
  var launches = result.launches;
  if (launches.length > 0) {

    // load the launches into a list, already sorted by name and UT
    var launchEventList = [];
    var vesselFinalLaunchTimes = [];
    var strCurrVesselDB = "";
    var finalLaunchTime = 0;
    launches.forEach(function(launch) {
      launchEventList.push(launch);

      // track whether the vessel name has changed and if so, assign the final launch time
      if (!strCurrVesselDB.length) strCurrVesselDB = launch.db;
      if (strCurrVesselDB != launch.db) {
        vesselFinalLaunchTimes.push({name: strCurrVesselDB,
                                     time: finalLaunchTime });
        strCurrVesselDB = launch.db;
      }
      finalLaunchTime = launch.LaunchTime;
    });

    // add the last final vessel launch time
    vesselFinalLaunchTimes.push({name: strCurrVesselDB,
                                 time: finalLaunchTime });

    // now we need to loop through the event listing again to find the next launch
    KSA_CALCULATIONS.strCurrentLaunchVessel = "";
    var firstLaunchTime = 9999999999;
    launchEventList.forEach(function(vessel) {

      // decide if this vessel still has yet to launch and is launching first
      // be sure to compare to final launch time in the event that the launch was moved up and this time is later but now expired
      if (KSA_CALCULATIONS.strCurrentLaunchVessel != vessel.db && vessel.LaunchTime < firstLaunchTime && vessel.LaunchTime > currUT() && vesselFinalLaunchTimes.find(o => o.name === vessel.db).time >= vessel.LaunchTime) {
        KSA_CALCULATIONS.strCurrentLaunchVessel = vessel.db;
        firstLaunchTime = vessel.LaunchTime;
      }
    });

    // find the current launch event attributed to the launch vessel, if there is one that still hasn't launched
    var launchData = null;
    if (KSA_CALCULATIONS.strCurrentLaunchVessel.length) {
      launchEventList.forEach(function(vessel) {
        if (vessel.UT <= currUT() && vessel.db == KSA_CALCULATIONS.strCurrentLaunchVessel && 
        (vessel.LaunchTime > currUT() || vessel.LaunchTime == vessel.UT))   // also check that this is a hold
        launchData = vessel;
      });
    }
    writeLaunchInfo(launchData);

    // find any future update
    launchEventList.forEach(function(vessel) {
      if (vessel.UT > currUT()) ops.updatesList.push({ type: "event", UT: vessel.UT });
      
      // resort the updatesList
      ops.updatesList.sort(function(a,b) { return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0); });
    }); 
  } else writeLaunchInfo();

  // is there an upcoming maneuver?
  var maneuvers = result.maneuvers;
  if (maneuvers.length > 0) {
    writeManeuverinfo(maneuvers[0]);
  } else writeManeuverinfo();
  
  // if this is a crew page, no need to wait for the Three.js scene to load
  if (ops.pageType.includes("crew")) activateEventLinks();

  // mark events as having been loaded at least once
  KSA_UI_STATE.isEventsLoaded = true;
}

function writeLaunchInfo(data) {
  var size = w2utils.getSize("#launch", 'height');
  var currHTML = $("#launch").html();
  if (KSA_TIMERS.launchRefreshTimeout) {
    clearTimeout(KSA_TIMERS.launchRefreshTimeout);
    KSA_TIMERS.launchRefreshTimeout = null;
  }
  if (data) {
    var strHTML = "<strong>Next Launch</strong><br>";
    strHTML += "<span id='launchLink' db='" + data.db + "'>" + wrapText(140, data.Title, 14) + "</span><br>";
    
    // regular launch, or hold event?
    if (data.LaunchTime != data.UT) {
      strHTML += "<span id='launchTime'>" + UTtoDateTime(data.LaunchTime, true, false) + "</span><br>"
      strHTML += "<span id='launchCountdown'>" + formatTime(data.LaunchTime - currUT()) + "</span>";
      KSA_CALCULATIONS.launchCountdown = data.LaunchTime;
    } else {
      strHTML += "<span id='launchTime'>COUNTDOWN HOLD</span><br><span id='launchCountdown'>Awaiting new L-0 time</span>";
      KSA_CALCULATIONS.launchCountdown = "null";

      // if we are actively viewing the vessel, update the launch text
      if (ops.currentVessel && ops.currentVessel.Catalog.DB == KSA_CALCULATIONS.strCurrentLaunchVessel && ops.pageType == "vessel") {
        flashUpdate("#dataField0", "#77C6FF", "#FFF");
        $("#dataField0").html("<b>" + ops.currentVessel.CraftData.MissionStartTerm + ":</b><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'metTip', maxWidth: 300\"> <u>To Be Determined</u>");
        $("#metTip").html("launch time currently being assessed");
        if (is_touch_device()) { showOpt = 'click'; }
        else { showOpt = 'mouseenter'; }
        
        Tipped.remove('.tip-update');
        Tipped.create('.tip-update', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
      }
    }
    $("#launch").html(strHTML);
    
    Tipped.remove('#launchLink');
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
      if (KSA_UI_STATE.isMenuDataLoaded) {
        w2ui['menu'].refresh();
        if (w2ui['menu'].find({selected: true}).length) w2ui['menu'].scrollIntoView(w2ui['menu'].find({selected: true})[0].id);
      }
    }, 250);
  }
  
  // if the menu data is already loaded and this is a refresh (not initial load), highlight the box and activate the links
  // also check if any change has been made to the contents
  if (KSA_UI_STATE.isMenuDataLoaded && KSA_UI_STATE.isEventsLoaded && data && currHTML != $("#launch").html()) {
    flashUpdate("#launch", "#FF0000", "#77C6FF");
    activateEventLinks();
  }
}

function writeManeuverinfo(data) {
  var size = w2utils.getSize("#maneuver", 'height');
  var currHTML = $("#maneuver").html();
  if (KSA_TIMERS.maneuverRefreshTimeout) {
    clearTimeout(KSA_TIMERS.maneuverRefreshTimeout);
    KSA_TIMERS.maneuverRefreshTimeout = null;
  }
  if (data) {
    strHTML = "<strong>Next Maneuver</strong><br>";
    strHTML += "<span id='manueverLink' db='" + data.db + "'>" + wrapText(150, data.Title, 16) + "</span><br>";
    KSA_CALCULATIONS.strCurrentManeuverVessel = data.db;
    strHTML += "<span id='maneuverTime'>" + UTtoDateTime(data.ExecuteUT, true, false) + "</span><br>"
    strHTML += "<span id='maneuverCountdown'>" + formatTime(data.ExecuteUT - currUT()) + "</span>";
    KSA_CALCULATIONS.maneuverCountdown = data.ExecuteUT;
    $("#maneuver").html(strHTML);
    
    Tipped.remove('#maneuverLink');
    // add an info tooltip
    Tipped.create("#maneuverLink", data.Desc, { offset: { y: -10 }, maxWidth: 150, position: 'top' });
  } else $("#maneuver").html("<strong>Next Maneuver</strong><br>None Scheduled");
  if (size != w2utils.getSize("#maneuver", 'height')) {
    size = w2utils.getSize("#maneuver", 'height');
    if (size < w2utils.getSize("#launch", 'height')) size = w2utils.getSize("#launch", 'height');
    $("#eventBox").css("height", (37 + size) + "px");
    $('#menuBox').css("height", (ops.maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px"); 
    setTimeout(function() { 
      if (KSA_UI_STATE.isMenuDataLoaded) {
        w2ui['menu'].refresh();
        if (w2ui['menu'].find({selected: true}).length) w2ui['menu'].scrollIntoView(w2ui['menu'].find({selected: true})[0].id);
      }
    }, 250);
  }
  
  // if the menu data is already loaded and this is a refresh (not initial load), highlight the box and activate the links
  // also check if any change has been made to the contents
  if (KSA_UI_STATE.isMenuDataLoaded && KSA_UI_STATE.isEventsLoaded && data && currHTML != $("#maneuver").html()) {
    flashUpdate("#maneuver", "#FF0000", "#77C6FF");
    activateEventLinks();
  }
}

// called once the Three.js scene is done loading so switching to a vessel doesn't cut off the load
function activateEventLinks() {
  $("#manueverLink").addClass("fauxLink");
  $("#manueverLink").on("click", function() {
    swapContent('vessel', $("#manueverLink").attr("db"));
  });
  $("#launchLink").addClass("fauxLink");
  $("#launchLink").on("click", function() {
    swapContent('vessel', $("#launchLink").attr("db"));
  });
}