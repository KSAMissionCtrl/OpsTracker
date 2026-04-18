// refactor complete
// SECURITY: All user-supplied data from database is sanitized with sanitizeHTML()
// before insertion into DOM to prevent XSS attacks. Use sanitizeHTML() for any
// new code that inserts database content into HTML.

function loadVessel(vessel, givenUT, wasUTExplicit) {

  // Track whether UT was explicitly provided in the original call
  // This flag needs to be preserved through recursive setTimeout calls
  if (wasUTExplicit === undefined) wasUTExplicit = (givenUT && givenUT != currUT());
  
  if (!givenUT || givenUT < 0) givenUT = currUT();

  // can't continue if menu data hasn't loaded and sorted - preserve the wasUTExplicit flag
  if (!KSA_UI_STATE.isMenuSorted) return setTimeout(loadVessel, 50, vessel, givenUT, wasUTExplicit);

  // if body is being switched, we need to wait for it to finish loading before proceeding
  // this ensures paused calculations can properly resume when switching directly to a vessel from another body
  if (KSA_TIMERS.bodyLoadTimeout && !ops.surface.Data) return setTimeout(loadVessel, 50, vessel, givenUT, wasUTExplicit);
  else KSA_TIMERS.bodyLoadTimeout = null;

  // we need to make sure the current surface map is proper for this vessel
  var strParentBody = getParentSystem(vessel);
  if (strParentBody == "inactive") {
    var soi = ops.craftsMenu.find(o => o.db === vessel).soi;

    // last entry is always the inactive ref (-2), second-to-last is the last real body
    strParentBody = ops.bodyCatalog.find(o => o.ID === soi[soi.length - 2].ref).Body;
  }
  if (strParentBody && (!ops.surface.Data || (ops.surface.Data && ops.surface.Data.Name != strParentBody.replace("-System", "")))) {
    loadBody(strParentBody);
    KSA_TIMERS.bodyLoadTimeout = setTimeout(loadVessel, 500, vessel, givenUT, wasUTExplicit);
    return;
  }

  // we can't let anyone jump to a UT later than the current UT
  if (givenUT > currUT() && !localStorage.getItem("ksaOps_admin")) givenUT = currUT();
  
  // Clear all certificate icons when loading a new vessel/event
  $('.change-indicator').remove();
  
  // compose the the URL that will appear in the address bar when the history state is updated
  var strURL = "http://www.kerbalspace.agency/Tracker/tracker.html?vessel=" + vessel;

  // Only add UT to URL if it was explicitly provided
  if (wasUTExplicit) strURL += "&ut=" + givenUT;

  // if this is the first page to load, replace the current history
  if (!history.state) history.replaceState({type: "vessel", id: vessel, UT: givenUT}, document.title, strURL.replace("&live", "").replace("&reload", ""));

  // otherwise check to see if the current state isn't this same event. if it is we are paging back and don't want to push a new state
  else if (history.state.UT != givenUT) history.pushState({type: "vessel", id: vessel, UT: givenUT}, document.title, strURL);
  
  // we changed the DB name for these vessels. Allow old links to still work
  if (vessel.includes("ascensionmk1b1")) vessel = vessel.replace("mk1b1", "mk1");

  // select and show it in the menu
  selectMenuItem(vessel);

  // loading spinners - activate!
  $("#infoBox").spin({ position: 'relative', top: '50%', left: '50%' });
  $("#contentBox").spin({ position: 'relative', top: '50%', left: '50%' });
  $("#dataLabel").html("Loading Data...");
  
  // delete the current vessel data and put out the call for new vessel data
  // set a flag to let data loader know if this is an initial load or not
  // was originally set in the currentVessel object but that needs to remain null until load is complete
  var bInitLoad;
  if (ops.currentVessel && ops.currentVessel.Catalog.DB === vessel) bInitLoad = false;
  else bInitLoad = true;
  ops.currentVessel = null;

  // clear ascent vessel tracking so ascentEnd() won't trigger a reload for this vessel
  ops.ascentData.vessel = null;

  KSA_DATA_SERVICE.fetchVesselData(vessel, givenUT, loadVesselAJAX, { initLoad: bInitLoad });
  
  // add vessel-specific buttons to the map
  addMapResizeButton();
  addMapViewButton();

  // size down the map
  lowerContent();
  
  // close any popups
  if (KSA_MAP_CONTROLS.vesselPositionPopup && ops.surface.map) KSA_MAP_CONTROLS.vesselPositionPopup.close();
}

function loadFlt(dbName, menuSelect = true) {

  // First check if this flight path has already been loaded - if so, handle it and skip loading checks
  var path = KSA_CATALOGS.fltPaths.find(o => o.id === dbName);
  if (path) {
    
    // Close any open flight position popup
    if (KSA_MAP_CONTROLS.flightPositionPopup.isOpen()) {
      KSA_MAP_CONTROLS.flightPositionPopup.close();
    }
    
    // Close the load notice dialog if it's open
    if ($("#mapDialog").dialog("isOpen") && $("#mapDialog").dialog("option", "title") == "Data Load Notice") {
      $("#mapDialog").dialog("close");
    }
    
    // Make sure we're on Kerbin
    var currBody = ops.bodyCatalog.find(o => o.selected === true);
    if (!currBody || (currBody && currBody.Body != "Kerbin")) {
      swapContent("body", "Kerbin", dbName);
      return;
    }
    
    // Make sure page type is correct
    if (ops.pageType != "body") swapContent("body", "Kerbin", dbName);
    
    // add it back to the map and the control if it has been removed
    if (path.deleted) {
      ops.surface.layerControl.addOverlay(path.layer, "<i class='fa fa-minus' style='color: " + path.color + "'></i> " + path.info.Title, "Flight Tracks");
      path.layer.addTo(ops.surface.map);
      path.Deleted = false;
      
    // just add it back to the map in case it was hidden
    } else if (!ops.surface.map.hasLayer(path.layer)) path.layer.addTo(ops.surface.map);
    showMap();
    
    // Zoom the map to fit this flight path
    // If there are more than two layers the plot wraps around the meridian so just show the whole map
    // otherwise zoom in to fit the size of the plot
    var polylines = getPolylinesFromLayer(path.layer);
    if (polylines.length > 1) ops.surface.map.setView([0,0], 1);
    else ops.surface.map.fitBounds(polylines[0]._bounds);

    // if this wasn't selected from the menu, select it now
    if (!menuSelect) selectMenuItem(dbName);
    else {

      // Update the URL to include this flight
      var strURL = "http://www.kerbalspace.agency/Tracker/tracker.html?body=Kerbin-System&flt=" + dbName;
      history.pushState({type: "flt", db: dbName}, document.title, strURL);
    }
    return;
  }
  
  // let the user know only one data load request can be active at a time
  if (KSA_UI_STATE.strFltTrackLoading) {
    
    // Check if dialog is already open before recreating it
    if (!$("#mapDialog").dialog("isOpen")) {
      $("#mapDialog").dialog( "option", "title", "Data Load Notice");
      $("#progressbar").fadeOut();
      $("#dialogTxt").fadeIn();
      $("#dialogTxt").html("Only one flight track can be requested at a time. Please wait for the track to load before clicking another from the menu.");
      $("#mapDialog").dialog( "option", "buttons", [{
        text: "Okay",
        click: function() { 
          $("#mapDialog").dialog("close");
        }
      }]);
      $("#mapDialog").dialog("open");
    }
    
    // Revert menu selection to the currently-loading flight path, but don't scroll into view
    w2ui['menu'].unselect(dbName);
    w2ui['menu'].select(KSA_UI_STATE.strFltTrackLoading);
    w2ui['menu'].expandParents(KSA_UI_STATE.strFltTrackLoading);
    return;
  }

  // Close the load notice dialog if it's open, since we're now allowing a new load to proceed
  if ($("#mapDialog").dialog("isOpen") && $("#mapDialog").dialog("option", "title") == "Data Load Notice") {
    $("#mapDialog").dialog("close");
  }

  // check that we are looking at the proper map (hardcoded to Kerbin), and load it if not
  // this will append the flight name to the URL and the path will be loaded
  var currBody = ops.bodyCatalog.find(o => o.selected === true);
  if (!currBody || (currBody && currBody.Body != "Kerbin")) {
    swapContent("body", "Kerbin", dbName);
  }

  // however if the system is already set to Kerbin, just load the path straight to the map
  else {

    // if this isn't the right page type, set it up
    if (ops.pageType != "body") swapContent("body", "Kerbin", dbName);
    setTimeout(showMap, 1000);

    // show the layers control
    $('.leaflet-top.leaflet-right').fadeIn();

    // load the aircraft track
    KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad = L.layerGroup();
    ops.surface.layerControl._expand();
    ops.surface.layerControl.options.collapsed = false;
    ops.surface.layerControl.addOverlay(KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Flight Tracks");
    KSA_DATA_SERVICE.fetchFltData(dbName, loadFltDataAJAX);
    KSA_UI_STATE.strFltTrackLoading = dbName;
    
    // if this wasn't selected from the menu, select it now
    if (!menuSelect) selectMenuItem(dbName);
  }
}

// parses data used to display information on parts for vessels
function loadPartsAJAX(parts) {
  KSA_CATALOGS.partsCatalog = parts;
}

// parses data used to drive the live/replay ascent telemetry
function loadAscentAJAX(result) {
  ops.ascentData.telemetry = result;
  setupStreamingAscent();
}

// parses data that shows up for the vessel currently selected in the menu
function loadVesselAJAX(result, flags) {

  // store all the data
  // preserve the initial load flag
  ops.currentVessel = { Catalog:        result.catalog,
                        CraftData:      result.current.craft,
                        Resources:      result.current.resources,
                        Manifest:       result.current.manifest,
                        Comms:          result.current.comms,
                        Ports:          result.current.ports,
                        Orbit:          result.current.orbit,
                        History:        result.history,
                        LaunchTimes:    result.launchTimes,
                        OrbitalHistory: result.orbitalHistory,
                        AscentData:     result.ascentRange || [],
                        timelineTweets: null,
                        initLoad:       null };

  // Clear prevContent so the content area always re-renders on page navigation.
  // CraftData is a cached reference from fetchJson — prevContent from a prior
  // visit would otherwise persist and cause the content update to be skipped.
  if (ops.currentVessel.CraftData) delete ops.currentVessel.CraftData.prevContent;

  // Reset the orbit stack when switching to a different vessel; preserve it for state changes within the same vessel.
  if (_vofObtStack.db !== ops.currentVessel.Catalog.DB) { _vofObtStack.db = ops.currentVessel.Catalog.DB; _vofObtStack.stack = []; }
  if (ops.currentVessel.Resources) ops.currentVessel.Resources.resIndex = 0;
  if (flags) ops.currentVessel.initLoad = flags.initLoad;
  
  // look for the closest recent event to this UT and see if it matches the current craft data to check if it is a past event
  var histIndex;
  for (histIndex = ops.currentVessel.History.length-1; histIndex >= 0; histIndex--) {
    if (ops.currentVessel.History[histIndex].UT <= currUT()) break;
  }
  if (ops.currentVessel.CraftData.UT < ops.currentVessel.History[histIndex].UT) ops.currentVessel.CraftData.pastEvent = true;
  else ops.currentVessel.CraftData.pastEvent = false;
  
  // update with the vessel name for this record
  vesselTitleUpdate();
  
  // update the twitter timeline 
  vesselTimelineUpdate();
  
  if (ops.currentVessel.Catalog.Patches) {
    var p = ops.currentVessel.Catalog.Patches;

    // program patch
    var patchImgURL = imageURLFromDB("http://www.kerbalspace.agency/Tracker/images/programs/", p.program.patchUrl);
    var patchPageURL;
    if (p.program.pageUrl.includes("http")) patchPageURL = p.program.pageUrl.replace("index.php", "");
    else patchPageURL = "http://www.kerbalspace.agency/?page_id=" + p.program.pageUrl;
    var strPatches = "<a target='_blank' href='" + patchPageURL + "'><img id='programPatch' class='tipped' data-tipped-options=\"position: 'bottom'\" style='height: 35px;' title=\"<center>Click to view the " + p.program.name + " Program page</center><br /><img style='height: 500px;' src='" + patchImgURL + "'>\" src='" + patchImgURL + "'></a>&nbsp;";

    // vessel patch has a page URL?
    patchImgURL = imageURLFromDB("http://www.kerbalspace.agency/Tracker/images/vessels/", p.vessel.patchUrl);
    if (p.vessel.pageUrl !== null) {
      if (p.vessel.pageUrl.includes("http")) patchPageURL = p.vessel.pageUrl.replace("index.php", "");
      else patchPageURL = "http://www.kerbalspace.agency/?page_id=" + p.program.pageUrl + "#ffs-tabbed-" + p.vessel.pageUrl;
      strPatches += "<a target='_blank' href='" + patchPageURL + "'><img id='vesselPatch' class='tipped' data-tipped-options=\"position: 'bottom'\" style='height: 35px; cursor: pointer;' title=\"<center>Click to view the " + p.vessel.name + " vessel page</center><br /><img style='height: 500px;' src='" + patchImgURL + "'>\" src='" + patchImgURL + "'></a>&nbsp;";
    } else {
      strPatches += "<img id='vesselPatch' class='tipped' data-tipped-options=\"position: 'bottom'\" style='height: 35px; cursor: help;' title=\"<img style='height: 500px;' src='" + patchImgURL + "'>\" src='" + patchImgURL + "'>&nbsp;";
    }

    // mission patch?
    if (p.mission !== null) {
      patchImgURL = imageURLFromDB("http://www.kerbalspace.agency/Tracker/images/vessels/" + encodeURIComponent(ops.currentVessel.Catalog.DB) + "/", p.mission.patchUrl);
      strPatches += "<img id='missionPatch' class='tipped' data-tipped-options=\"position: 'bottom'\" style='height: 35px; cursor: help;' title=\"<img style='height: 500px;' src='" + patchImgURL + "'><br /><center>Mission Payload</center>\" src='" + patchImgURL + "'>&nbsp;";
    }
    $("#patches").html(strPatches);
  } else $("#patches").empty();

  // no orbit data or mission ended? Close the dialog in case it is open
  if (!ops.currentVessel.Orbit || isMissionEnded()) $("#mapDialog").dialog("close");
  
  // is there ascent data available right now?
  if (ops.currentVessel.AscentData.length 
  && !ops.currentVessel.CraftData.pastEvent                                           // does not apply to past events
  && (ops.currentVessel.AscentData[0]-randomIntFromInterval(20,26) <= currUT()        // time is 20-26s prior to start of ascent data
  && ops.currentVessel.AscentData[ops.currentVessel.AscentData.length-1] > currUT()   // and time still remains in the ascent data
  )) {
    loadAscentData();
    ops.ascentData.active = true;

    // dunno why this was called
    // vesselInfoUpdate();
  }

  // just a normal update then
  else {

    // clear out the ascentID so any real-time updates stop
    ascentEnd();

    // display all the updateable data
    vesselHistoryUpdate();
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
    vesselAddlInfoUpdate();
    vesselRelatedUpdate();
    vesselLastUpdate();
    vesselContentUpdate();
    
    // check if this is a launch event
    if (ops.currentVessel.CraftData.CraftDescTitle.toLowerCase().includes("+0:00")
    && ops.currentVessel.CraftData.pastEvent                                            // make sure it happened in the past
    && ops.currentVessel.AscentData.length                                              // make sure there is ascent data
    ){
      $("#dataField13").html("<center><span class='fauxLink' onclick='loadAscentData()'>Ascent Data Available - Click to View</span></center>");
      $("#dataField13").fadeIn();
    } else {
      $("#dataField13").fadeOut();
      clearAscentTracks();
    }

    // hide the rest of the fields that are unused for now
    $("#dataField14").fadeOut();
    $("#dataField15").fadeOut();
    $("#dataField16").fadeOut();
  }

  // create the tooltips
  // behavior of tooltips depends on the device
  if (is_touch_device()) showOpt = 'click';
  else showOpt = 'mouseenter';
  Tipped.create('.tipped', { 
    showOn: showOpt, 
    hideOnClickOutside: is_touch_device(), 
    detach: false, 
    hideOn: { element: 'mouseleave'},
    onShow: onTooltipShow
  });
  Tipped.create('.tip-update', { 
    showOn: showOpt, 
    hideOnClickOutside: is_touch_device(), 
    detach: false, 
    hideOn: { element: 'mouseleave'},
    onShow: onTooltipShow
  });
}

function vesselTimelineUpdate(update) {

  // if there are multiple sources and this doesn't have a timeline then clear to just the main source
  if ($("#twitterTimelineSelection").html().includes("|") && !ops.currentVessel.Catalog.Timeline) swapTwitterSource();
  
  // only check for an existing mission feed if this is not an update call, otherwise it already exists from craft load
  // don't bother swapping the feed if it is still the same
  if (ops.currentVessel.Catalog.Timeline && !update && ops.twitterSource != ops.currentVessel.Catalog.Timeline) {
    swapTwitterSource("Mission Feed", ops.currentVessel.Catalog.Timeline);
  }
}

function vesselTitleUpdate(update) {
  $("#contentHeader").spin(false);
  $("#tags").fadeIn();
  if (update && $("#contentHeader").html() != ops.currentVessel.CraftData.CraftName) flashUpdate("#contentHeader", "#77C6FF", "#FFF");
  $("#contentTitle").html(ops.currentVessel.CraftData.CraftName);
  document.title = "KSA Operations Tracker" + " - " + ops.currentVessel.CraftData.CraftName + ": " + ops.currentVessel.CraftData.CraftDescTitle;
}

// updates all the data in the Info Box
function vesselInfoUpdate(update) {
  if (update && (!$("#infoImg").html().includes(getVesselImage()) || $("#infoTitle").html() != ops.currentVessel.CraftData.CraftDescTitle)) {
    flashUpdate("#infoTitle", "#77C6FF", "#000");
  }

  // is there a parts overlay?
  var partsMap = getPartsMap();
  if (partsMap) {
    var svgLines = '';
    var partsImgHTML = '';

    partsMap.forEach(function(part) {
      var cx = part.offset ? part.offset.x : part.x;
      var cy = part.offset ? part.offset.y : part.y;
      if (part.offset) {
        svgLines += "<line x1='" + part.x + "' y1='" + part.y + "' x2='" + part.offset.x + "' y2='" + part.offset.y + "' class='imgmap-offset-line'/>";
      }
      partsImgHTML += "<div id='" + part.id + "' ";
      if (part.amount) partsImgHTML += "amount='" + part.amount + "' ";
      partsImgHTML += "class='imgmap' style='top: " + (cy - 5) + "px; ";
      partsImgHTML += "left: " + (cx - 5) + "px;";
      partsImgHTML += "'></div>";
    });

    var svgEl = svgLines ? "<svg class='parts-overlay-svg'>" + svgLines + "</svg>" : '';
    $("#partsImg").html(svgEl + partsImgHTML);
    setTimeout(function() { if (!$('#infoBox').is(":hover")) $("#partsImg").fadeOut(1000); }, 1000);
    assignPartInfo();
  } else $("#partsImg").empty();

  // setup the basics
  var vesselImageHTML = "<div style='position: relative; display: inline-block;'>";

  // if there is an existing image in the container, save it src
  var existingImageSrc = $("#infoImg img").attr("src");
  if (existingImageSrc) vesselImageHTML += "<img src='" + existingImageSrc + "'>";
  else vesselImageHTML += "<img src='" + sanitizeHTML(getVesselImage()) + "'>";
  
  // only add maximize button if there's a parts overlay (static state)
  if ($("#partsImg").html()) {
    vesselImageHTML += "<i class='fa-solid fa-maximize vessel-image-maximize' style='color: #ffffff;' onclick='openVesselImageLightbox(\"" + sanitizeHTML(getVesselImage()) + "\")'></i>";
  }
  vesselImageHTML += "</div>";
  $("#infoImg").html(vesselImageHTML);

  // load the new image if it is different
  if (existingImageSrc != getVesselImage()) {
    // Keep the spinner going until the new image has fully loaded
    loadImageWithTransition("#infoImg", sanitizeHTML(getVesselImage()), function() { $("#infoBox").spin(false); });
  } else {
    // Image unchanged — stop the spinner now
    $("#infoBox").spin(false);
  }

  $("#infoTitle").html(sanitizeHTML(ops.currentVessel.CraftData.CraftDescTitle));
  $("#infoTitle").attr("class", "infoTitle vessel");

  // fix any mistakes that may have worked their way into several vessel updates
  var dialogStr = ops.currentVessel.CraftData.CraftDescContent;
  dialogStr = dialogStr.replace("thrid", "third");
  dialogStr = dialogStr.replace("kerbolar", "Kerbolar");
  dialogStr = dialogStr.replace("fist stage", "first stage");
  $("#infoDialog").html(dialogStr);
  $("#infoDialog").dialog("option", "title", "Additional Information - " + ops.currentVessel.CraftData.CraftDescTitle);
  $("#infoDialog").dialog("option", {width: 643, height: 400});
}

function vesselMETUpdate(update) {
  
  // get the current launch time - defer to mission start time if it's available
  var launchTime = checkLaunchTime();
  if (ops.currentVessel.Catalog.MissionStartTime) launchTime = ops.currentVessel.Catalog.MissionStartTime;

  if (update && (!$("#dataField0").html().includes(ops.currentVessel.CraftData.MissionStartTerm) || !$("#dataField0").html().includes(UTtoDateTime(launchTime)))) {
    flashUpdate("#dataField0", "#77C6FF", "#FFF");
  }

  // we don't know the start time right now
  var strHTML;
  if (!launchTime) {
    strHTML = "<b>" + ops.currentVessel.CraftData.MissionStartTerm + ":</b><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'metTip', maxWidth: 300\"> <u>To Be Determined</u>";
    
  // post the current launch time
  } else {
    strHTML = "<b>" + ops.currentVessel.CraftData.MissionStartTerm + ":</b><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'metTip', maxWidth: 300\"> <u>" + UTtoDateTime(launchTime) + " UTC</u>";
  }
  $("#dataField0").fadeIn();
  
  // decide what goes in the tooltip
  var strTip = '';
  var noMET = false;
  
  // we don't know yet
  if (!launchTime && !ops.currentVessel.CraftData.pastEvent) strTip = "launch time currently being assessed<br>";
  else {

    // if this is a past event and there was more than one launch time, find what time equals the current UT
    // if it is in a state greater than the current one, that's the actual current launch time
    if (ops.currentVessel.CraftData.pastEvent && ops.currentVessel.LaunchTimes.length > 1) {
      for (i=ops.currentVessel.LaunchTimes.length-1; i>=0; i--) {
        if (ops.currentVessel.LaunchTimes[i].UT <= currUT() && ops.currentVessel.LaunchTimes[i].UT > ops.currentVessel.CraftData.UT) {
          if (ops.currentVessel.LaunchTimes[i].LaunchTime == ops.currentVessel.LaunchTimes[i].UT) {
            noMET = true;
            strTip = "Launch has been scrubbed or put on hold<br>Actual Launch Time: To Be Determined<br>";
          } else {
            strTip = "Actual Launch Time: " + UTtoDateTime(ops.currentVessel.LaunchTimes[i].LaunchTime) + " UTC<br>";
          }
          launchTime = ops.currentVessel.LaunchTimes[i].LaunchTime
          break;
        }
      }
    }
    
    if (!noMET) {

      // add further details based on mission status
      // mission hasn't started yet
      if (launchTime && currUT() < launchTime) {
        strTip += "Time to Launch: <span data='" + launchTime + "' id='metCount'>" + formatTime(launchTime-currUT()) + "</span>";
        
      // mission is ongoing
      } else if (launchTime && !isMissionEnded()) {
        strTip += "Mission Elapsed Time: <span data='" + launchTime + "' id='metCount'>" + formatTime(currUT()-launchTime) + "</span>";
        
      // mission has ended
      } else if (launchTime && isMissionEnded()) {
        strTip += getMissionEndMsg() + "<br>Mission Total Elapsed Time: <span id='metCount'>" + formatTime(getMissionEndTime()-launchTime) + "</span>";
      }
    }
  }
  $("#dataField0").html(strHTML);
  $("#metTip").html(strTip);
}

function vesselVelocityUpdate(update) {
  if (ops.currentVessel.Orbit && ops.currentVessel.Orbit.AvgVelocity) {
    var formattedAvgVel = numeral(ops.currentVessel.Orbit.VelocityPe).add(ops.currentVessel.Orbit.VelocityAp).divide(2).format('0.000');
    var strTip = "<span id='avgVelUpdate'>Periapsis: " + numeral(ops.currentVessel.Orbit.VelocityPe).format('0.000') + "km/s<br>Apoapsis: " + numeral(ops.currentVessel.Orbit.VelocityAp).format('0.000') + "km/s</span>";
    var strHTML = "<b><u><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'avgVelTip'\">Average Velocity:</u></b> " + formattedAvgVel + "km/s";
    $("#avgVelTip").html(strTip);
    $("#dataField1").html(strHTML);
    $("#dataField1").fadeIn();
    if (addChangeIndicator("#dataField1", ops.currentVessel.Catalog.DB, "Orbit_AvgVelocity", formattedAvgVel) && update) flashUpdate("#dataField1", "#77C6FF", "#FFF");
  } else $("#dataField1").fadeOut();
}

function vesselPeUpdate(update) {
  if (ops.currentVessel.Orbit && ops.currentVessel.Orbit.Periapsis) {
    var formattedValue = numeral(ops.currentVessel.Orbit.Periapsis).format('0,0.000');
    var strHTML = "<b>Periapsis:</b> " + formattedValue + "km";
    $("#dataField2").html(strHTML);
    $("#dataField2").fadeIn();
    if (addChangeIndicator("#dataField2", ops.currentVessel.Catalog.DB, "Orbit_Periapsis", formattedValue) && update) flashUpdate("#dataField2", "#77C6FF", "#FFF");
  } else $("#dataField2").fadeOut();
}

function vesselApUpdate(update) {
  if (ops.currentVessel.Orbit && ops.currentVessel.Orbit.Apoapsis) {
    var formattedValue = numeral(ops.currentVessel.Orbit.Apoapsis).format('0,0.000');
    var strHTML = "<b>Apoapsis:</b> " + formattedValue + "km";
    $("#dataField3").html(strHTML);
    $("#dataField3").fadeIn();
    if (addChangeIndicator("#dataField3", ops.currentVessel.Catalog.DB, "Orbit_Apoapsis", formattedValue) && update) flashUpdate("#dataField3", "#77C6FF", "#FFF");
  } else $("#dataField3").fadeOut();
}

function vesselEccUpdate(update) {
  if (ops.currentVessel.Orbit && ops.currentVessel.Orbit.Eccentricity) {
    var formattedValue = numeral(ops.currentVessel.Orbit.Eccentricity).format('0.000');
    var strHTML = "<b>Eccentricity:</b> " + formattedValue;
    $("#dataField4").html(strHTML);
    $("#dataField4").fadeIn();
    if (addChangeIndicator("#dataField4", ops.currentVessel.Catalog.DB, "Orbit_Eccentricity", formattedValue) && update) flashUpdate("#dataField4", "#77C6FF", "#FFF");
  } else $("#dataField4").fadeOut();
}

function vesselIncUpdate(update) {
  if (ops.currentVessel.Orbit && ops.currentVessel.Orbit.Inclination) {
    var formattedValue = numeral(ops.currentVessel.Orbit.Inclination).format('0.000');
    var strHTML = "<b>Inclination:</b> " + formattedValue + "&deg;";
    $("#dataField5").html(strHTML);
    $("#dataField5").fadeIn();
    if (addChangeIndicator("#dataField5", ops.currentVessel.Catalog.DB, "Orbit_Inclination", formattedValue) && update) flashUpdate("#dataField5", "#77C6FF", "#FFF");
  } else $("#dataField5").fadeOut();
}

function vesselPeriodUpdate(update) {
  if (ops.currentVessel.Orbit && ops.currentVessel.Orbit.OrbitalPeriod) {
    var strTip = formatTime(ops.currentVessel.Orbit.OrbitalPeriod);
    var strHTML = "<b>Orbital Period:</b> <u><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'periodTip'\">" + numeral(ops.currentVessel.Orbit.OrbitalPeriod).format('0,0.000') + "s</span></u>";
    $("#dataField6").fadeIn();

    // calculate the  number of orbits
    var numOrbits = 0;
    for (obt=0; obt<ops.currentVessel.OrbitalHistory.length-1; obt++) {

      // don't look past the current time 
      // current time is the update time if we are looking at a past event
      if (!ops.currentVessel.CraftData.pastEvent && ops.currentVessel.OrbitalHistory[obt].UT > currUT()) break;
      if (ops.currentVessel.CraftData.pastEvent && ops.currentVessel.OrbitalHistory[obt].UT > ops.currentVessel.CraftData.UT) break;
      
      // get the amount of time spent between the two states, or this last/only state and the current time
      // if the mission has ended then use that instead of the current time
      var timeDiff;
      var timeUntil;
      if (isMissionEnded()) timeUntil = getMissionEndTime();
      else timeUntil = currUT();
      if (ops.currentVessel.OrbitalHistory[obt+1].UT > currUT()) timeDiff = timeUntil - ops.currentVessel.OrbitalHistory[obt].UT;
      else timeDiff = ops.currentVessel.OrbitalHistory[obt+1].UT - ops.currentVessel.OrbitalHistory[obt].UT;
      
      // add the orbits done during this time
      numOrbits += timeDiff/ops.currentVessel.OrbitalHistory[obt].Period;
    }

    // if we haven't completed a single orbit yet, calculate based on the current time (or past event time) and orbital data
    if (numOrbits > 0) strTip += "<br>Number of Orbits: " + numeral(numOrbits).format('0,0.00');
    else {
      if (ops.currentVessel.CraftData.pastEvent) {
        strTip += "<br>Number of Orbits: " + numeral(ops.currentVessel.CraftData.UT).subtract(ops.currentVessel.Orbit.Eph).divide(ops.currentVessel.Orbit.OrbitalPeriod).format('0,0.00');
      } else strTip += "<br>Number of Orbits: " + numeral(currUT()).subtract(ops.currentVessel.Orbit.Eph).divide(ops.currentVessel.Orbit.OrbitalPeriod).format('0,0.00');
    }

    var formattedPeriod = numeral(ops.currentVessel.Orbit.OrbitalPeriod).format('0,0.000');
    $("#dataField6").html(strHTML);
    $("#periodTip").html(strTip);
    if (addChangeIndicator("#dataField6", ops.currentVessel.Catalog.DB, "Orbit_OrbitalPeriod", formattedPeriod) && update) flashUpdate("#dataField6", "#77C6FF", "#FFF");
  } else $("#dataField6").fadeOut();
}

function vesselCrewUpdate(update) {
  if (ops.currentVessel.Manifest && ops.currentVessel.Manifest.Crew && ops.currentVessel.Manifest.Crew.length) {
    var strHTML = "<b>Crew:</b> ";
    ops.currentVessel.Manifest.Crew.forEach(function(item) {

      // older tooltip contained more data that can now be gotten at the crew page
      // strHTML += "<img class='tipped' title='" + item.name + "<br>Boarded on: " + UTtoDateTime(item.boarded).split("@")[0] + "<br>Mission Time: " + formatTime(currUT() - item.boarded).split(",")[0] + "' style='cursor: pointer' src='http://www.kerbalspace.agency/Tracker/favicon.ico'></a>&nbsp;";
      strHTML += "<img onclick=\"swapContent('crew', '" + item.roster + "')\" class='tipped' title='" + item.name + "' style='cursor: pointer' src='http://www.kerbalspace.agency/Tracker/favicon.ico'></a>&nbsp;";
    });
    $("#dataField7").html(strHTML);
    $("#dataField7").fadeIn();
    if (addChangeIndicator("#dataField7", ops.currentVessel.Catalog.DB, "Manifest", JSON.stringify(ops.currentVessel.Manifest.Crew)) && update) flashUpdate("#dataField7", "#77C6FF", "#FFF");
  } else $("#dataField7").fadeOut();
}
  
function vesselResourcesUpdate(update) {
  if (ops.currentVessel.Resources) {
    if (ops.currentVessel.Resources.NotNull) {
      var strHTML = "<span class='tipped' style='cursor:help' title='Total &Delta;v: ";
      if (ops.currentVessel.Resources.DeltaV !== null) strHTML += numeral(ops.currentVessel.Resources.DeltaV).format('0.000') + "km/s";
      else strHTML += "N/A";
      strHTML += "<br>Total Mass: ";
      if (ops.currentVessel.Resources.TotalMass !== null) strHTML += numeral(ops.currentVessel.Resources.TotalMass).format('0,0.000') + "t";
      else strHTML += "N/A";
      strHTML += "<br>Resource Mass: ";
      if (ops.currentVessel.Resources.ResourceMass !== null) strHTML += numeral(ops.currentVessel.Resources.ResourceMass).format('0.000') + "t";
      else strHTML += "N/A";
      strHTML += "'><b><u>Resources:</u></b></span> ";
      if (ops.currentVessel.Resources.Resources) {
        strHTML += "<span id='prevRes' style='visibility: hidden; cursor: pointer; vertical-align: -1px' onclick='prevResource()'><i class='fa-solid fa-play fa-rotate-180 fa-1xs' style='color: #000000;'></i></span>";

        // template the max number of visible resource icons and then actually load them 250ms later
        for (resCount=0; resCount<5; resCount++) {
          strHTML += "<div id='resTip" + resCount + "' style='display: none'>temp</div>";
          strHTML += "<span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'resTip" + resCount + "', detach: false\">";
          strHTML += "<img id='resImg" + resCount + "' src='' style='display: none; padding-left: 1px; padding-right: 2px'></span>";
        }
        strHTML += "<span id='nextRes' style='visibility: hidden; cursor: pointer; vertical-align: -1px' onclick='nextResource()'><i class='fa-solid fa-play fa-2xs' style='color: #000000;'></i></span>";
        setTimeout(updateResourceIcons, 250, update);
      } else strHTML += "None";
      $("#dataField8").fadeIn();
      $("#dataField8").html(strHTML);
      addChangeIndicator("#dataField8", ops.currentVessel.Catalog.DB, "Resources", JSON.stringify(ops.currentVessel.Resources));

      // decide whether to display recource scroll arrows
      if (ops.currentVessel.Resources.Resources && ops.currentVessel.Resources.Resources.length > 5) $("#nextRes").css("visibility", "visible");
      else $("#prevRes").css("display", "none");

    // !NotNull means a resource record exists for this UT but is empty, so we are removing the field at this time
    } else $("#dataField8").fadeOut();
  } else $("#dataField8").fadeOut();
}

function vesselCommsUpdate(update) {
  if (ops.currentVessel.Comms) {
    if (ops.currentVessel.Comms.Comms && ops.currentVessel.Comms.Comms.length > 0) {
      strHTML = "<span class='tipped' style='cursor:help' title='";
      if (ops.currentVessel.Comms.Connection) strHTML += "Signal Delay: <0.003s";
      else strHTML += "No Connection";
      strHTML += "'><b><u>Comms:</u></b></span> ";
      ops.currentVessel.Comms.Comms.forEach(function(item) {
          var iconStr = "";
          if (item.active === true) {
            if (!ops.currentVessel.Comms.Connection) iconStr = "no";
          } else iconStr = "inactive";

          // clear up confusion by replacing Connection with Target when referencing the ground station we are intending to communicate with
          // this is so it doesn't imply a connection when status is shown as not connected via icon
          strHTML += "<img class='tipped' title='" + item.desc.replace("Connection", "Target") + "' style='cursor:help' src='images/" + iconStr + item.type + ".png'></a>&nbsp;";
        });
      $("#dataField9").html(strHTML);
      $("#dataField9").fadeIn();
      if (addChangeIndicator("#dataField9", ops.currentVessel.Catalog.DB, "Comms", JSON.stringify(ops.currentVessel.Comms.Comms)) && update) flashUpdate("#dataField9", "#77C6FF", "#FFF");

    // no data in the Comms field means a record exists for this UT but is empty, so we are removing the field at this time
    } else $("#dataField9").fadeOut(); 
  } else $("#dataField9").fadeOut();
}

function vesselRelatedUpdate(update) {
  var Related = ops.currentVessel.Catalog.Related;

  // show when Related exists and either has no UT gate or that UT gate has passed
  if (Related && (Related.ut === null || Related.ut <= currUT())) {
    var strHTML = "<b>Related Vessel:</b> <span class='fauxLink tipped' style='cursor: pointer' onclick=\"swapContent('vessel', '" + Related.db + "')\" ";
    strHTML += "title='" + Related.desc + "'>";
    strHTML += Related.name + "</span>";
    $("#dataField10").html(strHTML);
    $("#dataField10").fadeIn();
    if (addChangeIndicator("#dataField10", ops.currentVessel.Catalog.DB, "Related", JSON.stringify(Related)) && update) flashUpdate("#dataField10", "#77C6FF", "#FFF");
  } else $("#dataField10").fadeOut();
}

function vesselAddlInfoUpdate(update) {
  var AddlRes = ops.currentVessel.Catalog.AddlRes;
  if (AddlRes && AddlRes.length > 0) {

    // handle things differently if this is a past live event or not
    if (!KSA_UI_STATE.isLivePastUT) {
      var newRes;
      var strHTML = '';
      AddlRes.forEach(function(item) {
        if (item.ut < currUT()) {
          strHTML += "<span class='tipped' title='" + item.desc + "'><a target='_blank' style='color: black' href='" + item.link + "'><i class='" + AddlResourceItems[item.desc] + "'></i></a></span>&nbsp;";
        
        // if the item isn't visible yet, save the UT so we can add an update notice for it
        } else {
          if (!newRes) newRes = item.ut;
          else if (item.ut < newRes) newRes = item.ut;
        }
      });
      if (strHTML) {
        $("#dataField11").html("<b>Additional Information:</b> " + strHTML);
        $("#dataField11").fadeIn();
        if (addChangeIndicator("#dataField11", ops.currentVessel.Catalog.DB, "AddlRes", JSON.stringify(AddlRes)) && update) flashUpdate("#dataField11", "#77C6FF", "#FFF");

      // there could be data but turns out we can't show it yet
      } else $("#dataField11").fadeOut();
      if (newRes) {
        ops.updatesList.push({ type: "object", id: ops.currentVessel.Catalog.DB, UT: newRes });
        
        // resort the updatesList
        ops.updatesList.sort(function(a,b) { return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0); });
      }
    } else {

      // if the craft is inactive then show all the resources, otherwise hide them
      if (isMissionEnded()) {
        var strHTML = '';
        AddlRes.forEach(function(item) {
          strHTML += "<span class='tipped' title='" + item.desc + "'><a target='_blank' style='color: black' href='" + item.link + "'><i class='" + AddlResourceItems[item.desc] + "'></i></a></span>&nbsp;";
        });
        $("#dataField11").html("<b>Additional Information:</b> " + strHTML);
        $("#dataField11").fadeIn();
        if (addChangeIndicator("#dataField11", ops.currentVessel.Catalog.DB, "AddlRes", JSON.stringify(AddlRes)) && update) flashUpdate("#dataField11", "#77C6FF", "#FFF");
      } else $("#dataField11").fadeOut();
    }
  } else $("#dataField11").fadeOut();
}

function vesselLastUpdate(update) {

  // determine which recordset has the latest time stamp if this vessel is active and this is the current event
  var timeStamp = 0;
  if (ops.activeVessels.find(o => o.db === ops.currentVessel.Catalog.DB) && !ops.currentVessel.CraftData.pastEvent) {
    Object.entries(ops.currentVessel).forEach(function(items) {
      if (items[1] && items[1].UT && items[1].UT > timeStamp) timeStamp = items[1].UT;
    });
  }

  // otherwise just use the timestamp of the craft data
  else timeStamp = ops.currentVessel.CraftData.UT;

  $("#distanceTip").html(UTtoDateTimeLocal(timeStamp))
  if (ops.currentVessel.CraftData.DistanceTraveled) $("#distanceTip").append("<br>Current Distance Traveled: " + ops.currentVessel.CraftData.DistanceTraveled + "km");
  $("#dataField12").html("<b>Last Update:</b> <u><span class='tip-update' style='cursor:help' data-tipped-options=\"inline: 'distanceTip'\">" + UTtoDateTime(timeStamp) + " UTC</span></u>")
  $("#dataField12").fadeIn()
  if (addChangeIndicator("#dataField12", ops.currentVessel.Catalog.DB, "LastUpdate", timeStamp) && update) flashUpdate("#dataField12", "#77C6FF", "#FFF");
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
  $("#prevEventButton").button("disable");
  $("#nextEventButton").button("disable");
  
  // fill up the previous events
  ops.currentVessel.History.reverse().forEach(function(item) {
    if (item.UT < ops.currentVessel.CraftData.UT) {
      if ((ops.ascentData.active && item.UT <= checkLaunchTime()) || !ops.ascentData.active) {
        $("#prevEvent").append($('<option>', {
          value: item.UT,
          text: item.Title
        }));
        $("#prevEvent").prop("disabled", false);
        $("#prevEventButton").button("enable");
      }
    }
  });

  // fill up the next events
  ops.currentVessel.History.reverse().forEach(function(item) {

    // if this isn't a past event, we don't want the current event (equal to the current UT) to show up
    if (!ops.currentVessel.CraftData.pastEvent && item.UT > ops.currentVessel.CraftData.UT && item.UT < currUT()) {
      $("#nextEvent").append($('<option>', {
        value: item.UT,
        text: item.Title
      }));
      $("#nextEvent").prop("disabled", false);
      $("#nextEventButton").button("enable");

    // otherwise if it's a previous event we do want the most recent event in this list
    } else if (ops.currentVessel.CraftData.pastEvent && item.UT > ops.currentVessel.CraftData.UT && item.UT <= currUT()) {
      $("#nextEvent").append($('<option>', {
        value: item.UT,
        text: item.Title
      }));
      $("#nextEvent").prop("disabled", false);
      $("#nextEventButton").button("enable");
    }
  });

  // update to remove the loading text
  $("#dataLabel").html("Mission History");
  
  // check for future event
  if (ops.currentVessel.CraftData.NextEventTitle && !ops.currentVessel.CraftData.pastEvent) {
    $("#nextEvent").append($('<option>', {
      value: ops.currentVessel.CraftData.NextEventTitle,
      text: "Scheduled Event"
    }));
    $("#nextEvent").prop("disabled", false);
  }
}

// ---------------------------------------------------------------------------
// Vessel orbit figures — two-viewport Three.js scene for old-data flight content
// ---------------------------------------------------------------------------
// Shared state for the two inline orbit viewports (one scene, two cameras/renderers).
// Initialised by initVesselOrbitScene(), nulled by disposeVesselOrbitScene().
var _vof          = null;  // { sunOE, worldUp, animId, left, right } — left/right each hold { scene, sunLight, orbitGroup, nodes, renderer, labelRenderer, camera, controls, ... }
var _vofFocused   = null;  // 'left' | 'right' — which viewport currently receives keyboard input
var _vofKdHandler = null;  // stored keydown listener so it can be removed on disposal
var _vofKuHandler = null;  // stored keyup   listener so it can be removed on disposal
var _vofObtStack  = { db: null, stack: [] };  // orbit stack persisted across state changes; reset on vessel change
var _VOF_NODE_MIN_PX = 3;    // target screen-pixel radius for Pe/Ap/AN/DN node markers (tweakable)

// Tear down the vessel orbit figures completely: cancel animation, dispose GPU
// resources, remove DOM label elements, and remove keyboard listeners.
function disposeVesselOrbitScene() {
  if (!_vof) return;
  if (_vof.animId !== null) { cancelAnimationFrame(_vof.animId); _vof.animId = null; }
  ['left', 'right'].forEach(function(side) {
    var vp = _vof[side];
    if (!vp) return;
    if (vp.scene) {
      vp.scene.traverse(function(obj) {
        // CSS2DObject label elements must be removed from the DOM manually.
        if (obj.isCSS2DObject && obj.element && obj.element.parentNode) {
          obj.element.parentNode.removeChild(obj.element);
        }
        if (obj.isMesh || obj.isLine) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(function(m) { m.dispose(); });
            else obj.material.dispose();
          }
        }
      });
      vp.scene = null;
    }
    if (vp.controls) { vp.controls.dispose(); vp.controls = null; }
    if (vp.renderer) { vp.renderer.dispose(); vp.renderer = null; }
    vp.labelRenderer = null;
    vp.camera        = null;
    vp.keysDown      = {};
    vp.ctrlDown      = false;
  });
  if (_vofKdHandler) { document.removeEventListener('keydown', _vofKdHandler); _vofKdHandler = null; }
  if (_vofKuHandler) { document.removeEventListener('keyup',   _vofKuHandler); _vofKuHandler = null; }
  _vofFocused = null;
  _vof        = null;
}

// Build independent Three.js scenes for the vessel's orbit, one per viewport, rendered
// into #vesselFigLeft (+X camera, ecliptic side view) and #vesselFigRight (+Z camera, polar top-down view).
// Each viewport has its own scene so CSS2D label DOM nodes are never shared between them.
// Clicking the orbit line shows Pe/Ap/AN/DN nodes in both views; clicking again or off hides them.
// Must be called only after the two container divs are already in the DOM.
function initVesselOrbitScene(obtBody) {
  if (!THREE || !obtBody) return;
  disposeVesselOrbitScene();  // always start clean

  var orbit = ops.currentVessel && ops.currentVessel.Orbit;
  if (!orbit) return;

  var SIZE    = 475;                            // px per square viewport
  var worldUp = new THREE.Vector3(0, 0, 1);    // Z is orbital north pole

  // ── Orbital elements from the vessel's flight-data record ─────────────────
  var ecc        = parseFloat(orbit.Eccentricity) || 0;
  var sma        = (ecc >= 1) ? Math.abs(parseFloat(orbit.SMA) || 1)
                              :           parseFloat(orbit.SMA) || 1;
  var inc        = Math.radians(parseFloat(orbit.Inclination) || 0);
  var raan       = Math.radians(parseFloat(orbit.RAAN)        || 0);
  var arg        = Math.radians(parseFloat(orbit.Arg)         || 0);
  var epoch      = parseFloat(orbit.Eph)           || 0;
  var period     = parseFloat(orbit.OrbitalPeriod) || 1;

  // Camera sits 2.5 × SMA from the central body; ensure it clears large bodies.
  var cPhysR  = Math.max(parseFloat(obtBody.Radius) || 1, 1);

  // Node marker radius — same proportions as buildBodyScene().
  var nodeR = Math.max(sma * 0.0035, 1);

  var cColor        = obtBody.Color || 'ffffff';
  var cColorInt     = parseInt(cColor, 16);
  var obtStack      = _vofObtStack.stack;
  var _hasOtherStacked = obtStack.some(function(o) { return o.Eph != orbit.Eph; });
  var orbitColorInt = _hasOtherStacked ? 0xFFFFFF : 0xFFD800;
  var atmoR         = _atmoRadiusKm(obtBody);
  var soiR          = _soiRadiusKm(obtBody);
  var orbitPts      = orbitalElementsToEllipsePoints(sma, ecc, inc, raan, arg, 128, soiR);
  var nodePositions = computeNodePositions(sma, ecc, inc, raan, arg);

  // Pre-compute ellipse points and node data for each stacked orbit.
  var stackedOrbitPts = [];  // kept for the camera-fit loop
  var stackedOrbits = obtStack.map(function(so) {
    var secc  = parseFloat(so.Eccentricity) || 0;
    var ssma  = (secc >= 1) ? Math.abs(parseFloat(so.SMA) || 1) : (parseFloat(so.SMA) || 1);
    var sinc  = Math.radians(parseFloat(so.Inclination) || 0);
    var sraan = Math.radians(parseFloat(so.RAAN) || 0);
    var sarg  = Math.radians(parseFloat(so.Arg)  || 0);
    var pts   = orbitalElementsToEllipsePoints(ssma, secc, sinc, sraan, sarg, 128, soiR);
    stackedOrbitPts.push(pts);
    return { pts: pts, ecc: secc, inc: sinc, nodeR: Math.max(ssma * 0.0035, 1),
             nodePositions: computeNodePositions(ssma, secc, sinc, sraan, sarg) };
  });

  // Fit both cameras so the full trajectory is visible on initial load.
  // For perspective projection a point at depth d from the camera plane and
  // perpendicular offset r requires  camDist ≥ d + r / tan(FOV/2)  to stay
  // inside the frustum.  The old approach only measured the maximum
  // perpendicular radius from the origin and ignored the depth term, which
  // under-estimated the distance for eccentric orbits whose focus (origin) is
  // far from the ellipse centre — the apoapsis side extends much further along
  // the camera axis than the periapsis side.
  //
  // Left  camera: +X axis  → depth = p.x,  screen spread = max(|p.y|,|p.z|)
  // Right camera: +Z axis  → depth = p.z,  screen spread = max(|p.x|,|p.y|)
  var _fitTanHalf = Math.tan(THREE.MathUtils.degToRad(45 / 2));
  var _needLeft = 0, _needRight = 0;
  var _allOrbitPts = [orbitPts].concat(stackedOrbitPts);
  _allOrbitPts.forEach(function(pts) {
    pts.forEach(function(p) {
      var dL = p.x + Math.max(Math.abs(p.y), Math.abs(p.z)) / _fitTanHalf;
      if (dL > _needLeft) _needLeft = dL;
      var dR = p.z + Math.max(Math.abs(p.x), Math.abs(p.y)) / _fitTanHalf;
      if (dR > _needRight) _needRight = dR;
    });
  });
  // Adaptive margin: grows with the maximum eccentricity across all displayed
  // orbits so highly eccentric / asymmetric trajectories get extra breathing
  // room while near-circular ones stay tightly framed.
  var _maxEcc = ecc;
  stackedOrbits.forEach(function(so) { if (so.ecc > _maxEcc) _maxEcc = so.ecc; });
  var _fitMargin = 1.05 + 0.15 * Math.min(_maxEcc, 0.99); // 1.05 (circular) → 1.20 (e→1)
  var camDist = Math.max(_needLeft, _needRight) * _fitMargin;
  camDist = Math.max(camDist, cPhysR * 5);  // always clear the body surface

  // ── Resolve sun orbital elements (same 3-case logic as buildBodyScene()) ──
  var vofSunOE = null;
  var kerbolData = ops.bodyCatalog.find(function(b) { return b.Body === 'Kerbol'; });
  if (obtBody.Body !== 'Kerbol') {
    var sunOrbitBody = null;
    if (kerbolData && parseInt(obtBody.Ref) === parseInt(kerbolData.ID)) {
      sunOrbitBody = obtBody;                                          // Case B: planet
    } else if (kerbolData) {
      var parentPlanet = ops.bodyCatalog.find(function(b) {
        return parseInt(b.ID) === parseInt(obtBody.Ref);
      });
      if (parentPlanet && parseInt(parentPlanet.Ref) === parseInt(kerbolData.ID)) {
        sunOrbitBody = parentPlanet;                                   // Case C: moon
      }
    }
    if (sunOrbitBody) {
      vofSunOE = {
        sma:        parseFloat(sunOrbitBody.SMA)        || 1,
        ecc:        parseFloat(sunOrbitBody.Ecc)        || 0,
        inc:        Math.radians(parseFloat(sunOrbitBody.Inc)  || 0),
        raan:       Math.radians(parseFloat(sunOrbitBody.RAAN) || 0),
        arg:        Math.radians(parseFloat(sunOrbitBody.Arg)  || 0),
        mean0:      Math.radians(parseFloat(sunOrbitBody.Mean) || 0),
        epoch:      parseFloat(sunOrbitBody.Eph)        || 0,
        meanMotion: (2 * Math.PI) / (parseFloat(sunOrbitBody.ObtPeriod) || 1)
      };
    }
  }

  // Compute the sun direction vector at the orbit epoch — fixed for the lifetime of the scene.
  function _computeInitialSunDir() {
    if (!vofSunOE) return null;
    var oe  = vofSunOE;
    var mn  = computeMeanAnomalyAtUT(oe.mean0, oe.meanMotion, epoch, oe.epoch, oe.ecc);
    var en  = solveKeplerEquation(mn, oe.ecc);
    var sp  = positionOnOrbit(oe.sma, oe.ecc, oe.inc, oe.raan, oe.arg, en);
    return new THREE.Vector3(-sp.x, -sp.y, -sp.z);
  }

  // ── Helper: build one complete self-contained scene ────────────────────────
  // Each scene has its own lights, sphere, orbit line, and node markers so that
  // CSS2DObject DOM nodes are never shared between the two CSS2DRenderers.
  function _buildVofScene() {
    var sc = new THREE.Scene();
    sc.add(new THREE.AmbientLight(0xffffff, 0.15));

    // Directional sun light (null for Kerbol system).
    var sunLight = null;
    var initDir  = _computeInitialSunDir();
    if (initDir) {
      sunLight = new THREE.DirectionalLight(0xfff5e0, 0.8);
      sunLight.position.copy(initDir);
      sc.add(sunLight);
    }

    // Central body sphere — unlit (MeshBasicMaterial) when Kerbol itself is central.
    var cSphereMat = (obtBody.Body === 'Kerbol')
      ? new THREE.MeshBasicMaterial ({ color: cColorInt })
      : new THREE.MeshLambertMaterial({ color: cColorInt });
    var cSphere = new THREE.Mesh(new THREE.SphereGeometry(cPhysR, 48, 48), cSphereMat);
    cSphere.userData.physicalRadius = cPhysR;
    cSphere.userData.segs = 48;
    sc.add(cSphere);

    // Atmosphere shell — _makeAtmoMesh already sets userData.physicalRadius and userData.segs.
    var atmoMesh = null;
    if (atmoR > 0) { atmoMesh = _makeAtmoMesh(atmoR, cColorInt); sc.add(atmoMesh); }

    // Stacked orbit lines + nodes (yellow) — drawn beneath the current orbit.
    var stackedOrbitGroups = [];
    var stackedNodes = [];
    stackedOrbits.forEach(function(so) {
      var og = _buildOrbitGroup(so.pts, 0xFFD800, atmoR, 'stackedOrbit');
      sc.add(og);
      stackedOrbitGroups.push(og);
      var sns = { _nodeR: so.nodeR };
      if (so.ecc) {
        var spenode = _makeNodeMarker(so.nodePositions.periapsis, '0099ff', so.nodeR);
        spenode.add(_makeBodyLabel('Pe', '0099ff', 0, 14));
        spenode.visible = false; sc.add(spenode); sns.pe = spenode;
        if (so.nodePositions.apoapsis) {
          var sapnode = _makeNodeMarker(so.nodePositions.apoapsis, '0099ff', so.nodeR);
          sapnode.add(_makeBodyLabel('Ap', '0099ff', 0, -14));
          sapnode.visible = false; sc.add(sapnode); sns.ap = sapnode;
        }
      }
      if (so.inc) {
        if (so.nodePositions.ascendingNode) {
          var sanode = _makeNodeMarker(so.nodePositions.ascendingNode, '33ff00', so.nodeR);
          sanode.add(_makeBodyLabel('AN', '33ff00', -14, 0));
          sanode.visible = false; sc.add(sanode); sns.an = sanode;
        }
        if (so.nodePositions.descendingNode) {
          var sdnode = _makeNodeMarker(so.nodePositions.descendingNode, '33ff00', so.nodeR);
          sdnode.add(_makeBodyLabel('DN', '33ff00', 14, 0));
          sdnode.visible = false; sc.add(sdnode); sns.dn = sdnode;
        }
      }
      stackedNodes.push(sns);
    });

    // Vessel orbit line (white when stacked orbits exist, yellow otherwise).
    var orbitGroup = _buildOrbitGroup(orbitPts, orbitColorInt, atmoR, 'vesselOrbit');
    sc.add(orbitGroup);

    // Node markers — hidden until the user clicks the orbit.
    var nodes = {};
    if (ecc) {
      var penode = _makeNodeMarker(nodePositions.periapsis, '0099ff', nodeR);
      penode.add(_makeBodyLabel('Pe', '0099ff', 0, 14));
      penode.visible = false;
      sc.add(penode);
      nodes.pe = penode;
      if (nodePositions.apoapsis) {
        var apnode = _makeNodeMarker(nodePositions.apoapsis, '0099ff', nodeR);
        apnode.add(_makeBodyLabel('Ap', '0099ff', 0, -14));
        apnode.visible = false;
        sc.add(apnode);
        nodes.ap = apnode;
      }
    }
    if (inc) {
      if (nodePositions.ascendingNode) {
        var anode = _makeNodeMarker(nodePositions.ascendingNode, '33ff00', nodeR);
        anode.add(_makeBodyLabel('AN', '33ff00', -14, 0));
        anode.visible = false;
        sc.add(anode);
        nodes.an = anode;
      }
      if (nodePositions.descendingNode) {
        var dnode = _makeNodeMarker(nodePositions.descendingNode, '33ff00', nodeR);
        dnode.add(_makeBodyLabel('DN', '33ff00', 14, 0));
        dnode.visible = false;
        sc.add(dnode);
        nodes.dn = dnode;
      }
    }

    return { scene: sc, sunLight: sunLight, orbitGroup: orbitGroup, stackedOrbitGroups: stackedOrbitGroups,
             nodes: nodes, stackedNodes: stackedNodes, sphere: cSphere, atmo: atmoMesh };
  }

  // ── Helper: build one renderer + CSS2D overlay + camera + OrbitControls ────
  function _makeViewport(containerId, sceneData, camX, camY, camZ) {
    var container = document.getElementById(containerId);
    if (!container) return null;

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(SIZE, SIZE);
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);

    var labelRend = new THREE.CSS2DRenderer();
    labelRend.setSize(SIZE, SIZE);
    labelRend.domElement.style.position      = 'absolute';
    labelRend.domElement.style.top           = '0px';
    labelRend.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRend.domElement);

    var camera = new THREE.PerspectiveCamera(45, 1, 1, 1e15);
    camera.position.set(camX, camY, camZ);
    camera.up.copy(worldUp);
    camera.lookAt(0, 0, 0);

    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.object.up.copy(worldUp);
    controls.enableDamping      = true;
    controls.dampingFactor      = 0.08;
    controls.screenSpacePanning = true;
    controls.enablePan          = true;
    controls.minPolarAngle      = 0.01;
    controls.maxPolarAngle      = Math.PI - 0.01;
    controls.minDistance        = 1;
    controls.maxDistance        = 1e14;
    controls.target.set(0, 0, 0);
    controls.update();

    var vp = {
      scene:              sceneData.scene,
      sunLight:           sceneData.sunLight,
      orbitGroup:         sceneData.orbitGroup,
      stackedOrbitGroups: sceneData.stackedOrbitGroups,
      nodes:              sceneData.nodes,
      stackedNodes:       sceneData.stackedNodes,
      sphere:             sceneData.sphere,
      atmo:               sceneData.atmo,
      renderer:           renderer,
      labelRenderer:      labelRend,
      camera:             camera,
      controls:           controls,
      camUp:              worldUp,
      keysDown:           {},
      ctrlDown:           false,
      _mouseDownPos:      { x: 0, y: 0 }
    };

    renderer.domElement.addEventListener('mousedown', function(e) {
      _vofFocused = (containerId === 'vesselFigLeft') ? 'left' : 'right';
      vp._mouseDownPos = { x: e.clientX, y: e.clientY };
    });

    return vp;
  }

  // Left:  camera on +X axis — ecliptic side view, sees inclination.
  // Right: camera near +Z axis (pole) looking down — sees the orbit's XY footprint.
  //        Nudged 0.0001 off the Z axis so worldUp (+Z) is not parallel to the view direction.
  var leftSD  = _buildVofScene();
  var rightSD = _buildVofScene();
  var leftVP  = _makeViewport('vesselFigLeft',  leftSD,  camDist,          0, 0);
  var rightVP = _makeViewport('vesselFigRight', rightSD, camDist * 0.0001, 0, camDist);
  if (!leftVP || !rightVP) { disposeVesselOrbitScene(); return; }

  // ── Corner view labels ─────────────────────────────────────────────────────
  [{ id: 'vesselFigLeft', text: 'Ecliptic View' }, { id: 'vesselFigRight', text: 'Polar View (N)' }]
    .forEach(function(cfg) {
      var c = document.getElementById(cfg.id);
      if (!c) return;
      var lbl = document.createElement('div');
      lbl.textContent = cfg.text;
      lbl.style.position    = 'absolute';
      lbl.style.bottom      = '6px';
      lbl.style.left        = '6px';
      lbl.style.color       = '#ffffff';
      lbl.style.fontSize    = '11px';
      lbl.style.pointerEvents = 'none';
      lbl.style.userSelect  = 'none';
      c.appendChild(lbl);
    });

  // ── Bottom-right rotation controls (left viewport only) ───────────────────
  var _leftFigCtr = document.getElementById('vesselFigLeft');
  if (_leftFigCtr) {
    var _makeVofCtrlBtn = function(iconClass) {
      var wrap = document.createElement('span');
      wrap.style.display    = 'inline-block';
      wrap.style.cursor     = 'pointer';
      wrap.style.padding    = '3px 4px';
      wrap.style.lineHeight = '1';
      var icon       = document.createElement('i');
      icon.className = iconClass;
      icon.style.color    = '#878787';
      icon.style.fontSize = '18px';
      wrap.appendChild(icon);
      return wrap;
    };

    var _vofBtnLeft  = _makeVofCtrlBtn('fa-solid fa-square-caret-left');
    var _vofBtnReset = _makeVofCtrlBtn('fa-solid fa-arrows-rotate');
    var _vofBtnRight = _makeVofCtrlBtn('fa-solid fa-square-caret-right');

    // Rotate left: orbit camera 90° CCW around world up (+Z axis)
    _vofBtnLeft.addEventListener('click', function() {
      if (!_vof || !_vof.left) return;
      var vp  = _vof.left;
      var off = new THREE.Vector3().subVectors(vp.camera.position, vp.controls.target);
      off.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2));
      vp.camera.position.copy(vp.controls.target).add(off);
      vp.camera.up.copy(worldUp);
      vp.camera.lookAt(vp.controls.target);
      vp.controls.update();
    });

    // Reset view: return camera to initial ecliptic position (looking from RAAN 0°, +X axis)
    _vofBtnReset.addEventListener('click', function() {
      if (!_vof || !_vof.left) return;
      var vp = _vof.left;
      vp.controls.target.set(0, 0, 0);
      vp.camera.position.set(camDist, 0, 0);
      vp.camera.up.copy(worldUp);
      vp.camera.lookAt(vp.controls.target);
      vp.controls.update();
    });

    // Rotate right: orbit camera 90° CW around world up (+Z axis)
    _vofBtnRight.addEventListener('click', function() {
      if (!_vof || !_vof.left) return;
      var vp  = _vof.left;
      var off = new THREE.Vector3().subVectors(vp.camera.position, vp.controls.target);
      off.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2));
      vp.camera.position.copy(vp.controls.target).add(off);
      vp.camera.up.copy(worldUp);
      vp.camera.lookAt(vp.controls.target);
      vp.controls.update();
    });

    var _vofCtrlRow = document.createElement('div');
    _vofCtrlRow.style.position   = 'absolute';
    _vofCtrlRow.style.bottom     = '6px';
    _vofCtrlRow.style.right      = '6px';
    _vofCtrlRow.style.display    = 'flex';
    _vofCtrlRow.style.gap        = '4px';
    _vofCtrlRow.style.alignItems = 'center';
    _vofCtrlRow.style.zIndex     = '5';
    _vofCtrlRow.appendChild(_vofBtnLeft);
    _vofCtrlRow.appendChild(_vofBtnReset);
    _vofCtrlRow.appendChild(_vofBtnRight);
    _leftFigCtr.appendChild(_vofCtrlRow);

    var _tippedOpts = { showOn: 'mouseenter', hideOn: { element: 'mouseleave' }, position: 'bottom', detach: false };
    Tipped.create(_vofBtnLeft,  'Rotate view 90\u00b0 Left',  _tippedOpts);
    Tipped.create(_vofBtnReset, 'Reset View',                  _tippedOpts);
    Tipped.create(_vofBtnRight, 'Rotate view 90\u00b0 Right', _tippedOpts);
  }

  // ── Bottom-right elevation controls (right viewport only) ─────────────────
  var _rightFigCtr = document.getElementById('vesselFigRight');
  if (_rightFigCtr) {
    var _makeVofRCtrlBtn = function(iconClass) {
      var wrap = document.createElement('span');
      wrap.style.display    = 'inline-block';
      wrap.style.cursor     = 'pointer';
      wrap.style.padding    = '3px 4px';
      wrap.style.lineHeight = '1';
      var icon       = document.createElement('i');
      icon.className = iconClass;
      icon.style.color    = '#878787';
      icon.style.fontSize = '18px';
      wrap.appendChild(icon);
      return wrap;
    };

    var _vofBtnPolarN = _makeVofRCtrlBtn('fa-solid fa-square-caret-up');
    var _vofBtnRReset = _makeVofRCtrlBtn('fa-solid fa-arrows-rotate');
    var _vofBtnPolarS = _makeVofRCtrlBtn('fa-solid fa-square-caret-down');

    // Set View Polar N: move camera to near polar north, preserve current azimuthal angle.
    _vofBtnPolarN.addEventListener('click', function() {
      if (!_vof || !_vof.right) return;
      var vp  = _vof.right;
      var off = new THREE.Vector3().subVectors(vp.camera.position, vp.controls.target);
      var radius = off.length();
      var az  = Math.atan2(off.y, off.x);
      var phi = vp.controls.minPolarAngle;  // 0.01 rad — near polar north
      vp.camera.position.set(
        vp.controls.target.x + radius * Math.sin(phi) * Math.cos(az),
        vp.controls.target.y + radius * Math.sin(phi) * Math.sin(az),
        vp.controls.target.z + radius * Math.cos(phi)
      );
      vp.camera.up.copy(worldUp);
      vp.camera.lookAt(vp.controls.target);
      vp.controls.update();
    });

    // Reset View: polar north looking from RAAN 0° direction so that +X (RAAN 0°) is at screen bottom.
    _vofBtnRReset.addEventListener('click', function() {
      if (!_vof || !_vof.right) return;
      var vp = _vof.right;
      vp.controls.target.set(0, 0, 0);
      vp.camera.position.set(camDist * 0.0001, 0, camDist);  // matches initial right-viewport position
      vp.camera.up.copy(worldUp);
      vp.camera.lookAt(vp.controls.target);
      vp.controls.update();
    });

    // Set View Polar S: move camera to near polar south, preserve current azimuthal angle.
    _vofBtnPolarS.addEventListener('click', function() {
      if (!_vof || !_vof.right) return;
      var vp  = _vof.right;
      var off = new THREE.Vector3().subVectors(vp.camera.position, vp.controls.target);
      var radius = off.length();
      var az  = Math.atan2(off.y, off.x);
      var phi = vp.controls.maxPolarAngle;  // π - 0.01 rad — near polar south
      vp.camera.position.set(
        vp.controls.target.x + radius * Math.sin(phi) * Math.cos(az),
        vp.controls.target.y + radius * Math.sin(phi) * Math.sin(az),
        vp.controls.target.z + radius * Math.cos(phi)
      );
      vp.camera.up.copy(worldUp);
      vp.camera.lookAt(vp.controls.target);
      vp.controls.update();
    });

    var _vofRCtrlCol = document.createElement('div');
    _vofRCtrlCol.style.position        = 'absolute';
    _vofRCtrlCol.style.bottom          = '6px';
    _vofRCtrlCol.style.right           = '6px';
    _vofRCtrlCol.style.display         = 'flex';
    _vofRCtrlCol.style.flexDirection   = 'column';
    _vofRCtrlCol.style.gap             = '4px';
    _vofRCtrlCol.style.alignItems      = 'center';
    _vofRCtrlCol.style.zIndex          = '5';
    _vofRCtrlCol.appendChild(_vofBtnPolarN);
    _vofRCtrlCol.appendChild(_vofBtnRReset);
    _vofRCtrlCol.appendChild(_vofBtnPolarS);
    _rightFigCtr.appendChild(_vofRCtrlCol);

    var _tippedROpts = { showOn: 'mouseenter', hideOn: { element: 'mouseleave' }, position: 'left', detach: false };
    Tipped.create(_vofBtnPolarN, 'Set View Polar N', _tippedROpts);
    Tipped.create(_vofBtnRReset, 'Reset View',        _tippedROpts);
    Tipped.create(_vofBtnPolarS, 'Set View Polar S',  _tippedROpts);
  }

  // ── Top-left stack orbit button (left viewport only) ──────────────────────
  var _leftFigCtrStack = document.getElementById('vesselFigLeft');
  if (_leftFigCtrStack) {
    var _stackTippedOpts = { showOn: 'mouseenter', hideOn: { element: 'mouseleave' }, position: 'right', detach: false };
    var _isStacked = obtStack.some(function(o) { return o.Eph == orbit.Eph; });

    // Column container for the top-left buttons.
    var _topLeftCol = document.createElement('div');
    _topLeftCol.style.position      = 'absolute';
    _topLeftCol.style.top           = '4px';
    _topLeftCol.style.display       = 'flex';
    _topLeftCol.style.flexDirection = 'column';
    _topLeftCol.style.gap           = '2px';
    _topLeftCol.style.zIndex        = '5';

    var _makeTLBtn = function(iconClass) {
      var wrap = document.createElement('span');
      wrap.style.display    = 'inline-block';
      wrap.style.cursor     = 'pointer';
      wrap.style.padding    = '3px 4px';
      wrap.style.lineHeight = '1';
      var icon = document.createElement('i');
      icon.className      = iconClass;
      icon.style.color    = '#878787';
      icon.style.fontSize = '18px';
      wrap.appendChild(icon);
      return { wrap: wrap, icon: icon };
    };

    // Stack button.
    var _stackBtn  = _makeTLBtn(_isStacked ? 'fa-solid fa-square-plus' : 'fa-regular fa-square-plus');
    var _stackWrap = _stackBtn.wrap;
    var _stackIcon = _stackBtn.icon;

    _stackWrap.addEventListener('click', function() {
      var curStack = _vofObtStack.stack;
      var idx = curStack.findIndex(function(o) { return o.Eph == orbit.Eph; });
      if (idx === -1) {
        curStack.push(Object.assign({}, orbit));
        _stackIcon.className = 'fa-solid fa-square-plus';
        Tipped.remove(_stackWrap);
        Tipped.create(_stackWrap, 'Unstack Orbit', _stackTippedOpts);
      } else {
        curStack.splice(idx, 1);
        _stackIcon.className = 'fa-regular fa-square-plus';
        Tipped.remove(_stackWrap);
        Tipped.create(_stackWrap, 'Stack Orbit', _stackTippedOpts);
      }
      _syncEyeVisibility();
    });
    Tipped.create(_stackWrap, _isStacked ? 'Unstack Orbit' : 'Stack Orbit', _stackTippedOpts);

    // Hide/show stack button.
    var _eyeBtn  = _makeTLBtn('fa-solid fa-eye');
    var _eyeWrap = _eyeBtn.wrap;
    var _eyeIcon = _eyeBtn.icon;
    var _stackHidden = false;

    // Show the eye button only when there are stacked orbits other than the current one.
    function _syncEyeVisibility() {
      var hasOther = _vofObtStack.stack.some(function(o) { return o.Eph != orbit.Eph; });
      _eyeWrap.style.display = hasOther ? 'inline-block' : 'none';
    }
    _syncEyeVisibility();

    _eyeWrap.addEventListener('click', function() {
      _stackHidden = !_stackHidden;
      [leftVP, rightVP].forEach(function(vp) {
        // Toggle stacked orbit line visibility.
        vp.stackedOrbitGroups.forEach(function(og) { og.visible = !_stackHidden; });
        // Hide all nodes when hiding the stack; they'll be re-shown if user clicks an orbit again.
        if (_stackHidden) {
          Object.keys(vp.nodes).forEach(function(k) { _setVisible(vp.nodes[k], false); });
          vp.stackedNodes.forEach(function(sns) {
            Object.keys(sns).forEach(function(k) { if (k !== '_nodeR') _setVisible(sns[k], false); });
          });
        }
        // Current orbit color: yellow when stack hidden (sole orbit), white when stack visible.
        var currentColor = _stackHidden ? 0xFFD800 : 0xFFFFFF;
        vp.orbitGroup.children.forEach(function(child) {
          if (child.material) child.material.color.setHex(currentColor);
        });
      });
      if (_stackHidden) {
        _activeNodeIdx = null;
        _eyeIcon.className = 'fa-solid fa-eye-slash';
        Tipped.remove(_eyeWrap);
        Tipped.create(_eyeWrap, 'Show Stack', _stackTippedOpts);
      } else {
        _eyeIcon.className = 'fa-solid fa-eye';
        Tipped.remove(_eyeWrap);
        Tipped.create(_eyeWrap, 'Hide Stack', _stackTippedOpts);
      }
    });
    Tipped.create(_eyeWrap, 'Hide Stack', _stackTippedOpts);

    // Clear stacks button.
    var _clearBtn  = _makeTLBtn('fa-solid fa-trash');
    var _clearWrap = _clearBtn.wrap;

    _clearWrap.addEventListener('click', function() {
      _vofObtStack.stack = [];
      _stackHidden = false;
      _eyeIcon.className = 'fa-solid fa-eye';
      Tipped.remove(_eyeWrap);
      Tipped.create(_eyeWrap, 'Hide Stack', _stackTippedOpts);

      // Dispose a scene object's GPU resources and DOM labels, then remove it.
      function _disposeAndRemove(obj, sc) {
        obj.traverse(function(child) {
          if (child.isCSS2DObject && child.element && child.element.parentNode) {
            child.element.parentNode.removeChild(child.element);
          }
          if (child.isMesh || child.isLine) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach(function(m) { m.dispose(); });
              else child.material.dispose();
            }
          }
        });
        sc.remove(obj);
      }

      [leftVP, rightVP].forEach(function(vp) {
        vp.stackedOrbitGroups.forEach(function(og) { _disposeAndRemove(og, vp.scene); });
        vp.stackedOrbitGroups = [];
        vp.stackedNodes.forEach(function(sns) {
          Object.keys(sns).forEach(function(k) { if (k !== '_nodeR' && sns[k]) _disposeAndRemove(sns[k], vp.scene); });
        });
        vp.stackedNodes = [];
        // Restore current orbit color to yellow.
        vp.orbitGroup.children.forEach(function(child) {
          if (child.material) child.material.color.setHex(0xFFD800);
        });
      });

      // Hide any visible nodes and reset tracking.
      _activeNodeIdx = null;
      _hideAllNodes();

      // Reset stack button state.
      _stackIcon.className = 'fa-regular fa-square-plus';
      Tipped.remove(_stackWrap);
      Tipped.create(_stackWrap, 'Stack Orbit', _stackTippedOpts);
      _syncEyeVisibility();
    });
    Tipped.create(_clearWrap, 'Clear Stacks', _stackTippedOpts);

    _topLeftCol.appendChild(_stackWrap);
    _topLeftCol.appendChild(_eyeWrap);
    _topLeftCol.appendChild(_clearWrap);
    _leftFigCtrStack.appendChild(_topLeftCol);
  }

  // ── Node visibility — one orbit's nodes shown at a time ──────────────────
  // _activeNodeIdx: null = all hidden, -1 = current orbit, 0..n-1 = stacked index.
  var _activeNodeIdx = null;
  function _hideAllNodes() {
    [leftVP, rightVP].forEach(function(vp) {
      Object.keys(vp.nodes).forEach(function(k) { _setVisible(vp.nodes[k], false); });
      vp.stackedNodes.forEach(function(sns) {
        Object.keys(sns).forEach(function(k) { if (k !== '_nodeR') _setVisible(sns[k], false); });
      });
    });
  }
  function _showNodesForIdx(idx) {
    _hideAllNodes();
    _activeNodeIdx = idx;
    if (idx === null) return;
    [leftVP, rightVP].forEach(function(vp) {
      var ns = (idx === -1) ? vp.nodes : vp.stackedNodes[idx];
      if (ns) Object.keys(ns).forEach(function(k) { if (k !== '_nodeR') _setVisible(ns[k], true); });
    });
  }

  // ── Click detection — raycast against current and all stacked orbit lines ──
  // Ignores drag events (mousedown displaced > 4 px from click release).
  function _makeClickHandler(vp) {
    var raycaster = new THREE.Raycaster();
    raycaster.params.Line = { threshold: nodeR * 3 };
    return function(e) {
      if (!_vof) return;
      var dx = e.clientX - vp._mouseDownPos.x;
      var dy = e.clientY - vp._mouseDownPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 4) return;  // was a drag, not a click
      var rect = vp.renderer.domElement.getBoundingClientRect();
      var ndcX = ((e.clientX - rect.left)  / SIZE) * 2 - 1;
      var ndcY = -((e.clientY - rect.top)  / SIZE) * 2 + 1;
      raycaster.setFromCamera({ x: ndcX, y: ndcY }, vp.camera);
      // Check current orbit.
      if (raycaster.intersectObjects(vp.orbitGroup.children, false).length > 0) {
        _showNodesForIdx(_activeNodeIdx === -1 ? null : -1);
        return;
      }
      // Check each stacked orbit.
      for (var i = 0; i < vp.stackedOrbitGroups.length; i++) {
        if (raycaster.intersectObjects(vp.stackedOrbitGroups[i].children, false).length > 0) {
          _showNodesForIdx(_activeNodeIdx === i ? null : i);
          return;
        }
      }
      // Clicked off all orbits: hide nodes.
      _showNodesForIdx(null);
    };
  }
  leftVP.renderer.domElement.addEventListener('click',  _makeClickHandler(leftVP));
  rightVP.renderer.domElement.addEventListener('click', _makeClickHandler(rightVP));

  // ── Keyboard controls — arrow keys navigate the focused viewport ───────────
  _vofKdHandler = function(e) {
    if (e.key === 'Control') {
      if (leftVP)  leftVP.ctrlDown  = true;
      if (rightVP) rightVP.ctrlDown = true;
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
        e.key === 'ArrowUp'   || e.key === 'ArrowDown') {
      var tag = (e.target.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      var focused = (_vofFocused === 'right') ? rightVP : leftVP;
      if (focused) focused.keysDown[e.key] = true;
      if (_vofFocused !== null) e.preventDefault();
    }
  };
  _vofKuHandler = function(e) {
    if (e.key === 'Control') {
      if (leftVP)  leftVP.ctrlDown  = false;
      if (rightVP) rightVP.ctrlDown = false;
      return;
    }
    if (leftVP)  delete leftVP.keysDown[e.key];
    if (rightVP) delete rightVP.keysDown[e.key];
  };
  document.addEventListener('keydown', _vofKdHandler);
  document.addEventListener('keyup',   _vofKuHandler);

  // ── Persist state ──────────────────────────────────────────────────────────
  _vof = {
    worldUp: worldUp,
    animId:  null,
    left:    leftVP,
    right:   rightVP
  };

  // ── Per-frame helpers ──────────────────────────────────────────────────────

  // Apply keyboard camera navigation — identical logic to _applyKeyNavigation() in ksaBodyOps.js.
  function _applyVofKeyNav(vp) {
    if (!vp || !vp.camera || !vp.controls) return;
    if (!vp.keysDown.ArrowLeft && !vp.keysDown.ArrowRight &&
        !vp.keysDown.ArrowUp   && !vp.keysDown.ArrowDown) return;

    var offset = new THREE.Vector3().subVectors(vp.camera.position, vp.controls.target);
    var radius = offset.length();
    if (radius === 0) return;

    if (vp.ctrlDown) {
      if (vp.keysDown.ArrowLeft || vp.keysDown.ArrowRight) {
        var right_v  = new THREE.Vector3().setFromMatrixColumn(vp.camera.matrix, 0);
        var panDelta = (vp.keysDown.ArrowLeft ? -1 : 1) * radius * 0.01;
        var panVec   = right_v.multiplyScalar(panDelta);
        vp.camera.position.add(panVec);
        vp.controls.target.add(panVec);
      }
      if (vp.keysDown.ArrowUp || vp.keysDown.ArrowDown) {
        var ZOOM_STEP  = 0.05;
        var zoomFactor = vp.keysDown.ArrowUp ? 1 - ZOOM_STEP : 1 + ZOOM_STEP;
        var newRadius  = THREE.MathUtils.clamp(radius * zoomFactor,
          vp.controls.minDistance, vp.controls.maxDistance);
        offset.setLength(newRadius);
        vp.camera.position.copy(vp.controls.target).add(offset);
      }
    } else {
      var SPEED = 0.02;
      if (vp.keysDown.ArrowLeft || vp.keysDown.ArrowRight) {
        var yawDelta = (vp.keysDown.ArrowLeft ? -1 : 1) * SPEED;
        offset.applyQuaternion(
          new THREE.Quaternion().setFromAxisAngle(vp.camUp, yawDelta)
        );
      }
      if (vp.keysDown.ArrowUp || vp.keysDown.ArrowDown) {
        var currPhi    = Math.acos(THREE.MathUtils.clamp(offset.z / radius, -1, 1));
        var pitchDelta = (vp.keysDown.ArrowUp ? -1 : 1) * SPEED;
        var newPhi     = THREE.MathUtils.clamp(currPhi + pitchDelta,
          vp.controls.minPolarAngle, vp.controls.maxPolarAngle);
        var dPhi       = newPhi - currPhi;
        if (Math.abs(dPhi) > 1e-9) {
          var pitchAxis = new THREE.Vector3().crossVectors(vp.camUp, offset).normalize();
          offset.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(pitchAxis, dPhi));
        }
      }
      vp.camera.position.copy(vp.controls.target).add(offset);
    }
    vp.camera.up.copy(vp.camUp);
    vp.camera.lookAt(vp.controls.target);
  }

  // ── Per-frame node scaling ─────────────────────────────────────────────────
  // Keeps Pe/Ap/AN/DN markers at a constant _VOF_NODE_MIN_PX apparent size in
  // each viewport regardless of zoom level (mirrors _updateBodySphereScales in
  // ksaBodyOps.js). Each viewport is computed independently because cameras can
  // be at different distances after independent orbit-control interaction.
  var _tanHalfFov = Math.tan(THREE.MathUtils.degToRad(45 / 2));
  function _updateVofNodeScales() {
    ['left', 'right'].forEach(function(side) {
      var vp = _vof[side];
      if (!vp || !vp.camera || !vp.controls) return;
      var camDist = vp.camera.position.distanceTo(vp.controls.target);
      if (camDist <= 0) return;
      var worldPerPx = (2 * camDist * _tanHalfFov) / SIZE;
      var scale = _VOF_NODE_MIN_PX * worldPerPx / nodeR;
      var ns = vp.nodes;
      Object.keys(ns).forEach(function(k) { if (ns[k]) ns[k].scale.setScalar(scale); });
      vp.stackedNodes.forEach(function(sns) {
        var sscale = _VOF_NODE_MIN_PX * worldPerPx / sns._nodeR;
        Object.keys(sns).forEach(function(k) { if (k !== '_nodeR' && sns[k]) sns[k].scale.setScalar(sscale); });
      });
    });
  }

  // ── Per-frame LOD: sphere geometry, adaptive body scale, adaptive dash sizes ──
  // Mirrors the three-stage logic of _updateBodySphereScales() in ksaBodyOps.js.
  // Each viewport is updated independently so independent zooming works correctly.
  function _updateVofLOD() {
    ['left', 'right'].forEach(function(side) {
      var vp = _vof[side];
      if (!vp || !vp.camera || !vp.controls) return;
      var cd = vp.camera.position.distanceTo(vp.controls.target);
      if (cd <= 0) return;
      var wpp = (2 * cd * _tanHalfFov) / SIZE;  // world units per pixel

      // Sphere and atmosphere geometry LOD (segment-count tiers).
      if (vp.sphere) {
        var dispR = cPhysR * vp.sphere.scale.x;
        _lod_updateSphereGeometry(vp.sphere, cPhysR, dispR / wpp);
      }
      if (vp.atmo) {
        _lod_updateSphereGeometry(vp.atmo, atmoR, atmoR / wpp);
      }

      // Adaptive dash scaling on inside-atmosphere orbit segments.
      if (vp.orbitGroup && vp.orbitGroup.userData.atmoR > 0 && vp.sphere) {
        var appPx = (cPhysR * vp.sphere.scale.x) / wpp;
        var dashMult = (appPx > _ATMO_DASH_PX_THRESHOLD)
          ? Math.pow(_ATMO_DASH_PX_THRESHOLD / appPx, _ATMO_DASH_SCALE_DECAY)
          : 1.0;
        var newDash = _ATMO_DASH_KM * dashMult;
        vp.orbitGroup.children.forEach(function(child) {
          if (child.material && child.material.isLineDashedMaterial) {
            child.material.dashSize = newDash;
            child.material.gapSize  = newDash * 0.5;
          }
        });
      }
    });
  }

  // ── Animation loop ─────────────────────────────────────────────────────────
  function _vofAnimate() {
    if (!_vof) return;
    _vof.animId = requestAnimationFrame(_vofAnimate);

    _vof.left.controls.update();
    _vof.right.controls.update();

    var focused = (_vofFocused === 'right') ? _vof.right : _vof.left;
    _applyVofKeyNav(focused);

    _updateVofNodeScales();
    _updateVofLOD();

    _vof.left.renderer.render(_vof.left.scene, _vof.left.camera);
    _vof.left.labelRenderer.render(_vof.left.scene, _vof.left.camera);
    _vof.right.renderer.render(_vof.right.scene, _vof.right.camera);
    _vof.right.labelRenderer.render(_vof.right.scene, _vof.right.camera);
  }
  _vofAnimate();
}

function vesselContentUpdate(update) {

  // this is for when calling to see if dynamic orbit data was loaded when a surface update was triggered
  var bMapShown = false;

  // we can't know whether this body has a surface map if we are still waiting for map data to load
  // since map data is called after scene load, make sure that's not happening either
  // finally, ops data could still be loading as well
  if (!KSA_UI_STATE.is3JSLoaded || ops.surface.isLoading || ops.updateData.find(o => o.isLoading === true)) {
    return setTimeout(vesselContentUpdate, 50, update);
  }

  // skip content update if ascent is already active - ascent setup handles the map view
  if (ops.ascentData.active) {
    return;
  }

  // decide what kind of content we have to deal with
  // pre-launch/static data event. 
  if (ops.currentVessel.CraftData.Content.type === "map") {
    
    // Don't need to update unless content is not the same
    if (!ops.currentVessel.CraftData.prevContent || (ops.currentVessel.CraftData.prevContent && ops.currentVessel.CraftData.prevContent != JSON.stringify(ops.currentVessel.CraftData.Content))) {
      showMap();
      
      // remove any previous markers and surface plots
      if (KSA_MAP_CONTROLS.launchsiteMarker) ops.surface.map.removeLayer(KSA_MAP_CONTROLS.launchsiteMarker);
      if (KSA_MAP_CONTROLS.vesselMarker) ops.surface.map.removeLayer(KSA_MAP_CONTROLS.vesselMarker);
      if (KSA_MAP_CONTROLS.vesselHorizon.vessel) KSA_LAYERS.groundMarkers.layerGroundStations.removeLayer(KSA_MAP_CONTROLS.vesselHorizon.vessel); 
      KSA_MAP_CONTROLS.vesselHorizon.vessel = null;
      KSA_MAP_CONTROLS.launchsiteMarker = null;
      clearSurfacePlots();

      // extract the data
      var mapContent = ops.currentVessel.CraftData.Content;
    
      // these elements should only appear on general surface maps
      if (KSA_LAYERS.groundMarkers.layerPins) {
        ops.surface.map.removeLayer(KSA_LAYERS.groundMarkers.layerPins);
        ops.surface.layerControl.removeLayer(KSA_LAYERS.groundMarkers.layerPins); 
      }
      
      // set launchsite icon
      launchsiteIcon = L.icon({ popupAnchor: [0, -43], iconUrl: 'images/markers-spacecenter.png', iconSize: [30, 40], iconAnchor: [15, 40], shadowUrl: 'images/markers-shadow.png', shadowSize: [35, 16], shadowAnchor: [10, 12] });
      
      // decide if this is still pre-launch or not
      var strLaunchIconCaption = "<b>Launch Location</b><br>"
      if (ops.currentVessel.CraftData.MissionStartTerm != "Launch") strLaunchIconCaption = "";
      
      // if launch is in progress and there's an altitude to report, include it
      var launchAltitude = "";
      if (mapContent.alt) {
        launchAltitude = "<br>" + mapContent.alt + "km ASL";

        // add a horizon circle at the marker location
        KSA_MAP_CONTROLS.vesselHorizon.vessel = addHorizonCircle([mapContent.lat, mapContent.lng], parseFloat(mapContent.alt) * 1000);
        KSA_LAYERS.groundMarkers.layerGroundStations.addLayer(KSA_MAP_CONTROLS.vesselHorizon.vessel);
      }

      // place the marker and build the information window for it, then center the map on it and create a popup for it
      KSA_MAP_CONTROLS.launchsiteMarker = L.marker([mapContent.lat, mapContent.lng], {icon: launchsiteIcon}).addTo(ops.surface.map);
      KSA_MAP_CONTROLS.launchsiteMarker.bindPopup(strLaunchIconCaption + mapContent.text + launchAltitude + "<br>[" + numeral(mapContent.lat).format('0.0000') + "&deg;" + getLatLngCompass(KSA_MAP_CONTROLS.launchsiteMarker.getLatLng()).lat + ", " + numeral(mapContent.lng).format('0.0000') + "&deg;" + getLatLngCompass(KSA_MAP_CONTROLS.launchsiteMarker.getLatLng()).lng + "]" , { closeOnClick: false });
      // if the marker is not in view, center the map on it
      if (!ops.surface.map.getBounds().contains(KSA_MAP_CONTROLS.launchsiteMarker.getLatLng())) {
        ops.surface.map.setView(KSA_MAP_CONTROLS.launchsiteMarker.getLatLng(), ops.surface.map.getZoom());
      }
      KSA_MAP_CONTROLS.launchsiteMarker.openPopup();
      
      // close the popup after 5 seconds if this is a past event or a prelaunch state
      // make sure to reset the timeout in case the page has been loaded with new data before the 5s expire
      clearTimeout(KSA_TIMERS.mapMarkerTimeout);
      if (ops.currentVessel.CraftData.pastEvent || strLaunchIconCaption) {
        KSA_TIMERS.mapMarkerTimeout = setTimeout(function () { if (KSA_MAP_CONTROLS.launchsiteMarker) KSA_MAP_CONTROLS.launchsiteMarker.closePopup(); }, 5000);
      }
      bMapShown = true;
    }

  // dynamic map with orbital information
  // backwards compatibility retained for older DB entries
  } else if ((ops.currentVessel.CraftData.Content.type === "html" && ops.currentVessel.CraftData.Content.html.charAt(0) === "!")
             || ops.currentVessel.CraftData.Content.type === "obt") { // new DB entries use this
  
    // build the obt object if this is an older DB entry
    if (ops.currentVessel.CraftData.Content.type === "html") {
      var data = ops.currentVessel.CraftData.Content.html.split("!")[1].split("|");
      ops.currentVessel.CraftData.Content.caption = data[1].includes(".png") ? null : data[1];
      ops.currentVessel.CraftData.Content.image = data[1].includes(".png") ? null : data[0];
    }

    // only show dynamic information if this is a current state in an ongoing mission
    // also only show if there is surface data for a map & orbital data
    // NOTE: this if block was cut out completely if this were an update for some reason I can't recall why but it was reverted to allow orbit recalc on flight data updates
    if (!isMissionEnded() && !ops.currentVessel.CraftData.pastEvent && ops.surface.Data && ops.currentVessel.Orbit.Eph) {

      // remove any previous markers
      if (KSA_MAP_CONTROLS.launchsiteMarker) ops.surface.map.removeLayer(KSA_MAP_CONTROLS.launchsiteMarker);
      KSA_MAP_CONTROLS.launchsiteMarker = null;
      showMap();

      // check first if there was a paused calculation for this vessel - if so, resume it immediately
      // this takes priority over checking if existing data is plottable since the calculation is incomplete
      if (!update && KSA_CALCULATIONS.strPausedVesselCalculation == ops.currentVessel.Catalog.DB) {
        renderMapData(update);
      } else {
        var isPlottable = false;
        if (ops.currentVesselPlot && 
            ops.currentVesselPlot.obtData.length &&                                                 // a plot exists
            ops.currentVesselPlot.id == ops.currentVessel.Catalog.DB &&                             // the plot belongs to this vessel
            ops.currentVesselPlot.eph == ops.currentVessel.Orbit.Eph &&                             // the data used for the plot is still valid
            ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].endUT > currUT()  // the plot itself runs longer than the current time
            ) {
          isPlottable = true;
          if (!update) redrawVesselPlots();
        }

        // if this is not plottable or there is no previous content, we need to render new data
        if (!update && (!isPlottable || (!isPlottable && !ops.currentVessel.CraftData.prevContent))) renderMapData(update);

        // if this is an update with changed content, we need to render new trajectories
        else if (update && (ops.currentVessel.CraftData.prevContent != JSON.stringify(ops.currentVessel.CraftData.Content)) || (ops.currentVesselPlot.eph != ops.currentVessel.Orbit.Eph)) renderMapData(update);

        // no call made to renderMapData means if the dialog is open we don't need it
        else $("#mapDialog").dialog("close");
        bMapShown = true;
      }
      
    // we're looking at old orbital data
    } else {

      // no need to update unless it's not the same as before or there's no orbit
      if (!ops.currentVessel.Orbit.Eph || !ops.currentVessel.CraftData.prevContent || (ops.currentVessel.CraftData.prevContent && ops.currentVessel.CraftData.prevContent != JSON.stringify(ops.currentVessel.CraftData.Content))) {
        disposeVesselOrbitScene();
        hideMap();
        
        var newContentHTML;
        var _vofPendingBody = null;  // set when the two-viewport scene needs to be built

        // no image? render the 3JS orbit 
        if (!ops.currentVessel.CraftData.Content.image) {

          // find the orbited body for the time of this orbit
          var obtBody = getCurrrentSOIObj(ops.currentVessel.Orbit.Eph);
          if (!obtBody) {
            obtBody = ops.bodyCatalog.find(b => b.Body === "Kerbin");
            console.warn("Couldn't find SOI for orbit with epoch " + ops.currentVessel.Orbit.Eph + ", defaulting to Kerbin");
          }

          // Two-viewport Three.js orbit figures.
          // The container divs are inserted into #content first; initVesselOrbitScene()
          // appends the WebGL canvases to them after the DOM update completes.
          // Left viewport: camera on the +X axis (view across the YZ plane).
          // Right viewport: camera on the +Y axis (view across the XZ plane).
          _vofPendingBody = obtBody;
          newContentHTML =
            "<div class='fullCenter' style='display:flex;gap:6px;width:956px;height:475px;'>" +
              "<div id='vesselFigLeft'  style='width:475px;height:475px;position:relative;'></div>" +
              "<div id='vesselFigRight' style='width:475px;height:475px;position:relative;'></div>" +
            "</div>";

        // one image
        } else {
          var imgURL = imageURLFromDB("http://www.kerbalspace.agency/Tracker/images/vessels/" + encodeURIComponent(ops.currentVessel.Catalog.DB) + "/", ops.currentVessel.CraftData.Content.image);
          newContentHTML = "<img class='fullCenter contentTip' style='cursor: help' title='" + sanitizeHTML(ops.currentVessel.CraftData.Content.caption) + "' src='" + imgURL + "'>";
        }
        
        // 3JS orbit figures update in-place without a fade transition;
        // image content still uses a cross-fade when previous content is visible.
        if (_vofPendingBody) {
          $("#content").html(newContentHTML);
          initVesselOrbitScene(_vofPendingBody);
          $("#content").fadeIn();
        } else if ($("#content").is(':visible') && $("#content").html()) {
          loadHTMLWithTransition("#content", newContentHTML, function() {
            $("#content").fadeIn();
          });
        } else {
          $("#content").html(newContentHTML);
          $("#content").fadeIn();
        }
      }
    }
  
  // streaming ascent data, possibly with video
  } else if (ops.currentVessel.CraftData.Content.type === "html" && ops.currentVessel.CraftData.Content.html.charAt(0) === "~") {
  
  // just plain HTML
  } else {
    hideMap();
    $("#content").empty();
    $("#content").html(ops.currentVessel.CraftData.Content.html);
    $("#content").fadeIn();
  }

  // save the content data so next load we don't update if we don't have to
  ops.currentVessel.CraftData.prevContent = JSON.stringify(ops.currentVessel.CraftData.Content);
  $("#contentBox").spin(false);

  // create any tooltips since we will likely miss the default tip creation waiting on async data load
  // behavior of tooltips depends on the device
  if (is_touch_device()) showOpt = 'click';
  else showOpt = 'mouseenter';
  Tipped.create('.contentTip', { showOn: showOpt, hideOnClickOutside: is_touch_device(), target: 'mouse', hideOn: {element: 'mouseleave'} });
  return bMapShown;
}

// JQuery callbacks
// only handle this if the page is a vessel instead of crew
$("#infoBox").on("mouseenter", function() { 
  if (ops.pageType == "vessel" && ops.currentVessel && !ops.ascentData.active) {
    if (!$("#infoDialog").dialog("isOpen")) $("#infoTitle").html("Click Here for Additional Information");
    $("#partsImg").fadeIn();
  }
}).on("mouseleave", function() {
  if (ops.pageType == "vessel" && ops.currentVessel && !ops.ascentData.active) {
  
    // wait to give tooltips a chance to hide on mouseover before checking to see if we're actually off the image
    setTimeout(function() {
      if (!ops.currentVessel) return;
      if (!$('#infoBox').is(":hover")) {
        $("#infoTitle").html(ops.currentVessel.CraftData.CraftDescTitle);
        $("#partsImg").fadeOut();
      }
    }, 500);
  }
});

// right-click on the vessel image outputs click coords relative to the image for dot authoring
$("#infoImg").on("contextmenu", function(e) {
  var img = $("#infoImg img")[0];
  if (!img) return;
  var rect = img.getBoundingClientRect();
  var x = Math.round(e.clientX - rect.left);
  var y = Math.round(e.clientY - rect.top);
  console.log("Parts dot coords: " + x + "," + y + ",partId");
  e.preventDefault();
});

// upon selection of a new list item, take the user to that event
$("#prevEvent").on("change", function () {
  if ($("#prevEvent").val()) swapContent("vessel", ops.currentVessel.Catalog.DB, parseFloat($("#prevEvent").val()));
});
$("#nextEvent").on("change", function () {
  
  // could be a future event
  if ($("#nextEvent").val() && $("#nextEvent").val() != "Next Event(s)") { 
    if (isNaN($("#nextEvent").val())) {
      $("#siteDialog").html($("#nextEvent").val());
      $("#siteDialog").dialog("option", { title: "Scheduled Event", width: 250, buttons: [{
        text: "Close",
        click: function() { 
          $("#siteDialog").dialog("close");
        }
      }]});
      $("#siteDialog").dialog("open");
      $("#nextEvent").val("Next Event(s)");
    } else swapContent("vessel", ops.currentVessel.Catalog.DB, parseFloat($("#nextEvent").val()));
  }
});

// history paging via buttons
function prevHistoryButton() {
  if (!ops.currentVessel) return; // clicked too fast, in between data calls
  var histIndex;
  for (histIndex = ops.currentVessel.History.length-1; histIndex >= 0; histIndex--) {
    if (ops.currentVessel.History[histIndex].UT < ops.currentVessel.CraftData.UT) break;
  }
  swapContent("vessel", ops.currentVessel.Catalog.DB, ops.currentVessel.History[histIndex].UT);
  if (histIndex == 0) $("#prevEventButton").button("disable");
  $("#nextEventButton").button("enable");
}
function nextHistoryButton() {
  if (!ops.currentVessel) return; // clicked too fast, in between data calls
  var histIndex;
  for (histIndex = 0; histIndex <= ops.currentVessel.History.length; histIndex++) {
    if (ops.currentVessel.History[histIndex].UT > ops.currentVessel.CraftData.UT) break;
  }
  var timeStamp = ops.currentVessel.History[histIndex].UT;

  // not just null the button if this is the last event, but also be sure to request current information if the vessel is active
  if (histIndex == ops.currentVessel.History.length-1) {
    $("#nextEventButton").button("disable");
    if (ops.activeVessels.find(o => o.db === ops.currentVessel.Catalog.DB)) timeStamp = currUT();
  
  // otherwise if there is more history, see if the next event is in the future and if so this event we are requesting is current and should be fetched with the current time
  } else if (ops.currentVessel.History[histIndex+1].UT > currUT()) timeStamp = currUT();

  swapContent("vessel", ops.currentVessel.Catalog.DB, timeStamp);
  $("#prevEventButton").button("enable");
}

// opens the dialog box with more details - this is the same box that holds crew details, was just implemented here first
function showInfoDialog() {
  if (!$("#infoDialog").dialog("isOpen") && !ops.ascentData.active) $("#infoDialog").dialog("open")
}

// provides full details for all vessel parts, ensures the parts catalog is loaded
function assignPartInfo() {
  if (!KSA_CATALOGS.partsCatalog.length) return setTimeout(assignPartInfo, 100);
  
  Tipped.remove('.imgmap');
  
  $(".imgmap").each(function() {
    var part = KSA_CATALOGS.partsCatalog.find(o => o.Part === $(this).attr("id"));

    // behavior of tooltips depends on the device
    if (is_touch_device()) showOpt = 'click';
    else showOpt = 'mouseenter';

    // is there a title and are there multiples of this part to add to the title?
    var strPartHtml = "";
    if (part.Title) {
      strPartHtml += "<b>" + part.Title;
      if ($(this).attr("amount")) strPartHtml += " (x" + $(this).attr("amount") + ")";
      strPartHtml += "</b>";
    }
    strPartHtml += part.HTML;

    // are there notes for this part?
    if (part.Notes) {
      part.Notes.forEach(function(note) {
        var regex = new RegExp(note.pattern);
        if (ops.currentVessel.Catalog.DB.match(regex)) strPartHtml += "<b>Note:</b> " + note.text;
      });
    }
    Tipped.create("#" + part.Part, strPartHtml, { showOn: showOpt, hideOnClickOutside: is_touch_device(), offset: { x: 3, y: -3 } });
  });
}

// called only to update the vessel data after it has already been loaded initially
function updateVesselData(vessel, isNonObtUpdate = true) {

  // check if this vessel has any orbital data to update
  if (vessel.FutureData.Orbit && vessel.FutureData.Orbit.UT <= currUT() && 
      ops.bodyCatalog.find(o => o.selected === true).Body === getCurrrentSOIName()) {
    KSA_DATA_SERVICE.fetchVesselOrbitData(vessel.id, currUT(), addOrbitAJAX);
    var currObj = KSA_CATALOGS.bodyPaths.paths.find(o => o.name === vessel.id);
    currObj.isCalculated = false;
    currObj.orbit = vessel.FutureData.Orbit;
    calculateSurfaceTracks();
  }

  // perform a live data update if we are looking at the vessel in question at the moment 
  if (ops.pageType == "vessel" && ops.currentVessel.Catalog.DB == vessel.id) {

    // hide any open tooltips
    Tipped.remove('.tipped');

    // these elements should only be updated if the vessel is not undergoing an active ascent and is viewing the current record
    if (!ops.ascentData.active && !ops.currentVessel.CraftData.pastEvent) {

      // we need to retain this information
      if (ops.currentVessel.Resources) var resHTML = ops.currentVessel.Resources.resHTML;
      var prevContent = ops.currentVessel.CraftData.prevContent;

      // update the current data with the updated data and then carry out updates to individual sections
      for (var futureProp in vessel.FutureData) {
        for (var prop in ops.currentVessel) {
        
          // only update data that exists and is current for this time 
          if (futureProp == prop && vessel.FutureData[futureProp] && vessel.FutureData[futureProp].UT <= currUT()) {
            ops.currentVessel[prop] = vessel.FutureData[futureProp];
          }
        }
      }

      // restore/save the data
      if (ops.currentVessel.Resources) {
        ops.currentVessel.Resources.resHTML = resHTML;
        ops.currentVessel.Resources.resIndex = 0;
      }
      ops.currentVessel.CraftData.prevContent = prevContent;

      vesselHistoryUpdate();
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
      vesselAddlInfoUpdate(true);
      vesselMETUpdate(true);
      vesselRelatedUpdate(true);
      vesselLastUpdate(true);
      vesselContentUpdate(true);
    }

    // create the tooltips
    // behavior of tooltips depends on the device
    if (is_touch_device()) showOpt = 'click';
    else showOpt = 'mouseenter';
    Tipped.create('.tipped', { 
      showOn: showOpt, 
      hideOnClickOutside: is_touch_device(), 
      detach: false, 
      hideOn: {element: 'mouseleave'},
      onShow: onTooltipShow
    });
    Tipped.create('.tip-update', { 
      showOn: showOpt, 
      hideOnClickOutside: is_touch_device(), 
      detach: false, 
      hideOn: {element: 'mouseleave'},
      onShow: onTooltipShow
    });
  } 

  // fetch new data. Add a second just to make sure we don't get the same current data
  vessel.isLoading = true;
  KSA_DATA_SERVICE.fetchOpsData(vessel.id, currUT()+1, vessel.type, NaN, loadOpsDataAJAX, {isRealTimeUpdate: isNonObtUpdate, id: vessel.id});
}

// following functions perform extra work on properties
function getVesselImage() {
  if (!ops.currentVessel.CraftData.CraftImg) return "images/nadaOp.png";
  else return imageURLFromDB("http://www.kerbalspace.agency/Tracker/images/vessels/" + encodeURIComponent(ops.currentVessel.CraftData.DB) + "/", ops.currentVessel.CraftData.CraftImg[KSA_UI_STATE.vesselRotationIndex].normal);
}
function getPartsMap() {
  return (ops.currentVessel.CraftData.PartsMap && ops.currentVessel.CraftData.PartsMap.length) ? ops.currentVessel.CraftData.PartsMap : null;
}
function getMissionEndTime() {
  if (!ops.currentVessel.Catalog.MissionEnd) return null;
  else return ops.currentVessel.Catalog.MissionEnd.utEnd;
}
function getCurrentName() {
  if (!ops.currentVessel) return null;
  var vessel = ops.currentVessel.Catalog.Vessel;
  if (Array.isArray(vessel)) {
    var strName = vessel[0].name;
    vessel.forEach(function(entry) {
      if (entry.ut <= currUT()) strName = entry.name;
    });
    return strName;
  }
  return vessel;
}
function getCurrrentSOIRef(ut = currUT()) {
  if (!ops.currentVessel) return null;
  var soiRef = null;
  ops.currentVessel.Catalog.SOI.forEach(function(entry) {
    if (entry.ut <= ut) soiRef = entry.ref;
  });
  return parseInt(soiRef);
}
function getCurrrentSOIName(ut = currUT()) {
  return ops.bodyCatalog.find(o => o.ID === getCurrrentSOIRef(ut)).Body;
}
function getCurrrentSOIObj(ut = currUT()) {
  return ops.bodyCatalog.find(o => o.ID === getCurrrentSOIRef(ut));
}
function getMissionEndMsg() {
  if (!ops.currentVessel.Catalog.MissionEnd) return null;
  else return ops.currentVessel.Catalog.MissionEnd.text;
}
function isMissionEnded() {
  if (!ops.currentVessel.Catalog.MissionEnd) return false;
  else return ops.currentVessel.Catalog.MissionEnd.utShow <= currUT();
}

function openVesselImageLightbox(imageUrl) {
  // Use the existing tweet lightbox for vessel images
  var lightbox = document.getElementById('tweet-lightbox');
  if (!lightbox) {
    console.error('Lightbox not available');
    return;
  }
  
  var lightboxImg = document.getElementById('lightbox-image');
  var lightboxAltText = document.getElementById('lightbox-alt-text');
  var lightboxCounter = document.querySelector('.lightbox-counter');
  var prevBtn = document.querySelector('.lightbox-prev');
  var nextBtn = document.querySelector('.lightbox-next');
  var loadingIndicator = document.querySelector('.lightbox-loading');
  
  // Hide navigation buttons (single image)
  if (prevBtn) prevBtn.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'none';
  if (lightboxCounter) lightboxCounter.style.display = 'none';
  if (lightboxAltText) lightboxAltText.style.display = 'none';
  
  // Show loading indicator
  loadingIndicator.style.display = 'block';
  lightboxImg.style.display = 'none';
  
  // Extract image name and construct large image URL
  var imageName = imageUrl.split('/').pop().split('.')[0];
  var largeImageUrl = "http://www.kerbalspace.agency/tracker/images/vessel/" + imageName + "-lrg.png";
  
  // Load the image
  var imgPreload = new Image();
  imgPreload.onload = function() {
    lightboxImg.src = largeImageUrl;
    lightboxImg.style.display = 'block';
    loadingIndicator.style.display = 'none';
  };
  
  imgPreload.onerror = function() {
    loadingIndicator.textContent = 'Failed to load image';
    setTimeout(function() {
      loadingIndicator.style.display = 'none';
      loadingIndicator.textContent = 'Loading...';
    }, 2000);
  };
  
  imgPreload.src = largeImageUrl;
  
  // Show lightbox
  lightbox.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// updates the 5 resource icons in the event of a scroll
function updateResourceIcons(update) {
  if (!ops.currentVessel) return; // too fast of a page through the history due to call delay of the function
  var resourceList = ops.currentVessel.Resources.Resources;
  for (resCount=0; resCount<5; resCount++) {
    if (resCount+ops.currentVessel.Resources.resIndex == resourceList.length) break;
    $("#resImg" + resCount).attr("src", "images/" + resourceList[resCount+ops.currentVessel.Resources.resIndex].name + ".png");
    $("#resImg" + resCount).fadeIn();
    $("#resTip" + resCount).html(resourceList[resCount+ops.currentVessel.Resources.resIndex].desc);
  }
  if (update && (!ops.currentVessel.Resources.resHTML || (ops.currentVessel.Resources.resHTML && ops.currentVessel.Resources.resHTML !=  $("#dataField8").html()))) {
    flashUpdate("#dataField8", "#77C6FF", "#FFF");
  }
  ops.currentVessel.Resources.resHTML = $("#dataField8").html();
}

// scrolls resource icons left and right, re-assigning their images and captions
function prevResource() {
  $("#nextRes").css("visibility", "visible");
  ops.currentVessel.Resources.resIndex--;
  if (ops.currentVessel.Resources.resIndex == 0) $("#prevRes").css("visibility", "hidden");
  updateResourceIcons();
}
function nextResource() {
  $("#prevRes").css("visibility", "visible");
  ops.currentVessel.Resources.resIndex++;
  if (ops.currentVessel.Resources.resIndex == ops.currentVessel.Resources.Resources.length - 5) $("#nextRes").css("visibility", "hidden");
  updateResourceIcons();
}

// decides if the ascent data for this vessel needs to be loaded
// initial load of ascent data only contains two entries, the start and end times
function loadAscentData() {
  if (ops.ascentData.vessel != ops.currentVessel.Catalog.DB) {
    ops.ascentData.vessel = ops.currentVessel.Catalog.DB;
    KSA_DATA_SERVICE.fetchAscentData(ops.ascentData.vessel, loadAscentAJAX);
    $("#dataLabel").html("Loading Tlm...");
  } else setupStreamingAscent();
}

// prepares the data fields for displaying real-time ascent data
function setupStreamingAscent() {

  // Wait for map to fully initialize before setting up ascent display
  if (!ops.surface.Data || ops.surface.isLoading) {
    return setTimeout(setupStreamingAscent, 50);
  }

  ops.ascentData.active = true;
  ops.activeAscentFrame = {};
  ops.activeAscentFrame.ascentIndex = 0;
  ops.activeAscentFrame.interpCount = null;
  ops.ascentData.isPaused = ops.currentVessel.CraftData.pastEvent;

  // make sure the map is small and don't let it go large
  if (ops.pageType == "vessel") {
    lowerContent();
    KSA_MAP_CONTROLS.mapResizeButton.disable();
  }

  // kill all spinners
  $("#infoBox").spin(false);
  $("#contentBox").spin(false);

  // do not allow history paging during a live event
  if (!ops.currentVessel.CraftData.pastEvent) {
    $("#prevEvent").prop("disabled", true);
    $("#nextEvent").prop("disabled", true);
    $("#prevEventButton").button("disable");
    $("#nextEventButton").button("disable");
    $("#dataLabel").html("Live Telemetry");
  } else $("#dataLabel").html("Mission History");

  // grab default ascent FPS from cookie or null if cookies not available
  ops.activeAscentFrame.FPS = null;
  if (checkCookies() && localStorage.getItem("ksaOps_ascentFPS")) ops.activeAscentFrame.FPS = parseInt(localStorage.getItem("ksaOps_ascentFPS"));

  // MET/countdown display
  // we do things differently if this is a past event
  if (ops.currentVessel.CraftData.pastEvent) {
    $("#dataField0").html("<b id='metCaption'>Launch in:</b> <span id='met'>" + formatTime(checkLaunchTime()-ops.ascentData.telemetry[0].UT) + "</span>");
    $("#dataField0").fadeIn();
  }

  // things are happening NOW
  else {
    var strHTML = "<b id='metCaption'>";
    if (checkLaunchTime() >= currUT()) strHTML += "Launch in:</b> <span id='met'>" + formatTime(checkLaunchTime()-currUT());
    else strHTML += "Mission Elapsed Time:</b> <span id='met'>" + formatTime(currUT()-checkLaunchTime());
    $("#dataField0").html(strHTML + "</span>");
    $("#dataField0").fadeIn();

    // update the current ascent index if needed
    if (currUT() > ops.ascentData.telemetry[0].UT) ops.activeAscentFrame.ascentIndex = currUT() - ops.ascentData.telemetry[0].UT;
  }

  // update the info box only if this is a realtime ascent and we have already started into the telemetry
  // or if it is being loaded as a past event
  if ((!ops.currentVessel.CraftData.pastEvent && currUT() >= ops.ascentData.telemetry[0].UT) || ops.currentVessel.CraftData.pastEvent) {

    // get the craft title for this point in the telemetry
    ops.activeAscentFrame.event = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Event;

    // if there isn't one, we need to seek back and find the last update
    if (!ops.activeAscentFrame.event) {
      for (checkIndex=ops.activeAscentFrame.ascentIndex-1; checkIndex>=0; checkIndex--) {
        if (ops.ascentData.telemetry[checkIndex].Event) {
          ops.activeAscentFrame.event = ops.ascentData.telemetry[checkIndex].Event;
          break;
        }
      }
    }

    // get the craft img for this point in the telemetry
    ops.activeAscentFrame.img = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Image;

    // if there isn't one, we need to seek back and find the last update
    if (!ops.activeAscentFrame.img) {
      for (checkIndex=ops.activeAscentFrame.ascentIndex-1; checkIndex>=0; checkIndex--) {
        if (ops.ascentData.telemetry[checkIndex].Image) {
          ops.activeAscentFrame.img = ops.ascentData.telemetry[checkIndex].Image;
          break;
        }
      }
    }
    ops.activeAscentFrame.img = imageURLFromDB("http://www.kerbalspace.agency/Tracker/images/vessels/" + encodeURIComponent(ops.currentVessel.CraftData.DB) + "/", ops.activeAscentFrame.img);

    // update info box img and title
    $("#infoImg").html("<img src='" + sanitizeHTML(ops.activeAscentFrame.img) + "'>");
    $("#infoTitle").attr("class", "infoTitle vessel");
    $("#infoTitle").css("cursor", "auto");
    $("#infoTitle").html(sanitizeHTML(ops.activeAscentFrame.event));
  
  // otherwise just update with the current status
  } else vesselInfoUpdate();

  // update the info box to let user know ascent data is available
  // if this is a past event, just close the box
  if ($("#infoDialog").dialog("isOpen")) {

    // also close the box if ascent has already begun at this time, meaning we just switched here from another vessel
    if (ops.currentVessel.CraftData.pastEvent || checkLaunchTime()-currUT() <= 0) $("#infoDialog").dialog("close")
    else {
      $("#infoDialog").html("<p>Please close the info box when you are finished reading - it will not update during ascent</p>" + $("#infoDialog").html() + "<p>Please close the info box when you are finished reading - it will not update during ascent</p>");
      $("#infoDialog").dialog("option", "title", "Launch in T-" + (checkLaunchTime()-currUT()) + "s!");
    }
  }

  // remove any part info data
  $("#partsImg").empty();

  // velocity readout
  strHTML = "<b>Velocity:</b> <span id='velocity'>";
  if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Velocity > 1000) {
    strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Velocity).divide(1000).format('0.000') + "km/s";
  } else {
    strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Velocity).format('0.000') + "m/s";
  }
  strHTML += "</span> (Throttle @ <span id='throttle'>" + numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Throttle).format('0.00') + "</span>%)";
  $("#dataField1").html(strHTML);
  $("#dataField1").fadeIn();

  // thrust readout
  strHTML = "<b>Total Thrust:</b> <span id='thrust'>" + numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Thrust).format('0.000') + "</span>kN @ <span id='twr'>";
  strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Thrust).divide(numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Mass).multiply(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Gravity).value()).format('0.000');
  $("#dataField2").html(strHTML + "</span> TWR");
  $("#dataField2").fadeIn();

  // altitude
  strHTML = "<b>Altitude:</b> <span id='altitude'>";
  if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Altitude > 1000) {
    strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Altitude).divide(1000).format('0.000') + "km";
  } else {
    strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Altitude).format('0.000') + "m";
  }
  $("#dataField3").html(strHTML + "</span>");
  $("#dataField3").fadeIn();

  // apoapsis
  strHTML = "<b>Apoapsis:</b> <span id='ap'>";
  if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Apoapsis > 1000) {
    strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Apoapsis).divide(1000).format('0.000') + "km";
  } else {
    strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Apoapsis).format('0.000') + "m";
  }
  $("#dataField4").html(strHTML + "</span>");
  $("#dataField4").fadeIn();

  // show periapsis if dynamic pressure is 0 and the rocket is into its ascent
  if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Q <= 0 && ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].UT > checkLaunchTime()) {
    strHTML = "<b id='peQcaption'>Periapsis:</b> <span id='peQ'>";
    if (Math.abs(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Periapsis) > 1000) {
      strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Periapsis).divide(1000).format('0.000') + "km";
    } else {
      strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Periapsis).format('0.000') + "m";
    }
  } else {
    strHTML = "<b id='peQcaption'>Dynamic Pressure (Q):</b> <span id='peQ'>";
    if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Q >= 1) {
      strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Q).format('0.000') + "kPa";
    } else {
      strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Q).multiply(1000).format('0.000') + "Pa";
    }
  }
  $("#dataField5").html(strHTML + "</span>");
  $("#dataField5").fadeIn();

  // inclination
  strHTML = "<b>Inclination:</b> <span id='inc'>" + numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Inclination).format('0.000');
  $("#dataField6").html(strHTML + "</span>&deg;");
  $("#dataField6").fadeIn();

  // total mass
  strHTML = "<b>Total Mass:</b> <span id='mass'>";
  if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Mass >= 1) {
    strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Mass).format('0.000') + "t";
  } else {
    strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Mass).multiply(1000).format('0.000') + "kg";
  }
  $("#dataField7").html(strHTML + "</span>");
  $("#dataField7").fadeIn();
  
  // stage fuel
  if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].StageFuel) {
    var percent = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].StageFuel*100;
    var Gwidth = 202 * ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].StageFuel;
    var Rwidth = 202 - Gwidth;
    strHTML = "<b>Stage Fuel: </b>";
    strHTML += "<span id='stageFuel' style='position: absolute; z-index: 120; margin-left: 80px;'>" + numeral(percent).format('0.00') + "%</span>";
    strHTML += "<img id='stageGreen' src='http://www.kerbalspace.agency/Tracker/images/stage_green.png' height='16' width='" + Gwidth + "'>";
    strHTML += "<img id='stageRed' src='http://www.kerbalspace.agency/Tracker/images/stage_red.png' height='16' width='" + Rwidth + "'>";
    $("#dataField8").html(strHTML);
    $("#dataField8").fadeIn();
  } else $("#dataField8").fadeOut();

  // total fuel
  var percent = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].TotalFuel*100;
  var Gwidth = 210 * ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].TotalFuel;
  var Rwidth = 210 - Gwidth;
  strHTML = "<b>Total Fuel: </b>";
  strHTML += "<span id='totalFuel' style='position: absolute; z-index: 120; margin-left: 80px;'>" + numeral(percent).format('0.00') + "%</span>";
  strHTML += "<img id='totalGreen' src='http://www.kerbalspace.agency/Tracker/images/stage_green.png' height='16' width='" + Gwidth + "'>";
  strHTML += "<img id='totalRed' src='http://www.kerbalspace.agency/Tracker/images/stage_red.png' height='16' width='" + Rwidth + "'>";
  $("#dataField9").html(strHTML);
  $("#dataField9").fadeIn();

  // distance downrange
  strHTML = "<b>Distance Downrange:</b> <span id='dstDownrange'>";
  if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstDownrange > 1000) {
    strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstDownrange).divide(1000).format('0.000') + "km";
  } else {
    strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstDownrange).format('0.000') + "m";
  }
  $("#dataField10").html(strHTML + "</span>");
  $("#dataField10").fadeIn();

  // distance traveled
  if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstTraveled) {
    strHTML = "<b>Distance Traveled:</b> <span id='dstTraveled'>";
    if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstTraveled > 1000) {
      strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstTraveled).divide(1000).format('0.000') + "km";
    } else {
      strHTML += numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstTraveled).format('0.000') + "m";
    }
    $("#dataField11").html(strHTML + "</span>");
    $("#dataField11").fadeIn();
  } else $("#dataField11").fadeOut();

  // AoA
  strHTML = "<b>Angle of Attack:</b> <span id='aoa'>" + numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].AoA).format('0.00') + "</span>&deg; [";
  if (!ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].AoAWarn) {
    strHTML += "<span id='aoawarn' style='color: green'>Nominal</span>]";
  } else {
    var aoaWarn = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].AoAWarn;
    strHTML += "<span id='aoawarn' style='color: " + aoaWarn.color + "'>" + aoaWarn.text + "</span>]";
  }
  $("#dataField12").html(strHTML);
  $("#dataField12").fadeIn();

  // Pitch/Roll/Heading
  strHTML = "<b>Pitch:</b> <span id='pitch'>" + numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Pitch).format('0.00') + "</span>&deg; | ";
  strHTML += "<b>Roll:</b> <span id='roll'>" + numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Roll).format('0.00') + "</span>&deg; | ";
  strHTML += "<b>Hdg:</b> <span id='hdg'>" + numeral(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Heading).format('0.00') + "</span>&deg;";
  $("#dataField13").html(strHTML);
  $("#dataField13").fadeIn();

  // if this is a past event, show playback controls
  if (ops.currentVessel.CraftData.pastEvent) {
    strHTML = "<div style='text-align:center'><span style='float:left'><span class='tipped' id='prev10s' title='Back 10s' style='visibility: hidden; cursor: pointer;' onclick='seekBack(10)'><i class='fa-solid fa-play fa-rotate-180 fa-1xs' style='color: #000000;'></i></span>&nbsp;";
    strHTML += "<span id='prev30s' style='visibility: hidden; cursor:pointer' class='tipped' title='Back 30s' onclick='seekBack(30)'><i class='fa-solid fa-backward fa-1xs' style='color: #000000;'></i></span>&nbsp;</span>";
    strHTML += "<span id='playbackCtrl' class='fauxLink' onclick='ascentPlaybackCtrl()'>Begin Playback</span>&nbsp";
    strHTML += "<span style='float:right'>&nbsp;<span id='next30s' style='cursor:pointer' class='tipped' title='Forward 30s' onclick='seekFore(30)'><i class='fa-solid fa-forward fa-1xs' style='color: #000000;'></i></span>&nbsp;";
    strHTML += "<span class='tipped' id='next10s' title='Forward 10s' style='cursor: pointer;' onclick='seekFore(10)'><i class='fa-solid fa-play fa-1xs' style='color: #000000;'></i></span></span>";
    strHTML += "<span>(<span id='playbackTime'>" + formatTime(ops.ascentData.telemetry.length-1, false, "") + "/" + formatTime(ops.ascentData.telemetry.length-1, false, "") + "</span>)</span></div>";
    $("#dataField14").html(strHTML);
    $("#dataField14").fadeIn();
  }

  // create the tooltips
  // behavior of tooltips depends on the device
  if (is_touch_device()) showOpt = 'click';
  else showOpt = 'mouseenter';
  Tipped.create('.tipped', { 
    showOn: showOpt, 
    hideOnClickOutside: is_touch_device(), 
    detach: false, 
    hideOn: {element: 'mouseleave'},
    onShow: onTooltipShow
  });

  // content area
  showMap();

  // remove any markers that might already be placed
  if (KSA_MAP_CONTROLS.launchsiteMarker) ops.surface.map.removeLayer(KSA_MAP_CONTROLS.launchsiteMarker);
  if (KSA_MAP_CONTROLS.vesselMarker) ops.surface.map.removeLayer(KSA_MAP_CONTROLS.vesselMarker);
  if (KSA_MAP_CONTROLS.vesselHorizon.vessel) KSA_LAYERS.groundMarkers.layerGroundStations.removeLayer(KSA_MAP_CONTROLS.vesselHorizon.vessel);
  KSA_MAP_CONTROLS.vesselHorizon.vessel = null;

  // place the craft marker 
  KSA_MAP_ICONS.vesselIcon = L.icon({iconUrl: 'images/button_vessel_' + currType(ops.currentVessel.Catalog.Type) + '.png', iconSize: [16, 16]});
  KSA_MAP_CONTROLS.vesselMarker = L.marker([ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Lat, ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Lon], {icon: KSA_MAP_ICONS.vesselIcon, zIndexOffset: 100, interactive: false}).addTo(ops.surface.map);
  
  // add a horizon circle at the marker location
  KSA_MAP_CONTROLS.vesselHorizon.vessel = addHorizonCircle(
    [ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Lat, ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Lon],
    ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Altitude
  );
  // Add horizon to ground station layer so it only shows when that layer is active
  KSA_LAYERS.groundMarkers.layerGroundStations.addLayer(KSA_MAP_CONTROLS.vesselHorizon.vessel);
  
  // focus in on the vessel position
  // delay to ensure map is fully shown and sized before setting view
  setTimeout(function() {
    ops.surface.map.setView(KSA_MAP_CONTROLS.vesselMarker.getLatLng(), 9);
  }, 600);

  // build surface plot up to where things are if needed
  rebuildAscentTrack();

  // get rid of the time controls during live ascent
  $("#liveControlIcons").fadeOut();
}

// have a bit of housecleaning to do
function ascentEnd(isPageSwap = false) {

  // reset cursor for info window
  $("#infoTitle").css("cursor", "pointer");

  // re-enable map controls
  if (KSA_MAP_CONTROLS.mapResizeButton) KSA_MAP_CONTROLS.mapResizeButton.enable();

  // bring back time controls if looking a past live event
  // as long as data is not still loading on initial page load
  if ($("#ksctime").html().indexOf("data load") === -1) $("#liveControlIcons").fadeIn();

  // save ascent FPS to localStorage
  if (checkCookies() && ops.activeAscentFrame.FPS) localStorage.setItem("ksaOps_ascentFPS", ops.activeAscentFrame.FPS.toString());

  // interpolation function timeout handle nulled
  if (KSA_TIMERS.ascentInterpTimeout) {
    clearTimeout(KSA_TIMERS.ascentInterpTimeout);
    KSA_TIMERS.ascentInterpTimeout = null;
  }

  // pause ascent so a return to the data has it static
  ops.ascentData.isPaused = true;

  // live event? reload the vessel to get all the history from the launch in addition to the current state
  // but not if we're leaving the vessel page (isPageSwap)
  if (!ops.currentVessel.CraftData.pastEvent && ops.ascentData.active) {

    // clear out the ascent track and vessel marker
    clearAscentTracks();
    if (KSA_MAP_CONTROLS.vesselMarker) ops.surface.map.removeLayer(KSA_MAP_CONTROLS.vesselMarker);
    if (KSA_MAP_CONTROLS.vesselHorizon.vessel) KSA_LAYERS.groundMarkers.layerGroundStations.removeLayer(KSA_MAP_CONTROLS.vesselHorizon.vessel);
    KSA_MAP_CONTROLS.vesselHorizon.vessel = null;

    // hide the fields that are now unused
    $("#dataField13").fadeOut();
    $("#dataField14").fadeOut();
    $("#dataField15").fadeOut();
    $("#dataField16").fadeOut();

    // check the vessel so switching vessels during ascent doesn't trigger a double load or reload while looking elsewhere
    // check page type so vessel load isn't triggered if not looking at the vessel page
    // skip reload if this is a page swap - we're leaving the vessel page entirely
    if (!isPageSwap && ops.ascentData.vessel == ops.currentVessel.Catalog.DB && ops.pageType == "vessel") loadVessel(ops.currentVessel.Catalog.DB, currUT())
  }
  ops.ascentData.active = false;
  ops.ascentData.vessel = null;
}

// interpolate or set the data fields during an active ascent
function updateAscentData(clamp) {

  // removing the timeout timer isn't fast enough to prevent an interpolation callback from ocurring at least once after ascent is ended, so check for ascent active
  if (!ops.ascentData.active) return;

  // can maybe get caught between switching to a past event
  if (!ops.currentVessel) return;

  // if we are clamping, just set the fields to the current ascent index
  if (clamp) {
    ops.activeAscentFrame.velocity = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Velocity;
    ops.activeAscentFrame.throttle = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Throttle;
    ops.activeAscentFrame.thrust = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Thrust;
    ops.activeAscentFrame.gravity = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Gravity;
    ops.activeAscentFrame.altitude = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Altitude;
    ops.activeAscentFrame.ap = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Apoapsis;
    ops.activeAscentFrame.q = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Q;
    ops.activeAscentFrame.pe = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Periapsis;
    ops.activeAscentFrame.inc = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Inclination;
    ops.activeAscentFrame.mass = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Mass;
    ops.activeAscentFrame.fuel = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].TotalFuel;
    ops.activeAscentFrame.dst = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstDownrange;
    ops.activeAscentFrame.aoa = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].AoA;
    ops.activeAscentFrame.pitch = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Pitch;
    ops.activeAscentFrame.roll = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Roll;
    ops.activeAscentFrame.hdg = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Heading;
    ops.activeAscentFrame.lat = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Lat;
    ops.activeAscentFrame.lon = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Lon;
    if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].StageFuel) ops.activeAscentFrame.stage = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].StageFuel;
    if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstTraveled) ops.activeAscentFrame.traveled = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstTraveled;

    // check if we have a new AoA status
    if (!ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].AoAWarn && $('#aoawarn').html() != "Nominal") {
      $('#aoawarn').html("Nominal");
      $('#aoawarn').css("color", "green");
    } else if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].AoAWarn) {
      var aoaWarn = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].AoAWarn;
      $('#aoawarn').html(aoaWarn.text);
      $('#aoawarn').css("color", aoaWarn.color);
    }

    // check for warning/errors
    if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].FieldStatus) {
      ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].FieldStatus.forEach(function(status) {
        if (status.code == "wrn") flashUpdate("#" + status.field, "#FFD800", "#FFF");
        if (status.code == "err") flashUpdate("#" + status.field, "#FF0000", "#FFF");
      });
    }

    // check if we have a new image or event
    if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Image) {
      ops.activeAscentFrame.img = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Image;
    }

    // if there isn't one and playback is paused, we need to seek back and find the last update
    else if (!ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Image && ops.ascentData.isPaused) {
      for (checkIndex=ops.activeAscentFrame.ascentIndex-1; checkIndex>=0; checkIndex--) {
        if (ops.ascentData.telemetry[checkIndex].Image) {
          ops.activeAscentFrame.img = ops.ascentData.telemetry[checkIndex].Image;
          break;
        }
      }
    }
    ops.activeAscentFrame.img = imageURLFromDB("http://www.kerbalspace.agency/Tracker/images/vessels/" + encodeURIComponent(ops.currentVessel.CraftData.DB) + "/", ops.activeAscentFrame.img);
    
    // don't bother updating the image if it is the same as what is already shown
    var existingImageSrc = $("#infoImg img").attr("src");
    if (existingImageSrc !== sanitizeHTML(ops.activeAscentFrame.img)) {
      loadImageWithTransition("#infoImg", sanitizeHTML(ops.activeAscentFrame.img));
    }

    if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Event) {
      ops.activeAscentFrame.event = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Event;
      flashUpdate("#infoTitle", "#77C6FF", "#000000");
    } else if (!ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Event && ops.ascentData.isPaused) {
      for (checkIndex=ops.activeAscentFrame.ascentIndex-1; checkIndex>=0; checkIndex--) {
        if (ops.ascentData.telemetry[checkIndex].Event) {
          ops.activeAscentFrame.event = ops.ascentData.telemetry[checkIndex].Event;
          break;
        }
      }
    }
    $("#infoTitle").html(ops.activeAscentFrame.event);
    $("#infoTitle").attr("class", "infoTitle vessel");
    $("#infoTitle").css("cursor", "auto");

    // update the surface plotting if there is one
    // otherwise redraw the plot, which won't happen until the vessel clears a box around KSC
    if (KSA_CATALOGS.ascentTracks.length) updateSurfacePlot();
    else rebuildAscentTrack();

  // otherwise, use the delta values to update towards the next clamp
  } else {
    KSA_TIMERS.interpStart = new Date().getTime();
    ops.activeAscentFrame.velocity += ops.activeAscentFrame.velocityDelta;
    ops.activeAscentFrame.throttle += ops.activeAscentFrame.throttleDelta;
    ops.activeAscentFrame.thrust += ops.activeAscentFrame.thrustDelta;
    ops.activeAscentFrame.gravity += ops.activeAscentFrame.gravityDelta;
    ops.activeAscentFrame.altitude += ops.activeAscentFrame.altitudeDelta;
    ops.activeAscentFrame.ap += ops.activeAscentFrame.apDelta;
    ops.activeAscentFrame.q += ops.activeAscentFrame.qDelta;
    ops.activeAscentFrame.pe += ops.activeAscentFrame.peDelta;
    ops.activeAscentFrame.inc += ops.activeAscentFrame.incDelta;
    ops.activeAscentFrame.mass += ops.activeAscentFrame.massDelta;
    ops.activeAscentFrame.fuel += ops.activeAscentFrame.fuelDelta;
    ops.activeAscentFrame.dst += ops.activeAscentFrame.dstDelta;
    ops.activeAscentFrame.aoa += ops.activeAscentFrame.aoaDelta;
    ops.activeAscentFrame.pitch += ops.activeAscentFrame.pitchDelta;
    ops.activeAscentFrame.roll += ops.activeAscentFrame.rollDelta;
    ops.activeAscentFrame.hdg += ops.activeAscentFrame.hdgDelta;
    ops.activeAscentFrame.lat += ops.activeAscentFrame.latDelta;
    ops.activeAscentFrame.lon += ops.activeAscentFrame.lonDelta;
    if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstTraveled) ops.activeAscentFrame.traveled += ops.activeAscentFrame.traveledDelta;
    if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].StageFuel) {

      // if the current clamp is 1 and we are supposed to increase to it, just jump there instead
      if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].StageFuel == 1 && ops.activeAscentFrame.stageDelta > 0) {
        ops.activeAscentFrame.stage = 1;

      // if the current clamp is 1 and we are supposed to decrease from it, then interpolate
      } else if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].StageFuel == 1 && ops.activeAscentFrame.stageDelta < 0) {
        ops.activeAscentFrame.stage += ops.activeAscentFrame.stageDelta;
      } else ops.activeAscentFrame.stage += ops.activeAscentFrame.stageDelta;
    }
  }

  // update all the data fields
  // velocity readout
  if (ops.activeAscentFrame.velocity > 1000) {
    $("#velocity").html((numeral(ops.activeAscentFrame.velocity).divide(1000).format('0.000')) + "km/s");
  } else {
    $("#velocity").html((numeral(ops.activeAscentFrame.velocity).format('0.000')) + "m/s");
  }
  $("#throttle").html(numeral(ops.activeAscentFrame.throttle).format('0.00'));

  // thrust readout
  if (ops.activeAscentFrame.thrust < 0 ) ops.activeAscentFrame.thrust = 0;
  $("#thrust").html(numeral(ops.activeAscentFrame.thrust).format('0.000'));
  $("#twr").html(numeral(ops.activeAscentFrame.thrust).divide(numeral(ops.activeAscentFrame.mass).multiply(ops.activeAscentFrame.gravity).value()).format('0.000'));

  // altitude
  if (ops.activeAscentFrame.altitude > 1000) {
    $("#altitude").html((numeral(ops.activeAscentFrame.altitude).divide(1000).format('0.000') + "km"));
  } else {
    $("#altitude").html((numeral(ops.activeAscentFrame.altitude).format('0.000') + "m"));
  }

  // apoapsis
  if (ops.activeAscentFrame.ap > 1000) {
    $("#ap").html((numeral(ops.activeAscentFrame.ap).divide(1000).format('0,0.000') + "km"));
  } else {
    $("#ap").html((numeral(ops.activeAscentFrame.ap).format('0.000') + "m"));
  }

  // show periapsis if dynamic pressure is 0 and the rocket is into its ascent
  if (ops.activeAscentFrame.q <= 0 && ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].UT > checkLaunchTime()) {
    $("#peQcaption").html("Periapsis:");
    if (Math.abs(ops.activeAscentFrame.pe) > 1000) {
      $("#peQ").html((numeral(ops.activeAscentFrame.pe).divide(1000).format('0.000')) + "km");
    } else {
      $("#peQ").html((numeral(ops.activeAscentFrame.pe).format('0.000')) + "m");
    }
  } else {
    $("#peQcaption").html("Dynamic Pressure (Q):");
    if (ops.activeAscentFrame.q >= 1) {
      $("#peQ").html((numeral(ops.activeAscentFrame.q).format('0.000')) + "kPa");
    } else {
      $("#peQ").html((numeral(ops.activeAscentFrame.q).multiply(1000).format('0.000')) + "Pa");
    }
  }

  // inclination
  $("#inc").html(numeral(ops.activeAscentFrame.inc).format('0.000'));

  // total mass
  if (ops.activeAscentFrame.mass >= 1) {
    $("#mass").html((numeral(ops.activeAscentFrame.mass).format('0.000')) + "t");
  } else {
    $("#mass").html((numeral(ops.activeAscentFrame.mass).multiply(1000).format('0.000')) + "kg");
  }
  
  // stage fuel
  if (ops.activeAscentFrame.stage) {
    var Gwidth = 204 * ops.activeAscentFrame.stage;
    var Rwidth = 204 - Gwidth;
    $("#stageFuel").html((numeral(ops.activeAscentFrame.stage).multiply(100).format('0.00')) + "%");
    $("#stageGreen").css("width", Gwidth);
    $("#stageRed").css("width", Rwidth);
  } 

  // total fuel
  var Gwidth = 210 * ops.activeAscentFrame.fuel;
  var Rwidth = 210 - Gwidth;
  $("#totalFuel").html((numeral(ops.activeAscentFrame.fuel).multiply(100).format('0.00')) + "%");
  $("#totalGreen").css("width", Gwidth);
  $("#totalRed").css("width", Rwidth);

  // distance downrange
  if (ops.activeAscentFrame.dst > 1000) {
    $("#dstDownrange").html((numeral(ops.activeAscentFrame.dst).divide(1000).format('0.000')) + "km");
  } else {
    $("#dstDownrange").html((numeral(ops.activeAscentFrame.dst).format('0.000')) + "m");
  }

  // distance traveled
  if (ops.activeAscentFrame.traveled) {
    if (ops.activeAscentFrame.traveled > 1000) {
      $("#dstTraveled").html((numeral(ops.activeAscentFrame.traveled).divide(1000).format('0.000')) + "km");
    } else {
      $("#dstTraveled").html((numeral(ops.activeAscentFrame.traveled).format('0.000')) + "m");
    }
  }

  // AoA
  $("#aoa").html(numeral(ops.activeAscentFrame.aoa).format('0.00'));

  // Pitch/Roll/Heading
  $("#pitch").html(numeral(ops.activeAscentFrame.pitch).format('0.00'));
  $("#roll").html(numeral(ops.activeAscentFrame.roll).format('0.00'));
  $("#hdg").html(numeral(ops.activeAscentFrame.hdg).format('0.00'));

  // adjust time remaining
  $("#playbackTime").html(formatTime(ops.ascentData.telemetry.length-ops.activeAscentFrame.ascentIndex-1, false, "") + "/" + formatTime(ops.ascentData.telemetry.length-1, false, ""));

  // move the vessel icon
  KSA_MAP_CONTROLS.vesselMarker.setLatLng([ops.activeAscentFrame.lat, ops.activeAscentFrame.lon]);

  // update the horizon circle position and radius
  if (KSA_MAP_CONTROLS.vesselHorizon.vessel) {
    KSA_MAP_CONTROLS.vesselHorizon.vessel.setLatLng([ops.activeAscentFrame.lat, ops.activeAscentFrame.lon]);
    var newRadius = calculateHorizonRadius(ops.activeAscentFrame.altitude, true);
    KSA_MAP_CONTROLS.vesselHorizon.vessel.setRadius(newRadius);
  }

  // if the vessel is outside the view but not KSC, shimmy the map over
  if (!ops.surface.map.getBounds().contains(KSA_MAP_CONTROLS.vesselMarker.getLatLng()) && ops.surface.map.getBounds().contains(KSA_LOCATIONS.srfLocations["KSC"])) {
    ops.surface.map.panInside(KSA_MAP_CONTROLS.vesselMarker.getLatLng()); 
  }

  // if the map moves off KSC, widen the view
  if (!ops.surface.map.getBounds().contains(KSA_LOCATIONS.srfLocations["KSC"])) {
    ops.surface.map.fitBounds(L.latLngBounds(KSA_LOCATIONS.srfLocations["KSC"], KSA_MAP_CONTROLS.vesselMarker.getLatLng())); 
  }

  // if we are not paused then we need to call ourselves again to keep things going
  if (!ops.ascentData.isPaused && ops.ascentData.active) {
    
    // get the time it took us to perform this function
    var diff = new Date().getTime() - KSA_TIMERS.interpStart;

    // call ourselves again at the proper FPS interval, taking into account the time we just used up
    KSA_TIMERS.ascentInterpTimeout = setTimeout(updateAscentData, (1000/ops.activeAscentFrame.FPS) - diff);
    ops.activeAscentFrame.interpCount++;
  }

  // if we are paused we're atill going to need to update the MET 
  // as well as the surface track
  else if (ops.ascentData.isPaused && ops.ascentData.active) {
    if (checkLaunchTime() > ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].UT) {
      $("#metCaption").html("Launch in:");
      $("#met").html(formatTime(checkLaunchTime()-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].UT));
    } else {
      $("#metCaption").html("Mission Elapsed Time:");
      $("#met").html(formatTime(ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].UT-checkLaunchTime()));
    }
    rebuildAscentTrack();
  }
}

function checkLaunchTime() {

  // if we are dealing with a past event, do not use the current time
  var timeCheck = currUT();
  if (ops.currentVessel.CraftData.pastEvent) timeCheck = ops.currentVessel.CraftData.UT;

  for (i=ops.currentVessel.LaunchTimes.length-1; i>=0; i--) {

    // the first record is always the original launch time, regardless of its UT
    // this assumption prevents the event calendar from getting confused if multiple launch times are posted
    if (ops.currentVessel.LaunchTimes[i].UT <= timeCheck || i == 0) {

      // make sure this is not a hold
      if (ops.currentVessel.LaunchTimes[i].LaunchTime != ops.currentVessel.LaunchTimes[i].UT) {
        return ops.currentVessel.LaunchTimes[i].LaunchTime;

      // this is a hold
      } else return null;
    }
  }
}

// buttons to seek through ascent playback
function seekFore(amount) {
  ops.activeAscentFrame.ascentIndex += amount;

  // make sure we aren't out of range
  if (ops.activeAscentFrame.ascentIndex >= ops.ascentData.telemetry.length-1) {
    ops.activeAscentFrame.ascentIndex = ops.ascentData.telemetry.length-1;

    // null the interpolation timer
    if (KSA_TIMERS.ascentInterpTimeout) {
      clearTimeout(KSA_TIMERS.ascentInterpTimeout);
      KSA_TIMERS.ascentInterpTimeout = null;
    }

    // one last surface track update
    updateSurfacePlot(ops.ascentData.telemetry.length-1);

    // hide the forward seek buttons & update control & time link
    $("#next10s").css("visibility", "hidden");
    $("#next30s").css("visibility", "hidden");
    $("#playbackCtrl").html("Reset Playback");
  }

  // if we're paused, push the update 
  // unless it's the final entry then playback is practically paused
  // wait a few millisecs for the interpolation function to cease
  if (ops.ascentData.isPaused || ops.activeAscentFrame.ascentIndex == ops.ascentData.telemetry.length-1) {
    ops.ascentData.isPaused = true;
    setTimeout(updateAscentData, 150, true);
  }

  // show the backward seek buttons
  $("#prev10s").css("visibility", "visible");
  $("#prev30s").css("visibility", "visible");
}
function seekBack(amount) {
  ops.activeAscentFrame.ascentIndex -= amount;

  // if we let the playback run to the end, we may need to reset things
  if ($("#playbackCtrl").html() == "Reset Playback") ops.ascentData.active = true;

  // make sure we aren't out of range
  if (ops.activeAscentFrame.ascentIndex <= 0) {
    ops.activeAscentFrame.ascentIndex = 0;

    // hide the backward seek buttons
    $("#prev10s").css("visibility", "hidden");
    $("#prev30s").css("visibility", "hidden");
  }

  // if we're paused, push the update 
  // don't change the control text if things are already playing
  if (ops.ascentData.isPaused) {
    updateAscentData(true);
    $("#playbackCtrl").html("Begin Playback");
  }

  // show the forward seek buttons
  $("#next10s").css("visibility", "visible");
  $("#next30s").css("visibility", "visible");
}

// action is defined by what is currently displayed in the playback control text area
function ascentPlaybackCtrl() {
  if ($("#playbackCtrl").html() == "Begin Playback") {
    ops.ascentData.isPaused = false;
    $("#playbackCtrl").html("Pause Playback");
    $("#next10s").css("visibility", "hidden");
    $("#next30s").css("visibility", "hidden");
    $("#prev10s").css("visibility", "hidden");
    $("#prev30s").css("visibility", "hidden");
  } else if ($("#playbackCtrl").html() == "Pause Playback") { 
    ops.ascentData.isPaused = true;
    $("#playbackCtrl").html("Begin Playback");
    $("#next10s").css("visibility", "visible");
    $("#next30s").css("visibility", "visible");
    $("#prev10s").css("visibility", "visible");
    $("#prev30s").css("visibility", "visible");
  } else if ($("#playbackCtrl").html() == "Reset Playback") { 
    ops.activeAscentFrame.ascentIndex = 0;
    $("#next10s").css("visibility", "visible");
    $("#next30s").css("visibility", "visible");
    $("#prev10s").css("visibility", "hidden");
    $("#prev30s").css("visibility", "hidden");
    $("#playbackCtrl").html("Begin Playback");
    clearAscentTracks();
    ops.ascentData.active = true;
    updateAscentData(true);
  }
}

// draws the ascent track and associated markers up to the current point
function rebuildAscentTrack() {
  clearAscentTracks();
  for (trackIndex = 0; trackIndex < ops.activeAscentFrame.ascentIndex; trackIndex++) {
    updateSurfacePlot(trackIndex);
  }
}

// add to the surface track and place markers as needed
function updateSurfacePlot(index) {
  if (index == null) index = ops.activeAscentFrame.ascentIndex-1;
  if (index < 0) index = 0;

  // if this is a new phase, start a new colored line
  if (ops.ascentData.telemetry[index].Phase) {

    // choose the next color and start a new line
    KSA_UI_STATE.ascentColorsIndex++;
    if (KSA_UI_STATE.ascentColorsIndex == KSA_COLORS.surfacePathColors.length) KSA_UI_STATE.ascentColorsIndex = 0;
    KSA_CATALOGS.ascentTracks.push(L.polyline([], {smoothFactor: .25, color: KSA_COLORS.surfacePathColors[KSA_UI_STATE.ascentColorsIndex], weight: 2, opacity: 1}).addTo(ops.surface.map));
    KSA_CATALOGS.ascentTracks[KSA_CATALOGS.ascentTracks.length-1].addLatLng([ops.ascentData.telemetry[index].Lat, ops.ascentData.telemetry[index].Lon]);
    KSA_CATALOGS.ascentTracks[KSA_CATALOGS.ascentTracks.length-1]._myId = "<center>" + ops.ascentData.telemetry[index].Phase + "</center>";
    KSA_CATALOGS.ascentTracks[KSA_CATALOGS.ascentTracks.length-1].on('mouseover', function(e) {
      KSA_MAP_CONTROLS.ascentPopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
      KSA_MAP_CONTROLS.ascentPopup.setLatLng(e.latlng).setContent(e.target._myId).openOn(ops.surface.map);
    });
    KSA_CATALOGS.ascentTracks[KSA_CATALOGS.ascentTracks.length-1].on('mousemove', function(e) {
      if (!KSA_MAP_CONTROLS.ascentPopup) return;
      if (getRroseDirection(ops.surface.map, e.latlng) === KSA_MAP_CONTROLS.ascentPopup.options.position) {
        KSA_MAP_CONTROLS.ascentPopup.setLatLng(e.latlng);
      } else {
        ops.surface.map.closePopup(KSA_MAP_CONTROLS.ascentPopup);
        KSA_MAP_CONTROLS.ascentPopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
        KSA_MAP_CONTROLS.ascentPopup.setLatLng(e.latlng).setContent(e.target._myId).openOn(ops.surface.map);
      }
    });
    KSA_CATALOGS.ascentTracks[KSA_CATALOGS.ascentTracks.length-1].on('mouseout', function(e) {
      if (KSA_MAP_CONTROLS.ascentPopup) { ops.surface.map.closePopup(KSA_MAP_CONTROLS.ascentPopup); }
      KSA_MAP_CONTROLS.ascentPopup = null;
    });

    // if there already existed a line, extend it to the start if the new line
    if (KSA_CATALOGS.ascentTracks.length > 1) KSA_CATALOGS.ascentTracks[KSA_CATALOGS.ascentTracks.length-2].addLatLng([ops.ascentData.telemetry[index].Lat, ops.ascentData.telemetry[index].Lon]);
  } 
  
  // if this isn't a new phase, continue the existing line
  else if (KSA_CATALOGS.ascentTracks.length) KSA_CATALOGS.ascentTracks[KSA_CATALOGS.ascentTracks.length-1].addLatLng([ops.ascentData.telemetry[index].Lat, ops.ascentData.telemetry[index].Lon]);
  // add a new marker if one exists
  if (ops.ascentData.telemetry[index].EventMark) {
    var labelIcon = L.icon({
      iconUrl: 'images/label.png',
      iconSize: [5, 5],
    });
    KSA_CATALOGS.ascentMarks.push(L.marker([ops.ascentData.telemetry[index].Lat, ops.ascentData.telemetry[index].Lon], {icon: labelIcon}).addTo(ops.surface.map));
    KSA_CATALOGS.ascentMarks[KSA_CATALOGS.ascentMarks.length-1]._myId = ops.ascentData.telemetry[index].EventMark + ";" + ops.ascentData.telemetry[index].Lat + ";" + ops.ascentData.telemetry[index].Lon;
    KSA_CATALOGS.ascentMarks[KSA_CATALOGS.ascentMarks.length-1].on('mouseover', function(e) {
      data = e.target._myId.split(";")
      KSA_MAP_CONTROLS.ascentPopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
      KSA_MAP_CONTROLS.ascentPopup.setLatLng([data[1], data[2]]).setContent("<center>" + data[0] + "</center>").openOn(ops.surface.map);
    });
    KSA_CATALOGS.ascentMarks[KSA_CATALOGS.ascentMarks.length-1].on('mouseout', function(e) {
      if (KSA_MAP_CONTROLS.ascentPopup) { ops.surface.map.closePopup(KSA_MAP_CONTROLS.ascentPopup); }
      KSA_MAP_CONTROLS.ascentPopup = null;
    });
  }
}

function clearAscentTracks() {
  if (KSA_CATALOGS.ascentTracks.length) {
    KSA_CATALOGS.ascentTracks.forEach(function(track) {
      ops.surface.map.removeLayer(track);
    });
  }
  if (KSA_CATALOGS.ascentMarks.length) {
    KSA_CATALOGS.ascentMarks.forEach(function(mark) {
      ops.surface.map.removeLayer(mark);
    });
  }
  KSA_CATALOGS.ascentTracks.length = 0;
  KSA_CATALOGS.ascentMarks.length = 0;
  KSA_UI_STATE.ascentColorsIndex = -1;
}

/**
 * Adds change indicator icon for vessel if content has changed
 * Uses initLoad and pastEvent properties to determine storage type:
 * - initLoad + pastEvent: temp storage, suppress indicators (fresh load to past event)
 * - initLoad + !pastEvent: perm storage, clear temp (fresh load to current event)
 * - !initLoad + pastEvent: temp storage (paging through history)
 * - !initLoad + !pastEvent: perm storage, copy temp->perm if needed (paged to current)
 * @param {string} elementId - jQuery selector for the element
 * @param {string} itemId - Vessel DB identifier
 * @param {string} fieldId - Field identifier for hash lookup
 * @param {*} currentContent - Current content to check against stored hash
 */
function addVesselChangeIndicator(elementId, itemId, fieldId, currentContent) {
  try {
    // Remove any existing indicator first
    $(`${elementId} .change-indicator`).remove();
    
    // Vessel logic: use initLoad and pastEvent properties to determine storage
    let usePermStorage = true;  // Default to permanent storage
    let suppressIndicator = false;  // Whether to suppress showing indicator on first temp storage creation
    
    // Override: If viewing historical data via URL parameter, always use temp storage
    if (KSA_UI_STATE.isLivePastUT) {
      usePermStorage = false;

    } else if (ops.currentVessel.initLoad) {
      if (ops.currentVessel.CraftData && ops.currentVessel.CraftData.pastEvent) {
        // Initial load of a past event - use temp storage, always suppress indicators
        // User is loading page fresh to a past event, don't show notifications
        usePermStorage = false;
        suppressIndicator = true;
      } else {
        // Initial load of current event - use permanent storage (default)
        // Clear any existing temp storage so subsequent page-backs compare fresh against perm
        const tempKey = `ksaOps_hashes_temp_${itemId}`;
        if (localStorage.getItem(tempKey)) {
          localStorage.removeItem(tempKey);
        }
      }
    } else {
      // Not initial load (paging through history) - default to temp storage
      usePermStorage = false;
      
      // If paging to current event, we need to use perm storage
      if (ops.currentVessel.CraftData && !ops.currentVessel.CraftData.pastEvent) {
        const permKey = `ksaOps_hashes_${itemId}`;
        const tempKey = `ksaOps_hashes_temp_${itemId}`;
        
        // If no perm storage exists, copy all existing temp storage to perm first
        if (!localStorage.getItem(permKey) && localStorage.getItem(tempKey)) {
          localStorage.setItem(permKey, localStorage.getItem(tempKey));
        }
        
        // Now use perm storage for this and subsequent fields
        usePermStorage = true;
      }
    }
    
    const storageKey = usePermStorage ? `ksaOps_hashes_${itemId}` : `ksaOps_hashes_temp_${itemId}`;
    const stored = localStorage.getItem(storageKey);
    const currentHash = hashContent(currentContent);
    
    // Track if we're paging from history to current event (!initLoad + !pastEvent)
    const isPagingToCurrent = !ops.currentVessel.initLoad && ops.currentVessel.CraftData && !ops.currentVessel.CraftData.pastEvent;
    
    // Helper to check if content changed against permanent storage
    // Used when: temp storage viewing past events, OR paging to current event
    const checkPermStorageForChange = () => {
      const permKey = `ksaOps_hashes_${itemId}`;
      const permStored = localStorage.getItem(permKey);
      if (!permStored) return false;  // No perm data to compare against
      const permHashes = JSON.parse(permStored);
      if (!permHashes[fieldId]) return false;  // This field wasn't in perm storage
      return permHashes[fieldId] !== currentHash;  // True if different from last visit
    };
    
    // Helper to check if temp differs from perm (for paging to current)
    const checkTempDiffersFromPerm = () => {
      const permKey = `ksaOps_hashes_${itemId}`;
      const tempKey = `ksaOps_hashes_temp_${itemId}`;
      const permStored = localStorage.getItem(permKey);
      const tempStored = localStorage.getItem(tempKey);
      if (!permStored || !tempStored) return false;  // Need both to compare
      const permHashes = JSON.parse(permStored);
      const tempHashes = JSON.parse(tempStored);
      if (!permHashes[fieldId] || !tempHashes[fieldId]) return false;  // Need both field values
      return permHashes[fieldId] !== tempHashes[fieldId];  // True if temp differs from perm
    };
    
    if (!stored) {
      // First time seeing this vessel in this storage type - create hash storage
      const hashes = {};
      hashes[fieldId] = currentHash;
      localStorage.setItem(storageKey, JSON.stringify(hashes));
      
      // Check for changes: temp vs perm when viewing past, OR temp differs from perm when paging to current
      if (!suppressIndicator && (!KSA_UI_STATE.isLivePastUT && (!usePermStorage && checkPermStorageForChange() || isPagingToCurrent && checkTempDiffersFromPerm()))) {
        
        // Add the certificate icon floating from the right side
        const icon = '<i class="fa-solid fa-certificate fa-2xs change-indicator" style="color: #000000; cursor: pointer; position: absolute; right: 5px; top: 50%; transform: translateY(-50%);" title="Updated since last visit" data-item-id="' + itemId + '" data-field-id="' + fieldId + '"></i>';
        
        // Make sure parent element has relative positioning
        if ($(elementId).css('position') === 'static') {
          $(elementId).css('position', 'relative');
        }
        
        $(elementId).append(icon);
      }
    } else {
      // Vessel has stored hashes - check if this field changed
      const hashes = JSON.parse(stored);
      
      if (!hashes[fieldId]) {
        // First time seeing this specific field in this storage type - save it
        hashes[fieldId] = currentHash;
        localStorage.setItem(storageKey, JSON.stringify(hashes));
        
        // Check for changes: temp vs perm when viewing past, OR temp differs from perm when paging to current
        if (!suppressIndicator && (!KSA_UI_STATE.isLivePastUT && (!usePermStorage && checkPermStorageForChange() || isPagingToCurrent && checkTempDiffersFromPerm()))) {
          
          // Add the certificate icon floating from the right side
          const icon = '<i class="fa-solid fa-certificate fa-2xs change-indicator" style="color: #000000; cursor: pointer; position: absolute; right: 5px; top: 50%; transform: translateY(-50%);" title="Updated since last visit" data-item-id="' + itemId + '" data-field-id="' + fieldId + '"></i>';
          
          // Make sure parent element has relative positioning
          if ($(elementId).css('position') === 'static') {
            $(elementId).css('position', 'relative');
          }
          
          $(elementId).append(icon);
        }
      } else if (hashes[fieldId] !== currentHash) {
        // Content has changed - update hash
        hashes[fieldId] = currentHash;
        localStorage.setItem(storageKey, JSON.stringify(hashes));
        
        // Only show indicator if not suppressed (i.e., not first-time temp storage creation on past event load)
        if (!suppressIndicator) {
          
          // Add the certificate icon floating from the right side
          const icon = '<i class="fa-solid fa-certificate fa-2xs change-indicator" style="color: #000000; cursor: pointer; position: absolute; right: 5px; top: 50%; transform: translateY(-50%);" title="Updated since last visit" data-item-id="' + itemId + '" data-field-id="' + fieldId + '"></i>';
          
          // Make sure parent element has relative positioning
          if ($(elementId).css('position') === 'static') {
            $(elementId).css('position', 'relative');
          }
          
          $(elementId).append(icon);
        }
      } else {
        // Hashes match in current storage - but check for temp vs perm differences
        // When using temp storage (viewing past events), check if temp differs from perm
        // When using perm storage (paging to current), check if temp differs from perm
        if (!suppressIndicator && (!KSA_UI_STATE.isLivePastUT && (!usePermStorage && checkPermStorageForChange() || isPagingToCurrent && checkTempDiffersFromPerm()))) {
          
          // Add the certificate icon floating from the right side
          const icon = '<i class="fa-solid fa-certificate fa-2xs change-indicator" style="color: #000000; cursor: pointer; position: absolute; right: 5px; top: 50%; transform: translateY(-50%);" title="Updated since last visit" data-item-id="' + itemId + '" data-field-id="' + fieldId + '"></i>';
          
          // Make sure parent element has relative positioning
          if ($(elementId).css('position') === 'static') {
            $(elementId).css('position', 'relative');
          }
          
          $(elementId).append(icon);
        }
      }
    }
  } catch (error) {
    handleError(error, 'addVesselChangeIndicator');
  }
}

