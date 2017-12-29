var UT;
var timeoutHandle;
var pageType;
var vesselPastUT;
var currentVesselData;
var currentCrewData;
var surfaceMap;
var mapResizeButton;
var mapCloseButton;
var launchsiteMarker;
var mapMarkerTimeout;
var twitterSource;
var clock = new Date();
var isGGBAppletLoaded = false;
var isCatalogDataLoaded = false;
var isMenuDataLoaded = false;
var isEventDataLoaded = false;
var isOrbitDataLoaded = false;
var isGGBAppletLoading = false;
var isDirty = false;
var isTipShow = false;
var isVesselUsingMap = true;
var UTC = 4;
var launchCountdown = -1;
var maneuverCountdown = -1;
var tickDelta = 0;
var updatesListSize = 0;
var vesselRotationIndex = 0;
var planetLabels = [];
var nodes = [];
var nodesVisible = [];
var ggbOrbits = [];
var craftsMenu = [];
var crewMenu = [];
var distanceCatalog = [];
var bodyCatalog = [];
var partsCatalog = [];
var orbitCatalog = [];
var updatesList = [];
var strTinyBodyLabel = "";
var strCurrentBody = "Kerbol";
var strCurrentSystem = "Kerbol-System";
var strCurrentVessel = "";
var strCurrentCrew = "";
var orbitColors = {
  probe: "#FFD800",
  debris: "#ff0000",
  ship: "#0094FF",
  station: "#B200FF",
  asteroid: "#996633"
};  
var srfLocations = {
  KSC: [-0.0972, -74.5577]
};

// get our platform properties for post-launch surveys
// http://stackoverflow.com/questions/11219582/how-to-detect-my-browser-version-and-operating-system-using-javascript
var nVer = navigator.appVersion;
var nAgt = navigator.userAgent;
var browserName  = navigator.appName;
var fullVersion  = ''+parseFloat(navigator.appVersion); 
var majorVersion = parseInt(navigator.appVersion,10);
var nameOffset,verOffset,ix;

// In Opera, the true version is after "Opera" or after "Version"
if ((verOffset=nAgt.indexOf("Opera"))!=-1) {
 browserName = "Opera";
 fullVersion = nAgt.substring(verOffset+6);
 if ((verOffset=nAgt.indexOf("Version"))!=-1) 
   fullVersion = nAgt.substring(verOffset+8);
}

// In MSIE, the true version is after "MSIE" in userAgent
else if ((verOffset=nAgt.indexOf("MSIE"))!=-1) {
 browserName = "Microsoft Internet Explorer";
 fullVersion = nAgt.substring(verOffset+5);
}

// In Chrome, the true version is after "Chrome" 
else if ((verOffset=nAgt.indexOf("Chrome"))!=-1) {
 browserName = "Chrome";
 fullVersion = nAgt.substring(verOffset+7);
}

// In Safari, the true version is after "Safari" or after "Version" 
else if ((verOffset=nAgt.indexOf("Safari"))!=-1) {
 browserName = "Safari";
 fullVersion = nAgt.substring(verOffset+7);
 if ((verOffset=nAgt.indexOf("Version"))!=-1) 
   fullVersion = nAgt.substring(verOffset+8);
}

// In Firefox, the true version is after "Firefox" 
else if ((verOffset=nAgt.indexOf("Firefox"))!=-1) {
 browserName = "Firefox";
 fullVersion = nAgt.substring(verOffset+8);
}

// In most other browsers, "name/version" is at the end of userAgent 
else if ( (nameOffset=nAgt.lastIndexOf(' ')+1) < 
          (verOffset=nAgt.lastIndexOf('/')) ) 
{
 browserName = nAgt.substring(nameOffset,verOffset);
 fullVersion = nAgt.substring(verOffset+1);
 if (browserName.toLowerCase()==browserName.toUpperCase()) {
  browserName = navigator.appName;
 }
}

// trim the fullVersion string at semicolon/space if present
if ((ix=fullVersion.indexOf(";"))!=-1)
   fullVersion=fullVersion.substring(0,ix);
if ((ix=fullVersion.indexOf(" "))!=-1)
   fullVersion=fullVersion.substring(0,ix);
majorVersion = parseInt(''+fullVersion,10);
if (isNaN(majorVersion)) {
 fullVersion  = ''+parseFloat(navigator.appVersion); 
 majorVersion = parseInt(navigator.appVersion,10);
}
var browserDeets = browserName + " (v" + fullVersion + ") [" + navigator.appName + "] [" + navigator.userAgent + "]";
var OSName="Unknown OS";
if (navigator.appVersion.indexOf("Win")!=-1) OSName="Windows";
if (navigator.appVersion.indexOf("Mac")!=-1) OSName="MacOS";
if (navigator.appVersion.indexOf("X11")!=-1) OSName="UNIX";
if (navigator.appVersion.indexOf("Linux")!=-1) OSName="Linux";

// current game time is the difference between current real time minus number of ms since midnight on 9/13/16
// account for fact that game started during DST and also convert to seconds
UT = ((clock.getTime() - foundingMoment) / 1000);
if (clock.toString().search("Standard") >= 0) { UT += 3600; UTC = 5; }
if (getParameterByName("showUT")) { console.log(UT + " " + clock); }

// handle history state changes
window.onpopstate = function(event) { swapContent(event.state.Type, event.state.ID, event.state.UT); };

// animate the size of the main content box
function raiseContent() {
  if ($("#contentBox").css("height") != "885px") {
    $("#contentBox").css("transform", "translateY(0px)");
    setTimeout(function() { 
      $("#contentBox").css("height", "885px");
      $("#map").css("height", "885px");
      surfaceMap.invalidateSize({reset: true});
    }, 400);
  }
}
function lowerContent() {
  if ($("#contentBox").css("height") != "480px") {
    $("#contentBox").css("height", "480px");
    $("#map").css("height", "480px");
      surfaceMap.invalidateSize({reset: true});
    setTimeout(function() { $("#contentBox").css("transform", "translateY(405px)"); }, 400);
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
  $("#figureDialog").spin({ position: 'relative', top: '45px', left: '50%' });

  // setup the clock
  $("#clock").html("<strong>Current Time @ KSC (UTC -" + UTC + ")</strong><br><span id='ksctime' style='font-size: 16px'>" + formatUTCTime(clock, true) + "</span>");

  // select the default crew roster sort
  $('input:radio[name=roster]').filter('[id=name]').prop('checked', true);
  
  // set up for AJAX requests
  // https://www.w3schools.com/xml/ajax_intro.asp
  // don't allow AJAX to cache data, which mainly screws up requests for updated vessel times for notifications
  $.ajaxSetup({ cache: false });
  
  // load data
  // event load then calls menu load
  loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX);
  loadDB("loadBodyData.asp", loadBodyAJAX);
  loadDB("loadPartsData.asp", loadPartsAJAX);
  loadMap();
  
  // setup the planet data dialog box
  // when it is closed, it will return to the top-left of the figure
  $("#figureDialog").dialog({autoOpen: false, 
                      closeOnEscape: true, 
                      resizable: false, 
                      width: "auto",
                      hide: { effect: "fade", duration: 300 }, 
                      show: { effect: "fade", duration: 300 },
                      position: { my: "left top", at: "left top", of: "#contentBox" },
                      close: function( event, ui ) { 
                        $(this).dialog("option", "position", { my: "left top", at: "left top", of: "#contentBox" }); 
                      }});
                      
  // setup the info dialog box that will contain vessel status notes
  // when it is closed, it will return to the center of the info box
  $("#infoDialog").dialog({autoOpen: false, 
                    closeOnEscape: true, 
                    resizable: true, 
                    title: "Additional Information",
                    width: 650,
                    height: 400,
                    hide: { effect: "fade", duration: 300 }, 
                    show: { effect: "fade", duration: 300 },
                    position: { my: "center", at: "center", of: "#infoBox" },
                    close: function( event, ui ) { 
                      $(this).dialog("option", "position", { my: "center", at: "center", of: "#infoBox" }); 
                      $(this).dialog("option", { width: 650, height: 400 }); 
                    }});
  
  // uncheck all the filter boxes
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
    if ($(this).attr("name") == "nodes") { toggleNodes($(this).is(":checked")); }
    if ($(this).attr("name") == "labels") { toggleLabels($(this).is(":checked")); }
    if ($(this).attr("name") == "orbits") { toggleOrbits($(this).is(":checked")); }
    if ($(this).attr("name") == "ref") { toggleRefLine($(this).is(":checked")); }
    if ($(this).attr("id").includes("menu")) { filterVesselMenu($(this).attr("name"), $(this).is(":checked")); }
    if ($(this).attr("id").includes("filter")) { filterVesselOrbits($(this).attr("name"), $(this).is(":checked")); }
  });

  // load page content
  if (getParameterByName("vessel").length) { swapContent("vessel", getParameterByName("vessel")); }
  else if (getParameterByName("body").length) { swapContent("body", getParameterByName("body")); }
  else if (getParameterByName("crew").length) { 
    if (getParameterByName("crew") == "crewFull") { swapContent("crewFull", getParameterByName("crew")); }
    else { swapContent("crew", getParameterByName("crew")); }
  } else { swapContent("body", "Kerbol-System"); }
}

// switch from one layout to another
function swapContent(newPageType, id, ut) {
  if (!ut && !getParameterByName("ut")) { swapContent(newPageType, id, "NaN"); return; }
  if (!ut && getParameterByName("ut")) { swapContent(newPageType, id, parseInt(getParameterByName("ut"))); return; }
  
  // initial page load
  if (!pageType) {
    pageType = newPageType;
    if (newPageType == "body") {
      $("#contentBox").css('top', '40px');
      $("#contentBox").css('height', '885px');
      $("#contentBox").fadeIn();
      loadBody(id);
    }
    if (newPageType == "vessel") {
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
      $("#contentBox").fadeIn();
      $("#fullRoster").fadeIn();
      loadCrew(id);
    }
    if (newPageType == "crew") {
      $("#contentBox").spin(false);
      $("#contentBox").fadeOut();
      $("#infoBox").fadeIn();
      $("#infoBox").css("height", "600px");
      $("#infoBox").css("width", "498px");
      $("#dataBox").fadeIn();
      $("#dataBox").css("transform", "translateX(-154px)");
      $("#dataBox").css("width", "449px");
      $("#crewFooter").fadeIn();
      $("#footer").fadeOut();
      $("#contentBox").fadeOut();
      $("#missionHistory").fadeOut();
      loadCrew(id);
    }
    return;
  } 
  
  // not a total content swap, just new data
  if (pageType == newPageType) {
    if (newPageType == "body") { loadBody(id); }
    if (newPageType == "vessel") { loadVessel(id, ut); }
    if (newPageType == "crew") { loadCrew(id); }
    return;
  }

  // hide the current content
  if (pageType == "body") {
    $("#figureOptions").fadeOut();
    $("#vesselOrbitTypes").fadeOut();
    $("#figure").fadeOut();
    $("#figureDialog").dialog("close");
    removeMapCloseButton();
  } else if (pageType == "vessel") {
  
    // some elements don't need to be hidden if switching to a crew page
    if (newPageType != "crew") {
      $("#infoBox").fadeOut();
      $("#dataBox").fadeOut();
      $("#contentBox").spin(false);
      $("#infoBox").spin(false);
      $("#dataField0").spin(false);
      swapTwitterSource();
    }
    $("#infoDialog").dialog("close");
    $("#map").fadeOut();
    $("#content").fadeOut();
    removeMapResizeButton();
  } else if (pageType == "crew") {
    if (newPageType == "body") {
      $("#infoBox").fadeOut();
      $("#dataBox").fadeOut();
    }
    $("#crewFooter").fadeOut();
    $("#footer").fadeIn();
    $("#infoDialog").dialog("close");
  } else if (pageType == "crewFull") {
    $("#fullRoster").fadeOut();
  }
  
  // show/load the new content
  pageType = newPageType;
  if (newPageType == "body") {
    raiseContent();
    setTimeout(function() { 
      $("#figureOptions").fadeIn();
      if (!$("#asteroid-filter").prop("disabled") || !$("#debris-filter").prop("disabled") || !$("#probe-filter").prop("disabled") || !$("#ship-filter").prop("disabled") || !$("#station-filter").prop("disabled")) { $("#vesselOrbitTypes").fadeIn(); }
      $("#contentBox").fadeIn();
      $("#figure").fadeIn();
      loadBody(id); 
    }, 600);
  } else if (newPageType == "vessel") {
    lowerContent();
    $("#infoBox").fadeIn();
    $("#infoBox").css("height", "400px");
    $("#infoBox").css("width", "650px");
    $("#dataBox").fadeIn();
    $("#dataBox").css("transform", "translateX(0px)");
    $("#dataBox").css("width", "295px");
    $("#contentBox").fadeIn();
    $("#map").css("visibility", "visible");
    if (isVesselUsingMap) { $("#map").fadeIn(); }
    else { $("#content").fadeIn(); }
    loadVessel(id, ut);
  } else if (newPageType == "crew") {
    $("#infoBox").fadeIn();
    $("#infoBox").css("height", "600px");
    $("#infoBox").css("width", "498px");
    $("#dataBox").fadeIn();
    $("#dataBox").css("transform", "translateX(-154px)");
    $("#dataBox").css("width", "449px");
    $("#crewFooter").fadeIn();
    $("#footer").fadeOut();
    $("#contentBox").fadeOut();
    $("#missionHistory").fadeOut();
    loadCrew(id);
  } else if (newPageType == "crewFull") {
    raiseContent();
    $("#infoBox").fadeOut();
    $("#dataBox").fadeOut();
    swapTwitterSource();
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
function updatePage(updateEvent) {
  if (updateEvent.Type.includes("menu")) {
    if (updateEvent.Type.split(";")[1] == "soi") {
      console.log("menu soi update");
    } else if (updateEvent.Type.split(";")[1] == "name") {
      console.log("menu name update");
    } else if (updateEvent.Type.split(";")[1] == "crew") {
      console.log("menu crew update");
    } else { console.log("unknown menu update"); console.log(updateEvent); }
  } else if (updateEvent.Type == "event") {
    if (updateEvent.ID == "launch") {
      console.log("launch update");
    } else if (updateEvent.ID == "maneuver") {
      console.log("maneuver update");
    } else { console.log("unknown event update"); console.log(updateEvent); }
  } else if (updateEvent.Type.includes("vessel") && updateEvent.ID == strCurrentVessel) {
    if (updateEvent.Type.split(";")[1] == "orbit") {
      console.log("vessel orbit update");
    } else if (updateEvent.Type.split(";")[1] == "flightplan") {
      console.log("vessel flightplan update");
    } else if (updateEvent.Type.split(";")[1] == "data") {
      console.log("vessel data update");
    } else if (updateEvent.Type.split(";")[1] == "resources") {
      console.log("vessel resources update");
    } else if (updateEvent.Type.split(";")[1] == "crew") {
      console.log("vessel crew update");
    } else if (updateEvent.Type.split(";")[1] == "comms") {
      console.log("vessel comms update");
    } else if (updateEvent.Type.split(";")[1] == "ports") {
      console.log("vessel ports update");
    } else { console.log("unknown vessel update"); console.log(updateEvent); }
  }
}

// recursively check through updates so we get any that occur at the same time
function checkPageUpdate() {
  if (updatesList.length && currUT() >= updatesList[0].UT) {
    updatePage(updatesList.shift());
    updatesListSize = updatesList.length;
    checkPageUpdate();
  } else { return; }
}

function swapTwitterSource(swap, source) {
  if (swap && source) {
    $("#twitterTimelineSelection").html("Sources: <span class='fauxLink' onclick=\"swapTwitterSource('" + swap + "')\">KSA Main Feed</span> | <b>" + swap + "</b>");
    twitterSource = source;
  } else if (swap && !source) {
    if (twitterSource.split(";").length > 1) { src = twitterSource.split(";")[1]; }
    else { src = twitterSource; }
    $("#twitterTimelineSelection").html("Sources: <b>KSA Main Feed</b> | <span class='fauxLink' onclick=\"swapTwitterSource('" + swap + "', '" + src + "')\">" + swap + "</span>");
  } else if (!swap && !source) {
    $("#twitterTimelineSelection").html("Sources: <b>KSA Main Feed</b>");
  }
  if (!source) { source = "https://twitter.com/KSA_MissionCtrl"; }
  $("#twitterTimeline").html("<a class='twitter-timeline' data-chrome='nofooter noheader' data-height='500' href='"+ source + "'>Loading Tweets...</a> <script async src='https://platform.twitter.com/widgets.js' charset='utf-8'>");
}

// loop and update the page every second
// no longer using setInterval, as suggested via
// http://stackoverflow.com/questions/6685396/execute-the-first-time-the-setinterval-without-delay
(function tick() {

  // sort the update times if new ones have been added since our last check, then look for updates
  if (updatesList.length > updatesListSize) {
    updatesListSize = updatesList.length;
    updatesList.sort(function(a,b) {return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0);} );
    console.log(updatesList); 
  }
  checkPageUpdate();

  // update to the current time
  // add a second to account for tickDelta starting at 0
  var currTime = new Date();
  currTime.setTime(clock.getTime() + tickDelta + 1000);

  // update the clocks
  $('#ksctime').html(formatUTCTime(currTime, true));
  if (launchCountdown > 0) { $('#launchCountdown').html(formatTime(launchCountdown, false)); }
  else if (launchCountdown == 0) { $('#launchCountdown').html("LIFTOFF!!"); }
  if (maneuverCountdown > 0) { $('#maneuverCountdown').html(formatTime(maneuverCountdown, false)); }
  else if (maneuverCountdown == 0) { $('#maneuverCountdown').html("EXECUTE!!"); }
  launchCountdown--;
  maneuverCountdown--;
  
  // update the dynamic orbit figure
  if (isGGBAppletLoaded) { ggbApplet.setValue("UT", currUT()); }
  
  // is there a loaded vessel we need to monitor?
  if (currentVesselData) {
  
    // is the mission still active?
    if (!isMissionEnded()) {
    
      // update the MET or countdown
      $("#metCount").html(formatTime($("#metCount").attr("data")-currUT()));
    }
  }
  
  // update any tooltips
  Tipped.refresh(".tip-update");  
  
  // ensure timer accuracy, even catch up if browser slows tab in background
  // http://www.sitepoint.com/creating-accurate-timers-in-javascript/
  var diff = (new Date().getTime() - clock.getTime()) - tickDelta;
  tickDelta += 1000;
  setTimeout(tick, 1000 - diff);
})();