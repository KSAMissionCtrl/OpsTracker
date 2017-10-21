// available content height: 480px (initially) / 885px (Max)
function loadVessel(isEmpty) {
  if (isEmpty) {
    console.log("Switching to body page");
  } else {
    console.log("Vessel page loaded");
  }
}

// sends out the AJAX call for data to add any vessels to a GeoGebra figure/Leaflet library once it has loaded
// calls itself repeatedly in the event that the menu is not yet loaded
function loadVesselOrbits() {
  if (isMenuDataLoaded) {
    var strVessels = '';
    var menuNodes = w2ui['menu'].get($("#contentHeader").html().replace(" ", "-")).nodes;
    if (menuNodes.length) {
      strVessels = extractVesselIDs(menuNodes);
      if (strVessels.length) { 
        loadDB("loadVesselOrbitData.asp?crafts=" + strVessels.substring(0, strVessels.length-1) + "&UT=" + currUT(), loadVesselOrbitsAJAX);
        $("#vesselLoaderMsg").spin({ scale: 0.35, position: 'relative', top: '8px', left: '0px' });
        $("#vesselLoaderMsg").fadeIn();
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
    var orbit = {};
    var flightplan = {};
    var dataBlocks = item.split("|");
    var strVesselDB = dataBlocks[0];
  
    // separate the fields of this orbit data
    var fields = dataBlocks[1].split("`");
    if (fields.length > 1) {
      fields.forEach(function(item, index) {
      
        // now get the name/value and assign the object
        var pair = item.split("~");
        if (pair[1] == "") {
          orbit[pair[0]] = null;
        } else if ($.isNumeric(pair[1])) {
          orbit[pair[0]] = parseFloat(pair[1]);
        } else {
          orbit[pair[0]] = pair[1];
        }
      });
    } else { orbit = null; }
    fields = dataBlocks[2].split("`");
    if (fields.length > 1) {
      fields.forEach(function(item, index) {
        var pair = item.split("~");
        if (pair[1] == "") {
          orbit[pair[0]] = null;
        } else if ($.isNumeric(pair[1])) {
          orbit[pair[0]] = parseFloat(pair[1]);
        } else {
          orbit[pair[0]] = pair[1];
        }
      });
    } else { flightplan = null; }
    orbitCatalog.push({ ID: strVesselDB, Orbit: orbit, Flightplan: flightplan });
    if (orbit) { addGGBOrbit(strVesselDB, orbit); }
    
    // check for future updates
    var updates = dataBlocks[3].split("~");
    if (updates[0] != "null") { updatesList.push({ Type: "vessel;orbit", ID: strVesselDB, UT: updates[0] }); }
    if (updates[1] != "null") { updatesList.push({ Type: "vessel;flightplan", ID: strVesselDB, UT: updates[0] }); }
  });
  isOrbitDataLoaded = true;
  $("#vesselLoaderMsg").spin(false);
  $("#vesselLoaderMsg").fadeOut();
  $("#vesselOrbitTypes").fadeIn();

  // make sure a quick figure switch doesn't declutter things too fast
  timeoutHandle = setTimeout(declutterGGB, 2500);
}