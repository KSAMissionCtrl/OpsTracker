// available content height: 480px (initially) / 885px (Max)
function loadVessel(vessel, givenUT) {
  if (!givenUT) givenUT = "NaN";

  // can't continue if menu data hasn't loaded. Try again in 250ms
  if (!isMenuDataLoaded) {
    setTimeout(function() {
      loadVessel(vessel, givenUT);
    }, 250)
    return;
  }
  
  // we can't let anyone jump to a UT later than the current UT
  if (!isNaN(givenUT) && givenUT > currUT() && !getCookie("missionctrl")) { givenUT = "NaN"; }
  vesselPastUT = givenUT;
  
  // if this is the first page to load, replace the current history
  var strURL;
  if (!history.state) {
    if (window.location.href.includes("&ut")) {
      var strURL = window.location.href;
      givenUT = parseInt(getParameterByName("ut"));
    }
    else var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + vessel;
    history.replaceState({Type: "vessel", ID: vessel, UT: parseInt(givenUT)}, document.title, strURL);
    
  // don't create a new entry if this is the same page being reloaded
  // however if its the same page but a different time, then that's different
  } else if (history.state.ID != vessel || (history.state.ID == vessel && givenUT != "NaN")) {
    if (givenUT != "NaN") var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + vessel + "&ut=" + givenUT;
    else var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + vessel;
    history.pushState({Type: "vessel", ID: vessel, UT: parseInt(givenUT)}, document.title, strURL);
  } 
  
  // if this vessel is not in the current system, we need to load a new system
  // unless the system that is the current system is not yet loaded
  // we can't call this function until the menu is loaded
  if (getParentSystem(vessel) != strCurrentBody || (getParentSystem(vessel) == strCurrentBody && !isGGBAppletLoaded)) loadBody(getParentSystem(vessel));
  
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
  currentVesselData = null;
  loadVesselAJAX(null, givenUT);
  
  // add vessel-specific buttons to the map
  addMapResizeButton();
  addMapViewButton();
  
  // we can't be switching vessels while loading any plot data so if it's in progress, kill it
  if (layerControl && !layerControl.options.collapsed) { 
    isOrbitRenderTerminated = true;
    layerControl._collapse();
    layerControl.options.collapsed = true;
    if (obtTrackDataLoad) layerControl.removeLayer(obtTrackDataLoad);
    obtTrackDataLoad = null;
    clearSurfacePlots();
    currentVesselPlot = null;
    vesselMarker = null;
  }
}

// parses data used to display information on parts for vessels
function loadPartsAJAX(xhttp) {
  xhttp.responseText.split("^").forEach(function(item) { partsCatalog.push(rsToObj(item)); });
  console.log(partsCatalog);
}

// parses data that shows up for the vessel currently selected in the menu
function loadVesselAJAX(xhttp, time) {
  
  // if the call was made to get data, we should have data
  if (xhttp) {

    // separate the main data segments
    var data = xhttp.responseText.split("Typ3vessel")[1].split("*");
    
    // the vessel catalog data is first
    var catalog = rsToObj(data[0]);
    
    // the various tables of the current record are next
    var dataTables = data[1].split("^");
    var craft = rsToObj(dataTables[0]);
    var resources = rsToObj(dataTables[1]);
    var crew = rsToObj(dataTables[2]);
    var comms = rsToObj(dataTables[3]);
    var obt = rsToObj(dataTables[4]);
    var ports = rsToObj(dataTables[5]);

    // parse and sort the histories and launch times
    var history = [];
    var launches = [];
    var obtHist = [];
    data[3].split("|").forEach(function(item) { history.push({UT: parseFloat(item.split("~")[0]), Title: item.split("~")[1]}); });
    if (data[4].split("|") != "null") {
      data[4].split("|").forEach(function(item) { launches.push({UT: parseFloat(item.split("~")[0]), LaunchTime: parseFloat(item.split("~")[1])}); });
    }
    if (data[5].split("|") != "null") {
      data[5].split("|").forEach(function(item) { obtHist.push({UT: parseFloat(item.split("~")[0]), Period: parseFloat(item.split("~")[1])}); });
    }
    
    // store all the data
    currentVesselData = { CatalogData: catalog,
                          CraftData: craft,
                          Resources: resources,
                          Manifest: crew,
                          Comms: comms,
                          Ports: ports,
                          Orbit: obt,
                          History: history,
                          LaunchTimes: launches,
                          OrbitalHistory: obtHist };
  
  // try to fetch the data from the catalog
  } else {
  
    // if we are not looking for a past date, we may be able to just pull from catalog data
    if (time == "NaN") {
      var vessel = opsCatalog.find(o => o.ID === strCurrentVessel);
      
      // copy over the data if it is available
      // was originally just doing currentVesselData = vessel.CurrentData but this created a reference link!!
      if (vessel && vessel.CurrentData) {
        currentVesselData = {};
        for (var prop in vessel.CurrentData) {
          currentVesselData[prop] = vessel.CurrentData[prop];
        }

      // get the data if it hasn't been loaded yet, then callback to wait for it to load
      } else if (vessel && !vessel.CurrentData && !vessel.isLoading) {
        vessel.isLoading = true;
        loadDB("loadOpsData.asp?db=" + strCurrentVessel + "&ut=" + currUT() + "&type=vessel" + "&pastUT=NaN", loadOpsDataAJAX);
        return setTimeout(loadVesselAJAX, 100, xhttp, time);
      
      // callback to check the catalog again if it's loading right now
      } else if (vessel && !vessel.CurrentData && vessel.isLoading) {
        return setTimeout(loadVesselAJAX, 100, xhttp, time);
      
      // if it's not in the catalog we need to do a data call for an inactive vessel
      } else if (!vessel) {
        return loadDB("loadOpsData.asp?db=" + strCurrentVessel + "&ut=" + currUT() + "&type=vessel" + "&pastUT=NaN", loadVesselAJAX);
      }
    
    // we are getting a past event that we will need to fetch new data for
    } else {
      return loadDB("loadOpsData.asp?db=" + strCurrentVessel + "&ut=" + currUT() + "&type=vessel" + "&pastUT=" + time, loadVesselAJAX);
    }
  }
  
  // kill all spinners
  $("#infoBox").spin(false);
  $("#contentBox").spin(false);
  
  // setup the content header sections
  $("#contentHeader").html("<span id='patches'></span>&nbsp;<span id='title'></span>&nbsp;<span id='tags'></span>");

  // update with the vessel name for this record
  vesselTitleUpdate();
  
  // tag loading
  //$("#tags").spin({ scale: 0.35, position: 'relative', top: '10px', left: (((955/2) + (strVesselName.width('bold 32px arial')/2)) + 10) +'px' });
  
  // update the twitter timeline only if the current one loaded isn't already the one we want to load
  var thisTimeline = '';
  if (currentVesselData.CatalogData.Timeline) {
    thisTimeline = currentVesselData.CatalogData.Timeline.split(";")[1];
    if (!thisTimeline) thisTimeline = currentVesselData.CatalogData.Timeline;
  }
  if (thisTimeline != twitterSource) vesselTimelineUpdate();
  
  $("#patches").empty();
  if (currentVesselData.CatalogData.Patches) {
    
    // program patch
    $("#patches").append("<a target='_blank' href='" + currentVesselData.CatalogData.Patches.split("|")[0].split(";")[2] + "'><img id='programPatch' class='tipped' data-tipped-options=\"position: 'bottom'\" style='height: 35px;' title=\"<center>Click to view the " + currentVesselData.CatalogData.Patches.split("|")[0].split(";")[0] + " Program page</center><br /><img src='" + currentVesselData.CatalogData.Patches.split("|")[0].split(";")[1] + "'>\" src='" + currentVesselData.CatalogData.Patches.split("|")[0].split(";")[1] + "'></a>&nbsp;");
    
    // vessel patch?
    if (currentVesselData.CatalogData.Patches.split("|").length > 1) {
      $("#patches").append("<a target='_blank' href='" + currentVesselData.CatalogData.Patches.split("|")[1].split(";")[2] + "'><img id='vesselPatch' class='tipped' data-tipped-options=\"position: 'bottom'\" style='height: 35px; cursor: pointer;' title=\"<center>Click to view the " + currentVesselData.CatalogData.Patches.split("|")[1].split(";")[0] + " vessel page</center><br /><img src='" + currentVesselData.CatalogData.Patches.split("|")[1].split(";")[1] + "'>\" src='" + currentVesselData.CatalogData.Patches.split("|")[1].split(";")[1] + "'></a>&nbsp;");
    }

    // mission patch?
    if (currentVesselData.CatalogData.Patches.split("|").length > 2) {
      $("#patches").append("<img id='missionPatch' class='tipped' data-tipped-options=\"position: 'bottom'\" style='height: 35px; cursor: help;' title=\"<img src='" + currentVesselData.CatalogData.Patches.split("|")[2].split(";")[1] + "<br /><center>" + currentVesselData.CatalogData.Patches.split("|")[2].split(";")[0] + "</center>' src='" + currentVesselData.CatalogData.Patches.split("|")[2].split(";")[1] + "'>&nbsp;");
    }
  }

  // no orbit data or mission ended? Close the dialog in case it is open
  if (!currentVesselData.Orbit || isMissionEnded()) $("#mapDialog").dialog("close");
  
  // if the current body is undefined then this is an inactive vessel, load the one the vessel was last in
  if (!strCurrentBody) { 
    var soiList = currentVesselData.CatalogData.SOI.split("|");
    
    // last element is always the inactive body ID
    soiList.pop();
    var lastBody = soiList.pop();
    strCurrentBody = bodyCatalog.find(o => o.ID === parseInt(lastBody.split(";")[1])).Body + "-System";
    loadMap();
  }

  // display all the updateable data
  vesselInfoUpdate();
  vesselMETUpdate();
  vesselVelocityUpdate();
  vesselPeUpdate();
  vesselApUpdate();
  vesselEccUpdate();
  vesselIncUpdate();
  vesselPeriodUpdate();
  vesselCrewUpdate();
  vesselResourcesUpdate();
  vesselCommsUpdate();
  vesselAddlResUpdate();
  vesselLastUpdate();
  vesselHistoryUpdate();
  vesselContentUpdate();
  
  // hide the rest of the fields that are unused for now
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

function vesselTimelineUpdate(update) {

  // if there are multiple sources and this isn't an update then clear to just the main source
  if ($("#twitterTimelineSelection").html().includes("|") && !update) swapTwitterSource();
  
  // only check for an existing mission feed if this is an update call, otherwise it could alredy exist from another craft when only switching vessels
  if (currentVesselData.CatalogData.Timeline) { 
    
    // if this timeline is date stamped, don't show it unless we are past the date
    if (currentVesselData.CatalogData.Timeline.split(";").length > 1) {
      if (currUT() > parseFloat(currentVesselData.CatalogData.Timeline.split(";")[0])) { 
        if (!update || (update && !$("#twitterTimelineSelection").html().includes("Mission Feed"))) {
          swapTwitterSource("Mission Feed", currentVesselData.CatalogData.Timeline.split(";")[1]);
          if (update) flashUpdate("#twitterTimelineSelection", "#77C6FF", "#FFF");
        }
      
      // not yet to the time, so setup an update call, but don't bother if this mission is over
      } else if (!isMissionEnded()) {
        updatesList.push({ Type: "object", ID: currentVesselData.CatalogData.DB, UT: parseFloat(currentVesselData.CatalogData.Timeline.split(";")[0]) });
      }
    } else if (!update) swapTwitterSource("Mission Feed", currentVesselData.CatalogData.Timeline);
  }
}

function vesselTitleUpdate(update) {
  if (update && $("#title").html() != currentVesselData.CraftData.CraftName) {
    flashUpdate("#title", "#77C6FF", "#FFF");
    $("#title").html(currentVesselData.CraftData.CraftName);
    document.title = "KSA Operations Tracker" + " - " + currentVesselData.CraftData.CraftName + ": " + currentVesselData.CraftData.CraftDescTitle;
  } else {
    $("#title").html(currentVesselData.CraftData.CraftName);
    document.title = "KSA Operations Tracker" + " - " + currentVesselData.CraftData.CraftName + ": " + currentVesselData.CraftData.CraftDescTitle;
  }
}

// updates all the data in the Info Box
function vesselInfoUpdate(update) {
  
  // setup the basics
  $("#infoImg").html("<img src='" + getVesselImage() + "'>");
  $("#infoTitle").html(currentVesselData.CraftData.CraftDescTitle);
  $("#infoTitle").attr("class", "infoTitle vessel");
  if (update) flashUpdate("#infoTitle", "#77C6FF", "#000");
  $("#infoDialog").html(currentVesselData.CraftData.CraftDescContent);
  $("#infoDialog").dialog("option", "title", "Additional Information - " + currentVesselData.CraftData.CraftDescTitle);
  $("#infoDialog").dialog("option", {width: 643, height: 400});
  
  // is there a parts overlay?
  if (getPartsHTML()) {
    var partsImgHTML = '';
    var imgMapData = getPartsHTML();
    
    // create divs for every <area> tag
    imgMapData.split("<area").forEach(function(item) {
      if (item.includes('coords="')) {
        var areaCenter = item.split('coords="')[1].split('"')[0].split(",");
        partsImgHTML += "<div id='" + item.split('title="&')[1].split('"')[0] + "' class='imgmap' style='";
        partsImgHTML += "top: " + (parseInt(areaCenter[1])-5) + "px; ";
        partsImgHTML += "left: " + (parseInt(areaCenter[0])+$("#infoBox").position().left+$("#mainContent").position().left-5) + "px;";
        partsImgHTML += "'></div>";
      }
    });
    
    // extract the image name
    partsImgHTML += "<img src='https://i.imgur.com/" + imgMapData.split("/")[3].split(".")[0] + ".png'/>";

    $("#partsImg").html(partsImgHTML);
    setTimeout(function(){ if (!$('#infoBox').is(":hover")) $("#partsImg").fadeOut(1000); }, 1000);
    assignPartInfo();
  } else $("#partsImg").empty();
}

function vesselMETUpdate(update) {
  
  // get the current launch time - defer to mission start time if it's available
  var launchTime = currentVesselData.CatalogData.MissionStartTime;
  for (i=currentVesselData.LaunchTimes.length-1; i>=0; i--) {
    if (currentVesselData.LaunchTimes[i].UT <= getLaunchUT()) {
      launchTime = currentVesselData.LaunchTimes[i].LaunchTime;
      break;
    }
  }
  
  // show the data field
  // we don't know the start time right now
  var strHTML;
  if (!launchTime) {
    strHTML = "<b>" + currentVesselData.CraftData.MissionStartTerm + ":</b><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'metTip'\"> <u>To Be Determined</u>";
    
  // post the current launch time
  } else {
    strHTML = "<b>" + currentVesselData.CraftData.MissionStartTerm + ":</b><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'metTip'\"> <u>" + UTtoDateTime(launchTime) + " UTC</u>";
  }
  $("#dataField0").fadeIn();
  
  // decide what goes in the tooltip
  var strTip = "";
  
  // we don't know yet
  if (!launchTime && !currentVesselData.CraftData.PastEvent) { strTip = "launch time currently being assessed<br>"; }
  else {

    // if this is a past event and there was more than one launch time, find what time equals the current UT
    // if it is in a state greater than the current one, that's the actual current launch time
    if (currentVesselData.CraftData.PastEvent && currentVesselData.LaunchTimes.length > 1) {
      for (i=currentVesselData.LaunchTimes.length-1; i>=0; i--) {
        if (currentVesselData.LaunchTimes[i].UT <= currUT() && currentVesselData.LaunchTimes[i].UT > currentVesselData.CraftData.UT) {
          if (!currentVesselData.LaunchTimes[i].LaunchTime) {
            strTip += "Launch has been scrubbed or put on hold<br>Actual Launch Time: To Be Determined";
          } else {
            strTip += "Actual Launch Time: " + UTtoDateTime(currentVesselData.LaunchTimes[i].LaunchTime) + " UTC<br>";
          }
          launchTime = currentVesselData.LaunchTimes[i].LaunchTime
          break;
        }
      }
    }
    
    // add further details based on mission status
    // mission hasn't started yet
    if (launchTime && currUT() < launchTime) {
      strTip += "Time to Launch: <span data='" + launchTime + "' id='metCount'>" + formatTime(launchTime-currUT()) + "</span>";
      
    // mission is ongoing
    } else if (launchTime && !isMissionEnded()) {
      strTip += "Mission Elapsed Time: <span data='" + launchTime + "' id='metCount'>" + formatTime(currUT()-launchTime) + "</span>";
      
    // mission has ended
    } else if (launchTime && isMissionEnded()) {
      strTip += getMissionEndMsg() + "<br>Mission Elapsed Time: <span id='metCount'>" + formatTime(getMissionEndTime()-launchTime) + "</span>";
    }
  }
  if (update && strHTML + strTip != currentVesselData.CraftData.HTML) {
    flashUpdate("#dataField0", "#77C6FF", "#FFF");
    $("#dataField0").html(strHTML);
    $("#metTip").html(strTip);
  } else {
    $("#dataField0").html(strHTML);
    $("#metTip").html(strTip);
  }
  currentVesselData.CraftData.HTML = strHTML = strTip;
}

function vesselVelocityUpdate(update) {
  if (currentVesselData.Orbit) {
    var strTip = "<span id='avgVelUpdate'>Periapsis: " + numeral(currentVesselData.Orbit.VelocityPe).format('0.000') + "km/s<br>Apoapsis: " + numeral(currentVesselData.Orbit.VelocityAp).format('0.000') + "km/s</span>";
    var strHTML = "<b><u><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'avgVelTip'\">Average Velocity:</u></b> " + numeral((currentVesselData.Orbit.VelocityPe+currentVesselData.Orbit.VelocityAp)/2).format('0.000') + "km/s";
    $("#dataField1").fadeIn();
    if (update && (!currentVesselData.Orbit.VelocityHTML || (currentVesselData.Orbit.VelocityHTML && strHTML + strTip != currentVesselData.Orbit.VelocityHTML))) {
      flashUpdate("#dataField1", "#77C6FF", "#FFF");
      $("#avgVelTip").html(strTip);
      $("#dataField1").html(strHTML);
    } else {
      $("#avgVelTip").html(strTip);
      $("#dataField1").html(strHTML);
    }
    currentVesselData.Orbit.VelocityHTML = strHTML + strTip;
  } else $("#dataField1").fadeOut();
}

function vesselPeUpdate(update) {
  if (currentVesselData.Orbit) {
    var strHTML = "<b>Periapsis:</b> " + numeral(currentVesselData.Orbit.Periapsis).format('0,0.000') + "km";
    $("#dataField2").fadeIn();
    if (update && strHTML != $("#dataField2").html()) {
      flashUpdate("#dataField2", "#77C6FF", "#FFF");
      $("#dataField2").html(strHTML);
    } else $("#dataField2").html(strHTML);
  } else $("#dataField2").fadeOut();
}

function vesselApUpdate(update) {
  if (currentVesselData.Orbit) {
    var strHTML = "<b>Apoapsis:</b> " + numeral(currentVesselData.Orbit.Apoapsis).format('0,0.000') + "km";
    $("#dataField3").fadeIn();
    if (update && strHTML != $("#dataField3").html()) {
      flashUpdate("#dataField3", "#77C6FF", "#FFF");
      $("#dataField3").html(strHTML);
    } else $("#dataField3").html(strHTML);
  } else $("#dataField3").fadeOut();
}

function vesselEccUpdate(update) {
  if (currentVesselData.Orbit) {
    var strHTML = "<b>Eccentricity:</b> " + numeral(currentVesselData.Orbit.Eccentricity).format('0.000');
    $("#dataField4").fadeIn();
    if (update && strHTML != $("#dataField4").html()) {
      flashUpdate("#dataField4", "#77C6FF", "#FFF");
      $("#dataField4").html(strHTML);
    } else $("#dataField4").html(strHTML);
  } else $("#dataField4").fadeOut();
}

function vesselIncUpdate(update) {
  if (currentVesselData.Orbit) {
    var strHTML = "<b>Inclination:</b> " + numeral(currentVesselData.Orbit.Inclination).format('0.000') + "&deg;";
    $("#dataField5").fadeIn();
    if (update && strHTML != $("#dataField5").html()) {
      flashUpdate("#dataField5", "#77C6FF", "#FFF");
      $("#dataField5").html(strHTML);
    } else $("#dataField5").html(strHTML);
  } else $("#dataField5").fadeOut();
}

function vesselPeriodUpdate(update) {
  if (currentVesselData.Orbit) {
    var strTip = formatTime(currentVesselData.Orbit.OrbitalPeriod);
    var strHTML = "<b>Orbital Period:</b> <u><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'periodTip'\">" + numeral(currentVesselData.Orbit.OrbitalPeriod).format('0,0.000') + "s</span></u>";
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
    if (numOrbits > 0) { strTip += "<br>Number of Orbits: " + numeral(numOrbits).format('0,0.00'); }
    if (update && (!currentVesselData.Orbit.OrbitalPeriodHTML || (currentVesselData.Orbit.OrbitalPeriodHTML && strHTML + strTip != currentVesselData.Orbit.OrbitalPeriodHTML))) {
      flashUpdate("#dataField6", "#77C6FF", "#FFF");
      $("#dataField6").html(strHTML);
      $("#periodTip").html(strTip);
    } else {
      $("#dataField6").html(strHTML);
      $("#periodTip").html(strTip);
    }
    currentVesselData.Orbit.OrbitalPeriodHTML = strHTML + strTip;
  } else $("#dataField6").fadeOut();
}

function vesselCrewUpdate(update) {
  if (currentVesselData.Manifest) {
    var strHTML = "<b>Crew:</b> ";
    currentVesselData.Manifest.Crew.split("|").forEach(function(item, index) {
      strHTML += "<img class='tipped' title='" + item.split(";")[0] + "<br>Boarded on: " + UTtoDateTime(parseFloat(item.split(";")[2])).split("@")[0] + "<br>Mission Time: " + formatTime(currUT() - parseFloat(item.split(";")[2])).split(",")[0] + "' style='cursor: pointer' src='http://www.kerbalspace.agency/Tracker/favicon.ico'></a>&nbsp;";
    });
    $("#dataField7").fadeIn();
    if (update && (!currentVesselData.Manifest.CrewHTML || (currentVesselData.Manifest.CrewHTML && strHTML != currentVesselData.Manifest.CrewHTML))) {
      flashUpdate("#dataField7", "#77C6FF", "#FFF");
      $("#dataField7").html(strHTML);
    } else $("#dataField7").html(strHTML);
    currentVesselData.Manifest.CrewHTML = strHTML;
  } else $("#dataField7").fadeOut();
}
  
function vesselResourcesUpdate(update) {
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
    if (currentVesselData.Resources.Resources) {
      currentVesselData.Resources.Resources.split("|").forEach(function(item, index) {
        strHTML += "<img class='tipped' title='" + item.split(";")[1] + "' style='cursor: pointer' src='" + item.split(";")[0] + ".png'></a>&nbsp;";
      });
    } else strHTML += "None";
    $("#dataField8").fadeIn();
    if (update && (!currentVesselData.Resources.HTML || (currentVesselData.Resources.HTML && strHTML != currentVesselData.Resources.HTML))) {
      flashUpdate("#dataField8", "#77C6FF", "#FFF");
      $("#dataField8").html(strHTML);
    } else $("#dataField8").html(strHTML);
    currentVesselData.Resources.HTML = strHTML;
  } else $("#dataField8").fadeOut();
}

function vesselCommsUpdate(update) {
  if (currentVesselData.Comms) {
    strHTML = "<span class='tipped' style='cursor:help' title='";
    if (currentVesselData.Comms.Connection) { strHTML += "Signal Delay: <0.003s"; }
    else { strHTML += "No Connection"; }
    strHTML += "'><b><u>Comms:</u></b></span> ";
    if (currentVesselData.Comms.Comms) {
      currentVesselData.Comms.Comms.split("|").forEach(function(item, index) {
        strHTML += "<img class='tipped' title='" + item.split(";")[1] + "' style='cursor: pointer' src='" + item.split(";")[0] + ".png'></a>&nbsp;";
      });
    } else strHTML += "None";
    $("#dataField9").fadeIn();
    if (update && (!currentVesselData.Comms.CommsHTML || (currentVesselData.Comms.CommsHTML && strHTML != currentVesselData.Comms.CommsHTML))) {
      flashUpdate("#dataField9", "#77C6FF", "#FFF");
      $("#dataField9").html(strHTML);
    } else $("#dataField9").html(strHTML);
    currentVesselData.Comms.CommsHTML = strHTML;
  } else $("#dataField9").fadeOut();
}

function vesselAddlResUpdate(update) {
  if (currentVesselData.CatalogData.AddlRes) {
    var newRes;
    var strHTML = '';
    currentVesselData.CatalogData.AddlRes.split("|").forEach(function(item) {
      if (parseFloat(item.split(";")[0]) < currUT()) {
        strHTML += "<span class='tipped' title='" + item.split(";")[1] + "'><a target='_blank' style='color: black' href='" + item.split(";")[2] + "'><i class='" + AddlResourceItems[item.split(";")[1]] + "'></i></a></span>&nbsp;";
      
      // if the item isn't visible yet, save the UT so we can add an update notice for it
      } else {
        if (!newRes) newRes = parseFloat(item.split(";")[0]);
        else if (parseFloat(item.split(";")[0]) < newRes) newRes = parseFloat(item.split(";")[0]);
      }
    });
    if (strHTML) {
      if (update && (!currentVesselData.CatalogData.AddlResHTML || (currentVesselData.CatalogData.AddlResHTML && strHTML != currentVesselData.CatalogData.AddlResHTML))) {
        flashUpdate("#dataField10", "#77C6FF", "#FFF");
        $("#dataField10").html("<b>Additional Resources:</b> " + strHTML);
      } else $("#dataField10").html("<b>Additional Resources:</b> " + strHTML);
      $("#dataField10").fadeIn();
      currentVesselData.CatalogData.AddlResHTML = strHTML;
    }
    if (newRes) updatesList.push({ Type: "object", ID: currentVesselData.CatalogData.DB, UT: newRes });
  } else $("#dataField10").fadeOut();
}

function vesselLastUpdate(update) {
  $("#distanceTip").html(UTtoDateTimeLocal(currentVesselData.CraftData.UT))
  if (currentVesselData.CraftData.DistanceTraveled) $("#distanceTip").append("<br>Current Distance Traveled: " + currentVesselData.CraftData.DistanceTraveled + "km");
  $("#dataField11").html("<b>Last Update:</b> <u><span class='tip-update' style='cursor:help' data-tipped-options=\"inline: 'distanceTip'\">" + UTtoDateTime(currentVesselData.CraftData.UT) + " UTC</span></u>")
  $("#dataField11").fadeIn()
  if (update) flashUpdate("#dataField11", "#77C6FF", "#FFF");
}

function vesselHistoryUpdate() {
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
    if (item.UT < currentVesselData.CraftData.UT && item.Title != currentVesselData.CraftData.CraftDescTitle) {
      $("#prevEvent").append($('<option>', {
        value: item.UT,
        text: item.Title
      }));
      $("#prevEvent").prop("disabled", false);
    }
  });
  currentVesselData.History.reverse().forEach(function(item, index) {
    if (item.UT > currentVesselData.CraftData.UT && item.Title != currentVesselData.CraftData.CraftDescTitle && item.UT < currUT()) {
      $("#nextEvent").append($('<option>', {
        value: item.UT,
        text: item.Title
      }));
      $("#nextEvent").prop("disabled", false);
    }
  });
  $("#dataLabel").html("Mission History");
  
  // check for future event
  if (currentVesselData.CraftData.NextEventTitle && !currentVesselData.CraftData.PastEvent) {
    $("#nextEvent").append($('<option>', {
      value: currentVesselData.CraftData.NextEventTitle,
      text: "Scheduled Event"
    }));
    $("#nextEvent").prop("disabled", false);
  }
}

function vesselContentUpdate() {
  isVesselUsingMap = true;
  $("#content").empty();
  
  // remove any previous markers and surface plots
  if (launchsiteMarker) surfaceMap.removeLayer(launchsiteMarker);
  clearSurfacePlots();

  // decide what kind of content we have to deal with
  // pre-launch/static data event
  if (currentVesselData.CraftData.Content.charAt(0) == "@") {
    $("#content").fadeOut();
    $("#map").css("visibility", "visible");
    $("#map").fadeIn();
  
    // extract the data
    var data = currentVesselData.CraftData.Content.split("@")[1].split("|");
  
    // set launchsite icon
    launchsiteIcon = L.icon({popupAnchor: [0, -43], iconUrl: 'markers-spacecenter.png', iconSize: [30, 40], iconAnchor: [15, 40], shadowUrl: 'markers-shadow.png', shadowSize: [35, 16], shadowAnchor: [10, 12]});
    
    // decide if this is still pre-launch or not
    var strLaunchIconCaption = "<b>Launch Location</b><br>"
    if (currentVesselData.CraftData.MissionStartTerm == "Launched") strLaunchIconCaption = "";
    
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
    launchsiteMarker.bindPopup(strLaunchIconCaption + data[2] + launchAltitude + "<br>[" + numeral(Math.abs(data[0])).format('0.0000') + "&deg;" + cardinalLat + ", " + numeral(Math.abs(data[1])).format('0.0000') + "&deg;" + cardinalLon + "]" , {closeOnClick: false});
    if (!strLaunchIconCaption.length) {
      surfaceMap.fitBounds([srfLocations.KSC, [data[0], data[1]]]);
    } else {
      surfaceMap.setView(launchsiteMarker.getLatLng(), 2); 
    }
    launchsiteMarker.openPopup(); 
    
    // close the popup after 5 seconds if this is a past event or a prelaunch state
    // make sure to reset the timeout in case the page has been loaded with new data before the 5s expire
    clearTimeout(mapMarkerTimeout);
    if (currentVesselData.CraftData.PastEvent || strLaunchIconCaption) {
      mapMarkerTimeout = setTimeout(function () { 
        launchsiteMarker.closePopup(); 
      }, 5000);
    }
    
  // dynamic map with orbital information
  } else if (currentVesselData.CraftData.Content.charAt(0) == "!" && !currentVesselData.CraftData.Content.includes("[")) {
  
    // extract the data
    var data = currentVesselData.CraftData.Content.split("!")[1].split("|");

    // only show dynamic information if this is a current state in an ongoing mission
    // note we can't use the PastEvent property here because a past event could still use the same orbital data
    // so instead we will compare it to the current data that was loaded for its catalog object
    // also do not show the map if the planet doesn't have one - for now just check for it orbiting Kerbin
    if (!isMissionEnded() && currentVesselData.Orbit.UT == opsCatalog.find(o => o.ID === strCurrentVessel).CurrentData.Orbit.UT && getParentSystem(strCurrentVessel) == "Kerbin-System") {
      $("#content").fadeOut();
      $("#map").css("visibility", "visible");
      $("#map").fadeIn();
      
      // check if plot data exists and is for the current vessel, because then we can just redraw it on the map (if it wasn't interrupted)
      // otherwise just clear off the map and call up a new render
      if (currentVesselPlot && currentVesselPlot.ID == strCurrentVessel && !strPausedVesselCalculation) { 
        $("#mapDialog").dialog("close");
        redrawVesselPlots(); 
      } else {
        renderMapData();
      }
      
    // we're looking at old orbital data or a planet with no map
    } else {
      if ($("#map").css("visibility") != "hidden") $("#map").fadeOut();
      $("#mapDialog").dialog("close");
      removeMapRefreshButton();
      
      // two images
      if (data[1].includes(".png")) {
        
        // why is the dynamic map not being displayed?
        if (currentVesselData.CraftData.PastEvent) var strReason = "viewing old data";
        if (getParentSystem(strCurrentVessel) != "Kerbin-System") var strReason = "no surface map available";
        
        $("#content").html("<div class='fullCenter'><img width='475' class='contentTip' title='Ecliptic View<br>Dynamic orbit unavailable - " + strReason + "' src='" + data[0] + "'>&nbsp;<img width='475' class='contentTip' title='Polar View<br>Dynamic orbit unavailable - " + strReason + "' src='" + data[1] + "'></div>");
        
      // one image
      } else {
        $("#content").html("<img class='fullCenter contentTip' title='" + data[1] + "' src='" + data[0] + "'>");
      }
    
      $("#content").fadeIn();
    }
  
  // static orbits with dynamic information
  } else if (currentVesselData.CraftData.Content.charAt(0) == "!" && currentVesselData.CraftData.Content.includes("[")) {
    $("#map").css("visibility", "visible");
    $("#map").fadeIn();
  
    $("#content").fadeOut();

  // streaming ascent data, possibly with video
  } else if (currentVesselData.CraftData.Content.charAt(0) == "~") {
  
  // just plain HTML
  } else {
    isVesselUsingMap = false;
    if ($("#map").css("visibility") != "hidden") $("#map").fadeOut();
    $("#content").html(currentVesselData.CraftData.Content);
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
  if (pageType == "vessel" && currentVesselData) {
    if (!$("#infoDialog").dialog("isOpen")) { $("#infoTitle").html("Click Here for Additional Information"); }
    $("#partsImg").fadeIn();
  }
}, function() {
  if (pageType == "vessel" && currentVesselData) {
  
    // wait to give tooltips a chance to hide on mouseover before checking to see if we're actually off the image
    setTimeout(function() {
      if (!$('#infoBox').is(":hover")) {
        $("#infoTitle").html(currentVesselData.CraftData.CraftDescTitle);
        $("#partsImg").fadeOut();
      }
    }, 1000);
  }
});

// upon selection of a new list item, take the user to that event
$("#prevEvent").change(function () {
  if ($("#prevEvent").val()) { loadVessel(strCurrentVessel, parseFloat($("#prevEvent").val())); }
});
$("#nextEvent").change(function () {
  
  // could be a future event
  if ($("#nextEvent").val() && $("#nextEvent").val() != "Next Event(s)") { 
    if (isNaN($("#nextEvent").val())) {
      $("#siteDialog").html($("#nextEvent").val());
      $("#siteDialog").dialog("option", "title", "Scheduled Event");
      $("#siteDialog").dialog("option", "width", 250);
      $("#siteDialog").dialog( "option", "buttons", [{
        text: "Close",
        click: function() { 
          $("#siteDialog").dialog("close");
        }
      }]);
      $("#siteDialog").dialog("open");
      $("#nextEvent").val("Next Event(s)");
    } else loadVessel(strCurrentVessel, parseFloat($("#nextEvent").val()));
  }
});

// opens the dialog box with more details - this is the same box that holds crew details, was just implemented here first
function showInfoDialog() {
  if (!$("#infoDialog").dialog("isOpen")) { $("#infoDialog").dialog("open") }
}

// provides full details for all vessel parts, ensures the parts catalog is loaded
function assignPartInfo() {
  if (!partsCatalog.length) { setTimeout(assignPartInfo, 100); }
  else {
    $(".imgmap").each(function(index) {
      var part = $(this).attr("id");

       // behavior of tooltips depends on the device
      if (is_touch_device()) { showOpt = 'click'; }
      else { showOpt = 'mouseenter'; }
      Tipped.create("#" + part, partsCatalog.find(o => o.Part === part).HTML, { showOn: showOpt, hideOnClickOutside: is_touch_device(), target: 'mouse', offset: { y: 2 } });
    });
  }
}

function updateVesselData(vessel) {
  
  // perform a live data update if we are looking at the vessel in question at the moment at its current record
  if (pageType == "vessel" && strCurrentVessel == vessel.ID && !currentVesselData.CraftData.PastEvent) {
  
    // update the current data with the updated data and then carry out updates to individual sections
    for (var futureProp in vessel.FutureData) {
      for (var prop in currentVesselData) {
      
        // only update data that exists and is current for this time 
        if (futureProp == prop && vessel.FutureData[futureProp] && vessel.FutureData[futureProp].UT <= currUT()) {
          currentVesselData[prop] = vessel.FutureData[futureProp];
        }
      }
    }
    vesselTimelineUpdate(true);
    vesselInfoUpdate(true);
    vesselVelocityUpdate(true);
    vesselPeUpdate(true);
    vesselApUpdate(true);
    vesselEccUpdate(true);
    vesselIncUpdate(true);
    vesselPeriodUpdate(true);
    vesselCrewUpdate(true);
    vesselResourcesUpdate(true);
    vesselCommsUpdate(true);
    vesselAddlResUpdate(true);
    vesselMETUpdate(true);
    vesselLastUpdate(true);
    vesselHistoryUpdate();
    console.log(vessel);
    if (vessel.CurrentData.CraftData.Content != vessel.FutureData.CraftData.Content) {

      // remove the current plotted data if it exists and matches this vessel because we're going to need to draw a new plot
      if (currentVesselPlot && currentVesselPlot.ID == strCurrentVessel) {
        clearSurfacePlots();
        currentVesselPlot = null;
        vesselMarker = null;
      }
      vesselContentUpdate();
    }
    
    // create the tooltips
    // behavior of tooltips depends on the device
    if (is_touch_device()) { showOpt = 'click'; }
    else { showOpt = 'mouseenter'; }
    Tipped.create('.tipped', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
    Tipped.create('.tip-update', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
  }
  
  // check the current launch time for this UT if this vessel is listed in the event calendar
  if (strCurrentLaunchVessel == vessel.ID) {
    var launchTime;
    for (i=vessel.CurrentData.LaunchTimes.length-1; i>=0; i--) {
      launchTime = vessel.CurrentData.LaunchTimes[i].LaunchTime;
      if (vessel.CurrentData.LaunchTimes[i].UT <= currUT()) break;
    }
    
    // if we have a new launchtime for this update we need to refresh the events calendar
    if (launchCountdown != launchTime) {
      $("#launch").spin({ scale: 0.5, position: 'relative', top: '20px', left: '50%' });
      loadDB("loadEventData.asp?UT=" + (currUT()+1), loadEventsAJAX);
    }
  }
  
  // fetch new data. Add a second just to make sure we don't get the same current data
  vessel.isLoading = true;
  loadDB("loadOpsData.asp?db=" + vessel.ID + "&UT=" + (currUT()+1) + "&type=" + vessel.Type + "&pastUT=NaN", loadOpsDataAJAX);
}

// depends on whether we are referenceing a UT that is the current time or not
function getLaunchUT() {
  if (!isNaN(vesselPastUT)) return vesselPastUT;
  else return currUT();
}

// following functions perform parsing on data strings
function getVesselImage() {
  if (!currentVesselData.CraftData.CraftImg) {
    return "nadaOp.png";
  } else {
    return currentVesselData.CraftData.CraftImg.split("|")[vesselRotationIndex].split("~")[0];
  }
}
function getPartsHTML() {
  if (!currentVesselData.CraftData.CraftImg) {
    return null;
  } else {
    if (currentVesselData.CraftData.CraftImg.split("|")[vesselRotationIndex].split("~")[3] != "null") {
      return currentVesselData.CraftData.CraftImg.split("|")[vesselRotationIndex].split("~")[3];
    } else {
      return null;
    }
  }
}
function getMissionEndTime() {
  if (!currentVesselData.CatalogData.MissionEnd) {
    return null;
  } else {
    return parseInt(currentVesselData.CatalogData.MissionEnd.split(";")[1]);
  }
}
function getMissionEndMsg() {
  if (!currentVesselData.CatalogData.MissionEnd) {
    return null;
  } else {
    return currentVesselData.CatalogData.MissionEnd.split(";")[2];
  }
}
function isMissionEnded() {
  if (!currentVesselData.CatalogData.MissionEnd) {
    return false;
  } else {
    return parseInt(currentVesselData.CatalogData.MissionEnd.split(";")[0]) <= currUT();
  }
}