// available content height: 480px (initially) / 885px (Max)
function loadVessel(vessel, UT) {
  if (!UT && !getParameterByName("ut")) { loadVessel(vessel, "NaN"); return; }
  if (!UT && getParameterByName("ut")) { loadVessel(vessel, parseInt(getParameterByName("ut"))); return; }
  
  // can't continue if menu data hasn't loaded. Try again in 250ms
  if (!isMenuDataLoaded) {
    setTimeout(function() {
      loadVessel(vessel, UT);
    }, 250)
    return;
  }
  
  // we can't let anyone jump to a UT later than the current UT
  if (!isNaN(UT) && UT > currUT()) { UT = "NaN"; }
  vesselPastUT = UT;
  
  // modify the history so people can page back/forward
  // only add URL variables if they aren't already included
  if (window.location.href.includes("?") && (vessel == strCurrentVessel || !history.state)) { var strURL = window.location.href; }
  else { 
    if (isNaN(UT)) { var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + vessel; }
    else { var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + vessel + "&ut=" + UT; }
  }
  
  // if this is the first page to load, replace the current history
  var strURL;
  if (!history.state) {
    history.replaceState({Type: "vessel", ID: vessel, UT: parseInt(UT)}, document.title, strURL);
  // don't create a new entry if this is the same page being reloaded
  // however if its the same page but a different time, then that's different
  } else if (history.state.ID != vessel || (history.state.ID == vessel && (currentVesselData && !isNaN(UT) && currentVesselData.DynamicData.UT != UT))) {
    history.pushState({Type: "vessel", ID: vessel, UT: parseInt(UT)}, document.title, strURL);
  } 
  
  // if this vessel is not in the current catalog, we need to load a new system
  // we can't call this function until the menu is loaded
  if (!orbitCatalog.length || !orbitCatalog.find(o => o.ID === vessel)) { loadBody(getParentSystem(vessel)); }
  
  strCurrentVessel = vessel;
  
  // select and show it in the menu
  w2ui['menu'].select(strCurrentVessel);
  w2ui['menu'].expandParents(strCurrentVessel);
  w2ui['menu'].scrollIntoView(strCurrentVessel);

  // loading spinners - activate!
  $("#infoBox").spin({ position: 'relative', top: '50%', left: '50%' });
  $("#contentBox").spin({ position: 'relative', top: '50%', left: '50%' });
  $("#dataLabel").html("Loading Data...");
  
  // put out the call for the vessel data
  console.log("loadVesselData.asp?craft=" + strCurrentVessel + "&UT=" + currUT() + "&UTjump=" + UT);
  loadDB("loadVesselData.asp?craft=" + strCurrentVessel + "&UT=" + currUT() + "&UTjump=" + UT, loadVesselDataAJAX);
  currentVesselData = null;
  
  // add vessel-specific buttons to the map and call up for a data re-render
  addMapResizeButton();
  addMapViewButton();
  renderMapData();
}

// sends out the AJAX call for data to add any vessels to a GeoGebra figure/Leaflet library once it has loaded
// calls itself repeatedly in the event that the menu is not yet loaded
function loadVesselOrbits() {
  if (isMenuDataLoaded) {
    var strVessels = '';
    var menuNodes = w2ui['menu'].get(strCurrentSystem).nodes;
    if (menuNodes.length) {
      console.log(menuNodes);
      strVessels = extractIDs(menuNodes);
      if (strVessels.length) { 
        loadDB("loadVesselOrbitData.asp?crafts=" + strVessels.substring(0, strVessels.length-1) + "&UT=" + currUT() + "&UTjump=" + getParameterByName("ut"), loadVesselOrbitsAJAX);
        if (pageType == "body") {
          $("#vesselLoaderMsg").spin({ scale: 0.35, position: 'relative', top: '8px', left: '0px' });
          $("#vesselLoaderMsg").fadeIn();
        }
        return true;
      } else { return false; }
    }
  } else { setTimeout(loadVesselOrbits, 250); }
}

// parses data that allows the GeoGebra figure and Leaflet map to display orbital/maneuver data for vessels in the current system view
function loadVesselOrbitsAJAX(xhttp) {

  // separate the vessels
  var vessels = xhttp.responseText.split("*");
  
  // parse the data blocks for each vessel
  vessels.forEach(function(item, index) {
  
    // parse the fields and create the table objects
    var dataBlocks = item.split("|");
    var strVesselDB = dataBlocks[0];
    var orbit = rsToObj(dataBlocks[1]);
    var flightplan = rsToObj(dataBlocks[2]);
    orbitCatalog.push({ ID: strVesselDB, Orbit: orbit, Flightplan: flightplan });
    if (orbitCatalog[orbitCatalog.length-1].Orbit) { addGGBOrbit(strVesselDB, orbit); }
    
    // check for future updates
    var updates = dataBlocks[3].split("~");
    if (updates[0] != "null") { updatesList.push({ Type: "vessel;orbit", ID: strVesselDB, UT: updates[0] }); }
    if (updates[1] != "null") { updatesList.push({ Type: "vessel;flightplan", ID: strVesselDB, UT: updates[0] }); }
  });
  console.log(orbitCatalog);
  isOrbitDataLoaded = true;
  isGGBAppletLoaded = true;
  isGGBAppletLoading = false;
  if (pageType == "body") {
    $("#vesselLoaderMsg").spin(false);
    $("#vesselLoaderMsg").fadeOut();
    if ($("#figure").is(":visible")) { $("#vesselOrbitTypes").fadeIn(); }
  }
  
  // make sure a quick figure switch doesn't declutter things too fast
  timeoutHandle = setTimeout(declutterGGB, 2500);
}

// parses data that shows up for the vessel currently selected in the menu
function loadVesselDataAJAX(xhttp) {
  
  // separate the data tables and update data
  var dataTables = xhttp.responseText.split("*")[0].split("^");
  var updates = xhttp.responseText.split("*")[1].split("~");
  
  // parse the fields and create the table objects
  var sdata = rsToObj(dataTables[0]);
  var ddata = rsToObj(dataTables[1]);
  var resources = rsToObj(dataTables[2]);
  var crew = rsToObj(dataTables[3]);
  var comms = rsToObj(dataTables[4]);
  var obt = rsToObj(dataTables[5]);
  var ports = rsToObj(dataTables[6]);
  
  // check for future updates
  if (updates[0] != "null") { updatesList.push({ Type: "vessel;data", ID: strCurrentVessel, UT: parseFloat(updates[0]) }); }
  if (updates[1] != "null") { updatesList.push({ Type: "vessel;resources", ID: strCurrentVessel, UT: parseFloat(updates[1]) }); }
  if (updates[2] != "null") { updatesList.push({ Type: "vessel;crew", ID: strCurrentVessel, UT: parseFloat(updates[2]) }); }
  if (updates[3] != "null") { updatesList.push({ Type: "vessel;comms", ID: strCurrentVessel, UT: parseFloat(updates[3]) }); }
  if (updates[4] != "null") { updatesList.push({ Type: "vessel;ports", ID: strCurrentVessel, UT: parseFloat(updates[4]) }); }
  
  // parse and sort the histories and launch times
  var history = [];
  var launches = [];
  var obtHist = [];
  xhttp.responseText.split("*")[2].split("|").forEach(function(item, index) { history.push({UT: parseFloat(item.split("~")[0]), Title: item.split("~")[1]}); });
  if (xhttp.responseText.split("*")[3].split("|") != "null") {
    xhttp.responseText.split("*")[3].split("|").forEach(function(item, index) { launches.push({UT: parseFloat(item.split("~")[0]), LaunchTime: parseFloat(item.split("~")[1])}); });
  }
  if (xhttp.responseText.split("*")[4].split("|") != "null") {
    xhttp.responseText.split("*")[4].split("|").forEach(function(item, index) { obtHist.push({UT: parseFloat(item.split("~")[0]), Period: parseFloat(item.split("~")[1])}); });
  }
  
  // store all the data
  currentVesselData = { StaticData: sdata, DynamicData: ddata, Resources: resources, Manifest: crew, Comms: comms, Ports: ports, Orbit: obt, History: history, LaunchTimes: launches, OrbitalHistory: obtHist };
  console.log(currentVesselData);
  
  // kill all spinners
  $("#infoBox").spin(false);
  $("#contentBox").spin(false);

  // update with the vessel name for this record
  $("#contentHeader").html(currentVesselData.DynamicData.CraftName);
  document.title = "KSA Operations Tracker" + " - " + currentVesselData.DynamicData.CraftName + ": " + currentVesselData.DynamicData.CraftDescTitle;
  
  // tag loading
  //$("#contentHeader").spin({ scale: 0.35, position: 'relative', top: '10px', left: (((955/2) + (strVesselName.width('bold 32px arial')/2)) + 10) +'px' });
  
  // update the twitter timeline?
  if (currentVesselData.StaticData.Timeline) { 
    
    // if this timeline is date stamped, don't show it unless we are past the date
    if (currentVesselData.StaticData.Timeline.split(";").length > 1) {
      if (currUT() > currentVesselData.StaticData.Timeline.split(";")[0]) { 
        swapTwitterSource("Mission Feed", currentVesselData.StaticData.Timeline.split(";")[1]); 
      }
    } else swapTwitterSource("Mission Feed", currentVesselData.StaticData.Timeline);
  }

  // display all the data
  vesselInfoUpdate();
  vesselDataUpdate();
  vesselContentUpdate();
}

// parses data used to display information on parts for vessels
function loadPartsAJAX(xhttp) {
  xhttp.responseText.split("^").forEach(function(item, index) { partsCatalog.push(rsToObj(item)); });
  console.log(partsCatalog);
}

// updates all the data in the Info Box
function vesselInfoUpdate() {
  
  // setup the basics
  $("#infoImg").html("<img src='" + getVesselImage() + "'>");
  $("#infoTitle").html(currentVesselData.DynamicData.CraftDescTitle);
  $("#infoTitle").attr("class", "infoTitle vessel");
  $("#infoDialog").html(currentVesselData.DynamicData.CraftDescContent);
  $("#infoDialog").dialog("option", "title", "Additional Information - " + currentVesselData.DynamicData.CraftDescTitle);
  $("#infoDialog").dialog("option", {width: 643, height: 400});
  $("#partsImg").empty();
  
  // is there a parts overlay?
  if (getPartsHTML()) {
    $("#partsImg").html(getPartsHTML());
    setTimeout(function(){ if (!$('#infoBox').is(":hover")) $("#partsImg").fadeOut(1000); }, 1000);
    assignPartInfo();
    
    // Non-Firefox support for image map tooltips with Tipped
    $("area").hover(function() { 

      // HTML data is stashed in the alt attribute so other browsers don't show their own tooltip
      if (browserName != "Firefox" && $(this).attr("alt")) { 
        $("#mapTipData").html($(this).attr("alt"));
        // get the coordinate data for the area and size/center the div around it
        // div containing image map is below the title header, so offset must be applied
        // div containing all content is left-margin: auto to center on page, so offset must be applied
        areaCenter = $(this).attr("coords").split(",");
        $("#mapTip").css("width", parseInt(areaCenter[2])*2);
        $("#mapTip").css("height", parseInt(areaCenter[2])*2);
        $("#mapTip").css("top", parseInt(areaCenter[1])+$("#infoBox").position().top-parseInt(areaCenter[2]));
        $("#mapTip").css("left", parseInt(areaCenter[0])+$("#infoBox").position().left+$("#mainContent").position().left-parseInt(areaCenter[2]));
        $("#mapTip").show();
      }
    }, function() {

      // called once the div is shown atop this
      Tipped.refresh(".nonFFTip");
    });
    
    // set flag to tell main image that tooltip is or is no longer visible
    $("#mapTip").hover(function() { 
      isTipShow = true;
    }, function() {
      isTipShow = false;
    });
  }
}

function vesselDataUpdate() {

  ///////////
  // Patches
  ///////////
  
  if (currentVesselData.StaticData.Patches) {
    var strTitle = $("#contentHeader").html();
    
    // program patch
    $("#contentHeader").html("<a target='_blank' href='" + currentVesselData.StaticData.Patches.split("|")[0].split(";")[2] + "'><img id='programPatch' class='tipped' data-tipped-options=\"position: 'bottom'\" style='height: 35px;' title=\"<center>Click to view the " + currentVesselData.StaticData.Patches.split("|")[0].split(";")[0] + " Program page</center><br /><img src='" + currentVesselData.StaticData.Patches.split("|")[0].split(";")[1] + "'>\" src='" + currentVesselData.StaticData.Patches.split("|")[0].split(";")[1] + "'></a>&nbsp;");
    
    // vessel patch?
    if (currentVesselData.StaticData.Patches.split("|").length > 1) {
      $("#contentHeader").append("<a target='_blank' href='" + currentVesselData.StaticData.Patches.split("|")[1].split(";")[2] + "'><img id='vesselPatch' class='tipped' data-tipped-options=\"position: 'bottom'\" style='height: 35px; cursor: pointer;' title=\"<center>Click to view the " + currentVesselData.StaticData.Patches.split("|")[1].split(";")[0] + " vessel page</center><br /><img src='" + currentVesselData.StaticData.Patches.split("|")[1].split(";")[1] + "'>\" src='" + currentVesselData.StaticData.Patches.split("|")[1].split(";")[1] + "'></a>&nbsp;");
    }

    // mission patch?
    if (currentVesselData.StaticData.Patches.split("|").length > 2) {
      $("#contentHeader").append("<img id='missionPatch' class='tipped' data-tipped-options=\"position: 'bottom'\" style='height: 35px; cursor: help;' title=\"<img src='" + currentVesselData.StaticData.Patches.split("|")[2].split(";")[1] + "<br /><center>" + currentVesselData.StaticData.Patches.split("|")[2].split(";")[0] + "</center>' src='" + currentVesselData.StaticData.Patches.split("|")[2].split(";")[1] + "'>&nbsp;");
    }
    
    $("#contentHeader").append(strTitle);
  } 
  
  ///////////////////
  // MET/Launch Time
  ///////////////////
  
  // get the current launch time - defer to mission start time if it's available
  var launchTime = currentVesselData.StaticData.MissionStartTime;
  for (i=currentVesselData.LaunchTimes.length-1; i>=0; i--) {
    if (currentVesselData.LaunchTimes[i].UT <= getLaunchUT()) {
      launchTime = currentVesselData.LaunchTimes[i].LaunchTime;
      break;
    }
  }
  
  // show the data field
  // we don't know the start time right now
  if (!launchTime) {
    $("#dataField0").html("<b>" + currentVesselData.DynamicData.MissionStartTerm + ":</b><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'metTip'\"> <u>To Be Determined</u>");
    
  // post the current launch time
  } else {
    $("#dataField0").html("<b>" + currentVesselData.DynamicData.MissionStartTerm + ":</b><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'metTip'\"> <u>" + UTtoDateTime(launchTime) + " UTC</u>");
  }
  $("#dataField0").fadeIn();
  
  // decide what goes in the tooltip - clear it so we can use append for all scenarios
  $("#metTip").empty();
  
  // we don't know yet
  if (!launchTime) { $("#metTip").append("launch time currently being assessed<br>"); }

  // if this is a past event and there was more than one launch time, find what time equals the current UT
  // if it is in a state greater than the current one, that's the actual current launch time
  if (currentVesselData.DynamicData.PastEvent && currentVesselData.LaunchTimes.length > 1) {
    for (i=currentVesselData.LaunchTimes.length-1; i>=0; i--) {
      if (currentVesselData.LaunchTimes[i].UT <= currUT() && currentVesselData.LaunchTimes[i].UT > currentVesselData.DynamicData.UT) {
        $("#metTip").append("Actual Launch Time: " + UTtoDateTime(currentVesselData.LaunchTimes[i].LaunchTime) + " UTC<br>");
        launchTime = currentVesselData.LaunchTimes[i].LaunchTime
        break;
      }
    }
  }
  
  // add further details based on mission status
  // mission hasn't started yet
  if (currUT() <= launchTime) {
    $("#metTip").append("Time to Launch: <span data='" + launchTime + "' id='metCount'>" + formatTime(launchTime-currUT()) + "</span>");
    
  // mission is ongoing
  } else if (!isMissionEnded()) {
    $("#metTip").append("Mission Elapsed Time: <span data='" + launchTime + "' id='metCount'>" + formatTime(currUT()-launchTime) + "</span>");
    
  // mission has ended
  } else if (isMissionEnded()) {
    $("#metTip").append(getMissionEndMsg() + "<br>Mission Elapsed Time: <span id='metCount'>" + formatTime(getMissionEndTime()-launchTime) + "</span>");
  }
  
  ////////////////
  // Orbital Data
  ////////////////
  
  if (currentVesselData.Orbit) {
  
    // VELOCITY
    $("#avgVelTip").html("<span id='avgVelUpdate'>Periapsis: " + numeral(currentVesselData.Orbit.VelocityPe).format('0.000') + "km/s<br>Apoapsis: " + numeral(currentVesselData.Orbit.VelocityAp).format('0.000') + "km/s</span>");
    $("#dataField1").html("<b><u><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'avgVelTip'\">Average Velocity:</u></b> " + numeral((currentVesselData.Orbit.VelocityPe+currentVesselData.Orbit.VelocityAp)/2).format('0.000') + "km/s");
    $("#dataField1").fadeIn();
    
    // PERIAPSIS
    $("#dataField2").html("<b>Periapsis:</b> " + numeral(currentVesselData.Orbit.Periapsis).format('0,0.000') + "km");
    $("#dataField2").fadeIn();
    
    // APOAPSIS
    $("#dataField3").html("<b>Apoapsis:</b> " + numeral(currentVesselData.Orbit.Apoapsis).format('0,0.000') + "km");
    $("#dataField3").fadeIn();
    
    // ECCENTRICITY
    $("#dataField4").html("<b>Eccentricity:</b> " + numeral(currentVesselData.Orbit.Eccentricity).format('0.000'));
    $("#dataField4").fadeIn();
    
    // INCLINATION
    $("#dataField5").html("<b>Inclination:</b> " + numeral(currentVesselData.Orbit.Inclination).format('0.000') + "&deg;");
    $("#dataField5").fadeIn();
    
    // ORBITAL PERIOD
    $("#periodTip").html(formatTime(currentVesselData.Orbit.OrbitalPeriod));
    $("#dataField6").html("<b>Orbital Period:</b> <u><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'periodTip'\">" + numeral(currentVesselData.Orbit.OrbitalPeriod).format('0,0.000') + "s</span></u>");
    $("#dataField6").fadeIn();

    // calculate the  number of orbits
    var numOrbits = 0;
    for (obt=0; obt<currentVesselData.OrbitalHistory.length; obt++) {
      
      // get the amount of time spent between the two states, or this last/only state and the current time
      var timeDiff;
      if (obt+1 >= currentVesselData.OrbitalHistory.length) { timeDiff = currUT() - currentVesselData.OrbitalHistory[obt].UT; }
      else { timeDiff = currentVesselData.OrbitalHistory[obt+1].UT - currentVesselData.OrbitalHistory[obt].UT; }
      
      // add the orbits done during this time
      numOrbits += timeDiff/currentVesselData.OrbitalHistory[obt].Period;
    }
    if (numOrbits > 0) { $("#periodTip").append("<br>Number of Orbits: " + numeral(numOrbits).format('0,0.00')); }
  } else {
    $("#dataField1").fadeOut();
    $("#dataField2").fadeOut();
    $("#dataField3").fadeOut();
    $("#dataField4").fadeOut();
    $("#dataField5").fadeOut();
    $("#dataField6").fadeOut();
  }
  
  ////////
  // Crew
  ////////
  
  if (currentVesselData.Manifest) {
    $("#dataField7").html("<b>Crew:</b> ");
    currentVesselData.Manifest.Crew.split("|").forEach(function(item, index) {
      $("#dataField7").append("<img class='tipped' title='" + item.split(";")[0] + "<br>Boarded on: " + UTtoDateTime(parseFloat(item.split(";")[2])).split("@")[0] + "<br>Mission Time: " + formatTime(currUT() - parseFloat(item.split(";")[2])).split(",")[0] + "' style='cursor: pointer' src='http://www.kerbalspace.agency/Tracker/favicon.ico'></a>&nbsp;");
    });
    $("#dataField7").fadeIn();
  } else $("#dataField7").fadeOut();
  
  /////////////
  // Resources
  /////////////
  
  if (currentVesselData.Resources) {
    var strHTML = "<span class='tipped' style='cursor:help' title='Total &Delta;v: ";
    if (currentVesselData.Resources.DeltaV !== null) { strHTML += numeral(currentVesselData.Resources.DeltaV).format('0.000') + "km/s"; }
    else { strHTML += "N/A"; }
    strHTML += "<br>Total Mass: ";
    if (currentVesselData.Resources.TotalMass !== null) { strHTML += numeral(currentVesselData.Resources.TotalMass).format('0.000') + "t"; }
    else { strHTML += "N/A"; }
    strHTML += "<br>Resource Mass: ";
    if (currentVesselData.Resources.ResourceMass !== null) { strHTML += numeral(currentVesselData.Resources.ResourceMass).format('0.000') + "t"; }
    else { strHTML += "N/A"; }
    strHTML += "'><b><u>Resources:</u></b></span> ";
    $("#dataField8").html(strHTML);
    if (currentVesselData.Resources.Resources) {
      currentVesselData.Resources.Resources.split("|").forEach(function(item, index) {
        $("#dataField8").append("<img class='tipped' title='" + item.split(";")[1] + "' style='cursor: pointer' src='" + item.split(";")[0] + ".png'></a>&nbsp;");
      });
    } else $("#dataField8").append("None");
    $("#dataField8").fadeIn();
  } else $("#dataField8").fadeOut();
  
  /////////
  // Comms
  /////////
  
  if (currentVesselData.Comms) {
    strHTML = "<span class='tipped' style='cursor:help' title='";
    if (currentVesselData.Comms.Connection) { strHTML += "Signal Delay: <0.003s"; }
    else { strHTML += "No Connection"; }
    $("#dataField9").html(strHTML + "'><b><u>Comms:</u></b></span> ");
    if (currentVesselData.Comms.Comms) {
      currentVesselData.Comms.Comms.split("|").forEach(function(item, index) {
        $("#dataField9").append("<img class='tipped' title='" + item.split(";")[1] + "' style='cursor: pointer' src='" + item.split(";")[0] + ".png'></a>&nbsp;");
      });
    } else $("#dataField9").append("None");
    $("#dataField9").fadeIn();
  } else $("#dataField9").fadeOut();
  
  ///////////////
  // Last Update
  ///////////////
  
  $("#distanceTip").html(UTtoDateTimeLocal(currentVesselData.DynamicData.UT))
  if (currentVesselData.DynamicData.DistanceTraveled) $("#distanceTip").append("<br>Current Distance Traveled: " + currentVesselData.DynamicData.DistanceTraveled + "km");
  $("#dataField10").html("<b>Last Update:</b> <u><span class='tip-update' style='cursor:help' data-tipped-options=\"inline: 'distanceTip'\">" + UTtoDateTime(currentVesselData.DynamicData.UT) + "</span></u>")
  $("#dataField10").fadeIn()

  ///////////////////
  // Mission History
  ///////////////////
  $("#missionHistory").fadeIn()
  
  // reset the history
  $("#prevEvent").empty()
  $("#prevEvent").append($('<option>', { value: null, text: 'Prev Event(s)' }));
  $("#prevEvent").prop("disabled", true);
  $("#nextEvent").empty()
  $("#nextEvent").append($('<option>', { value: null, text: 'Next Event(s)' }));
  $("#nextEvent").prop("disabled", true);
  
  // fill up the previous events, then the next events
  currentVesselData.History.reverse().forEach(function(item, index) {
    if (item.UT < currentVesselData.DynamicData.UT && item.Title != currentVesselData.DynamicData.CraftDescTitle) {
      $("#prevEvent").append($('<option>', {
        value: item.UT,
        text: item.Title
      }));
      $("#prevEvent").prop("disabled", false);
    }
  });
  currentVesselData.History.reverse().forEach(function(item, index) {
    if (item.UT > currentVesselData.DynamicData.UT && item.Title != currentVesselData.DynamicData.CraftDescTitle && item.UT < currUT()) {
      $("#nextEvent").append($('<option>', {
        value: item.UT,
        text: item.Title
      }));
      $("#nextEvent").prop("disabled", false);
    }
  });
  $("#dataLabel").html("Mission History");
  
  // hide the rest of the fields
  $("#dataField11").fadeOut();
  $("#dataField12").fadeOut();
  $("#dataField13").fadeOut();
  $("#dataField14").fadeOut();
  $("#dataField15").fadeOut();
  $("#dataField16").fadeOut();

  // create the tooltips
  // behavior of tooltips depends on the device
  if (is_touch_device()) { showOpt = 'click'; }
  else { showOpt = 'mouseenter'; }
  Tipped.create('.tipped', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
  Tipped.create('.tip-update', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
}

function vesselContentUpdate() {
  isVesselUsingMap = true;
  $("#content").empty();
  
  // remove any previous markers
  if (launchsiteMarker) surfaceMap.removeLayer(launchsiteMarker);
    
  // decide what kind of content we have to deal with
  // pre-launch/static data event
  if (currentVesselData.DynamicData.Content.charAt(0) == "@") {
    $("#content").fadeOut();
    $("#map").css("visibility", "visible");
    $("#map").fadeIn();
  
    // extract the data
    var data = currentVesselData.DynamicData.Content.split("@")[1].split("|");
  
    // set launchsite icon
    launchsiteIcon = L.icon({popupAnchor: [0, -43], iconUrl: 'markers-spacecenter.png', iconSize: [30, 40], iconAnchor: [15, 40], shadowUrl: 'markers-shadow.png', shadowSize: [35, 16], shadowAnchor: [10, 12]});
    
    // decide if this is still pre-launch or not
    var strLaunchIconCaption = "<b>Launch Location</b><br>"
    if (currentVesselData.DynamicData.MissionStartTerm == "Launched") strLaunchIconCaption = "";
    
    // if launch is in progress and there's an altitude to report, include it
    var launchAltitude = "";
    if (data.length > 3) launchAltitude = "<br>" + data[3] + "km";
    
    // place the marker and build the information window for it, then center the map on it and create a popup for it
    launchsiteMarker = L.marker([data[0], data[1]], {icon: launchsiteIcon}).addTo(surfaceMap);
    if (data[0] < 0) {
      cardinalLat = "S";
    } else {
      cardinalLat = "N";
    }
    if (data[1] < 0) {
      cardinalLon = "W";
    } else {
      cardinalLon = "E";
    }
    launchsiteMarker.bindPopup(strLaunchIconCaption + data[2] + launchAltitude + "<br>[" + numeral(Math.abs(data[0])).format('0.0000') + "&deg;" + cardinalLat + ", " + numeral(Math.abs(data[1])).format('0.0000') + "&deg;" + cardinalLon + "]" , {closeButton: true});
    if (!strLaunchIconCaption.length) {
      surfaceMap.fitBounds([srfLocations.KSC, [data[0], data[1]]]);
    } else {
      surfaceMap.setView(launchsiteMarker.getLatLng(), 2); 
    }
    launchsiteMarker.openPopup(); 
    
    // close the popup after 5 seconds
    // make sure to reset the timeout in case the page has been loaded with new data before the 5s expire
    clearTimeout(mapMarkerTimeout);
    mapMarkerTimeout = setTimeout(function () { 
      launchsiteMarker.closePopup(); 
    }, 5000);
    
  // dynamic map with orbital information
  } else if (currentVesselData.DynamicData.Content.charAt(0) == "!" && !currentVesselData.DynamicData.Content.includes("[")) {
  
    // we need the orbital catalog so if it's not loaded with our data, call again later
    if (!orbitCatalog.find(o => o.ID === strCurrentVessel)) { setTimeout(function() { vesselContentUpdate(); }, 250); return; }
  
    // extract the data
    var data = currentVesselData.DynamicData.Content.split("!")[1].split("|");

    // only show dynamic information if this is a current state
    if (currentVesselData.Orbit.UT == orbitCatalog.find(o => o.ID === strCurrentVessel).Orbit.UT) {
      $("#content").fadeOut();
      $("#map").css("visibility", "visible");
      $("#map").fadeIn();
      
    // we're looking at old orbital data
    } else {
      
      // two images
      if (data[0].includes(".png")) {
        $("#content").html("<div class='fullCenter'><img width='475' class='contentTip' title='Ecliptic View<br>Dynamic orbit unavailable - viewing old data' src='" + data[0] + "'>&nbsp;<img width='475' class='contentTip' title='Polar View<br>Dynamic orbit unavailable - viewing old data' src='" + data[1] + "'></div>");
        
      // one image
      } else {
        $("#content").html("<img class='fullCenter' class='tip' title='" + data[1] + "' src='" + data[0] + "'>");
      }
    
      $("#content").fadeIn();
    }

  
  // static orbits with dynamic information
  } else if (currentVesselData.DynamicData.Content.charAt(0) == "!" && currentVesselData.DynamicData.Content.includes("[")) {
    $("#map").css("visibility", "visible");
    $("#map").fadeIn();
  
    // we need the orbital catalog so if it's not loaded with our data, call again later
    if (!orbitCatalog.find(o => o.ID === strCurrentVessel)) { setTimeout(function() { vesselContentUpdate(); }, 250); return; }

    // only show dynamic information if this is a current state
    if (currentVesselData.Orbit.UT == orbitCatalog.find(o => o.ID === strCurrentVessel).Orbit.UT) {
    // we're looking at old orbital data
    } else {
    }
  
    $("#content").fadeOut();

  // streaming ascent data, possibly with video
  } else if (currentVesselData.DynamicData.Content.charAt(0) == "~") {
  
  // just plain HTML
  } else {
    isVesselUsingMap = false;
    if ($("#map").css("visibility") != "hidden") $("#map").fadeOut();
    $("#content").html(currentVesselData.DynamicData.Content);
    $("#content").fadeIn();
  }
  
  // create any tooltips
  // behavior of tooltips depends on the device
  if (is_touch_device()) { showOpt = 'click'; }
  else { showOpt = 'mouseenter'; }
  Tipped.create('.contentTip', { showOn: showOpt, hideOnClickOutside: is_touch_device(), target: 'mouse', hideOn: {element: 'mouseleave'} });
}

// JQuery callbacks
// only handle this if the page is a vessel instead of crew
$("#infoBox").hover(function() { 
  if (pageType == "vessel") {
    if (!$("#infoDialog").dialog("isOpen")) { $("#infoTitle").html("Click Here for Additional Information"); }
    $("#partsImg").fadeIn();
  }
}, function() {
  if (pageType == "vessel") {
  
    // wait to give tooltips a chance to hide on mouseover before checking to see if we're actually off the image
    setTimeout(function() {
      if (!$('#infoBox').is(":hover") && !isTipShow) {
        $("#infoTitle").html(currentVesselData.DynamicData.CraftDescTitle);
        $("#partsImg").fadeOut();
      }
    }, 250);
  }
});

// upon selection of a new list item, take the user to that event
$("#prevEvent").change(function () {
  if ($("#prevEvent").val()) { loadVessel(strCurrentVessel, $("#prevEvent").val()); }
});
$("#nextEvent").change(function () {          
  if ($("#nextEvent").val()) { loadVessel(strCurrentVessel, $("#nextEvent").val()); }
});

// opens the dialog box with more details - this is the same box that holds crew details, was just implemented here first
function showInfoDialog() {
  if (!$("#infoDialog").dialog("isOpen")) { $("#infoDialog").dialog("open") }
}

// provides full details for all vessel parts, ensures the parts catalog is loaded
function assignPartInfo() {
  if (!partsCatalog.length) { setTimeout(assignPartInfo, 500); }
  else {
    $("area").each(function( index ) {
      if ($(this ).attr("title").substr(0,1) == "&") {
        strPartName = $(this ).attr("title").substr(1,$(this ).attr("title").length-1);

        // we have to hack our own tooltips in other browsers so only redo the title attribute in Firefox
        if (browserName == "Firefox") {
          $(this).attr("title", partsCatalog.find(o => o.Part === strPartName).HTML);
          
        // for other browsers we are going to move the data to the alt tag so they don't create a tooltip
        // and we can use it to plug the data into a dynamic tooltip attached to a div that moves over the cursor location
        } else {
          $(this).attr("title", ""); 
          $(this).attr("alt", partsCatalog.find(o => o.Part === strPartName).HTML);
        }
      }
    });
    
    // Non-Firefox support for image map tooltips
    // check every <area> tag on the page for any title data remaining from custom part data not taken from the database
    $("area").each(function( index ) {
      if (browserName != "Firefox" && $(this).attr("title")) {
        $(this).attr("alt", $(this).attr("title")); 
        $(this).attr("title", ""); 
      }
    });      

    // create the tooltips
    // behavior of tooltips depends on the device
    if (is_touch_device()) { showOpt = 'click'; }
    else { showOpt = 'mouseenter'; }
    if (browserName == "Firefox") {
      Tipped.create('area', { showOn: showOpt, hideOnClickOutside: is_touch_device(), target: 'mouse', offset: { y: 2 } });
    } else {
      Tipped.create('.nonFFTip', { showOn: showOpt, hideOnClickOutside: is_touch_device(), target: 'mouse', offset: { y: 2 } });
    }
  }
}

// depends on whether we are referenceing a UT that is the current time or not
function getLaunchUT() {
  if (!isNaN(vesselPastUT)) return vesselPastUT;
  else return currUT();
}

// following functions perform parsing on data strings
function getVesselImage() {
  if (!currentVesselData.DynamicData.CraftImg) {
    return "nadaOp.png";
  } else {
    return currentVesselData.DynamicData.CraftImg.split("|")[vesselRotationIndex].split("~")[0];
  }
}
function getPartsHTML() {
  if (!currentVesselData.DynamicData.CraftImg) {
    return null;
  } else {
    if (currentVesselData.DynamicData.CraftImg.split("|")[vesselRotationIndex].split("~")[3] != "null") {
      return currentVesselData.DynamicData.CraftImg.split("|")[vesselRotationIndex].split("~")[3];
    } else {
      return null;
    }
  }
}
function getMissionEndTime() {
  if (!currentVesselData.StaticData.MissionEnd) {
    return null;
  } else {
    return parseInt(currentVesselData.StaticData.MissionEnd.split(";")[1]);
  }
}
function getMissionEndMsg() {
  if (!currentVesselData.StaticData.MissionEnd) {
    return null;
  } else {
    return currentVesselData.StaticData.MissionEnd.split(";")[2];
  }
}
function isMissionEnded() {
  if (!currentVesselData.StaticData.MissionEnd) {
    return false;
  } else {
    return parseInt(currentVesselData.StaticData.MissionEnd.split(";")[0]) <= currUT();
  }
}