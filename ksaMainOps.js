// refactor complete (except for calls to surface/vessel operations)

// current game time is the difference between current real time minus number of ms since midnight on 9/13/16
ops.UT = dateToUT(luxon.DateTime.utc());
if (getParameterByName("setut") && (getCookie("missionctrl") || parseFloat(getParameterByName("setut")) < ops.UT)) ops.UT = parseFloat(getParameterByName("setut"));
if (window.location.href.includes("&live") && getParameterByName("ut")) {
  if (parseFloat(getParameterByName("ut")) < ops.UT) {
    ops.UT = parseFloat(getParameterByName("ut"));
    KSA_UI_STATE.isLivePastUT = true;
  }
}

// handle history state changes when user invokes forward/back button
window.onpopstate = function(event) { 
  if (event.state.type == "flt") loadFlt(event.state.db, false);
  else swapContent(event.state.type, event.state.id, event.state.UT); 

  // make sure to do a menu selection in these instances where its not done intrinsically
  if (event.state.type == "crewFull" || event.state.type == "body") selectMenuItem(event.state.id);

  console.log(event);
}

// ==============================================================================
// MEMORY LEAK PREVENTION - Cleanup Functions
// ==============================================================================

/**
 * Cleans up all tooltips to prevent memory leaks
 * Should be called before switching views
 * Note: Does NOT remove .imgmap tooltips (parts overlay) as they persist within views
 */
function cleanupTooltips() {
  try {
    // Remove general tooltips that are recreated on each view
    Tipped.remove('.tip');
    Tipped.remove('.tip-update');
    Tipped.remove('.contentTip');
    
    // Remove specific event tooltips
    Tipped.remove('#launchLink');
    Tipped.remove('#maneuverLink');
    
    // Note: .imgmap tooltips (parts overlay) are NOT removed here
    // They are managed by assignPartInfo() and only need cleanup when
    // the vessel itself changes, not during general view switches
  } catch (error) {
    handleError(error, 'cleanupTooltips');
  }
}

/**
 * Cleans up all active timers and intervals
 * Stores timer handles in KSA_TIMERS for proper cleanup
 */
function cleanupTimers() {
  try {
    // Clear all known timeout handles
    if (KSA_TIMERS.mapDialogDelay) {
      clearTimeout(KSA_TIMERS.mapDialogDelay);
      KSA_TIMERS.mapDialogDelay = null;
    }
    if (KSA_TIMERS.timeoutHandle) {
      clearTimeout(KSA_TIMERS.timeoutHandle);
      KSA_TIMERS.timeoutHandle = null;
    }
    if (KSA_TIMERS.launchRefreshTimeout) {
      clearTimeout(KSA_TIMERS.launchRefreshTimeout);
      KSA_TIMERS.launchRefreshTimeout = null;
    }
    if (KSA_TIMERS.maneuverRefreshTimeout) {
      clearTimeout(KSA_TIMERS.maneuverRefreshTimeout);
      KSA_TIMERS.maneuverRefreshTimeout = null;
    }
    if (KSA_TIMERS.mapMarkerTimeout) {
      clearTimeout(KSA_TIMERS.mapMarkerTimeout);
      KSA_TIMERS.mapMarkerTimeout = null;
    }
    if (KSA_TIMERS.flightTimelineInterval) {
      clearInterval(KSA_TIMERS.flightTimelineInterval);
      KSA_TIMERS.flightTimelineInterval = null;
    }
    if (KSA_TIMERS.vesselImgTimeout) {
      clearTimeout(KSA_TIMERS.vesselImgTimeout);
      KSA_TIMERS.vesselImgTimeout = null;
    }
    if (KSA_TIMERS.ascentInterpTimeout) {
      clearTimeout(KSA_TIMERS.ascentInterpTimeout);
      KSA_TIMERS.ascentInterpTimeout = null;
    }
    
    // Update global references for backward compatibility
    KSA_TIMERS.mapDialogDelay = null;
    KSA_TIMERS.timeoutHandle = null;
    KSA_TIMERS.launchRefreshTimeout = null;
    KSA_TIMERS.maneuverRefreshTimeout = null;
    KSA_TIMERS.mapMarkerTimeout = null;
    KSA_TIMERS.flightTimelineInterval = null;
    KSA_TIMERS.vesselImgTimeout = null;
    KSA_TIMERS.ascentInterpTimeout = null;
  } catch (error) {
    handleError(error, 'cleanupTimers');
  }
}

/**
 * Cleans up event listeners on specific elements
 * Call before removing or replacing DOM elements
 */
function cleanupEventListeners() {
  try {
    // Remove jQuery event handlers from dialog elements
    $('#infoDialog').off();
    $('#figureDialog').off();
    
    // Note: #infoBox, #contentBox, and #dataBox event handlers are NOT removed
    // These elements persist across views and have permanent callbacks
    // (e.g., #infoBox hover for parts overlay, dropdown change handlers)
    // Removing them would break functionality within views
  } catch (error) {
    handleError(error, 'cleanupEventListeners');
  }
}

/**
 * Master cleanup function to call when switching views
 * Prevents memory leaks by removing all dynamic resources
 */
function cleanupView() {
  cleanupTooltips();
  cleanupTimers();
  cleanupEventListeners();
}

// animate the size of the main content box
function raiseContent(mapInvalTime = 1500) {
  if ($("#contentBox").css("height") != "885px") {
    KSA_UI_STATE.isContentMoving = true;
    $("#contentBox").css("transform", "translateY(0px)");
    setTimeout(function() { 
      $("#contentBox").css("height", "885px");
      $("#map").css("height", "885px");
      if (ops.surface.map) setTimeout(function() { ops.surface.map.invalidateSize(); }, mapInvalTime);
      KSA_UI_STATE.isContentMoving = false;
    }, 400);
  }
}
function lowerContent(mapInvalTime = 1900) {
  if ($("#contentBox").css("height") != "480px") {
    KSA_UI_STATE.isContentMoving = true;
    $("#contentBox").css("height", "480px");
    $("#map").css("height", "480px");
    setTimeout(function() { 
      $("#contentBox").css("transform", "translateY(405px)"); 
      setTimeout(function() { KSA_UI_STATE.isContentMoving = false; }, 400);
      if (ops.surface.map) setTimeout(function() { ops.surface.map.invalidateSize(); }, mapInvalTime);
    }, 400);
  }
}

// called on page load
function setupContent() {

  // data load spinners
  $("#contentHeader").spin({ scale: 0.5, position: 'relative', top: '50%', left: '50%' });
  $("#menuBox").spin({ scale: 0.5, position: 'relative', top: '8px', left: '50%' });
  $("#launch").spin({ scale: 0.5, position: 'relative', top: '20px', left: '50%' });
  $("#maneuver").spin({ scale: 0.5, position: 'relative', top: '20px', left: '75%' });
  $("#contentBox").spin({ position: 'relative', top: '50%', left: '50%' });

  // populate the live reload icon only if not already in live mode
  if (!KSA_UI_STATE.isLivePastUT) {
    $("#liveReloadIcon").html("<i class=\"fa-solid fa-clock-rotate-left\" style=\"cursor: pointer;\"></i>");

    // setup click handler for the link icon
    $("#liveReloadIcon").click(function() {
      $("#liveReloadIcon").html("<i class=\"fa-solid fa-clock-rotate-left fa-spin fa-spin-reverse\"></i>");
      var newUrl = window.location.href;
      if (ops.currentVessel && ops.pageType == "vessel" && !getParameterByName("ut")) newUrl += "&ut=" + ops.currentVessel.CraftData.UT;
      else if (!getParameterByName("ut")) newUrl += "&ut=" + (currUT()-1);
      newUrl += "&live";
      window.location.href = newUrl;
    });
  }

  $("#copyLinkIcon").click(function() {
    var queryString = window.location.search;
    var sanitizedUrl = "http://ops.kerbalspace.agency/" + queryString;
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sanitizedUrl).then(function() {
        $("#copyLinkIcon").html("<i class=\"fa-solid fa-link fa-bounce\"></i>");
        setTimeout(function() { $("#copyLinkIcon").html("<i class=\"fa-solid fa-link\"></i>"); }, 800);
      }).catch(function(err) {
        console.error("Failed to copy: ", err);
      });
    } else {
      // Fallback for older browsers
      var temp = $("<input>");
      $("body").append(temp);
      temp.val(sanitizedUrl).select();
      document.execCommand("copy");
      temp.remove();
      $("#copyLinkIcon").html("<i class=\"fa-solid fa-link fa-bounce\"></i>");
      setTimeout(function() { $("#copyLinkIcon").html("<i class=\"fa-solid fa-link\"></i>"); }, 800);
    }
  });

  // setup the clock
  var tzOffset = luxon.DateTime.fromMillis(KSA_CONSTANTS.MS_FROM_1970_TO_KSA_FOUNDING + (ops.UT * 1000)).setZone("America/New_York");
  var clockHTML = "<strong>Current Time @ KSC (UTC <span id='utcOffset'>" + tzOffset.offset/60 + "</span>)</strong><br>";
  if (KSA_UI_STATE.isLivePastUT) {
    clockHTML += "<div style=\"position: relative;\">";
    clockHTML += "<input type='checkbox' id='ffCancelOnOtherUpdates' style=\"position: absolute; left: 18px; cursor: pointer; display: none;\" checked>";
    clockHTML += "<span id='resetHistoricTime' style=\"position: absolute; left: 42px; cursor: pointer; display: none;\"><i class=\"fa-solid fa-arrow-rotate-right\" style=\"color: #000000;\"></i></span>";
    clockHTML += "<span id='ksctime' style='font-size: 16px; display: block; text-align: center;' title='Click to set time'></span>";
    clockHTML += "<span id='liveControlIcons' style=\"position: absolute; right: 0; top: 0; display: none;\">";
    clockHTML += "<span id='advanceTime1s' style=\"cursor: pointer;\"><i class=\"fa-solid fa-play\" style=\"color: #000000;\"></i></span> ";
    clockHTML += "<span id='advanceTime1m' style=\"cursor: pointer;\"><i class=\"fa-solid fa-forward\" style=\"color: #000000;\"></i></span> ";
    clockHTML += "<span id='returnToCurrentTime' style=\"cursor: pointer;\"><i class=\"fa-solid fa-forward-fast\" style=\"color: #000000;\"></i></span>";
    clockHTML += "</span>";
    clockHTML += "</div>";
  } else {
    clockHTML += "<span id='ksctime' style='font-size: 16px'></span>";
  }
  $("#clock").html(clockHTML);

  if (KSA_UI_STATE.isLivePastUT) {

    // Add click handler to open time picker dialog
    $("#ksctime").click(function() {
      openTimePicker(currUT());
      if (ops.ascentData) ops.ascentData.isPaused = true;
    });
    
    $("#resetHistoricTime").click(function() {
      $("#resetHistoricTime").html("<i class=\"fa-solid fa-arrow-rotate-right fa-spin\" style=\"color: #000000;\"></i>");
      var newUrl = window.location.href;
      if (!getParameterByName("ut")) newUrl += "&ut=" + ops.UT;
      else newUrl = newUrl.replace(/(&|\?)ut=[^&]*/, "$1ut=" + ops.UT);
      newUrl += "&live";
      window.location.href = newUrl;
    });
    $("#resetHistoricTime").contextmenu(function(e) {
      e.preventDefault();

      // if there is no ut parameter, nothing to reset
      if (!getParameterByName("ut")) return;
      $("#resetHistoricTime").html("<i class=\"fa-solid fa-arrow-rotate-right fa-spin\" style=\"color: #000000;\"></i>");
      var newUrl = window.location.href;
      newUrl += "&live";
      window.location.href = newUrl;
    });
    $("#returnToCurrentTime").click(function() {
      var newUrl = window.location.href;
      if (ops.pageType == "vessel" && ops.currentVessel && ops.currentVessel.CraftData) {
        var currentUT = ops.currentVessel.CraftData.UT;
        if (!getParameterByName("ut")) {
          newUrl += "&ut=" + currentUT;
        } else {
          newUrl = newUrl.replace(/(&|\?)ut=[^&]*/, "$1ut=" + currentUT);
        }
      }
      window.location.href = newUrl;
    });
    var showOpt = 'mouseenter';
    if (is_touch_device()) showOpt = 'click';
    Tipped.create('#ffCancelOnOtherUpdates', 'Checked: FF time stops on any vessel/crew updates<br>Unchecked: FF only stops for current vessel/crew updates', { showOn: showOpt, hideOnClickOutside: is_touch_device(), position: 'bottom' });
    Tipped.create('#resetHistoricTime', 'Left click: Reset time to page load<br>Right click: Reset time to current event', { showOn: showOpt, hideOnClickOutside: is_touch_device(), position: 'bottom' });
    Tipped.create('#advanceTime1s', 'Advance time 1sec', { showOn: showOpt, hideOnClickOutside: is_touch_device(), position: 'bottom' });
    Tipped.create('#advanceTime1m', 'Advance time 1min', { showOn: showOpt, hideOnClickOutside: is_touch_device(), position: 'bottom' });
    Tipped.create('#returnToCurrentTime', 'Return to current time', { showOn: showOpt, hideOnClickOutside: is_touch_device(), position: 'bottom' });
    
    // Setup 1s time advance icon mousedown/mouseup handlers
    $("#advanceTime1s").on('mousedown', function() {
      clearTimeout(KSA_TIMERS.rapidFireTimer);
      clearTimeout(KSA_TIMERS.tickTimer);
      KSA_TIMERS.tickTimer = setTimeout(tick, 1);
      
      // Set timer for rapid fire mode after 750ms
      KSA_TIMERS.rapidFireTimer = setTimeout(function() {
        clearTimeout(KSA_TIMERS.tickTimer);
        KSA_TIMERS.tickTimer = setTimeout(tick, 1, 1000, true);
        KSA_TIMERS.rapidFireTimer = null;
        $("#advanceTime1s").css('cursor', 'pointer').html("<i class=\"fa-solid fa-play fa-beat\" style=\"color: #000000;\"></i>");
      }, 750);
    });
    
    $("#advanceTime1s").on('mouseup', function() {
      clearTimeout(KSA_TIMERS.rapidFireTimer);
      $("#advanceTime1s").css('cursor', 'pointer').html("<i class=\"fa-solid fa-play\" style=\"color: #000000;\"></i>");
      if (!KSA_TIMERS.rapidFireTimer) {
        clearTimeout(KSA_TIMERS.tickTimer);
        KSA_TIMERS.tickTimer = setTimeout(tick, 500);
      }
      KSA_TIMERS.rapidFireTimer = null;
    });
    
    // Setup 1m time advance icon mousedown/mouseup handlers
    $("#advanceTime1m").on('mousedown', function() {

      // if there is a countdown clock, we are viewing that vessel, and the countdown is within 2 minutes, block time advance
      var bClickAllow = true;
      if (!isNaN(KSA_CALCULATIONS.launchCountdown)) {
        if (ops.pageType == "vessel") {
          if (ops.currentVessel && ops.currentVessel.Catalog.DB == $("#launchLink").attr("db")) {
            if (KSA_CALCULATIONS.launchCountdown - currUT() <= 120) bClickAllow = false;
          }
        }
      }
      if (bClickAllow) {
        clearTimeout(KSA_TIMERS.rapidFireTimer);
        clearTimeout(KSA_TIMERS.tickTimer);
        KSA_TIMERS.tickTimer = setTimeout(tick, 1, 60000);
        
        // Set timer for rapid fire mode after 750ms
        KSA_TIMERS.rapidFireTimer = setTimeout(function() {
          clearTimeout(KSA_TIMERS.tickTimer);
          KSA_TIMERS.tickTimer = setTimeout(tick, 1, 60000, true);
          KSA_TIMERS.rapidFireTimer = null;
          $("#advanceTime1m").css('cursor', 'pointer').html("<i class=\"fa-solid fa-forward fa-beat\" style=\"color: #000000;\"></i>");
        }, 750);
      } else {

        // flash the countdown clock to cue users into why time advance is blocked
        flashUpdate("#launch", "#FF0000", "#77C6FF");

        // dummy value to indicate no rapid fire mode on mouse up
        KSA_TIMERS.rapidFireTimer = 80085; 
      }
    });
    
    $("#advanceTime1m").on('mouseup', function() {
      clearTimeout(KSA_TIMERS.rapidFireTimer);
      $("#advanceTime1m").css('cursor', 'pointer').html("<i class=\"fa-solid fa-forward\" style=\"color: #000000;\"></i>");     
      if (!KSA_TIMERS.rapidFireTimer) {
        clearTimeout(KSA_TIMERS.tickTimer);
        KSA_TIMERS.tickTimer = setTimeout(tick, 500);
      }
      KSA_TIMERS.rapidFireTimer = null;
    });
  }
  
  // select the default sort options
  $('input:radio[name=roster]').filter('[id=name]').prop('checked', true);
  $('input:radio[name=inactive]').filter('[id=type]').prop('checked', true);

  // set up for AJAX requests
  // https://www.w3schools.com/xml/ajax_intro.asp
  // don't allow AJAX to cache data, which mainly screws up requests for updated vessel times for notifications
  $.ajaxSetup({ cache: false });
  
  // even if we don't need it right away, likely to need it eventually so just set it up now with the rest of the page
  initializeMap();

  // load data
  loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX);
  loadDB("loadMenuData.asp?UT=" + currUT(), loadMenuAJAX);
  loadDB("loadBodyData.asp", loadBodyAJAX);
  loadDB("loadPartsData.asp", loadPartsAJAX);
  
  // JQuery UI theme the buttons used to page through mission history
  // diabled by default, will enable as needed when vessel loads
  // NOTE: make sure this is always before dialog setup so the X close button does not get disabled
  $("button").button({disabled: true});

  // setup the planet data dialog box
  // when it is closed, it will return to the top-left of the figure
  $("#figureDialog").dialog({ autoOpen: false, 
                              closeOnEscape: true, 
                              resizable: false, 
                              width: "auto",
                              hide: { effect: "fade", duration: 300 }, 
                              show: { effect: "fade", duration: 300 },
                              position: { my: "left top", at: "left top", of: "#contentBox" },
                              close: function() { 
                                $(this).dialog("option", "position", { my: "left top", at: "left top", of: "#contentBox" }); 
                              }});
                      
  // setup the info dialog box that will contain vessel status notes
  $("#infoDialog").dialog({ autoOpen: false, 
                            closeOnEscape: true, 
                            resizable: false, 
                            draggable: false, 
                            title: "Additional Information",
                            hide: { effect: "fade", duration: 300 }, 
                            show: { effect: "fade", duration: 300 },
                            position: { my: "center", at: "center", of: "#infoBox" },
                            open: function() { 
                              if (ops.pageType == "vessel") $(this).dialog("option", { width: 643, height: 400 });
                              else if (ops.pageType == "crew") $(this).dialog("option", { width: 490, height: 600 });
                            }});
  
  // setup the message dialog box that will notify the user about any surface map stuff
  $("#progressbar").progressbar({ value: 0 });
  $("#mapDialog").dialog({autoOpen: false, 
                          closeOnEscape: false, 
                          resizable: false, 
                          draggable: false,
                          dialogClass: "no-close",
                          width: 450,
                          height: "auto",
                          hide: { effect: "fade", duration: 300 }, 
                          show: { effect: "fade", duration: 300 },
                          position: { my: "center", at: "center", of: "#contentBox" },
                          open: function() { 

                            // don't allow the user to manipulate the map size while dialog is open
                            if (KSA_MAP_CONTROLS.mapResizeButton) KSA_MAP_CONTROLS.mapResizeButton.disable();
                            $(".leaflet-control-zoom-fullscreen.fullscreen-icon").hide();
                          },
                          close: function() { 
                            if (KSA_MAP_CONTROLS.mapResizeButton) KSA_MAP_CONTROLS.mapResizeButton.enable();
                            $(".leaflet-control-zoom-fullscreen.fullscreen-icon").show();
                          }
                          });

  // setup the message dialog box that will notify the user about any general website stuff
  $("#siteDialog").dialog({ autoOpen: false, 
                            closeOnEscape: false, 
                            resizable: false, 
                            draggable: false,
                            modal: true,
                            dialogClass: "no-close",
                            width: 620,
                            height: "auto",
                            hide: { effect: "fade", duration: 300 }, 
                            show: { effect: "fade", duration: 300 },
                            position: { my: "center", at: "center", of: "#mainContent" }
                            });
  
  // uncheck all the GGB filter boxes
  $("#asteroid-filter").prop('checked', false);
  $("#debris-filter").prop('checked', false);
  $("#probe-filter").prop('checked', false);
  $("#ship-filter").prop('checked', false);
  $("#station-filter").prop('checked', false);

  // checkbox handling needed for dynamic figure & menu filters
  // ensure some start checked, then handle any changes
  $("#nodes").prop('checked', true);
  $("#labels").prop('checked', true);
  $("#ref").prop('checked', true);
  $("input").change(function () {
    if ($(this).attr("name") == "nodes") toggleNodes($(this).is(":checked"));
    if ($(this).attr("name") == "labels") toggleLabels($(this).is(":checked"));
    if ($(this).attr("name") == "orbits") toggleOrbits($(this).is(":checked"));
    if ($(this).attr("name") == "ref") toggleRefLine($(this).is(":checked"));
    if ($(this).attr("name") == "soi") toggleSOI($(this).is(":checked"));
    if ($(this).attr("id").includes("menu")) filterVesselMenu($(this).attr("name"), $(this).is(":checked"));
    if ($(this).attr("id").includes("filter")) filterVesselOrbits($(this).attr("name"), $(this).is(":checked"));
  });

  // setup the header
  $("#contentHeader").html("<span id='patches'></span>&nbsp;<span id='contentTitle'></span>&nbsp;<span id='tags' style='display:none'><i class='fa-solid fa-tag fa-2xs' style='color: #000000;'></i></span>");
  var showOpt = 'mouseenter';
  if (is_touch_device()) showOpt = 'click';
  Tipped.create('#tags', 'Left click: Open posts on KSA website<br>Right click: Open images on flickr<br>Middle click: Open both', { showOn: showOpt, hideOnClickOutside: is_touch_device(), position: 'right' });

  // setup click handlers for tags element
  $("#tags").on('click', function(e) {
    openObjectTags("http://www.kerbalspace.agency/?tag=", ",");
  });
  $("#tags").on('mouseup', function(e) {
    if (e.which === 2) {
      e.preventDefault();
      openObjectTags("http://www.kerbalspace.agency/?tag=", ",");
      openObjectTags("https://www.flickr.com/search/?user_id=kerbal_space_agency&view_all=1&tags=(", "+OR+", ")+-archive");
    }
  });
  $("#tags").on('contextmenu', function(e) {
    e.preventDefault();
    openObjectTags("https://www.flickr.com/search/?user_id=kerbal_space_agency&view_all=1&tags=(", "+OR+", ")+-archive");
  });
  
  // load page content
  var paramUT = null;
  if (getParameterByName("ut")) paramUT = parseInt(getParameterByName("ut"));

  // support older URLs that still load vessels by db
  if (getParameterByName("db") && getParameterByName("db") != "bodies") swapContent("vessel", getParameterByName("db"), paramUT);
  else if (getParameterByName("vessel")) swapContent("vessel", getParameterByName("vessel"), paramUT);
  else if (getParameterByName("body")) swapContent("body", getParameterByName("body"), paramUT);
  else if (getParameterByName("crew")) { 
    if (getParameterByName("crew") == "crewFull") swapContent("crewFull", getParameterByName("crew"));
    else swapContent("crew", getParameterByName("crew"), paramUT);
  }
  else swapContent("body", "Kerbol-System");

  // check if this is a first-time visitor and act accordingly
  if (checkCookies()) {
    if (!getCookie("visitTime")) {
      setCookie("visitTime", currUT(), true);
      $("#siteDialog").html("<img src='http://www.kerbalspace.agency/KSA/wp-content/uploads/2016/01/KSAlogo_new_190x250.png' style='float: left; margin: 0px 5px 0px 0px; width: 25%'>The Operations Tracker is your view into everything that is happening right now at the Kerbal Space Agency. There is a lot to view and explore - we suggest starting with the Wiki to get an idea of all you can do here. We ask you take note the Operations Tracker is under <b>heavy ongoing development</b> and may at times be inaccessible for short periods. Please help us make this the best experience possible by <a href='https://github.com/KSAMissionCtrl/OpsTracker/issues' target='_blank'>submitting bug reports</a> if you come across any problems not listed in our <a href='https://github.com/KSAMissionCtrl/OpsTracker#known-issues' target='_blank'>Known Issues</a>. Enjoy exploring the Kerbol system with us <img src='http://www.kerbalspace.agency/KSA/wp-content/uploads/2017/12/jef2zahe.png'>");
      $("#siteDialog").dialog("option", "title", "Welcome, new visitor!");
      $("#siteDialog").dialog( "option", "buttons", [{
        text: "View wiki",
        click: function() { 
          window.open("https://github.com/KSAMissionCtrl/OpsTracker/wiki");
          $("#siteDialog").dialog("close");
        }
      },{
        text: "Close",
        click: function() { 
          $("#siteDialog").dialog("close");
        }
      }]);
      $("#siteDialog").dialog("open");
    }
  }
  
  // Initialize twitter source to use collection system by default
  // Load after other content to avoid blocking if it's a large dataset
  setTimeout(function() {
    swapTwitterSource();
  }, 500);

  // start the heartbeat after everything is loaded
  checkInitDataLoad();
}
function setupContentDown() {
  setTimeout(function() {
    $(".body").empty();
    document.documentElement.innerHTML = 'Error connecting to server! Please wait a few minutes and try again.';
  }, 5000);
}

// keep checking to see if all page data load is complete before starting the tick timer
function checkInitDataLoad() {
  if (KSA_UI_STATE.dataLoadQueue.length > 0) {
    $('#ksctime').html(KSA_UI_STATE.dataLoadQueue.length + " data load(s) remaining...");
    setTimeout(checkInitDataLoad, 1000);
  } else {

    // show clock icons and time settings if in live mode
    if (KSA_UI_STATE.isLivePastUT) {
      $('#ksctime').html(UTtoDateTime(currUT(), true));
      $("#ksctime").addClass("fauxLink tipped");
      $("#ffCancelOnOtherUpdates").delay(100).fadeIn();
      $("#resetHistoricTime").delay(100).fadeIn();
      if (!ops.ascentData.active) $("#liveControlIcons").delay(100).fadeIn();
    }
    KSA_TIMERS.tickTimer = setTimeout(tick, 1);
  }
}

// switch from one layout to another
function swapContent(newPageType, id, ut, flt) {
  if (!ut) ut = currUT();

  // load flt data without having to pass a dummy value for ut
  if (!flt && isNaN(ut)) flt = ut;

  // ignore any attempts to change content layout if request is to load what is already loaded (if something is already loaded)
  if (ops.currentVessel && (newPageType == "vessel" && ops.pageType == "vessel" && ops.currentVessel.Catalog.DB == id) && ut == currUT()) return;
  if (ops.currentCrew && (newPageType == "crew" && ops.pageType == "crew" && ops.currentCrew.Background.Kerbal == id)) return;
  if (ops.bodyCatalog && (newPageType == "body" && ops.pageType == "body" && ops.bodyCatalog.find(o => o.selected === true).Body == id.replace("-System", ""))) {

    // in the case of a body already set, we can maybe hide the map
    hideMap();
    return;
  }

  // Clean up resources from previous view to prevent memory leaks
  cleanupView();

  // make sure any map dialog that was commanded to show does not
  if (KSA_TIMERS.mapDialogDelay) {
    clearTimeout(KSA_TIMERS.mapDialogDelay);
    KSA_TIMERS.mapDialogDelay = null;
  }

  // close any open map popups
  ops.surface.map.closePopup();

  // initial page load
  if (!ops.pageType) {
    ops.pageType = newPageType;
    if (newPageType == "body") {
      $("#contentBox").css('top', '40px');
      $("#contentBox").css('height', '885px');
      $("#contentBox").fadeIn();
      loadBody(id);
    }
    if (newPageType == "vessel") {

      // this doesn't need as much setup as crew since site layout is already set for this type of view
      $("#contentBox").css('top', '40px');
      $("#contentBox").css('height', '885px');
      $("#contentBox").fadeIn();
      lowerContent();
      $("#infoBox").fadeIn();
      $("#dataBox").fadeIn();
      loadVessel(id, ut);
    }
    if (newPageType == "crewFull") {
      $("#contentBox").spin(false);
      $("#contentBox").css("margin-top", "5px");
      $("#contentBox").fadeIn();
      $("#fullRoster").fadeIn();
      loadCrew(id);
    }
    if (newPageType == "crew") {
      $("#contentBox").spin(false);
      $("#contentBox").css("margin-top", "5px");
      $("#contentBox").fadeOut();
      $("#infoBox").fadeIn();
      $("#infoBox").css("height", "600px");
      $("#infoBox").css("width", "498px");
      $("#dataBox").fadeIn();
      $("#dataBox").css("transform", "translateX(-154px)");
      $("#dataBox").css("width", "449px");
      $("#contentBox").fadeOut();
      $("#missionHistory").fadeOut();
      loadCrew(id);
    }
    // Show link icon after spinner is removed
    setTimeout(function() { 
      $("#liveReloadIcon").fadeIn();
      $("#copyLinkIcon").fadeIn();
      var showOpt = 'mouseenter';
      if (is_touch_device()) showOpt = 'click';
      Tipped.create('#liveReloadIcon', 'Switch to historical time view', { showOn: showOpt, hideOnClickOutside: is_touch_device(), position: 'bottom' });
      Tipped.create('#copyLinkIcon', 'Copy shareable link to clipboard', { showOn: showOpt, hideOnClickOutside: is_touch_device(), position: 'bottom' });
    }, 500);

    return;
  }
  
  // if a vessel orbital calculation is in progress, pause it
  if (ops.currentVessel && ops.pageType == "vessel" && !ops.surface.layerControl.options.collapsed) {
    if (KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad) ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad);
    KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad = null;
    KSA_CALCULATIONS.strPausedVesselCalculation = ops.currentVessel.Catalog.DB;
    checkDataLoad();
  }

  // just do this regardless - anything that needs to be redrawn will do so
  clearSurfacePlots();

  // always clear since patches are appended
  $("#patches").empty();

  // not a total content swap, just new data
  if (ops.pageType == newPageType) {
    if (newPageType == "body") loadBody(id, flt);
    if (newPageType == "vessel") loadVessel(id, ut);
    if (newPageType == "crew") loadCrew(id);
    return;
  }

  // hide the current content
  if (ops.pageType == "body") {
    hideMap();
    $("#figureOptions").fadeOut();
    $("#vesselOrbitTypes").fadeOut();
    $("#figure").fadeOut();
    $("#figureDialog").dialog("close");
    removeMapCloseButton();
    if (KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad) {
      ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad);
      KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad = null;
    }
  } else if (ops.pageType == "vessel") {
  
    // stop any active ascent playback before leaving the vessel page
    // pass true to indicate this is a page swap so vessel reload is skipped
    if (ops.ascentData.active) ascentEnd(true);
  
    // some elements need to be hidden only if we are not switching to a crew page
    if (newPageType != "crew") {
      $("#infoBox").fadeOut();
      $("#dataBox").fadeOut();
      $("#contentBox").spin(false);
      $("#infoBox").spin(false);
      $("#dataField0").spin(false);
    }
    $("#infoDialog").dialog("close");
    hideMap();
    $("#content").fadeOut();
    removeVesselMapButtons();    
  } else if (ops.pageType == "crew") {

    // some elements need to be hidden only if we are not switching to a vessel page
    if (newPageType != "vessel") {
      $("#infoBox").fadeOut();
      $("#dataBox").fadeOut();
    }
    $("#crewFooter").fadeOut();
    $("#infoDialog").dialog("close");
  } else if (ops.pageType == "crewFull") {
    $("#fullRoster").fadeOut();
  }
  
  // show/load the new content
  ops.pageType = newPageType;
  if (ops.pageType == "body") {

    // return the twitter feed to the main feed if alternate feed is loaded from vessel or crew
    if ($("#twitterTimelineSelection").html().includes("|")) swapTwitterSource();
    raiseContent();
    setTimeout(function() { 
      if (!window.location.href.includes("&map")) {
        $("#figureOptions").fadeIn();
        if (!KSA_UI_STATE.isMapShown && (!$("#asteroid-filter").prop("disabled") || !$("#debris-filter").prop("disabled") || !$("#probe-filter").prop("disabled") || !$("#ship-filter").prop("disabled") || !$("#station-filter").prop("disabled"))) $("#vesselOrbitTypes").fadeIn();
        $("#figure").fadeIn();
      }
      $("#contentBox").fadeIn();
      if (KSA_LAYERS.layerPins) {
        KSA_LAYERS.layerPins.addTo(ops.surface.map);
        ops.surface.layerControl.addOverlay(KSA_LAYERS.layerPins, "<img src='defPin.png' style='width: 10px; height: 14px; vertical-align: 1px;'> Custom Pins", "Ground Markers");
      }
      KSA_CATALOGS.bodyPaths.layers.forEach(function(layer) {
        if (layer.isLoaded) {
          var strType = capitalizeFirstLetter(layer.type);
          if (!strType.endsWith("s")) strType += "s";
          ops.surface.layerControl.addOverlay(layer.group, "<img src='icon_" + layer.type + ".png' style='width: 15px;'> " + strType, "Orbital Tracks");
        }
      });
      loadBody(id, flt); 
    }, 600);
  } else if (ops.pageType == "vessel") {
    lowerContent();
    $("#infoBox").fadeIn();
    $("#infoBox").css("height", "400px");
    $("#infoBox").css("width", "650px");
    $("#dataBox").fadeIn();
    $("#dataBox").css("transform", "translateX(0px)");
    $("#dataBox").css("width", "295px");
    $("#contentBox").fadeIn();
    loadVessel(id, ut);
  } else if (ops.pageType == "crew") {
    $("#infoBox").fadeIn();
    $("#infoBox").css("height", "600px");
    $("#infoBox").css("width", "498px");
    $("#dataBox").fadeIn();
    $("#dataBox").css("transform", "translateX(-154px)");
    $("#dataBox").css("width", "449px");
    $("#crewFooter").fadeIn();
    $("#contentBox").fadeOut();
    $("#missionHistory").fadeOut();
    loadCrew(id);
  } else if (ops.pageType == "crewFull") {
    raiseContent();
    $("#infoBox").fadeOut();
    $("#dataBox").fadeOut();
    if ($("#twitterTimelineSelection").html().includes("|")) swapTwitterSource();
    $("#crewFooter").fadeOut();
    $("#footer").fadeIn();
    $("#contentBox").fadeIn();
    $("#fullRoster").spin({ position: 'relative', top: '50%', left: '50%' });
    
    // delay this a bit so the scroll bar doesn't pop up before the content move is complete
    setTimeout(function() { $("#fullRoster").fadeIn(); }, 250);
    loadCrew(id);
  }
}

// updates various content on the page depending on what update event has been triggered
function updatePage(updateEvent, rapidFireMode = false) {

  // if rapid fire mode is active, we need to reset the tick timer?
  if (rapidFireMode) {

    // if the ffCancelOnOtherUpdates is not checked, only stop FF for current vessel/crew updates
    if (!$("#ffCancelOnOtherUpdates").is(":checked")) {
      if (updateEvent.type == "object" && 
         ((ops.pageType == "vessel" && ops.currentVessel && updateEvent.id == ops.currentVessel.Catalog.DB) ||
          (ops.pageType == "crew" && ops.currentCrew && updateEvent.id == ops.currentCrew.Background.Kerbal))) {
            KSA_TIMERS.tickTimer = null;
      }
    } else KSA_TIMERS.tickTimer = null;
  }
      
  KSA_UI_STATE.menuSaveSelected = w2ui['menu'].find({selected: true});
  if (KSA_UI_STATE.menuSaveSelected.length == 0) KSA_UI_STATE.menuSaveSelected = null;
  if (updateEvent.type.includes("menu")) menuUpdate(updateEvent.type.split(";")[1], updateEvent.id);
  else if (updateEvent.type == "event") loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX);
  else if (updateEvent.type == "object") {
    var obj = ops.updateData.find(o => o.id === updateEvent.id);
    if (!obj) console.log("unknown object", updateEvent);
    else {
      if (obj.type == "crew") updateCrewData(obj);
      else if (obj.type == "vessel") updateVesselData(obj);
      else console.log("unknown update type", obj);
    }
  }
}

// recursively check through updates so we get any that occur at the same time
function checkPageUpdate(rapidFireMode = false) {
  if (!KSA_UI_STATE.isMenuDataLoaded) return;
  if (ops.updatesList.length && currUT() >= ops.updatesList[0].UT) {
    updatePage(ops.updatesList.shift(), rapidFireMode);
    ops.updatesListSize = ops.updatesList.length;
    return checkPageUpdate(rapidFireMode);
  } else return;
}

function swapTwitterSource(swap, source) {

  // Ensure source is a string (in case it comes from ASP as a number)
  if (source) source = String(source);
  
  if (swap && source) {
    $("#twitterTimelineSelection").html("Source: <span class='fauxLink' onclick=\"swapTwitterSource('" + swap + "')\">KSA Main Feed</span> | <b>" + swap + "</b>");
    ops.twitterSource = source;
  } else if (swap && !source) {
    if (ops.twitterSource.includes(";")) src = ops.twitterSource.split(";")[1];
    else src = ops.twitterSource;
    $("#twitterTimelineSelection").html("Source: <b>KSA Main Feed</b> | <span class='fauxLink' onclick=\"swapTwitterSource('" + swap + "', '" + src + "')\">" + swap + "</span>");
  } else if (!swap && !source) {
    $("#twitterTimelineSelection").html("Source: <b>KSA Main Feed</b>");
  }
  if (!source) {
    source = "13573";
    ops.twitterSource = source;
  }
  
  // Determine if source is a URL (old Twitter widget) or a collection ID (new system)
  if (source.startsWith("http://") || source.startsWith("https://")) {
    // Old Twitter/X widget system - kept for backward compatibility if needed
    $("#twitterTimeline").html("<a class='twitter-timeline' data-chrome='nofooter noheader' data-height='500' href='"+ source + "'>Loading Tweets...</a> <script async src='https://platform.x.com/widgets.js' charset='utf-8'>");
  } else {
    // New custom tweet display system - source is a collection ID
    // Determine order based on mission status - ascending if mission ended, descending otherwise
    var tweetOrder = 'desc';
    if (swap && (swap == "Mission Feed" && ops.currentVessel && isMissionEnded()) && source != "13573") {
      tweetOrder = 'asc';
    }
    
    TweetDisplay.displayTweets({
      containerId: 'twitterTimeline',
      collectionFile: source,
      order: tweetOrder,
      maxTweets: 25
    });
  }
}

// loads future data for all active vessels and crew so they can be updated without fetch delay
function loadOpsDataAJAX(xhttp, args = null) {

  if (xhttp) {
  
    // header info uses "Typ3" as a unique identifier to parse out the craft id from the rest of the data
    // since I ran out of special character to use
    var object = ops.updateData.find(o => o.id === xhttp.responseText.split("Typ3")[0]);
    
    // decide what type of object we are parsing data for
    if (xhttp.responseText.includes("Typ3vessel")) {
      
      // separate the main data segments
      var data = xhttp.responseText.split("Typ3vessel")[1].split("*");

      // the various tables of the current record 
      var dataTables = data[2].split("^");
      var craft = rsToObj(dataTables[0]);
      var resources = rsToObj(dataTables[1]);
      var crew = rsToObj(dataTables[2]);
      var comms = rsToObj(dataTables[3]);
      var obt = rsToObj(dataTables[4]);
      var ports = rsToObj(dataTables[5]);

      // temp workaround
      // can reqrite ops load to send over these values in case of null records
      if (!crew) crew = {UT: 0};
      if (!resources) resources = {UT: 0};
      if (!comms) comms = {UT: 0};
      if (!obt) obt = {UT: 0};
      if (!ports) ports = {UT: 0};

      // only save the UT field so we can determine if any menu badging is required
      object.CurrentData = { CraftData: {UT: craft.UT},
                             Resources: {UT: resources.UT},
                             Manifest: {UT: crew.UT},
                             Comms: {UT: comms.UT},
                             Orbit: {UT: obt.UT},
                             Ports: {UT: ports.UT} };

      // any future events
      dataTables = data[3].split("^");
      craft = rsToObj(dataTables[0]);
      resources = rsToObj(dataTables[1]);
      crew = rsToObj(dataTables[2]);
      comms = rsToObj(dataTables[3]);
      obt = rsToObj(dataTables[4]);
      ports = rsToObj(dataTables[5]);
      object.FutureData = { CraftData: craft,
                            Resources: resources,
                            Manifest: crew,
                            Comms: comms,
                            Orbit: obt,
                            Ports: ports };
      
    } else if (xhttp.responseText.includes("Typ3crew")) {
      var data = xhttp.responseText.split("Typ3crew")[1].split("*");

      // the various tables of the current record
      var dataTables = data[1].split("^");
      var stats = rsToObj(dataTables[0]);
      var history = rsToObj(dataTables[3]);
      
      // parse the missions and the ribbons
      var missions = [];
      var ribbons = [];
      if (dataTables[1] != "null") dataTables[1].split("|").forEach(function(item) { missions.push(rsToObj(item)); });
      if (dataTables[2] != "null") dataTables[2].split("|").forEach(function(item) { ribbons.push(rsToObj(item)); });
      missions.reverse();

      // only save the UT fields so we can determine if any menu badging is needed
      object.CurrentData = {  Stats: {UT: stats.UT},
                              History: {UT: history.UT},
                              Missions: missions,
                              Ribbons: ribbons };
      
      // any future events
      var dataTables = data[2].split("^");
      var stats = rsToObj(dataTables[0]);
      var missions = rsToObj(dataTables[1]);
      var ribbons = rsToObj(dataTables[2]);
      var history = rsToObj(dataTables[3]);
      object.FutureData = { Stats: stats,
                            History: history,
                            Missions: missions,
                            Ribbons: ribbons };
    }
    object.isLoading = false;
    
    // determine if this object has a future event that we need to plan an update for
    var updateUT = null;
    for (var prop in object.FutureData) {
      if (object.FutureData[prop] && 
      ((object.FutureData[prop].UT && !updateUT) || (object.FutureData[prop].UT && object.FutureData[prop].UT < updateUT))) { 
        updateUT = object.FutureData[prop].UT
      }
    }
    if (updateUT) ops.updatesList.push({ type: "object", id: object.id, UT: updateUT });
  }
  
  // is there anything that has not been loaded yet?
  for (i=0; i<ops.updateData.length; i++) {
    if (!ops.updateData[i].isLoading && !ops.updateData[i].CurrentData) {
      ops.updateData[i].isLoading = true;
      loadDB("loadOpsData.asp?db=" + ops.updateData[i].id + "&UT=" + currUT() + "&type=" + ops.updateData[i].type + "&pastUT=NaN", loadOpsDataAJAX);
    }
  }

  // if this was a real-time update, badge the menu item 
  // if the badging was successful or still previously badged we are not viewing this object, flash the menu to indicate an update
  if (args && args.isRealTimeUpdate) {
    var result = badgeMenuItem(args.id, true)
    if (result == true || result == null) {
      flashUpdate("#menuHeader", "#77C6FF", "#FFF")
    }
  }

  // test for loading complete
  if (!ops.updateData.find(o => o.isLoading === true)) {

    // if this user has cookies, badge anything that has been updated since their last visit
    if (checkCookies() && !ops.lastVisit) {

      // get the time of the user's last visit
      ops.lastVisit = parseInt(getCookie("visitTime"));

      // go through all the inactive vessels to see if any have been updated since the last visit
      ops.craftsMenu.forEach(function(item) {
        var refNumUT = currSOI(item);
        if (refNumUT[0] == -1 && ops.lastVisit < refNumUT[1]) badgeMenuItem(item.db, true, true);
      });

      // now check the active vessels and crew, which can have several fields with varying update times
      ops.updateData.forEach(function(item) {
        var latestUT = 0;
        if (item.type == "vessel") {
          
          // find the latest UT update for the vessel
          Object.entries(item.CurrentData).forEach(function(items) {
            if (items[1] && items[1].UT && items[1].UT > latestUT) latestUT = items[1].UT;
          });
        } else {

          // same as for vessels but check for arrays and test accordingly
          Object.entries(item.CurrentData).forEach(function(items) {
            if (items[1] && !Array.isArray(items[1])) {
              if (items[1].UT && items[1].UT > latestUT) latestUT = items[1].UT;
            } else if (items[1] && Array.isArray(items[1])) {
              items[1].forEach(function(arrayItem) {
                if (arrayItem.UT && arrayItem.UT > latestUT) latestUT = arrayItem.UT;
              });
            }
          });
        }

        // if this UT is greater than when we last visited, but not greater than the current time, badge it
        if (ops.lastVisit <= latestUT && latestUT <= currUT()) badgeMenuItem(item.id, true, true);
      });

      // update the visit time only if we're viewing current time (not looking at past data)
      if (currUT() > ops.lastVisit) setCookie("visitTime", currUT(), true);
    }
  }
}

// loop and update the page every second
// no longer using setInterval, as suggested via
// http://stackoverflow.com/questions/6685396/execute-the-first-time-the-setinterval-without-delay
function tick(utDelta = 1000, rapidFireMode = false) {

  // update the clocks
  var tzOffset = luxon.DateTime.fromMillis(KSA_CONSTANTS.MS_FROM_1970_TO_KSA_FOUNDING + (ops.UT * 1000)).setZone("America/New_York");
  $('#ksctime').html(UTtoDateTime(currUT(), true));
  $('#utcOffset').html(tzOffset.offset/60);

  if (!isNaN(KSA_CALCULATIONS.launchCountdown) && KSA_CALCULATIONS.launchCountdown - currUT() > 0) $('#launchCountdown').html(formatTime(KSA_CALCULATIONS.launchCountdown - currUT(), false));
  else if (!isNaN(KSA_CALCULATIONS.launchCountdown) && KSA_CALCULATIONS.launchCountdown - currUT() <= 0) { 
    
    // cleanup the event data and prep for checking for new events
    $('#launchCountdown').html("LIFTOFF!!"); 
    KSA_CALCULATIONS.launchCountdown = "null";
    setTimeout(function() { loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX); }, 5000);
  }
  if (!isNaN(KSA_CALCULATIONS.maneuverCountdown) && KSA_CALCULATIONS.maneuverCountdown - currUT() > 0) $('#maneuverCountdown').html(formatTime(KSA_CALCULATIONS.maneuverCountdown - currUT(), false));
  else if (!isNaN(KSA_CALCULATIONS.maneuverCountdown) && KSA_CALCULATIONS.maneuverCountdown - currUT() <= 0) { 
    $('#maneuverCountdown').html("EXECUTE!!"); 
    KSA_CALCULATIONS.maneuverCountdown = "null";
    KSA_TIMERS.maneuverRefreshTimeout = setTimeout(function() { loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX); }, 5000);
  }

  // sort the update times if new ones have been added since our last check, then look for updates
  if (ops.updatesList.length > ops.updatesListSize) {
    ops.updatesListSize = ops.updatesList.length;
    ops.updatesList.sort(function(a,b) { return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0); });
  }
  checkPageUpdate(rapidFireMode);

  // update the terminator & sun display if a marker exists and the current body has a solar day length (is not the sun)
  // drawn based on the technique from SCANSat
  // https://github.com/S-C-A-N/SCANsat/blob/dev/SCANsat/SCAN_Unity/SCAN_UI_MainMap.cs#L682-L704
  if (ops.surface.Data && ops.surface.Data.Name == "Kerbin" && KSA_MAP_CONTROLS.sunMarker && ops.bodyCatalog.find(o => o.selected === true).SolarDay) {

    // for now only for Kerbin, with no solar inclination
    var sunLon = -ops.bodyCatalog.find(o => o.selected === true).RotIni - (((currUT() / ops.bodyCatalog.find(o => o.selected === true).SolarDay) % 1) * 360);
    var sunLat = 0;
    if (sunLon < -180) sunLon += 360;

    // update the marker position
    KSA_MAP_CONTROLS.sunMarker.setLatLng([sunLat, sunLon]);

    // calculate the new terminator line
    var sunLatCenter = (0 + 180 + 90) % 180 - 90;
    if (sunLatCenter >= 0) var sunLonCenter = ((sunLon + 90) + 360 + 180) % 360 - 180;
    else var sunLonCenter = ((sunLon - 90) + 360 + 180) % 360 - 180;
    var gamma = Math.abs(sunLatCenter) < 0.55 ? 100 : Math.tan(Math.radians(90 - Math.abs(sunLatCenter)));
    var terminatorPath = [];
    for (lon=0; lon<=360; lon++) {
      var crossingLat = Math.atan(gamma * Math.sin(Math.radians(lon - 180) - Math.radians(sunLonCenter)));
      terminatorPath.push([Math.degrees(crossingLat), lon-180]);
    }

    // close up the polygon
    terminatorPath.push([-90, 180]);
    terminatorPath.push([-90, -180]);

    // remove the previous layer if there is one before adding the new one
    if (KSA_MAP_CONTROLS.terminator) KSA_LAYERS.layerSolar.removeLayer(KSA_MAP_CONTROLS.terminator);
    KSA_MAP_CONTROLS.terminator = L.polygon(terminatorPath, {stroke: false, fillOpacity: 0.5, fillColor: "#000000", interactive: false});
    KSA_LAYERS.layerSolar.addLayer(KSA_MAP_CONTROLS.terminator);
  }

  // update any crew mission countdown that is active
  if (ops.pageType == "crew" && !$('#dataField10').is(':empty')) $("#crewCountdown").html(formatTime($("#crewCountdown").attr("data")-currUT()));
  
  // update the dynamic orbit figure
  if (KSA_UI_STATE.isGGBAppletLoaded) ggbApplet.setValue("UT", currUT());
  
  // is there a loaded vessel we need to monitor?
  if (ops.currentVessel && ops.pageType == "vessel") {

    // does the vessel have ascent data and is it starting in the future?
    if (ops.currentVessel.AscentData.length && ops.currentVessel.AscentData[0] > currUT()) {

      // check if we need to transition into a realtime ascent state
      if (!ops.ascentData.active                                                            // there is no ascent active yet
      && !ops.currentVessel.CraftData.pastEvent                                             // we are not looking at a past event
      && (checkLaunchTime() && checkLaunchTime()-randomIntFromInterval(20,26) <= currUT()   // we are within 20-26s of the launch
      && ops.currentVessel.AscentData[ops.currentVessel.AscentData.length-1] > currUT()-5   // and still within 5s of the end of the telemetry
      )) {
        loadAscentData();
        ops.ascentData.active = true;
        if (rapidFireMode) KSA_TIMERS.tickTimer = null;
      }
    }

    // is the mission still active?
    // or is some archived telemetry attempting to play?
    if (!isMissionEnded() || (isMissionEnded() && !ops.ascentData.isPaused)) {
    
      // update the MET or countdown
      $("#metCount").html(formatTime($("#metCount").attr("data")-currUT()));
      
      // update vessel surface map information if a vessel is on the map and calculations are not running
      if (KSA_MAP_CONTROLS.vesselMarker && (ops.surface.layerControl && ops.surface.layerControl.options.collapsed)) {

        // is there an ascent going on?
        if (ops.ascentData.active && !ops.ascentData.isPaused) {

          // update the mission countdown/timer
          // UT source depends on current event state
          if (ops.currentVessel.CraftData.pastEvent) var utSrc = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].UT;
          else var utSrc = currUT();
          if (checkLaunchTime() > utSrc) {
            $("#metCaption").html("Launch in:");
            $("#met").html(formatTime(checkLaunchTime()-utSrc));
          } else {
            $("#metCaption").html("Mission Elapsed Time:");
            $("#met").html(formatTime(utSrc-checkLaunchTime()));
          }

          // only perform interpolation if we are beyond the start of data and there is still data remaining
          if (currUT() >= ops.ascentData.telemetry[0].UT && ops.activeAscentFrame.ascentIndex < ops.ascentData.telemetry.length-1) {
            KSA_TIMERS.interpStart = new Date().getTime();

            // set the FPS to default 30 if null
            if (!ops.activeAscentFrame.FPS) ops.activeAscentFrame.FPS = 30;
            else if (ops.activeAscentFrame.FPS && ops.activeAscentFrame.interpCount) {

              // check if we hit our target FPS and if so, increase it. Cap at 60
              // otherwise decrease. cap at 15
              if (ops.activeAscentFrame.interpCount >= ops.activeAscentFrame.FPS && ops.activeAscentFrame.FPS < 60) ops.activeAscentFrame.FPS += 2;
              else if (ops.activeAscentFrame.interpCount < ops.activeAscentFrame.FPS-2 && ops.activeAscentFrame.FPS > 15) ops.activeAscentFrame.FPS -= 2;
            }

            // interpolate between the current and next values using the current FPS
            ops.activeAscentFrame.velocityDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Velocity-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Velocity)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.throttleDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Throttle-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Throttle)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.thrustDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Thrust-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Thrust)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.gravityDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Gravity-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Gravity)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.altitudeDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Altitude-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Altitude)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.apDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Apoapsis-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Apoapsis)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.qDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Q-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Q)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.peDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Periapsis-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Periapsis)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.incDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Inclination-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Inclination)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.massDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Mass-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Mass)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.fuelDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].TotalFuel-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].TotalFuel)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.dstDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].DstDownrange-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstDownrange)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.aoaDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].AoA-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].AoA)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.pitchDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Pitch-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Pitch)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.rollDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Roll-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Roll)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.hdgDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Heading-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Heading)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.latDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Lat-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Lat)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.lonDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Lon-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Lon)/ops.activeAscentFrame.FPS;

            // account for possible missing data
            if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].StageFuel) ops.activeAscentFrame.stageDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].StageFuel-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].StageFuel)/ops.activeAscentFrame.FPS;
            else ops.activeAscentFrame.stageDelta = null;
            if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstTraveled) ops.activeAscentFrame.traveledDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].DstTraveled-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstTraveled)/ops.activeAscentFrame.FPS;
            else ops.activeAscentFrame.traveledDelta = null;

            // cancel the current interpolation timer & reset counter
            if (KSA_TIMERS.ascentInterpTimeout) {
              clearTimeout(KSA_TIMERS.ascentInterpTimeout);
              KSA_TIMERS.ascentInterpTimeout = null;
              ops.activeAscentFrame.interpCount = 0;
            }

            // update all the data fields to clamp to the proper data each second
            // it will then continue to call itself to interpolate
            updateAscentData(true);

            // if this is happening now we need to keep sync to real time so any page load hang doesn't screw it up
            // otherwise we can just tick it up with the function call
            if (!ops.currentVessel.CraftData.pastEvent) ops.activeAscentFrame.ascentIndex = (currUT()+1) - ops.ascentData.telemetry[0].UT;
            else ops.activeAscentFrame.ascentIndex++;
          
          // ascent has terminated
          } else if (ops.activeAscentFrame.ascentIndex >= ops.ascentData.telemetry.length-1) {

            // interpolation function timeout handle nulled after one last update
            updateAscentData(true);
            if (KSA_TIMERS.ascentInterpTimeout) {
              clearTimeout(KSA_TIMERS.ascentInterpTimeout);
              KSA_TIMERS.ascentInterpTimeout = null;
            }

            // one last surface track update
            updateSurfacePlot(ops.ascentData.telemetry.length-1);

            // handle more stuff, some only for live events
            ascentEnd();

            // update control link & show buttons
            $("#playbackCtrl").html("Reset Playback");
            $("#prev10s").css("visibility", "visible");
            $("#prev30s").css("visibility", "visible");
          }

        // orbital plot update, then
        } else if (ops.currentVesselPlot && ops.currentVesselPlot.obtData.length) {
          var now = getPlotIndex();

          // update craft position and popup content
          var cardinal = getLatLngCompass(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng);
          KSA_MAP_CONTROLS.vesselMarker.setLatLng(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng);
          $('#lat').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng.lat).format('0.0000') + "&deg;" + cardinal.lat);
          $('#lng').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng.lng).format('0.0000') + "&deg;" + cardinal.lng);
          $('#alt').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].alt).format('0,0.000') + " km");
          $('#vel').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].vel).format('0,0.000') + " km/s");

          // create the horizon if needed, else update it
          if (ops.surface.map.hasLayer(KSA_MAP_CONTROLS.vesselMarker)) {
            
            if (!KSA_MAP_CONTROLS.vesselHorizon.vessel) {
              KSA_MAP_CONTROLS.vesselHorizon.vessel = addHorizonCircle(
                KSA_MAP_CONTROLS.vesselMarker.getLatLng(),
                ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].alt * 1000,
                { color: KSA_COLORS.vesselOrbitColors[now.obtNum] }
              );
              // Add horizon to ground station layer so it only shows when that layer is active
              KSA_LAYERS.layerGroundStations.addLayer(KSA_MAP_CONTROLS.vesselHorizon.vessel);
            } else {
              var horizonRadius = calculateHorizonRadius(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].alt * 1000);
              KSA_MAP_CONTROLS.vesselHorizon.vessel.setLatLng(KSA_MAP_CONTROLS.vesselMarker.getLatLng());
              KSA_MAP_CONTROLS.vesselHorizon.vessel.setRadius(horizonRadius);
              KSA_MAP_CONTROLS.vesselHorizon.vessel.setStyle({color: KSA_COLORS.vesselOrbitColors[now.obtNum]});
            }
          }
          
          // update Soi markers if they exist
          if (ops.currentVesselPlot.events.soiEntry.marker) {
            $('#soiEntryTime').html(formatTime(ops.currentVesselPlot.events.soiEntry.UT - currUT()));

            // if we've hit or exceeded the entry time, remove the vessel marker and update the entry marker popup
            if (ops.currentVesselPlot.events.soiEntry.UT-1 <= currUT()) {
              ops.currentVesselPlot.events.soiEntry.marker.closePopup();
              ops.surface.map.removeLayer(KSA_MAP_CONTROLS.vesselMarker);
              KSA_LAYERS.layerGroundStations.removeLayer(KSA_MAP_CONTROLS.vesselHorizon.vessel);
              KSA_MAP_CONTROLS.vesselMarker = null;
              KSA_MAP_CONTROLS.vesselHorizon.vessel = null;
              ops.currentVesselPlot.events.soiEntry.marker.bindPopup("<center>" + UTtoDateTime(currUT()).split("@")[1] + " UTC<br>Telemetry data invalid due to " + ops.currentVessel.Orbit.SOIEvent.split(";")[2] + "<br>Please stand by for update</center>", { autoClose: false });
              ops.currentVesselPlot.events.soiEntry.marker.openPopup();
            }
          }
          else if (ops.currentVesselPlot.events.soiExit.marker) $('#soiExitTime').html(formatTime(ops.currentVesselPlot.events.soiExit.UT - currUT()));

          // update the Ap/Pe markers if they exist, and check for passing
          if (ops.currentVesselPlot.events.ap.marker) {
            $('#apTime').html(formatTime(ops.currentVesselPlot.events.ap.UT - currUT()));
            if (ops.currentVesselPlot.events.ap.UT <= currUT()) {

              // just add on the time of an orbit to get the time for the next Ap
              ops.currentVesselPlot.events.ap.UT += ops.currentVessel.Orbit.OrbitalPeriod;
              
              // remove the marker from the current layer and check if there is an orbit after this that is long enough to add the marker to
              ops.currentVesselPlot.obtData[now.obtNum].layer.removeLayer(ops.currentVesselPlot.events.ap.marker);
              if (now.obtNum + 1 < ops.currentVesselPlot.obtData.length && 
                  currUT() + ops.currentVesselPlot.obtData[now.obtNum+1].orbit.length > ops.currentVesselPlot.events.ap.UT) {
              
                // subtract the new UT of the Ap from the starting UT of the next orbit to get the proper index
                ops.currentVesselPlot.events.ap.marker.setLatLng(ops.currentVesselPlot.obtData[now.obtNum+1].orbit[Math.floor(ops.currentVesselPlot.events.ap.UT-ops.currentVesselPlot.obtData[now.obtNum+1].startUT)].latlng);
                var strTimeDate = UTtoDateTime(ops.currentVesselPlot.events.ap.UT);
                $('#apDate').html(strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1]);
                ops.currentVesselPlot.obtData[now.obtNum+1].layer.addLayer(ops.currentVesselPlot.events.ap.marker);
                
              // noplace else to go, so remove the marker from the map completely
              } else { 
                ops.surface.map.removeLayer(ops.currentVesselPlot.events.ap.marker); 
                ops.currentVesselPlot.events.ap.marker = null;
              }
            }
          }
          if (ops.currentVesselPlot.events.pe.marker) {
            $('#peTime').html(formatTime(ops.currentVesselPlot.events.pe.UT - currUT(true)));
            if (ops.currentVesselPlot.events.pe.UT <= currUT()) {
              ops.currentVesselPlot.events.pe.UT += ops.currentVessel.Orbit.OrbitalPeriod;
              ops.currentVesselPlot.obtData[now.obtNum].layer.removeLayer(ops.currentVesselPlot.events.pe.marker);
              if (now.obtNum + 1 < ops.currentVesselPlot.obtData.length && 
                  currUT() + ops.currentVesselPlot.obtData[now.obtNum+1].orbit.length > ops.currentVesselPlot.events.pe.UT) {
                ops.currentVesselPlot.events.pe.marker.setLatLng(ops.currentVesselPlot.obtData[now.obtNum+1].orbit[Math.floor(ops.currentVesselPlot.events.pe.UT-ops.currentVesselPlot.obtData[now.obtNum+1].startUT)].latlng);
                var strTimeDate = UTtoDateTime(ops.currentVesselPlot.events.pe.UT);
                $('#peDate').html(strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1]);
                ops.currentVesselPlot.obtData[now.obtNum+1].layer.addLayer(ops.currentVesselPlot.events.pe.marker);
              } else { 
                ops.surface.map.removeLayer(ops.currentVesselPlot.events.pe.marker); 
                ops.currentVesselPlot.events.pe.marker = null;
              }
            }
          }
        }
      }
    }
  }

  // are there surface paths that need to be monitored?
  if (KSA_CATALOGS.bodyPaths.paths.length) {
   KSA_CATALOGS.bodyPaths.paths.forEach(function(object) {
      if (object.obtData) {
        var now = currUT() - object.obtData.startUT;
        var currLayer =KSA_CATALOGS.bodyPaths.layers.find(o => o.type === object.type);

        // update craft position and popup content
        if (object.obtData.marker) object.obtData.marker.setLatLng(object.obtData.orbit[now].latlng);

        // only perform these actions if this is the selected vessel
        if (object.isSelected) {

          // update the popup
          var cardinal = getLatLngCompass(object.obtData.orbit[now].latlng);
          $('#latSurface').html(numeral(object.obtData.orbit[now].latlng.lat).format('0.0000') + "&deg;" + cardinal.lat);
          $('#lngSurface').html(numeral(object.obtData.orbit[now].latlng.lng).format('0.0000') + "&deg;" + cardinal.lng);
          $('#altSurface').html(numeral(object.obtData.orbit[now].alt).format('0,0.000') + " km");
          $('#velSurface').html(numeral(object.obtData.orbit[now].vel).format('0,0.000') + " km/s");

          // update the horizon
          if (KSA_MAP_CONTROLS.vesselHorizon.vessel) {
            var horizonRadius = calculateHorizonRadius(object.obtData.orbit[now].alt * 1000);
            KSA_MAP_CONTROLS.vesselHorizon.vessel.setLatLng(object.obtData.marker.getLatLng());
            KSA_MAP_CONTROLS.vesselHorizon.vessel.setRadius(horizonRadius);
          }
        }
        
        // update Soi markers if they exist
        if (object.obtData.events.soiEntry.marker) {
          $('#soiEntryTime').html(formatTime(object.obtData.events.soiEntry.UT - currUT()));

          // if we've hit or exceeded the entry time, remove the vessel marker and update the entry marker popup
          if (object.obtData.events.soiEntry.UT-1 <= currUT()) {
            object.obtData.events.soiEntry.marker.closePopup();
            currLayer.group.removeLayer(object.obtData.marker);
            object.obtData.marker = null;
            object.obtData.events.soiEntry.marker.bindPopup("<center>" + UTtoDateTime(currUT()).split("@")[1] + " UTC<br>Telemetry data invalid due to " + object.obtData.events.soiEntry.reason + "<br>Please stand by for update</center>", { autoClose: false });
            object.obtData.events.soiEntry.marker.openPopup();
          }
        }
        else if (object.obtData.events.soiExit.marker) $('#soiExitTimeSurface').html(formatTime(object.obtData.events.soiExit.UT - currUT()));

        // update the Ap/Pe markers if they exist, and check for passing
        if (object.obtData.events.ap.marker) {
          $('#apTimeSurface').html(formatTime(object.obtData.events.ap.UT - currUT()));
          if (object.obtData.events.ap.UT <= currUT()) {

            // remove the marker from the current layer and null it out
            currLayer.group.removeLayer(object.obtData.events.ap.marker);
            object.obtData.events.ap.marker = null;
          }
        }
        if (object.obtData.events.pe.marker) {
          $('#peTimeSurface').html(formatTime(object.obtData.events.pe.UT - currUT()));
          if (object.obtData.events.pe.UT <= currUT()) {
              currLayer.group.removeLayer(object.obtData.events.pe.marker); 
              object.obtData.events.pe.marker = null;
          }
        }
      }
    });
  }
  
  // update any tooltips
  Tipped.refresh(".tip-update");  
  
  // update the UT if timer hasn't been canceled
  if (KSA_TIMERS.tickTimer) ops.tickDelta += utDelta;
  if (!rapidFireMode && KSA_TIMERS.tickTimer) { 
    
    // if this is viewing current time, keep track of any tab inactivity or time drift
    // otherwise just set a standard timeout since we don't care about accuracy when viewing past time
    if (!KSA_UI_STATE.isLivePastUT) {

      // ensure timer accuracy, even catch up if browser slows tab in background
      // http://www.sitepoint.com/creating-accurate-timers-in-javascript/
      var diff = ((new Date().getTime()) - ops.clock.getTime()) - ops.tickDelta;

      // if tab was inactive for more than 3 minutes, reload the page to ensure fresh state
      if (diff > 180000) {
        window.location.reload();
        return;
      }
      
      KSA_TIMERS.tickTimer = setTimeout(tick, 1000 - diff);
    } else KSA_TIMERS.tickTimer = setTimeout(tick, 1000);

  // in rapid fire mode, call the next tick sooner
  // bail if an update event or ascent telemetry load was fired and nulled the timer
  // also bail if we are at or past terminal countdown when FF at speeds greater than 1s
  // but only if we are viewing the current vessel that is launching
  } else if (rapidFireMode) {
    if (!KSA_TIMERS.tickTimer || 
       (utDelta > 1000 && 
         (ops.currentVessel && (ops.currentVessel.Catalog.DB == $("#launchLink").attr("db") && ops.pageType == "vessel")) &&
         (!isNaN(KSA_CALCULATIONS.launchCountdown) && KSA_CALCULATIONS.launchCountdown - currUT() <= 120))) 
    {
      KSA_TIMERS.tickTimer = setTimeout(tick, 1);

      // flash the launch countdown if we are within T-2 minutes
      if (!isNaN(KSA_CALCULATIONS.launchCountdown) && KSA_CALCULATIONS.launchCountdown - currUT() <= 120) {
        flashUpdate("#launch", "#FF0000", "#77C6FF");
      }

      // reset the advance time buttons
      $("#advanceTime1s").css('cursor', 'pointer').html("<i class=\"fa-solid fa-play\" style=\"color: #000000;\"></i>");
      $("#advanceTime1m").css('cursor', 'pointer').html("<i class=\"fa-solid fa-forward\" style=\"color: #000000;\"></i>");     
    } else KSA_TIMERS.tickTimer = setTimeout(tick, 125, utDelta, true);
  }
}