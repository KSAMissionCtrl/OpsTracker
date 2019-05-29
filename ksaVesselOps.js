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
  
  // we changed the DB name for these vessels. Allow old links to still work
  if (vessel.includes("ascensionmk1b1")) vessel = vessel.replace("mk1b1", "mk1");
  
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

  // size down the map
  lowerContent();
  
  // close any popups
  if (vesselPositionPopup && surfaceMap) surfaceMap.closePopup(vesselPositionPopup); 

  // we can't be switching vessels while loading any plot data so if it's in progress, kill it
  if (layerControl && !layerControl.options.collapsed) { 
    isOrbitRenderTerminated = true;
    layerControl._collapse();
    layerControl.options.collapsed = true;
    if (surfaceTracksDataLoad.obtTrackDataLoad) layerControl.removeLayer(surfaceTracksDataLoad.obtTrackDataLoad);
    surfaceTracksDataLoad.obtTrackDataLoad = null;
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

    // any ascent data is always accessible
    var ascentData = [];
    if (data[1] != "null") {
      data[1].split("|").forEach(function(item) { 
        var dataObj = rsToObj(item);
        ascentData.push(dataObj);
      });
    }
    
    // the various tables of the current record are next
    var dataTables = data[2].split("^");
    var craft = rsToObj(dataTables[0]);
    var resources = rsToObj(dataTables[1]);
    var crew = rsToObj(dataTables[2]);
    var comms = rsToObj(dataTables[3]);
    var obt = rsToObj(dataTables[4]);
    var ports = rsToObj(dataTables[5]);

    // skip the future data, we only care about the curent data

    // parse and sort the histories and launch times
    var history = [];
    var launches = [];
    var obtHist = [];
    data[4].split("|").forEach(function(item) { history.push({UT: parseFloat(item.split("~")[0]), Title: item.split("~")[1]}); });
    if (data[5].split("|") != "null") {
      data[5].split("|").forEach(function(item) { launches.push({UT: parseFloat(item.split("~")[0]), LaunchTime: parseFloat(item.split("~")[1])}); });
    }
    if (data[6].split("|") != "null") {
      data[6].split("|").forEach(function(item) { obtHist.push({UT: parseFloat(item.split("~")[0]), Period: parseFloat(item.split("~")[1])}); });
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
                          OrbitalHistory: obtHist,
                          ascentData: ascentData };
  
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
        currentVesselData.ascentData = vessel.ascentData;

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
  launchTime = null;

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
  
  // if this is an inactive vessel, load the body the vessel was last in
  if (getParentSystem(currentVesselData.CatalogData.DB) == "inactive") { 
    var soiList = currentVesselData.CatalogData.SOI.split("|");
    
    // last element is always the inactive body ID
    soiList.pop();
    var lastBody = soiList.pop();
    if (strCurrentBody != bodyCatalog.find(o => o.ID === parseInt(lastBody.split(";")[1])).Body + "-System") {
      strCurrentBody = bodyCatalog.find(o => o.ID === parseInt(lastBody.split(";")[1])).Body + "-System";
      loadMap();
    }
  }

  // always update the vessel history because we need to be able to page back & forth even during an ascent
  vesselHistoryUpdate();

  // is there ascent data available right now?
  if (currentVesselData.ascentData.length 
  && !currentVesselData.CraftData.PastEvent                                             // does not apply to past events
  && (currentVesselData.ascentData[0].UT-30 <= currUT()                                 // time is 30s prior to start of ascent data
  && currentVesselData.ascentData[currentVesselData.ascentData.length-1].UT > currUT()  // and time still remains in the ascent data
  )) {
    setupStreamingAscent();
    vesselInfoUpdate();
  }

  // just a normal update then
  else {

    // clear out the ascentID so any real-time updates stop
    ascentEnd();

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
    vesselContentUpdate();
    
    // check if this is a launch event
    if (currentVesselData.CraftData.CraftDescTitle.toLowerCase().includes("+0:00")
    && currentVesselData.CraftData.PastEvent                                              // make sure it happened in the past
    && currentVesselData.ascentData.length                                                // make sure there is ascent data
    && currentVesselData.ascentData[currentVesselData.ascentData.length-1].UT <= currUT() // make sure the ascent isn't going on right now
    ){
      $("#dataField12").html("<center><span class='fauxLink' onclick='setupStreamingAscent()'>Ascent Data Available - Click to View</span></center>");
      $("#dataField12").fadeIn();
    } else $("#dataField12").fadeOut();

    // hide the rest of the fields that are unused for now
    $("#dataField13").fadeOut();
    $("#dataField14").fadeOut();
    $("#dataField15").fadeOut();
    $("#dataField16").fadeOut();
  }

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
  $("#infoDialog").html(currentVesselData.CraftData.CraftDescContent.replace("thrid", "third"));
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
        partsImgHTML += "<div id='" + item.split('title="&')[1].split('"')[0] + "' ";
        if (item.includes("amount")) partsImgHTML += "amount='" + item.split('amount="')[1].split('"')[0] + "' ";
        partsImgHTML += "class='imgmap' style='top: " + (parseInt(areaCenter[1])-5) + "px; ";
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

    // the first record is always the original launch time, regardless of its UT
    // this assumption prevents the event calendar from getting confused if multiple launch times are posted
    if (currentVesselData.LaunchTimes[i].UT <= getLaunchUT() || i == 0) {
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
    if (currentVesselData.Resources.TotalMass !== null) { strHTML += numeral(currentVesselData.Resources.TotalMass).format('0,0.000') + "t"; }
    else { strHTML += "N/A"; }
    strHTML += "<br>Resource Mass: ";
    if (currentVesselData.Resources.ResourceMass !== null) { strHTML += numeral(currentVesselData.Resources.ResourceMass).format('0.000') + "t"; }
    else { strHTML += "N/A"; }
    strHTML += "'><b><u>Resources:</u></b></span> ";
    if (currentVesselData.Resources.Resources) {
      strHTML += "<img id='prevRes' width='12' src='prevList.png' style='visibility: hidden; cursor: pointer; vertical-align: -1px' onclick='prevResource()'>";
      for (resCount=0; resCount<5; resCount++) {
        strHTML += "<div id='resTip" + resCount + "' style='display: none'>temp</div>";
        strHTML += "<span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'resTip" + resCount + "', detach: false\">";
        strHTML += "<img id='resImg" + resCount + "' src='' style='display: none; padding-left: 1px; padding-right: 2px'></span>";
      }
      strHTML += "<img id='nextRes' width='12' src='nextList.png' style='visibility: hidden; cursor: pointer; vertical-align: -1px' onclick='nextResource()'>";
      setTimeout(updateResourceIcons, 250);
    } else strHTML += "None";
    $("#dataField8").fadeIn();
    if (update && (!currentVesselData.Resources.HTML || (currentVesselData.Resources.HTML && strHTML != currentVesselData.Resources.HTML))) {
      flashUpdate("#dataField8", "#77C6FF", "#FFF");
      $("#dataField8").html(strHTML);
    } else $("#dataField8").html(strHTML);
    if (currentVesselData.Resources.Resources && currentVesselData.Resources.Resources.split("|").length > 5) $("#nextRes").css("visibility", "visible");
    else $("#prevRes").css("display", "none");
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
    } else $("#dataField10").fadeOut();
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
  
  // disable history buttons - they will be re-enabled as needed
  $("#prevEventButton").button("option", "disabled", true);
  $("#nextEventButton").button("option", "disabled", true);
  
  // fill up the previous events, then the next events
  currentVesselData.History.reverse().forEach(function(item, index) {
    if (item.UT < currentVesselData.CraftData.UT && item.Title != currentVesselData.CraftData.CraftDescTitle) {
      $("#prevEvent").append($('<option>', {
        value: item.UT,
        text: item.Title
      }));
      $("#prevEvent").prop("disabled", false);
      $("#prevEventButton").button("option", "disabled", false);
    }
  });
  currentVesselData.History.reverse().forEach(function(item, index) {

    // if this isn't a past event, we don't want the current event (equal to the current UT) to show up
    if (!currentVesselData.CraftData.PastEvent && item.UT > currentVesselData.CraftData.UT && item.Title != currentVesselData.CraftData.CraftDescTitle && item.UT < currUT()) {
      $("#nextEvent").append($('<option>', {
        value: item.UT,
        text: item.Title
      }));
      $("#nextEvent").prop("disabled", false);
      $("#nextEventButton").button("option", "disabled", false);

    // otherwise if it's a previous event we do want the most recent event in this list
    } else if (currentVesselData.CraftData.PastEvent && item.UT > currentVesselData.CraftData.UT && item.Title != currentVesselData.CraftData.CraftDescTitle && item.UT <= currUT()) {
      $("#nextEvent").append($('<option>', {
        value: item.UT,
        text: item.Title
      }));
      $("#nextEvent").prop("disabled", false);
      $("#nextEventButton").button("option", "disabled", false);
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

function vesselContentUpdate(update) {
  isVesselUsingMap = true;
  $("#content").empty();
  
  // remove any previous markers and surface plots
  if (launchsiteMarker) surfaceMap.removeLayer(launchsiteMarker);
  if (vesselMarker) surfaceMap.removeLayer(vesselMarker);
  vesselMarker = null;
  launchsiteMarker = null;
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
    if (data.length > 3) launchAltitude = "<br>" + data[3] + "km ASL";
    
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
        if (launchsiteMarker) launchsiteMarker.closePopup(); 
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
    if (!isMissionEnded() && (update || currentVesselData.Orbit.UT == opsCatalog.find(o => o.ID === strCurrentVessel).CurrentData.Orbit.UT) && getParentSystem(strCurrentVessel) == "Kerbin-System") {
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
  if (pageType == "vessel" && currentVesselData && !strActiveAscent.length) {
    if (!$("#infoDialog").dialog("isOpen")) { $("#infoTitle").html("Click Here for Additional Information"); }
    $("#partsImg").fadeIn();
  }
}, function() {
  if (pageType == "vessel" && currentVesselData && !strActiveAscent.length) {
  
    // wait to give tooltips a chance to hide on mouseover before checking to see if we're actually off the image
    setTimeout(function() {
      if (!currentVesselData) return;
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

// history paging via buttons
function prevHistoryButton() {
  if (!currentVesselData) return; // clicked too fast, in between data calls
  var histIndex;
  for (histIndex = currentVesselData.History.length-1; histIndex >= 0; histIndex--) {
    if (currentVesselData.History[histIndex].UT < currentVesselData.CraftData.UT) break;
  }
  loadVessel(strCurrentVessel, currentVesselData.History[histIndex].UT);
  if (histIndex == 0) $("#prevEventButton").button("option", "disabled", true);
  $("#nextEventButton").button("option", "disabled", false);
}
function nextHistoryButton() {
  if (!currentVesselData) return; // clicked too fast, in between data calls
  var histIndex;
  for (histIndex = 0; histIndex <= currentVesselData.History.length; histIndex++) {
    if (currentVesselData.History[histIndex].UT > currentVesselData.CraftData.UT) break;
  }
  if (histIndex == currentVesselData.History.length-1) $("#nextEventButton").button("option", "disabled", true);
  loadVessel(strCurrentVessel, currentVesselData.History[histIndex].UT);
  $("#prevEventButton").button("option", "disabled", false);
}

// opens the dialog box with more details - this is the same box that holds crew details, was just implemented here first
function showInfoDialog() {
  if (!$("#infoDialog").dialog("isOpen") && !strActiveAscent.length) { $("#infoDialog").dialog("open") }
}

// provides full details for all vessel parts, ensures the parts catalog is loaded
function assignPartInfo() {
  if (!partsCatalog.length) { setTimeout(assignPartInfo, 100); }
  else {
    $(".imgmap").each(function(index) {
      var part = partsCatalog.find(o => o.Part === $(this).attr("id"));

      // behavior of tooltips depends on the device
      if (is_touch_device()) { showOpt = 'click'; }
      else { showOpt = 'mouseenter'; }

      // is there a title and are there multiples of this part to add to the title?
      var strPartHtml = "";
      if (part.Title) {
        strPartHtml += "<b>" + part.Title;
        if ($(this).attr("amount")) {
          strPartHtml += " (x" + $(this).attr("amount") + ")";
        }
        strPartHtml += "</b>";
      }
      strPartHtml += part.HTML;

      // are there notes for this part?
      if (part.Notes) {
        
        // get all the notes
        var notes = part.Notes.split("&");

        // find out if any apply to this vessel and if so add the note to the HTML
        notes.forEach(function(note) {
          var regex = new RegExp(note.split("%")[0]);
          if (strCurrentVessel.match(regex)) strPartHtml += "<b>Note:</b> " + note.split("%")[1];
        });
      }
      Tipped.create("#" + part.Part, strPartHtml, { showOn: showOpt, hideOnClickOutside: is_touch_device(), target: 'mouse', offset: { y: 2 } });
    });
  }
}

// called only to update the vessel data after it has already been loaded initially
function updateVesselData(vessel) {
  
  // if there is new orbital data we need to redraw the GGB orbit
  // but there could be no more orbital data if the craft currently has any
  if ((vessel.CurrentData.Orbit && !vessel.FutureData.Orbit) || (vessel.FutureData.Orbit && vessel.FutureData.Orbit.UT <= currUT())) {
    addGGBOrbit(vessel.ID, vessel.FutureData.Orbit);
  }

  // perform a live data update if we are looking at the vessel in question at the moment 
  if (pageType == "vessel" && strCurrentVessel == vessel.ID) {

    // always update the vessel history because we need to be able to page back & forth even during an ascent
    vesselHistoryUpdate();

    // force a re-check of the launch time in case a hold or new L-0 was posted if we are not in an active ascent
    if (isAscentPaused) L0Time = null;

    // check for an end to an ascent
    if (!currentVesselData.CraftData.PastEvent && strActiveAscent == strCurrentVessel && currUT() >= currentVesselData.ascentData[currentVesselData.ascentData.length-1].UT) {
      
      // hide the fields that are now unused
      $("#dataField12").fadeOut();
      $("#dataField13").fadeOut();
      $("#dataField14").fadeOut();
      $("#dataField15").fadeOut();
      $("#dataField16").fadeOut();
      ascentEnd();
    }

    // these elements should only be updated if the vessel is not undergoing an active ascent and is viewing the current record
    if (strActiveAscent != strCurrentVessel && !currentVesselData.CraftData.PastEvent) {

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
      if (vessel.CurrentData.CraftData.Content != vessel.FutureData.CraftData.Content) {

        // if a current orbit happens to be under calculation at this time, cancel it
        if (!layerControl.options.collapsed) {
          if (surfaceTracksDataLoad.obtTrackDataLoad) layerControl.removeLayer(surfaceTracksDataLoad.obtTrackDataLoad);
          surfaceTracksDataLoad.obtTrackDataLoad = null;
          isOrbitRenderTerminated = true;
          layerControl.options.collapsed = true;
        }

        // close the map dialog if it is open
        $("#mapDialog").dialog("close"); 

        // remove the current plotted data if it exists and matches this vessel because we're going to need to draw a new plot
        if (currentVesselPlot && currentVesselPlot.ID == strCurrentVessel) {
          clearSurfacePlots();
          currentVesselPlot = null;
          vesselMarker = null;
        }
        vesselContentUpdate(true);
      }
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

// updates the 5 resource icons in the event of a scroll
function updateResourceIcons() {
  if (!currentVesselData) return; // too fast of a page through the history due to call delay of the function
  var resourceList = currentVesselData.Resources.Resources.split("|");
  for (resCount=0; resCount<5; resCount++) {  
    if (resCount+resIndex == resourceList.length) break;
    $("#resImg" + resCount).attr("src", resourceList[resCount+resIndex].split(";")[0] + ".png");
    $("#resImg" + resCount).fadeIn();
    $("#resTip" + resCount).html(resourceList[resCount+resIndex].split(";")[1]);
  }
  currentVesselData.Resources.HTML = $("#dataField8").html();
}

// scrolls resource icons left and right, re-assigning their images and captions
function prevResource() {
  $("#nextRes").css("visibility", "visible");
  resIndex--;
  if (resIndex == 0) $("#prevRes").css("visibility", "hidden");
  updateResourceIcons();
}
function nextResource() {
  $("#prevRes").css("visibility", "visible");
  resIndex++;
  if (resIndex == currentVesselData.Resources.Resources.split("|").length-5) $("#nextRes").css("visibility", "hidden");
  updateResourceIcons();
}

// prepares the data fields for displaying real-time ascent data
function setupStreamingAscent() {
  strActiveAscent = strCurrentVessel;
  currentAscentData = {};
  currentAscentData.ascentIndex = 0;
  currentAscentData.interpCount = null;
  isAscentPaused = currentVesselData.CraftData.PastEvent;

  // grab default ascent FPS from cookie or null if cookies not available
  currentAscentData.FPS = null;
  if (checkCookies() && getCookie("ascentFPS")) currentAscentData.FPS = parseInt(getCookie("ascentFPS"));

  // MET/countdown display
  // we do things differently if this is a past event
  checkLaunchTime();
  if (currentVesselData.CraftData.PastEvent) {
    $("#dataField0").html("<b id='metCaption'>Launch in:</b> <span id='met'>" + formatTime(L0Time-currentVesselData.ascentData[0].UT) + "</span>");
    $("#dataField0").fadeIn();
  }

  // things are happening NOW
  else {
    var strHTML = "<b id='metCaption'>";
    if (L0Time >= currUT()) strHTML += "Launch in:</b> <span id='met'>" + formatTime(L0Time-currUT(true));
    else strHTML += "Mission Elapsed Time:</b> <span id='met'>" + formatTime(currUT(true)-L0Time);
    $("#dataField0").html(strHTML + "</span>");
    $("#dataField0").fadeIn();

    // update the current ascent index if needed
    if (currUT() > currentVesselData.ascentData[0].UT) currentAscentData.ascentIndex = currUT(true) - currentVesselData.ascentData[0].UT;
  }

  // update the info box only if this is a realtime ascent and we have already started into the telemetry
  // or if it is being loaded as a past event
  if ((!currentVesselData.CraftData.PastEvent && currUT() >= currentVesselData.ascentData[0].UT) || currentVesselData.CraftData.PastEvent) {

    // get the craft title for this point in the telemetry
    currentAscentData.event = currentVesselData.ascentData[currentAscentData.ascentIndex].Event;

    // if there isn't one, we need to seek back and find the last update
    if (!currentAscentData.event) {
      for (checkIndex=currentAscentData.ascentIndex-1; checkIndex>=0; checkIndex--) {
        if (currentVesselData.ascentData[checkIndex].Event) {
          currentAscentData.event = currentVesselData.ascentData[checkIndex].Event;
          break;
        }
      }
    }

    // get the craft img for this point in the telemetry
    currentAscentData.img = currentVesselData.ascentData[currentAscentData.ascentIndex].Image;

    // if there isn't one, we need to seek back and find the last update
    if (!currentAscentData.img) {
      for (checkIndex=currentAscentData.ascentIndex-1; checkIndex>=0; checkIndex--) {
        if (currentVesselData.ascentData[checkIndex].Image) {
          currentAscentData.img = currentVesselData.ascentData[checkIndex].Image;
          break;
        }
      }
    }

    // update info box img and title
    $("#infoImg").html("<img src='" + currentAscentData.img + "'>");
    $("#infoTitle").html(currentAscentData.event);
    $("#infoTitle").attr("class", "infoTitle vessel");
    $("#infoTitle").css("cursor", "auto");
  }

  // update the info box to let user know ascent data is available
  if ($("#infoDialog").dialog("isOpen")) {
    $("#infoDialog").html("<p>Please close the info box when you are finished reading - it will not update during ascent</p>" + $("#infoDialog").html() + "<p>Please close the info box when you are finished reading - it will not update during ascent</p>");
    $("#infoDialog").dialog("option", "title", "Launch in T-" + (launchTime-currUT(true)) + "s!");
  }

  // remove any part info data
  $("#partsImg").empty();

  // velocity readout
  strHTML = "<b>Velocity:</b> <span id='velocity'>";
  if (currentVesselData.ascentData[currentAscentData.ascentIndex].Velocity > 1000) {
    strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Velocity/1000).format('0.000') + "km/s";
  } else {
    strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Velocity).format('0.000') + "m/s";
  }
  strHTML += "</span> (Throttle @ <span id='throttle'>" + numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Throttle).format('0.00') + "</span>%)";
  $("#dataField1").html(strHTML);
  $("#dataField1").fadeIn();

  // thrust readout
  strHTML = "<b>Total Thrust:</b> <span id='thrust'>" + numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Thrust).format('0.000') + "</span>kN @ <span id='twr'>";
  strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Thrust/(currentVesselData.ascentData[currentAscentData.ascentIndex].Mass * currentVesselData.ascentData[currentAscentData.ascentIndex].Gravity)).format('0.000');
  $("#dataField2").html(strHTML + "</span> TWR");
  $("#dataField2").fadeIn();

  // altitude
  strHTML = "<b>Altitude:</b> <span id='altitude'>";
  if (currentVesselData.ascentData[currentAscentData.ascentIndex].Altitude > 1000) {
    strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Altitude/1000).format('0.000') + "km";
  } else {
    strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Altitude).format('0.000') + "m";
  }
  $("#dataField3").html(strHTML + "</span>");
  $("#dataField3").fadeIn();

  // apoapsis
  strHTML = "<b>Apoapsis:</b> <span id='ap'>";
  if (currentVesselData.ascentData[currentAscentData.ascentIndex].Apoapsis > 1000) {
    strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Apoapsis/1000).format('0.000') + "km";
  } else {
    strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Apoapsis).format('0.000') + "m";
  }
  $("#dataField4").html(strHTML + "</span>");
  $("#dataField4").fadeIn();

  // show periapsis if dynamic pressure is 0 and the rocket is into its ascent
  if (currentVesselData.ascentData[currentAscentData.ascentIndex].Q <= 0 && currentVesselData.ascentData[currentAscentData.ascentIndex].UT > launchTime) {
    strHTML = "<b id='peQcaption'>Periapsis:</b> <span id='peQ'>";
    if (Math.abs(currentVesselData.ascentData[currentAscentData.ascentIndex].Periapsis) > 1000) {
      strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Periapsis/1000).format('0.000') + "km";
    } else {
      strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Periapsis).format('0.000') + "m";
    }
  } else {
    strHTML = "<b id='peQcaption'>Dynamic Pressure (Q):</b> <span id='peQ'>";
    if (currentVesselData.ascentData[currentAscentData.ascentIndex].Q >= 1) {
      strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Q).format('0.000') + "kPa";
    } else {
      strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Q*1000).format('0.000') + "Pa";
    }
  }
  $("#dataField5").html(strHTML + "</span>");
  $("#dataField5").fadeIn();

  // inclination
  strHTML = "<b>Inclination:</b> <span id='inc'>" + numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Inclination).format('0.000');
  $("#dataField6").html(strHTML + "</span>&deg;");
  $("#dataField6").fadeIn();

  // total mass
  strHTML = "<b>Total Mass:</b> <span id='mass'>";
  if (currentVesselData.ascentData[currentAscentData.ascentIndex].Mass >= 1) {
    strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Mass).format('0.000') + "t";
  } else {
    strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Mass*1000).format('0.000') + "kg";
  }
  $("#dataField7").html(strHTML + "</span>");
  $("#dataField7").fadeIn();
  
  // stage fuel
  if (currentVesselData.ascentData[currentAscentData.ascentIndex].StageFuel) {
    var percent = currentVesselData.ascentData[currentAscentData.ascentIndex].StageFuel*100;
    var Gwidth = 202 * currentVesselData.ascentData[currentAscentData.ascentIndex].StageFuel;
    var Rwidth = 202 - Gwidth;
    strHTML = "<b>Stage Fuel: </b>";
    strHTML += "<span id='stageFuel' style='position: absolute; z-index: 120; margin-left: 80px;'>" + numeral(percent).format('0.00') + "%</span>";
    strHTML += "<img id='stageGreen' src='http://i.imgur.com/HszGFDA.png' height='16' width='" + Gwidth + "'>";
    strHTML += "<img id='stageRed' src='http://i.imgur.com/Gqe2mfx.png' height='16' width='" + Rwidth + "'>";
    $("#dataField8").html(strHTML);
    $("#dataField8").fadeIn();
  } else $("#dataField8").fadeOut();

  // total fuel
  var percent = currentVesselData.ascentData[currentAscentData.ascentIndex].TotalFuel*100;
  var Gwidth = 210 * currentVesselData.ascentData[currentAscentData.ascentIndex].TotalFuel;
  var Rwidth = 210 - Gwidth;
  strHTML = "<b>Total Fuel: </b>";
  strHTML += "<span id='totalFuel' style='position: absolute; z-index: 120; margin-left: 80px;'>" + numeral(percent).format('0.00') + "%</span>";
  strHTML += "<img id='totalGreen' src='http://i.imgur.com/HszGFDA.png' height='16' width='" + Gwidth + "'>";
  strHTML += "<img id='totalRed' src='http://i.imgur.com/Gqe2mfx.png' height='16' width='" + Rwidth + "'>";
  $("#dataField9").html(strHTML);
  $("#dataField9").fadeIn();

  // distance downrange
  strHTML = "<b>Distance Downrange:</b> <span id='dstDownrange'>";
  if (currentVesselData.ascentData[currentAscentData.ascentIndex].DstDownrange > 1000) {
    strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].DstDownrange/1000).format('0.000') + "km";
  } else {
    strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].DstDownrange).format('0.000') + "m";
  }
  $("#dataField10").html(strHTML + "</span>");
  $("#dataField10").fadeIn();

  // distance traveled
  if (currentVesselData.ascentData[currentAscentData.ascentIndex].DstTraveled) {
    strHTML = "<b>Distance Traveled:</b> <span id='dstTraveled'>";
    if (currentVesselData.ascentData[currentAscentData.ascentIndex].DstTraveled > 1000) {
      strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].DstTraveled/1000).format('0.000') + "km";
    } else {
      strHTML += numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].DstTraveled).format('0.000') + "m";
    }
    $("#dataField11").html(strHTML + "</span>");
    $("#dataField11").fadeIn();
  } else $("#dataField11").fadeOut();

  // AoA
  strHTML = "<b>Angle of Attack:</b> <span id='aoa'>" + numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].AoA).format('0.00') + "</span>&deg; [";
  if (!currentVesselData.ascentData[currentAscentData.ascentIndex].AoAWarn) {
    strHTML += "<span id='aoawarn' style='color: green'>Nominal</span>]";
  } else {
    var data = currentVesselData.ascentData[currentAscentData.ascentIndex].AoAWarn.split(":");
    strHTML += "<span id='aoawarn' style='color: " + data[1] + "'>" + data[0] + "</span>]";
  }
  $("#dataField12").html(strHTML);
  $("#dataField12").fadeIn();

  // Pitch/Roll/Heading
  strHTML = "<b>Pitch:</b> <span id='pitch'>" + numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Pitch).format('0.00') + "</span>&deg; | ";
  strHTML += "<b>Roll:</b> <span id='roll'>" + numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Roll).format('0.00') + "</span>&deg; | ";
  strHTML += "<b>Hdg:</b> <span id='hdg'>" + numeral(currentVesselData.ascentData[currentAscentData.ascentIndex].Heading).format('0.00') + "</span>&deg;";
  $("#dataField13").html(strHTML);
  $("#dataField13").fadeIn();

  // if this is a past event, show playback controls
  if (currentVesselData.CraftData.PastEvent) {
    strHTML = "<center><img class='tipped' id='prev10s' title='Back 10s' src='seekBackward1.png' style='visibility: hidden; cursor: pointer;' onclick='seekBack(10)'>&nbsp;&nbsp;";
    strHTML += "<img id='prev30s' src='seekBack.png' style='visibility: hidden; cursor:pointer' class='tipped' title='Back 30s' onclick='seekBack(30)'>&nbsp;&nbsp;";
    strHTML += "<span id='playbackCtrl' class='fauxLink' onclick='ascentPlaybackCtrl()'>Begin Playback</span>&nbsp;&nbsp;";
    strHTML += "<img id='next30s' src='seekForward.png' style='cursor:pointer' class='tipped' title='Forward 30s' onclick='seekFore(30)'>&nbsp;&nbsp;";
    strHTML += "<img class='tipped' id='next10s' title='Forward 10s' src='seekForward1.png' style='cursor: pointer;' onclick='seekFore(10)'></center>";
    $("#dataField14").html(strHTML);
    $("#dataField14").fadeIn();
  }

  // create the tooltips
  // behavior of tooltips depends on the device
  if (is_touch_device()) { showOpt = 'click'; }
  else { showOpt = 'mouseenter'; }
  Tipped.create('.tipped', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });

  // content area
  $("#content").fadeOut();
  $("#map").css("visibility", "visible");
  $("#map").fadeIn();

  // remove any markers that might already be placed
  if (launchsiteMarker) surfaceMap.removeLayer(launchsiteMarker);
  if (vesselMarker) surfaceMap.removeLayer(vesselMarker);

  // place the craft marker 
  vesselIcon = L.icon({iconUrl: 'button_vessel_' + currentVesselData.CatalogData.Type + '.png', iconSize: [16, 16]});
  vesselMarker = L.marker([currentVesselData.ascentData[currentAscentData.ascentIndex].Lat, currentVesselData.ascentData[currentAscentData.ascentIndex].Lon], {icon: vesselIcon, zIndexOffset: 100, interactive: false}).addTo(surfaceMap);
  
  // focus in on the vessel position
  surfaceMap.setView(vesselMarker.getLatLng(), 5);

  // build surface plot up to where things are if needed
  rebuildAscentTrack();
}

// have a bit of housecleaning to do
function ascentEnd() {

  // null the string so it can be checked for non-ascent
  strActiveAscent = "";

  // reset cursor for info window
  $("#infoTitle").css("cursor", "pointer");

  // save ascent FPS cookie
  if (checkCookies() && currentAscentData.FPS) setCookie("ascentFPS", currentAscentData.FPS, true);

  // interpolation function timeout handle nulled
  if (ascentInterpTimeout) {
    clearTimeout(ascentInterpTimeout);
    ascentInterpTimeout = null;
  }

  // pause ascent so a return to the data has it static
  isAscentPaused = true;

  // clear out the ascent track, won't take long to build it again
  clearAscentTracks();
}

// interpolate or set the data fields during an active ascent
function updateAscentData(clamp) {

  // can maybe get caught between switching to a past event
  if (!currentVesselData) return;

  // if we are clamping, just set the fields to the current ascent index
  if (clamp) {
    currentAscentData.velocity = currentVesselData.ascentData[currentAscentData.ascentIndex].Velocity;
    currentAscentData.throttle = currentVesselData.ascentData[currentAscentData.ascentIndex].Throttle;
    currentAscentData.thrust = currentVesselData.ascentData[currentAscentData.ascentIndex].Thrust;
    currentAscentData.gravity = currentVesselData.ascentData[currentAscentData.ascentIndex].Gravity;
    currentAscentData.altitude = currentVesselData.ascentData[currentAscentData.ascentIndex].Altitude;
    currentAscentData.ap = currentVesselData.ascentData[currentAscentData.ascentIndex].Apoapsis;
    currentAscentData.q = currentVesselData.ascentData[currentAscentData.ascentIndex].Q;
    currentAscentData.pe = currentVesselData.ascentData[currentAscentData.ascentIndex].Periapsis;
    currentAscentData.inc = currentVesselData.ascentData[currentAscentData.ascentIndex].Inclination;
    currentAscentData.mass = currentVesselData.ascentData[currentAscentData.ascentIndex].Mass;
    currentAscentData.fuel = currentVesselData.ascentData[currentAscentData.ascentIndex].TotalFuel;
    currentAscentData.dst = currentVesselData.ascentData[currentAscentData.ascentIndex].DstDownrange;
    currentAscentData.aoa = currentVesselData.ascentData[currentAscentData.ascentIndex].AoA;
    currentAscentData.pitch = currentVesselData.ascentData[currentAscentData.ascentIndex].Pitch;
    currentAscentData.roll = currentVesselData.ascentData[currentAscentData.ascentIndex].Roll;
    currentAscentData.hdg = currentVesselData.ascentData[currentAscentData.ascentIndex].Heading;
    currentAscentData.lat = currentVesselData.ascentData[currentAscentData.ascentIndex].Lat;
    currentAscentData.lon = currentVesselData.ascentData[currentAscentData.ascentIndex].Lon;
    if (currentVesselData.ascentData[currentAscentData.ascentIndex].StageFuel) currentAscentData.stage = currentVesselData.ascentData[currentAscentData.ascentIndex].StageFuel;
    if (currentVesselData.ascentData[currentAscentData.ascentIndex].DstTraveled) currentAscentData.traveled = currentVesselData.ascentData[currentAscentData.ascentIndex].DstTraveled;

    // check if we have a new AoA status
    if (!currentVesselData.ascentData[currentAscentData.ascentIndex].AoAWarn && $('#aoawarn').html() != "Nominal") {
      $('#aoawarn').html("Nominal");
      $('#aoawarn').css("color", "green");
    } else if (currentVesselData.ascentData[currentAscentData.ascentIndex].AoAWarn) {
      var data = currentVesselData.ascentData[currentAscentData.ascentIndex].AoAWarn.split(":");
      $('#aoawarn').html(data[0]);
      $('#aoawarn').css("color", data[1]);
    }

    // check if we have a new image or event
    if (currentVesselData.ascentData[currentAscentData.ascentIndex].Image) {
      currentAscentData.img = currentVesselData.ascentData[currentAscentData.ascentIndex].Image;
    }

    // if there isn't one and playback is paused, we need to seek back and find the last update
    else if (!currentVesselData.ascentData[currentAscentData.ascentIndex].Image && isAscentPaused) {
      for (checkIndex=currentAscentData.ascentIndex-1; checkIndex>=0; checkIndex--) {
        if (currentVesselData.ascentData[checkIndex].Image) {
          currentAscentData.img = currentVesselData.ascentData[checkIndex].Image;
          break;
        }
      }
    }
    $("#infoImg").html("<img src='" + currentAscentData.img + "'>");
    if (currentVesselData.ascentData[currentAscentData.ascentIndex].Event) {
      currentAscentData.event = currentVesselData.ascentData[currentAscentData.ascentIndex].Event;
      flashUpdate("#infoTitle", "#77C6FF", "#000000");
    } else if (!currentVesselData.ascentData[currentAscentData.ascentIndex].Event && isAscentPaused) {
      for (checkIndex=currentAscentData.ascentIndex-1; checkIndex>=0; checkIndex--) {
        if (currentVesselData.ascentData[checkIndex].Event) {
          currentAscentData.event = currentVesselData.ascentData[checkIndex].Event;
          break;
        }
      }
    }
    $("#infoTitle").html(currentAscentData.event);
    $("#infoTitle").attr("class", "infoTitle vessel");
    $("#infoTitle").css("cursor", "auto");

    // update the surface plotting if there is one
    // otherwise redraw the plot, which won't happen until the vessel clears a box around KSC
    if (ascentTracks.length) updateSurfacePlot();
    else rebuildAscentTrack();

  // otherwise, use the delta values to update towards the next clamp
  } else {
    interpStart = new Date().getTime();
    currentAscentData.velocity += currentAscentData.velocityDelta;
    currentAscentData.throttle += currentAscentData.throttleDelta;
    currentAscentData.thrust += currentAscentData.thrustDelta;
    currentAscentData.gravity += currentAscentData.gravityDelta;
    currentAscentData.altitude += currentAscentData.altitudeDelta;
    currentAscentData.ap += currentAscentData.apDelta;
    currentAscentData.q += currentAscentData.qDelta;
    currentAscentData.pe += currentAscentData.peDelta;
    currentAscentData.inc += currentAscentData.incDelta;
    currentAscentData.mass += currentAscentData.massDelta;
    currentAscentData.fuel += currentAscentData.fuelDelta;
    currentAscentData.dst += currentAscentData.dstDelta;
    currentAscentData.aoa += currentAscentData.aoaDelta;
    currentAscentData.pitch += currentAscentData.pitchDelta;
    currentAscentData.roll += currentAscentData.rollDelta;
    currentAscentData.hdg += currentAscentData.hdgDelta;
    currentAscentData.lat += currentAscentData.latDelta;
    currentAscentData.lon += currentAscentData.lonDelta;
    if (currentVesselData.ascentData[currentAscentData.ascentIndex].DstTraveled) currentAscentData.traveled += currentAscentData.traveledDelta;
    if (currentVesselData.ascentData[currentAscentData.ascentIndex].StageFuel) {

      // if the current clamp is 1 and we are supposed to increase to it, just jump there instead
      if (currentVesselData.ascentData[currentAscentData.ascentIndex].StageFuel == 1 && currentAscentData.stageDelta > 0) {
        currentAscentData.stage = 1;

      // if the current clamp is 1 and we are supposed to decrease from it, then interpolate
      } else if (currentVesselData.ascentData[currentAscentData.ascentIndex].StageFuel == 1 && currentAscentData.stageDelta < 0) {
        currentAscentData.stage += currentAscentData.stageDelta;
      } else currentAscentData.stage += currentAscentData.stageDelta;
    }
  }

  // update all the data fields
  // velocity readout
  if (currentAscentData.velocity > 1000) {
    $("#velocity").html((numeral(currentAscentData.velocity/1000).format('0.000')) + "km/s");
  } else {
    $("#velocity").html((numeral(currentAscentData.velocity).format('0.000')) + "m/s");
  }
  $("#throttle").html(numeral(currentAscentData.throttle).format('0.00'));

  // thrust readout
  $("#thrust").html(numeral(currentAscentData.thrust).format('0.000'));
  $("#twr").html(numeral(currentAscentData.thrust/(currentAscentData.mass * currentAscentData.gravity)).format('0.000'));

  // altitude
  if (currentAscentData.altitude > 1000) {
    $("#altitude").html((numeral(currentAscentData.altitude/1000).format('0.000') + "km"));
  } else {
    $("#altitude").html((numeral(currentAscentData.altitude).format('0.000') + "m"));
  }

  // apoapsis
  if (currentAscentData.ap > 1000) {
    $("#ap").html((numeral(currentAscentData.ap/1000).format('0.000') + "km"));
  } else {
    $("#ap").html((numeral(currentAscentData.ap).format('0.000') + "m"));
  }

  // show periapsis if dynamic pressure is 0 and the rocket is into its ascent
  if (currentAscentData.q <= 0 && currentVesselData.ascentData[currentAscentData.ascentIndex].UT > launchTime) {
    $("#peQcaption").html("Periapsis:");
    if (Math.abs(currentAscentData.pe) > 1000) {
      $("#peQ").html((numeral(currentAscentData.pe/1000).format('0.000')) + "km");
    } else {
      $("#peQ").html((numeral(currentAscentData.pe).format('0.000')) + "m");
    }
  } else {
    $("#peQcaption").html("Dynamic Pressure (Q):");
    if (currentAscentData.q >= 1) {
      $("#peQ").html((numeral(currentAscentData.q).format('0.000')) + "kPa");
    } else {
      $("#peQ").html((numeral(currentAscentData.q*1000).format('0.000')) + "Pa");
    }
  }

  // inclination
  $("#inc").html(numeral(currentAscentData.inc).format('0.000'));

  // total mass
  if (currentAscentData.mass >= 1) {
    $("#mass").html((numeral(currentAscentData.mass).format('0.000')) + "t");
  } else {
    $("#mass").html((numeral(currentAscentData.mass*1000).format('0.000')) + "kg");
  }
  
  // stage fuel
  if (currentAscentData.stage) {
    var Gwidth = 204 * currentAscentData.stage;
    var Rwidth = 204 - Gwidth;
    $("#stageFuel").html((numeral(currentAscentData.stage*100).format('0.00')) + "%");
    $("#stageGreen").css("width", Gwidth);
    $("#stageRed").css("width", Rwidth);
  } 

  // total fuel
  var Gwidth = 210 * currentAscentData.fuel;
  var Rwidth = 210 - Gwidth;
  $("#totalFuel").html((numeral(currentAscentData.fuel*100).format('0.00')) + "%");
  $("#totalGreen").css("width", Gwidth);
  $("#totalRed").css("width", Rwidth);

  // distance downrange
  if (currentAscentData.dst > 1000) {
    $("#dstDownrange").html((numeral(currentAscentData.dst/1000).format('0.000')) + "km");
  } else {
    $("#dstDownrange").html((numeral(currentAscentData.dst).format('0.000')) + "m");
  }

  // distance traveled
  if (currentAscentData.traveled) {
    if (currentAscentData.traveled > 1000) {
      $("#dstTraveled").html((numeral(currentAscentData.traveled/1000).format('0.000')) + "km");
    } else {
      $("#dstTraveled").html((numeral(currentAscentData.traveled).format('0.000')) + "m");
    }
  }

  // AoA
  $("#aoa").html(numeral(currentAscentData.aoa).format('0.00'));

  // Pitch/Roll/Heading
  $("#pitch").html(numeral(currentAscentData.pitch).format('0.00'));
  $("#roll").html(numeral(currentAscentData.roll).format('0.00'));
  $("#hdg").html(numeral(currentAscentData.hdg).format('0.00'));

  // move the vessel icon
  vesselMarker.setLatLng([currentAscentData.lat, currentAscentData.lon]);

  // if we are not paused then we need to call ourselves again to keep things going
  if (!isAscentPaused) {
    
    // get the time it took us to perform this function
    var diff = new Date().getTime() - interpStart;

    // call ourselves again at the proper FPS interval, taking into account the time we just used up
    ascentInterpTimeout = setTimeout(updateAscentData, (1000/currentAscentData.FPS) - diff);
    currentAscentData.interpCount++;
  }

  // if we are paused we're going to need to update the MET 
  // as well as the surface track
  else {
    if (L0Time > currentVesselData.ascentData[currentAscentData.ascentIndex].UT) {
      $("#metCaption").html("Launch in:");
      $("#met").html(formatTime(L0Time-currentVesselData.ascentData[currentAscentData.ascentIndex].UT));
    } else {
      $("#metCaption").html("Mission Elapsed Time:");
      $("#met").html(formatTime(currentVesselData.ascentData[currentAscentData.ascentIndex].UT-L0Time));
    }
    rebuildAscentTrack();
  }
}

function checkLaunchTime() {
  if (!L0Time) {

    // get the current launch time
    for (i=currentVesselData.LaunchTimes.length-1; i>=0; i--) {

      // the first record is always the original launch time, regardless of its UT
      // this assumption prevents the event calendar from getting confused if multiple launch times are posted
      if (currentVesselData.LaunchTimes[i].UT <= getLaunchUT() || i == 0) {
        L0Time = currentVesselData.LaunchTimes[i].LaunchTime;
        break;
      }
    }
  }
}

// buttons to seek through ascent playback
function seekFore(amount) {
  currentAscentData.ascentIndex += amount;

  // make sure we aren't out of range
  if (currentAscentData.ascentIndex >= currentVesselData.ascentData.length-1) {
    currentAscentData.ascentIndex = currentVesselData.ascentData.length-1;

    // null the interpolation timer
    if (ascentInterpTimeout) {
      clearTimeout(ascentInterpTimeout);
      ascentInterpTimeout = null;
    }

    // one last surface track update
    updateSurfacePlot(currentVesselData.ascentData.length-1);

    // hide the forward seek buttons & update control link
    $("#next10s").css("visibility", "hidden");
    $("#next30s").css("visibility", "hidden");
    $("#playbackCtrl").html("Reset Playback");
  }

  // if we're paused, push the update 
  // unless it's the final entry then playback is practically paused
  // wait a few millisecs for the interpolation function to cease
  if (isAscentPaused || currentAscentData.ascentIndex == currentVesselData.ascentData.length-1) {
    isAscentPaused = true;
    setTimeout(updateAscentData, 150, true);
  }

  // show the backward seek buttons
  $("#prev10s").css("visibility", "visible");
  $("#prev30s").css("visibility", "visible");
}
function seekBack(amount) {
  currentAscentData.ascentIndex -= amount;

  // make sure we aren't out of range
  if (currentAscentData.ascentIndex <= 0) {
    currentAscentData.ascentIndex = 0;

    // hide the backward seek buttons
    $("#prev10s").css("visibility", "hidden");
    $("#prev30s").css("visibility", "hidden");
  }

  // if we're paused, push the update 
  // don't change the control text if things are already playing
  if (isAscentPaused) {
    updateAscentData(true);
    $("#playbackCtrl").html("Begin Playback");
  }

  // show the forward seek buttons & update control link
  $("#next10s").css("visibility", "visible");
  $("#next30s").css("visibility", "visible");
}

// action is defined by what is currently displayed in the playback control text area
function ascentPlaybackCtrl() {
  if ($("#playbackCtrl").html() == "Begin Playback") {
    isAscentPaused = false;
    $("#playbackCtrl").html("Pause Playback");
    $("#next10s").css("visibility", "hidden");
    $("#next30s").css("visibility", "hidden");
    $("#prev10s").css("visibility", "hidden");
    $("#prev30s").css("visibility", "hidden");
  } else if ($("#playbackCtrl").html() == "Pause Playback") { 
    isAscentPaused = true;
    $("#playbackCtrl").html("Begin Playback");
    $("#next10s").css("visibility", "visible");
    $("#next30s").css("visibility", "visible");
    $("#prev10s").css("visibility", "visible");
    $("#prev30s").css("visibility", "visible");
  } else if ($("#playbackCtrl").html() == "Reset Playback") { 
    currentAscentData.ascentIndex = 0;
    $("#next10s").css("visibility", "visible");
    $("#next30s").css("visibility", "visible");
    $("#prev10s").css("visibility", "hidden");
    $("#prev30s").css("visibility", "hidden");
    $("#playbackCtrl").html("Begin Playback");
    clearAscentTracks();
    updateAscentData(true);
  }
}

// draws the ascent track and associated markers up to the current point
// only draws markers/tracks outside a bounding box near KSC
function rebuildAscentTrack() {
  clearAscentTracks();
  if (!noMarkBox.contains(vesselMarker.getLatLng())) {
    for (trackIndex = 0; trackIndex < currentAscentData.ascentIndex; trackIndex++) {
      updateSurfacePlot(trackIndex);
    }
  }
}

// add to the surface track and place markers as needed
function updateSurfacePlot(index) {
  if (index == null) index = currentAscentData.ascentIndex-1;
  if (currentVesselData.ascentData[index].Phase) {  
    ascentColorsIndex++;
    if (ascentColorsIndex == surfacePathColors.length) { ascentColorsIndex = 0; }
    ascentTracks.push(L.polyline([], {smoothFactor: .25, clickable: true, color: surfacePathColors[ascentColorsIndex], weight: 2, opacity: 1}).addTo(surfaceMap));
    ascentTracks[ascentTracks.length-1].addLatLng([currentVesselData.ascentData[index].Lat, currentVesselData.ascentData[index].Lon]);
    ascentTracks[ascentTracks.length-1]._myId = "<center>" + currentVesselData.ascentData[index].Phase + "</center>";
    ascentTracks[ascentTracks.length-1].on('mouseover mousemove', function(e) {
      ascentPopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
      ascentPopup.setLatLng(e.latlng);
      ascentPopup.setContent(e.target._myId);
      ascentPopup.openOn(surfaceMap);
    });
    ascentTracks[ascentTracks.length-1].on('mouseout', function(e) {
      if (ascentPopup) { surfaceMap.closePopup(ascentPopup); }
      ascentPopup = null;
    });
  } else if (ascentTracks.length) ascentTracks[ascentTracks.length-1].addLatLng([currentVesselData.ascentData[index].Lat, currentVesselData.ascentData[index].Lon]);
  if (currentVesselData.ascentData[index].EventMark) {
    var labelIcon = L.icon({
      iconUrl: 'label.png',
      iconSize: [5, 5],
    });
    ascentMarks.push(L.marker([currentVesselData.ascentData[index].Lat, currentVesselData.ascentData[index].Lon], {icon: labelIcon}).addTo(surfaceMap));
    ascentMarks[ascentMarks.length-1]._myId = currentVesselData.ascentData[index].EventMark + ";" + currentVesselData.ascentData[index].Lat + ";" + currentVesselData.ascentData[index].Lon;
    ascentMarks[ascentMarks.length-1].on('mouseover mousemove', function(e) {
      data = e.target._myId.split(";")
      ascentPopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
      ascentPopup.setLatLng([data[1], data[2]]);
      ascentPopup.setContent("<center>" + data[0] + "</center>");
      ascentPopup.openOn(surfaceMap);
    });
    ascentMarks[ascentMarks.length-1].on('mouseout', function(e) {
      if (ascentPopup) { surfaceMap.closePopup(ascentPopup); }
      ascentPopup = null;
    });
  }
}

function clearAscentTracks() {
  if (ascentTracks.length) {
    ascentTracks.forEach(function(track) {
      surfaceMap.removeLayer(track);
    });
  }
  if (ascentMarks.length) {
    ascentMarks.forEach(function(mark) {
      surfaceMap.removeLayer(mark);
    });
  }
  ascentTracks = [];
  ascentMarks = [];
  ascentColorsIndex = -1;
}