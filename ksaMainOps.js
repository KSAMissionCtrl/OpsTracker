var UT;
var timeoutHandle;
var clock = new Date();
var isGGBAppletLoaded = false;
var isCatalogDataLoaded = false;
var isMenuDataLoaded = false;
var isEventDataLoaded = false;
var isOrbitDataLoaded = false;
var UTC = 5;
var launchCountdown = -1;
var maneuverCountdown = -1;
var tickDelta = 0;
var updatesListSize = 0;
var strTinyBodyLabel = "";
var strCurrentBody = "Kerbol";
var strCurrentVessel = "";
var strCurrentCrew = "";
var orbitColors = {probe: "#FFD800", debris: "#ff0000", ship: "#0094FF", station: "#B200FF", asteroid: "#996633"};
var planetLabels = [];
var nodes = [];
var nodesVisible = [];
var ggbOrbits = [];
var pageType;
var craftsMenu = [];
var crewMenu = [];
var distanceCatalog = [];
var bodyCatalog = [];
var partsCatalog = [];
var vesselCatalog = [];
var orbitCatalog = [];
var updatesList = [];

// current game time is the difference between current real time minus number of ms since midnight on 9/13/16
// account for fact that game started during DST and also convert to seconds
UT = ((clock.getTime() - foundingMoment) / 1000);
if (clock.toString().search("Standard") >= 0) { UT += 3600; UTC = 4; }

// handle history state changes
window.onpopstate = function(event) {
  console.log("pop");
  if (event.state.Type == "body") {
    loadBody(event.state.ID);
  }
};

// animate the size of the main content box
function raiseContent() {
  $("#contentBox").css("transform", "translateY(0px)");
  setTimeout(function() { $("#contentBox").css("height", "885px"); }, 400);
}
function lowerContent() {
  $("#contentBox").css("height", "480px");
  setTimeout(function() { $("#contentBox").css("transform", "translateY(405px)"); }, 400);
}

// JQuery setup
$(document).ready(function(){
  $("#timeDate").click(function(){
    timeDateOpen();
    console.log("click");
  });
});

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
                              if ($(this).dialog("option", "title") == "Time & Date Controls") { $("#timeDate").fadeIn(); }
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
  else if (getParameterByName("crew").length) { swapContent("crew", getParameterByName("crew")); }
  else { swapContent("body", getParameterByName("body")); }
}

// switch from one layout to another
function swapContent(newPageType, id) {
  
  // initial page load
  if (!pageType) {
    if (newPageType == "body") {
      $("#contentBox").css('top', '40px');
      $("#contentBox").css('height', '885px');
      $("#contentBox").fadeIn();
      loadBody(id);
    }
    return;
  } 
  
  // not a total content swap, just new data
  if (pageType == newPageType) {
    if (newPageType == "body") { loadBody(id); }
    if (newPageType == "vessel") { loadVessel(id); }
    if (newPageType.includes("crew") ) { loadCrew(id); }
    return;
  } 
  
  // hide the current content
  if (pageType == "body") {
    lowerContent();
    $("#figureOptions").fadeOut();
    $("#vesselOrbitTypes").fadeOut();
    $("#figure").fadeOut();
    $("#figureDialog").dialog("close");
  } else if (pageType == "vessel" && newPageType == "body") {
    $("#infoBox").fadeOut();
    $("#dataBox").fadeOut();
  } else if (pageType == "crew") {
    if (newPageType == "body") {
      $("#infoBox").fadeOut();
      $("#dataBox").fadeOut();
    }
    $("#crewFooter").fadeOut();
    $("#footer").fadeIn();
  } else if (pageType == "crewFull") {
    $("#fullRoster").fadeOut();
  }
  
  // show/load the new content
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
    $("#infoBox").fadeIn();
    $("#infoBox").css("height", "400px");
    $("#infoBox").css("width", "650px");
    $("#dataBox").fadeIn();
    $("#dataBox").css("transform", "translateX(0px)");
    $("#dataBox").css("width", "295px");
    $("#contentBox").fadeIn();
    loadVessel(id);
  } else if (newPageType == "crew") {
    if (id = "fullCrew") {
      $("#infoBox").fadeOut();
      $("#dataBox").fadeOut();
      $("#fullRoster").fadeIn();
    } else {
      $("#infoBox").fadeIn();
      $("#infoBox").css("height", "600px");
      $("#infoBox").css("width", "498px");
      $("#dataBox").fadeIn();
      $("#dataBox").css("transform", "translateX(-154px)");
      $("#dataBox").css("width", "449px");
      $("#crewFooter").fadeIn();
      $("#footer").fadeOut();
      $("#contentBox").fadeOut();
    }
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
  } else if (updateEvent.Type.includes("vessel")) {
    if (updateEvent.Type.split(";")[1] == "orbit") {
      console.log("vessel orbit update");
    } else if (updateEvent.Type.split(";")[1] == "flightplan") {
      console.log("vessel flightplan update");
    }
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
  
  // ensure timer accuracy, even catch up if browser slows tab in background
  // http://www.sitepoint.com/creating-accurate-timers-in-javascript/
  var diff = (new Date().getTime() - clock.getTime()) - tickDelta;
  tickDelta += 1000;
  setTimeout(tick, 1000 - diff);
})();