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
  // if this is the first page to load, replace the current history
  var strURL;
  if (isNaN(UT)) { strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + vessel; }
  else { strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + vessel + "&ut=" + UT; }
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
  
  // add the resize button to the map
  addMapResizeButton();
  if (!$('#map').is(":hover")) { $(".easy-button-button").fadeOut(); }
  
  // no further loading needed if this is already the current vessel
  // unless a new time is being specified
  if (!currentVesselData || strCurrentVessel != vessel || (currentVesselData && !isNaN(UT) && currentVesselData.DynamicData.UT != UT)) { 
    strCurrentVessel = vessel;

    // loading spinners - activate!
    $("#infoBox").spin({ position: 'relative', top: '50%', left: '50%' });
    $("#contentBox").spin({ position: 'relative', top: '50%', left: '50%' });
    $("#dataLabel").html("Loading Data...");
    
    // put out the call for the vessel data
    console.log("loadVesselData.asp?craft=" + strCurrentVessel + "&UT=" + currUT() + "&UTjump=" + UT);
    loadDB("loadVesselData.asp?craft=" + strCurrentVessel + "&UT=" + currUT() + "&UTjump=" + UT, loadVesselDataAJAX);
  }
}

// sends out the AJAX call for data to add any vessels to a GeoGebra figure/Leaflet library once it has loaded
// calls itself repeatedly in the event that the menu is not yet loaded
function loadVesselOrbits() {
  if (isMenuDataLoaded) {
    var strVessels = '';
    var menuNodes = w2ui['menu'].get(strCurrentSystem).nodes;
    if (menuNodes.length) {
      console.log(menuNodes);
      strVessels = extractVesselIDs(menuNodes);
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
    $("#vesselOrbitTypes").fadeIn();
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
  $("#vesselImg").html("<img src='" + getVesselImage() + "'>");
  $("#infoTitle").html(currentVesselData.DynamicData.CraftDescTitle);
  $("#infoDialog").html(currentVesselData.DynamicData.CraftDescContent);
  $("#infoDialog").dialog("option", "title", "Additional Information - " + currentVesselData.DynamicData.CraftDescTitle);
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
    $("#MET").html("<b>" + currentVesselData.DynamicData.MissionStartTerm + ":</b><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'metTip'\"> <u>To Be Determined</u>");
    
  // post the current launch time
  } else {
    $("#MET").html("<b>" + currentVesselData.DynamicData.MissionStartTerm + ":</b><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'metTip'\"> <u>" + UTtoDateTime(launchTime) + " UTC</u>");
  }
  $("#MET").fadeIn();
  
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
    $("#velocity").html("<b><u><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'avgVelTip'\">Average Velocity:</u></b> " + numeral((currentVesselData.Orbit.VelocityPe+currentVesselData.Orbit.VelocityAp)/2).format('0.000') + "km/s");
    $("#velocity").fadeIn();
    
    // PERIAPSIS
    $("#pe").html("<b>Periapsis:</b> " + numeral(currentVesselData.Orbit.Periapsis).format('0,0.000') + "km");
    $("#pe").fadeIn();
    
    // APOAPSIS
    $("#ap").html("<b>Apoapsis:</b> " + numeral(currentVesselData.Orbit.Apoapsis).format('0,0.000') + "km");
    $("#ap").fadeIn();
    
    // ECCENTRICITY
    $("#ecc").html("<b>Eccentricity:</b> " + numeral(currentVesselData.Orbit.Eccentricity).format('0.000'));
    $("#ecc").fadeIn();
    
    // INCLINATION
    $("#inc").html("<b>Inclination:</b> " + numeral(currentVesselData.Orbit.Inclination).format('0.000') + "&deg;");
    $("#inc").fadeIn();
    
    // ORBITAL PERIOD
    $("#periodTip").html(formatTime(currentVesselData.Orbit.OrbitalPeriod));
    $("#period").html("<b>Orbital Period:</b> <u><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'periodTip'\">" + numeral(currentVesselData.Orbit.OrbitalPeriod).format('0,0.000') + "s</span></u>");
    $("#period").fadeIn();

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
    $("#velocity").fadeOut();
    $("#pe").fadeOut();
    $("#ap").fadeOut();
    $("#ecc").fadeOut();
    $("#inc").fadeOut();
    $("#period").fadeOut();
  }
  
  ////////
  // Crew
  ////////
  
  if (currentVesselData.Manifest) {
    $("#crew").html("<b>Crew:</b> ");
    currentVesselData.Manifest.Crew.split("|").forEach(function(item, index) {
      $("#crew").append("<img class='tipped' title='" + item.split(";")[0] + "<br>Boarded on: " + UTtoDateTime(parseFloat(item.split(";")[2])).split("@")[0] + "<br>Mission Time: " + formatTime(currUT() - parseFloat(item.split(";")[2])).split(",")[0] + "' style='cursor: pointer' src='http://www.kerbalspace.agency/Tracker/favicon.ico'></a>&nbsp;");
    });
    $("#crew").fadeIn();
  } else $("#crew").fadeOut();
  
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
    $("#resources").html(strHTML);
    if (currentVesselData.Resources.Resources) {
      currentVesselData.Resources.Resources.split("|").forEach(function(item, index) {
        $("#resources").append("<img class='tipped' title='" + item.split(";")[1] + "' style='cursor: pointer' src='" + item.split(";")[0] + ".png'></a>&nbsp;");
      });
    } else $("#resources").append("None");
    $("#resources").fadeIn();
  } else $("#resources").fadeOut();
  
  /////////
  // Comms
  /////////
  
  if (currentVesselData.Comms) {
    strHTML = "<span class='tipped' style='cursor:help' title='";
    if (currentVesselData.Comms.Connection) { strHTML += "Signal Delay: <0.003s"; }
    else { strHTML += "No Connection"; }
    $("#comms").html(strHTML + "'><b><u>Comms:</u></b></span> ");
    if (currentVesselData.Comms.Comms) {
      currentVesselData.Comms.Comms.split("|").forEach(function(item, index) {
        $("#comms").append("<img class='tipped' title='" + item.split(";")[1] + "' style='cursor: pointer' src='" + item.split(";")[0] + ".png'></a>&nbsp;");
      });
    } else $("#comms").append("None");
    $("#comms").fadeIn();
  } else $("#comms").fadeOut();
  
  ///////////////
  // Last Update
  ///////////////
  
  $("#distanceTip").html(UTtoDateTimeLocal(currentVesselData.DynamicData.UT))
  if (currentVesselData.DynamicData.DistanceTraveled) $("#distanceTip").append("<br>Current Distance Traveled: " + currentVesselData.DynamicData.DistanceTraveled + "km");
  $("#update").html("<b>Last Update:</b> <u><span class='tip-update' style='cursor:help' data-tipped-options=\"inline: 'distanceTip'\">" + UTtoDateTime(currentVesselData.DynamicData.UT) + "</span></u>")
  $("#update").fadeIn()

  ///////////////////
  // Mission History
  ///////////////////
  
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

  // create the tooltips
  // behavior of tooltips depends on the device
  if (is_touch_device()) { showOpt = 'click'; }
  else { showOpt = 'mouseenter'; }
  Tipped.create('.tipped', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
  Tipped.create('.tip-update', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
}

function vesselContentUpdate() {
}

// JQuery callbacks
$("#infoBox").hover(function() { 
  if (!$("#infoDialog").dialog("isOpen")) { $("#infoTitle").html("Click Here for Additional Information"); }
  $("#partsImg").fadeIn();
}, function() {
  
  // wait to give tooltips a chance to hide on mouseover before checking to see if we're actually off the image
  setTimeout(function() {
    if (!$('#infoBox').is(":hover") && !isTipShow) {
      $("#infoTitle").html(currentVesselData.DynamicData.CraftDescTitle);
      $("#partsImg").fadeOut();
    }
  }, 250);
});

// upon selection of a new list item, take the user to that event
$("#prevEvent").change(function () {
  if ($("#prevEvent").val()) { loadVessel(strCurrentVessel, $("#prevEvent").val()); }
});
$("#nextEvent").change(function () {          
  if ($("#nextEvent").val()) { loadVessel(strCurrentVessel, $("#nextEvent").val()); }
});

// opens the dialog box with more details on the vessel
function showVesselInfo() {
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