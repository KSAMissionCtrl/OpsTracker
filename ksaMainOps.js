var UT;
var UTC = 5;
var clock = new Date();
var isGGBAppletLoaded = false;
var strTinyBodyLabel = "";
var planetLabels = [];
var nodes = [];
var nodesVisible = [];
var isCatalogDataLoaded = false;
var isMenuDataLoaded = false;
var isEventDataLoaded = false;
var isOrbitDataLoaded = false;
var pageType;
var craftsMenu = [];
var crewMenu = [];
var distanceCatalog = [];
var bodyCatalog = [];
var partsCatalog = [];
var vesselCatalog = [];
var orbitCatalog = [];
var updatesList = [];
var launchCountdown = -1;
var maneuverCountdown = -1;
var timeoutHandle;
var tickDelta = 0;
var updatesListSize = 0;
var strCurrentBody = "Kerbol";
var strCurrentVessel = "";
var strCurrentCrew = "";
var orbitColors = {probe: "#FFD800", debris: "#ff0000", ship: "#0094FF", station: "#B200FF", asteroid: "#996633"};

// current game time is the difference between current real time minus number of ms since midnight on 9/13/16
// account for fact that game started during DST and also convert to seconds
UT = ((clock.getTime() - foundingMoment) / 1000);
if (clock.toString().search("Standard") >= 0) { UT += 3600; UTC = 4; }

function setupContent() {

  // data load spinners
  $("#contentHeader").spin({ scale: 0.5, position: 'relative', top: '50%', left: '50%' });
  $("#menuBox").spin({ scale: 0.5, position: 'relative', top: '8px', left: '50%' });
  $("#launch").spin({ scale: 0.5, position: 'relative', top: '20px', left: '50%' });
  $("#maneuver").spin({ scale: 0.5, position: 'relative', top: '20px', left: '75%' });

  // setup the clock
  $("#clock").html("<strong>Current Time @ KSC (UTC -" + UTC + ")</strong><br><span id='ksctime' style='font-size: 16px'>" + formatUTCTime(clock, true) + "</span>");

  // select the default crew roster sort
  $('input:radio[name=roster]').filter('[id=name]').prop('checked', true);
  
  // set up for AJAX requests
  // https://www.w3schools.com/xml/ajax_intro.asp
  // don't allow AJAX to cache data, which mainly screws up requests for updated vessel times for notifications
  $.ajaxSetup({ cache: false });
  
  // load data
  loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX);
  loadDB("loadBodyData.asp", loadBodyAJAX);
  
  // prep & load page
  if (getParameterByName("vessel").length) { setupVessel(); }
  else if (getParameterByName("body").length) { setupBody(); }
  else if (getParameterByName("crew").length) { setupCrew(); }
  else { setupBody(); }

  // checkbox handling needed for dynamic figure & menu filters
  // ensure some start checked, then handle any changes
  $("#nodes").prop('checked', true);
  $("#labels").prop('checked', true);
  $("#ref").prop('checked', true);
  $("input").change(function () {
    if ($(this).attr("name") == "nodes") { toggleNodes($(this).is(":checked")); }
    if ($(this).attr("name") == "labels") { toggleLabels($(this).is(":checked")); }
    if ($(this).attr("name") == "ref") { toggleRefLine($(this).is(":checked")); }
    if ($(this).attr("id") == "filter") { filterVesselMenu($(this).attr("name"), $(this).is(":checked")); }
    
    /*
        nodes.forEach(function(item, index) { 
          ggbApplet.setVisible(item, true);
        });
      } else  {
        planetLabels.forEach(function(item, index) {
          ggbApplet.setLabelVisible(item, true);
        });
      } else  {
        ggbApplet.setVisible("RefLine", true);
      } else { filterVesselMenu($(this).attr("name"), true); }
    } else {
      if ($(this).attr("name") == "nodes") {
        nodes.forEach(function(item, index) {
        
          // don't hide the nodes if they were shown individually
          if (!nodesVisible.includes(item.charAt(0))) {
            ggbApplet.setVisible(item, false);
          }
        });
      } else if ($(this).attr("name") == "labels") {
        planetLabels.forEach(function(item, index) {
        
          // only hide labels for planets not explicitly shown
          if (!strTinyBodyLabel.includes(item.charAt(0))) { ggbApplet.setLabelVisible(item, false); }
        });
      } else if ($(this).attr("name") == "ref") {
        ggbApplet.setVisible("RefLine", false);
      } else if ($(this).attr("id") == "filter") { 
        filterVesselMenu($(this).attr("name"), false); 
      } else if ($(this).attr("id") == "orbit") { 
        
      }
    }*/
  });
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
  var currTime = new Date();
  currTime.setTime(clock.getTime() + tickDelta);

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