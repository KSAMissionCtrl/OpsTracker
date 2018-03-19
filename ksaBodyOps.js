// load a new GeoGebra figure into the main content window
function loadBody(body, flt) {
  
  // an attempt was made to load orbital data for an inactive vessel
  if (body == "inactive") { return; }

  // if there is already a body loading then try calling back later
  if (isGGBAppletLoading) {
    setTimeout(function() {
      loadBody(body);
    }, 1000)
    return;
  }
  isGGBAppletLoading = true;
  
  // select and show it in the menu - if we can't do this now it'll get called again after GGB init
  if (isMenuDataLoaded && !flt && !window.location.href.includes("flt")) {
    w2ui['menu'].select(body);
    w2ui['menu'].expandParents(body);
    w2ui['menu'].scrollIntoView(body);       
  }  
  
  // hide the map just in case its open
  hideMap();

  // do not do any of this if the current page is not set to body
  // in that case a vessel page is changing the figure because the current vessel orbit was not loaded
  if (pageType != "vessel") {

    // default to kerbol system
    if (!body.length) { body = "Kerbol-System"; }
    $("#contentHeader").html(body.replace("-", " "));
    document.title = "KSA Operations Tracker" + " - " + body.replace("-", " ");
    
    // if this is the first page to load, replace the current history
    // don't create a new entry if this is the same page being reloaded
    if (!history.state) {
      if (window.location.href.includes("&")) var strURL = window.location.href;
      else strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?body=" + body;
      history.replaceState({Type: "body", ID: body}, document.title, strURL); 
    } else if (history.state.ID != body) {
      var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?body=" + body;
      if (flt) strURL += "&flt=" + flt;
      history.pushState({Type: "body", ID: body}, document.title, strURL); 
    }

    // for tag loading
    // $("#contentHeader").spin({ scale: 0.35, position: 'relative', top: '10px', left: (((955/2) + (body.width('bold 32px arial')/2)) + 10) +'px' });

    // if body is already loaded, then just exit
    if (isGGBAppletLoaded && strCurrentBody == body) { 
      if (isDirty) {
        ggbApplet.reset();
        isDirty = false;
      }
      isGGBAppletLoading = false;
      return;
    }
  
  // if this is a vessel page calling the load then set a flag to let us know the figure will need to be reset next time it is shown
  } else if (pageType == "vessel") { isDirty = true; }

  // update the current body & system
  strCurrentBody = body;
  
  // hide and reset stuff
  $("#figureDialog").dialog("close");
  isGGBAppletLoaded = false;
  strCurrentVessel = "undefined";
  $("#figureOptions").fadeOut();
  $("#nodes").prop('checked', true);
  $("#labels").prop('checked', true);
  $("#orbits").prop('checked', true);
  $("#ref").prop('checked', true);
  
  // remove and add the figure container
  $("#figure").remove();
  $("#contentBox").append("<div id='figure'></div>");
  
  // hide it if this isn't a body page
  if (pageType != "body") { $("#figure").hide(); } 

  // hide & disable the filters
  $("#vesselOrbitTypes").fadeOut();
  $("#asteroid-filter").prop("disabled", true);
  $("#debris-filter").prop("disabled", true);
  $("#probe-filter").prop("disabled", true);
  $("#ship-filter").prop("disabled", true);
  $("#station-filter").prop("disabled", true);

  // setup GeoGebra
  // use a random number to always load a new file not from cache
  // can use cookies to check for prev version and load new cache if needed
  var parameters = {"prerelease":false,
                    "width":w2utils.getSize("#contentBox", 'width'),
                    "height":885,
                    "showToolBar":false,
                    "borderColor":null,
                    "showMenuBar":false,
                    "showAlgebraInput":false,
                    "showResetIcon":true,
                    "enableLabelDrags":false,
                    "enableShiftDragZoom":true,
                    "enableRightClick":false,
                    "capturingThreshold":null,
                    "showToolBarHelp":false,
                    "errorDialogsActive":true,
                    "useBrowserForJS":true,
                    "filename":"ggb/" + body + ".ggb"};
  var views = {"is3D":1};
  var applet = new GGBApplet('5.0', parameters, views);
  applet.inject('figure');
  
  // restart spinner so its on top of figure
  $("#contentBox").spin({ position: 'relative', top: '50%', left: '50%' });
}

// load the data for all the bodies in the Kerbol system
function loadBodyAJAX(xhttp) {

  // separate each of the bodies and their fields
  var bodies = xhttp.responseText.split("|");
  
  // push each body into the array
  bodies.forEach(function(item) {
    bodyCatalog.push(rsToObj(item));  
  });
  console.log(bodyCatalog);
  $("#figureDialog").spin(false);
}

// called after load and after user clicks the reset
function ggbOnInit() {
  console.log("ggbOnInit()");
  
  // reset all the orbits since the figure itself is reset
  ggbOrbits = [];
  
  // reset all the checkboxes
  $("#nodes").prop('checked', true);
  $("#labels").prop('checked', true);
  $("#orbits").prop('checked', true);
  $("#ref").prop('checked', true);
  $("#soi").prop('checked', true);

  // disable the spinner & show checkboxes if this is the first load
  if (!isGGBAppletLoaded && pageType == "body") { 
    $("#contentBox").spin(false); 
    if (!window.location.href.includes("&map")) { $("#figureOptions").fadeIn(); }
  }
  
  // loop through and catalog all the pre-made objects
  var bodyIDs = [];
  for (obj=0; obj<ggbApplet.getObjectNumber(); obj++) {

    // is this a unique identifier? Look for a letter followed by a number, ignore A
    if (ggbApplet.getObjectName(obj).charAt(0) != "A" && (bodyIDs.indexOf(ggbApplet.getObjectName(obj).charAt(0)) == -1 && $.isNumeric(ggbApplet.getObjectName(obj).charAt(1)))) {
    
      // add this identifier to the orbits list and also keep track that we've already used it
      ggbOrbits.push({Type: "body", ID: ggbApplet.getObjectName(obj).charAt(0), showName: false, showNodes: false, isSelected: false, isHidden: false});
      bodyIDs.push(ggbApplet.getObjectName(obj).charAt(0));
    }
  }
  console.log(ggbOrbits);

  // bring figure body locations up to date
  // account for any time elapsed since page load
  ggbApplet.setValue("UT", currUT());
  
  // listen for any objects clicked on
  ggbApplet.registerClickListener("figureClick");
  
  // select and show it in the menu if this is the proper page type because the figure can load after a vessel was already selected
  if (pageType == "body" && !window.location.href.includes("flt")) {
    w2ui['menu'].select(strCurrentBody);
    w2ui['menu'].expandParents(strCurrentBody);
    w2ui['menu'].scrollIntoView(strCurrentBody);
  }
    
  // declutter the view after a few seconds
  // make sure a quick figure switch doesn't declutter things too fast
  clearTimeout(timeoutHandle);
  timeoutHandle = setTimeout(declutterGGB, 2500);
  
  // load additional data
  loadMap();
  vesselsToLoad = extractIDs(w2ui['menu'].get(strCurrentBody).nodes).split(";");
  if (vesselsToLoad.length > 1) {
    $("#vesselLoaderMsg").spin({ scale: 0.35, position: 'relative', top: '8px', left: '0px' });
    $("#vesselLoaderMsg").fadeIn();
    clearTimeout(timeoutHandle);
    loadVesselOrbits();
  } else isGGBAppletLoaded = true; isGGBAppletLoading = false;
}

// adds to the figure the orbits of any vessels around this body
function loadVesselOrbits() {
  if (isMenuDataLoaded) {
    
    // try to find the vessel in the catalog and add it if it's there, removing it from the array
    // take into account vessels with no orbital data, which will just be removed
    // if it's not there, call for the data and wait for it to be returned
    var vessel = opsCatalog.find(o => o.ID === vesselsToLoad[0]);
    if (vessel && vessel.CurrentData && vessel.CurrentData.Orbit) addGGBOrbit(vesselsToLoad.shift(), vessel.CurrentData.Orbit);
    if (vessel && vessel.CurrentData && !vessel.CurrentData.Orbit) vesselsToLoad.shift();
    else if (vessel && !vessel.CurrentData && !vessel.isLoading) {
      loadDB("loadOpsData.asp?db=" + vessel.ID + "&UT=" + currUT() + "&type=" + vessel.Type + "&pastUT=NaN", loadOpsDataAJAX);
    } else if (!vessel) vesselsToLoad.shift();
    
    // callback if there is still data to load
    if (vesselsToLoad.length) setTimeout(loadVesselOrbits, 1);
    else {
      isGGBAppletLoaded = true;
      isGGBAppletLoading = false;
      $("#vesselLoaderMsg").spin(false);
      $("#vesselLoaderMsg").fadeOut();
      if ($("#figure").is(":visible")) { 
        $("#vesselOrbitTypes").fadeIn(); 
        
        // check again in a few ms just in case we popped up as the figure was fading out
        setTimeout(function() { if (!$("#figure").is(":visible")) $("#vesselOrbitTypes").hide(); }, 500);
      }
      timeoutHandle = setTimeout(declutterGGB, 2500);
    }
  } else { setTimeout(loadVesselOrbits, 150); }
}

// creates an orbit on the currently-loaded GeoGebra figure
function addGGBOrbit(vesselID, orbitData) {
    
    // we need to ensure the body data is loaded first
    if (!bodyCatalog) setTimeout(addGGBOrbit, 150, vesselID, orbitData);
    
    // need the data of the body this vessel is in orbit around
    // get the current body being orbited using its parent node in the menu
    // then look it up in the body catalog
    var strBodyName = w2ui['menu'].get('activeVessels', vesselID).parent.id.split("-")[0];
    var bodyData = bodyCatalog.find(o => o.Body === strBodyName);
    
    // type of vessel so we can color things appropriately
    var strVesselType = w2ui['menu'].get('activeVessels', vesselID).img.split("-")[1];
    
    // enable this vessel type in the filters menu
    $("#" + strVesselType + "-filter").removeAttr("disabled");
    $("#" + strVesselType + "-filter").prop('checked', true);
    $("#" + strVesselType + "-label").css('color', orbitColors[strVesselType]);
    
    // convert the vessel id to a variable name suitable for GeoGebra then load the vessel into the figure
    ggbID = vesselID.replace("-", "");
    ggbApplet.evalCommand(ggbID + 'id="' + vesselID + '"');
    ggbApplet.evalCommand(ggbID + 'sma=' + orbitData.SMA);
    ggbApplet.evalCommand(ggbID + 'pe=' + (orbitData.Periapsis + bodyData.Radius));
    ggbApplet.evalCommand(ggbID + 'ap=' + (orbitData.Apoapsis + bodyData.Radius));
    ggbApplet.evalCommand(ggbID + 'ecc=' + orbitData.Eccentricity);
    ggbApplet.evalCommand(ggbID + 'inc=' + (orbitData.Inclination * .017453292519943295));
    ggbApplet.evalCommand(ggbID + 'raan=' + (orbitData.RAAN * .017453292519943295));
    ggbApplet.evalCommand(ggbID + 'arg=' + (orbitData.Arg * .017453292519943295));
    ggbApplet.evalCommand(ggbID + 'period=' + orbitData.OrbitalPeriod);
    ggbApplet.evalCommand(ggbID + 'mean=' + toMeanAnomaly(orbitData.TrueAnom, orbitData.Eccentricity));
    ggbApplet.evalCommand(ggbID + 'smna=' + ggbID + 'sma sqrt(1 - ' + ggbID + 'ecc^2)');
    ggbApplet.evalCommand(ggbID + 'foci=' + ggbID + 'ap - ' + ggbID + 'pe');
    ggbApplet.evalCommand(ggbID + 'meanmotion=2pi / ' + ggbID + 'period');
    ggbApplet.evalCommand(ggbID + 'obtaxis=Line(origin, Vector((1; ' + ggbID + 'raan - pi / 2; pi / 2 - ' + ggbID + 'inc)))');
    ggbApplet.setVisible(ggbID + 'obtaxis', false);
    ggbApplet.evalCommand(ggbID + 'secondfocus=Rotate(Rotate((' + ggbID + 'foci; 0; 0), ' + ggbID + 'raan, zAxis), ' + ggbID + 'arg + pi, ' + ggbID + 'obtaxis)');
    ggbApplet.setVisible(ggbID + 'secondfocus', false);
    ggbApplet.evalCommand(ggbID + 'refpoint=Rotate(Rotate((' + ggbID + 'sma; 0; 0), ' + ggbID + 'raan, zAxis), ' + ggbID + 'arg - acos(-' + ggbID + 'ecc), ' + ggbID + 'obtaxis)');
    ggbApplet.setVisible(ggbID + 'refpoint', false);
    ggbApplet.evalCommand(ggbID + 'conic=Ellipse(origin, ' + ggbID + 'secondfocus, ' + ggbID + 'refpoint)');
    ggbApplet.setColor(ggbID + 'conic', hexToRgb(orbitColors[strVesselType]).r, hexToRgb(orbitColors[strVesselType]).g, hexToRgb(orbitColors[strVesselType]).b);
    ggbApplet.evalCommand(ggbID + 'penode=Point(' + ggbID + 'conic, 0)');
    ggbApplet.setCaption(ggbID + 'penode', "Pe");
    ggbApplet.setLabelStyle(ggbID + 'penode', 3);
    ggbApplet.setLabelVisible(ggbID + 'penode', true);
    ggbApplet.setColor(ggbID + 'penode', 0, 153, 255);
    ggbApplet.setPointSize(ggbID + 'penode', 3);
    ggbApplet.setFixed(ggbID + 'penode', true, false);
    ggbApplet.evalCommand(ggbID + 'apnode=Point(' + ggbID + 'conic, 0.5)');
    ggbApplet.setCaption(ggbID + 'apnode', "Ap");
    ggbApplet.setLabelStyle(ggbID + 'apnode', 3);
    ggbApplet.setLabelVisible(ggbID + 'apnode', true);
    ggbApplet.setColor(ggbID + 'apnode', 0, 153, 255);
    ggbApplet.setPointSize(ggbID + 'apnode', 3);
    ggbApplet.setFixed(ggbID + 'apnode', true, false);
    ggbApplet.evalCommand(ggbID + 'anode=If(' + ggbID + 'inc != 0, Element({Intersect(xOyPlane, ' + ggbID + 'conic)}, 1), Point(' + ggbID + 'conic, ' + ggbID + 'raan / (2pi)))');
    ggbApplet.setCaption(ggbID + 'anode', "AN");
    ggbApplet.setLabelStyle(ggbID + 'anode', 3);
    ggbApplet.setLabelVisible(ggbID + 'anode', true);
    ggbApplet.setColor(ggbID + 'anode', 51, 255, 0);
    ggbApplet.setPointSize(ggbID + 'anode', 3);
    ggbApplet.setFixed(ggbID + 'anode', true, false);
    ggbApplet.evalCommand(ggbID + 'anodeta=If(' + ggbID + 'arg != 0, Angle(' + ggbID + 'penode, origin, ' + ggbID + 'anode), 0)');
    ggbApplet.evalCommand(ggbID + 'anodeea=If(' + ggbID + 'anodeta > pi, 2pi - acos((' + ggbID + 'ecc + cos(' + ggbID + 'anodeta)) / (1 + ' + ggbID + 'ecc cos(' + ggbID + 'anodeta))), acos((' + ggbID + 'ecc + cos(' + ggbID + 'anodeta)) / (1 + ' + ggbID + 'ecc cos(' + ggbID + 'anodeta))))');
    ggbApplet.evalCommand(ggbID + 'anodema=' + ggbID + 'anodeea - ' + ggbID + 'ecc sin(' + ggbID + 'anodeea)');
    ggbApplet.evalCommand(ggbID + 'dnode=If(' + ggbID + 'inc != 0, Element({Intersect(xOyPlane, ' + ggbID + 'conic)}, 2), Point(' + ggbID + 'conic, (' + ggbID + 'raan + pi) / (2pi)))');
    ggbApplet.setCaption(ggbID + 'dnode', "DN");
    ggbApplet.setLabelStyle(ggbID + 'dnode', 3);
    ggbApplet.setLabelVisible(ggbID + 'dnode', true);
    ggbApplet.setColor(ggbID + 'dnode', 51, 255, 0);
    ggbApplet.setPointSize(ggbID + 'dnode', 3);
    ggbApplet.setFixed(ggbID + 'dnode', true, false);
    ggbApplet.evalCommand(ggbID + 'maut=Mod(' + ggbID + 'mean + ' + ggbID + 'meanmotion (UT-' + orbitData.Eph + '), 2pi)');
    ggbApplet.evalCommand(ggbID + 'eaut=Iteration(M - (M - ' + ggbID + 'ecc sin(M) - ' + ggbID + 'maut) / (1 - ' + ggbID + 'ecc cos(M)), M, {' + ggbID + 'maut}, 20)');
    ggbApplet.evalCommand(ggbID + 'position=Point(' + ggbID + 'conic, ' + ggbID + 'eaut / (2pi))');
    ggbApplet.setCaption(ggbID + 'position', w2ui['menu'].get('activeVessels', vesselID).text.split(">")[1].split("<")[0]);
    ggbApplet.setLabelStyle(ggbID + 'position', 3);
    ggbApplet.setPointSize(ggbID + 'position', 2);
    ggbApplet.setLabelVisible(ggbID + 'position', true);
    ggbApplet.setColor(ggbID + 'position', hexToRgb(orbitColors[strVesselType]).r, hexToRgb(orbitColors[strVesselType]).g, hexToRgb(orbitColors[strVesselType]).b);
    
    // add this vessel type and ID to the orbits array for filtering
    ggbOrbits.push({Type: strVesselType, ID: ggbID, showName: false, showNodes: false, isSelected: false, isHidden: false});
}

// remove all the nodes and names for everything in the figure and store them for future use
function declutterGGB() {
  
  // hide figure elements
  // for orbits, local settings override declutter
  ggbApplet.setVisible("RefLine", false);
  ggbOrbits.forEach(function(item, index) { 
    if (!item.showNodes) {
      if (item.Type == "body") {
        ggbApplet.setVisible(item.ID + "26", false);
        ggbApplet.setVisible(item.ID + "27", false);
        ggbApplet.setVisible(item.ID + "28", false);
        ggbApplet.setVisible(item.ID + "32", false);
        ggbApplet.setVisible(item.ID + "39", false);
      } else {
        ggbApplet.setVisible(item.ID + "apnode", false);
        ggbApplet.setVisible(item.ID + "penode", false);
        ggbApplet.setVisible(item.ID + "anode", false);
        ggbApplet.setVisible(item.ID + "dnode", false);
      }
    }
    if (!item.showName) {
      if (item.Type == "body") {
        ggbApplet.setLabelVisible(item.ID + "36", false);
      } else {
        ggbApplet.setLabelVisible(item.ID + "position", false);
      }
    }
  });

  // uncheck the affected boxes
  $("#nodes").prop('checked', false);
  $("#labels").prop('checked', false);
  $("#ref").prop('checked', false);
  $("#soi").prop('checked', false);
  
  // nullify to let anyone else know this has already happened
  timeoutHandle = null;
}

// handle any objects that are clicked in the GeoGebra figure
function figureClick(object) {
  if (object == "RefLine") {
    ggbApplet.evalCommand("SetViewDirection((0,0,1), true)");
    return;
  }
  
  // show label if clicked on an orbit
  // hide label if click on another orbit or the same orbit
  // make sure the labels box is not checked
  if (object.includes("23")) {
    if (!$("#labels").is(":checked")) {
      if (strTinyBodyLabel == object) {
        ggbApplet.setLabelVisible(strTinyBodyLabel.charAt(0) + "36", false);
        ggbOrbits.find(o => o.ID === object.charAt(0)).showName = false;
        strTinyBodyLabel = "";
      } else {
        if (strTinyBodyLabel.length) {
          if (strTinyBodyLabel.includes("23")) {
            ggbApplet.setLabelVisible(strTinyBodyLabel.charAt(0) + "36", false);
          } else {
            var objID = strTinyBodyLabel.replace("conic", "");
            ggbApplet.setLabelVisible(objID + "position", false);
            ggbApplet.setVisible(objID + "penode", false);
            ggbApplet.setVisible(objID + "apnode", false);
            ggbApplet.setVisible(objID + "anode", false);
            ggbApplet.setVisible(objID + "dnode", false);
          }
        }
        ggbOrbits.find(o => o.ID === object.charAt(0)).showName = true;
        ggbApplet.setLabelVisible(object.charAt(0) + "36", true);
        strTinyBodyLabel = object;
      }
    }
    return;
  
  // for a vessel/asteroid
  } else if (object.includes("conic")) {
    if (strTinyBodyLabel == object) {
      var objID = strTinyBodyLabel.replace("conic", "");
      if (!$("#labels").is(":checked")) { ggbApplet.setLabelVisible(objID + "position", false); }
      if (!$("#nodes").is(":checked")) { 
        ggbApplet.setVisible(objID + "penode", false);
        ggbApplet.setVisible(objID + "apnode", false);
        ggbApplet.setVisible(objID + "anode", false);
        ggbApplet.setVisible(objID + "dnode", false);
      }
      ggbOrbits.find(o => o.ID === objID).showName = false;
      ggbOrbits.find(o => o.ID === objID).showNodes = false;
      strTinyBodyLabel = "";
    } else {
      if (strTinyBodyLabel.length) {
        if (strTinyBodyLabel.includes("23")) {
          ggbApplet.setLabelVisible(strTinyBodyLabel.charAt(0) + "36", false);
        } else {
          var objID = strTinyBodyLabel.replace("conic", "");
          if (!$("#labels").is(":checked")) { ggbApplet.setLabelVisible(objID + "position", false); }
          if (!$("#nodes").is(":checked")) { 
            ggbApplet.setVisible(objID + "penode", false);
            ggbApplet.setVisible(objID + "apnode", false);
            ggbApplet.setVisible(objID + "anode", false);
            ggbApplet.setVisible(objID + "dnode", false);
          }
          ggbOrbits.find(o => o.ID === objID).showName = false;
          ggbOrbits.find(o => o.ID === objID).showNodes = false;
        }
      }
      var objID = object.replace("conic", "");
      ggbApplet.setLabelVisible(objID + "position", true);
      ggbApplet.setVisible(objID + "penode", true);
      ggbApplet.setVisible(objID + "apnode", true);
      ggbApplet.setVisible(objID + "anode", true);
      ggbApplet.setVisible(objID + "dnode", true);
      ggbOrbits.find(o => o.ID === objID).showName = true;
      ggbOrbits.find(o => o.ID === objID).showNodes = true;
      strTinyBodyLabel = object;
    }
    return;
  }

  // clicked on a planet?
  if (object.includes("36") || object.includes("37")) {

    // show the planet data
    if (bodyCatalog.length) {
      var strBodyName = ggbApplet.getCaption(object.charAt(0) + "36");
      var strHTML = "<table style='border: 0px; border-collapse: collapse;'><tr><td style='vertical-align: top; width: 256px;'>";
      var bodyData = bodyCatalog.find(o => o.Body === strBodyName);
      if (bodyData.Image) {
        strHTML += "<img src='" + bodyData.Image + "' style='background-color:black;'>";
      } else {
        strHTML += "<img src='https://i.imgur.com/advRrs1.png'>";
      }
      strHTML += "<i><p>&quot;" + bodyData.Desc + "&quot;</p></i><p><b>- Kerbal Astronomical Society</b></p></td>";
      strHTML += "<td style='vertical-align: top; padding: 0px; margin-top: 0px'><b>Orbital Data</b>";
      strHTML += "<p>Apoapsis: " + bodyData.Ap + " m<br>";
      strHTML += "Periapsis: " + bodyData.Pe + " m<br>";
      strHTML += "Eccentricity: " + bodyData.Ecc + "<br>";
      strHTML += "Inclination: "+ bodyData.Inc + "&deg;<br>";
      strHTML += "Orbital period: " + formatTime(bodyData.ObtPeriod, false) + "<br>";
      strHTML += "Orbital velocity: " + bodyData.ObtVel + " m/s</p><p><b>Physical Data</b></p>";
      strHTML += "<p>Equatorial radius: " + numeral(bodyData.Radius*1000).format('0,0') + " m<br>";
      strHTML += "Mass: " + bodyData.Mass.replace("+", "e") + " kg<br>";
      strHTML += "Density: " + bodyData.Density + " kg/m<sup>3</sup><br>";
      gravity = bodyData.SurfaceG.split(":");
      strHTML += "Surface gravity: " + gravity[0] + " m/s<sup>2</sup> <i>(" + gravity[1] + " g)</i><br>";
      strHTML += "Escape velocity: " + bodyData.EscapeVel + " m/s<br>";
      strHTML += "Rotational period: " + formatTime(bodyData.SolarDay, true) + "<br>";
      strHTML += "Atmosphere: " + bodyData.Atmo + "</p>";
      if (bodyData.Moons) { strHTML += "<p><b>Moons</b></p><p>" + bodyData.Moons + "</p>"; }
      if (getParameterByName("body") == "Kerbin-System" && strBodyName == "Kerbin") {
        strHTML += "<p><span onclick='showMap()' style='cursor: pointer; color: blue; text-decoration: none;'>View Surface</span> | ";
      } else if (bodyData.Moons && !$("#contentHeader").html().includes(strBodyName)) {
        strHTML += "<span class='fauxLink' onclick='loadBody(&quot;" + strBodyName + "-System&quot;)'>View System</span> | "
      }
      // no nodes to show unless body has an eccentric or inclined orbit
      if ((parseFloat(bodyData.Ecc) || parseFloat(bodyData.Inc)) && !$("#contentHeader").html().includes(strBodyName)) {
        if (ggbOrbits.find(o => o.ID === object.charAt(0)).showNodes) {
          strHTML += "<span onclick='nodesToggle(&quot;" + object + "&quot;)' style='cursor: pointer; color: blue;'>Hide Nodes</span>"
        } else {
          strHTML += "<span onclick='nodesToggle(&quot;" + object + "&quot;)' style='cursor: pointer; color: blue;'>Show Nodes</span>"
        }
      } else { strHTML = strHTML.substring(0, strHTML.length-2); }
      strHTML += "</p></td></tr></table>";
    }
    $("#figureDialog").dialog("option", "title", strBodyName);
    $("#figureDialog").html(strHTML);
    $("#figureDialog").dialog("open");
    
    // show the orbit if the orbits are hidden
    if (!$("#orbits").is(":checked")) {
      
      // first find any other object that is selected and hide its orbit and nodes
      var selectedObj = ggbOrbits.find(o => o.isSelected === true);
      if (selectedObj) { 
        selectedObj.isSelected = false;
        if (selectedObj.Type == "body") {
          ggbApplet.setVisible(selectedObj.ID + "23", false); 
          ggbApplet.setVisible(selectedObj.ID + "26", false);
          ggbApplet.setVisible(selectedObj.ID + "27", false);
          ggbApplet.setVisible(selectedObj.ID + "28", false);
          ggbApplet.setVisible(selectedObj.ID + "32", false);
        } else {
          ggbApplet.setVisible(selectedObj.ID + "conic", false); 
          ggbApplet.setVisible(selectedObj.ID + "apnode", false);
          ggbApplet.setVisible(selectedObj.ID + "penode", false);
          ggbApplet.setVisible(selectedObj.ID + "anode", false);
          ggbApplet.setVisible(selectedObj.ID + "dnode", false);
        }
      }
      
      // only show the orbit (and nodes?) if we didn't click on ourselves or didn't find an object
      if (!selectedObj || selectedObj.ID != object.charAt(0)) {
        selectedObj = ggbOrbits.find(o => o.ID === object.charAt(0));
        selectedObj.isSelected = true;
        ggbApplet.setVisible(selectedObj.ID + "23", true);
        if (selectedObj.showNodes || $("#nodes").is(":checked")) {
          ggbApplet.setVisible(selectedObj.ID + "26", true);
          ggbApplet.setVisible(selectedObj.ID + "27", true);
          ggbApplet.setVisible(selectedObj.ID + "28", true);
          ggbApplet.setVisible(selectedObj.ID + "32", true);
        }
      }
    }
    return;
  }
  
  // clicked on a vessel/asteroid?
  if (object.includes("position")) {
    $("#figureDialog").dialog("close");
  
    // show the orbit if the orbits are hidden
    if (!$("#orbits").is(":checked")) {
      
      // first find any other object that is selected and hide its orbit and nodes
      var selectedObj = ggbOrbits.find(o => o.isSelected === true);
      if (selectedObj) { 
        selectedObj.isSelected = false;
        if (selectedObj.Type == "body") {
          ggbApplet.setVisible(selectedObj.ID + "23", false); 
          ggbApplet.setVisible(selectedObj.ID + "26", false);
          ggbApplet.setVisible(selectedObj.ID + "27", false);
          ggbApplet.setVisible(selectedObj.ID + "28", false);
          ggbApplet.setVisible(selectedObj.ID + "32", false);
        } else {
          ggbApplet.setVisible(selectedObj.ID + "conic", false); 
          ggbApplet.setVisible(selectedObj.ID + "apnode", false);
          ggbApplet.setVisible(selectedObj.ID + "penode", false);
          ggbApplet.setVisible(selectedObj.ID + "anode", false);
          ggbApplet.setVisible(selectedObj.ID + "dnode", false);
        }
      }
      
      // only show the orbit (and nodes?) if we didn't click on ourselves or didn't find an object
      if (!selectedObj || selectedObj.ID != object.replace("position" , "")) {
        selectedObj = ggbOrbits.find(o => o.ID === object.replace("position" , ""));
        selectedObj.isSelected = true;
        ggbApplet.setVisible(selectedObj.ID + "conic", true);
        if (selectedObj.showNodes || $("#nodes").is(":checked")) {
          ggbApplet.setVisible(selectedObj.ID + "apnode", true);
          ggbApplet.setVisible(selectedObj.ID + "penode", true);
          ggbApplet.setVisible(selectedObj.ID + "anode", true);
          ggbApplet.setVisible(selectedObj.ID + "dnode", true);
        }
      }
    }
    
    // if we clicked on ourselves after the orbit was selected, then jump to the vessel view
    if (strTinyBodyLabel.replace("conic", "") == object.replace("position" , "")) { 
      swapContent("vessel", ggbApplet.getValueString(object.replace("position", "id")));
      
    // otherwise select the orbit
    } else {
      if (strTinyBodyLabel.length) {
        if (strTinyBodyLabel.includes("23")) {
          ggbApplet.setLabelVisible(strTinyBodyLabel.charAt(0) + "36", false);
        } else {
          var objID = strTinyBodyLabel.replace("conic", "");
          if (!$("#labels").is(":checked")) { ggbApplet.setLabelVisible(objID + "position", false); }
          if (!$("#nodes").is(":checked")) { 
            ggbApplet.setVisible(objID + "penode", false);
            ggbApplet.setVisible(objID + "apnode", false);
            ggbApplet.setVisible(objID + "anode", false);
            ggbApplet.setVisible(objID + "dnode", false);
          }
          ggbOrbits.find(o => o.ID === objID).showName = false;
          ggbOrbits.find(o => o.ID === objID).showNodes = false;
        }
      }
      var objID = object.replace("position", "");
      ggbApplet.setLabelVisible(objID + "position", true);
      ggbApplet.setVisible(objID + "penode", true);
      ggbApplet.setVisible(objID + "apnode", true);
      ggbApplet.setVisible(objID + "anode", true);
      ggbApplet.setVisible(objID + "dnode", true);
      ggbOrbits.find(o => o.ID === objID).showName = true;
      ggbOrbits.find(o => o.ID === objID).showNodes = true;
      strTinyBodyLabel = object.replace("position", "conic");
    }
    return;
  }
}

function nodesToggle(object) {
  if ($('#figureDialog').html().includes("Show Nodes")) {
    $('#figureDialog').html($('#figureDialog').html().replace("Show Nodes", "Hide Nodes"));
    if (ggbApplet.getCaption(object.charAt(0) + "36") == "Priax") { object = object.replace("D", "C"); }
    ggbApplet.setVisible(object.charAt(0) + "26", true);
    ggbApplet.setVisible(object.charAt(0) + "27", true);
    ggbApplet.setVisible(object.charAt(0) + "28", true);
    ggbApplet.setVisible(object.charAt(0) + "32", true);
    
    // https://stackoverflow.com/questions/12462318/find-a-value-in-an-array-of-objects-in-javascript
    ggbOrbits.find(o => o.ID === object.charAt(0)).showNodes = true;
    if (ggbApplet.getCaption(object.charAt(0) + "36") == "Polta") { ggbOrbits.find(o => o.ID === "D").showNodes = true; }
    if (ggbApplet.getCaption(object.charAt(0) + "36") == "Priax") { ggbOrbits.find(o => o.ID === "C").showNodes = true; }
  } else {
    $('#figureDialog').html($('#figureDialog').html().replace("Hide Nodes", "Show Nodes"));
    if (ggbApplet.getCaption(object.charAt(0) + "36") == "Priax") { object = object.replace("D", "C"); }
    
    // only hide if the diagram checkbox is not checked
    if (!$("#nodes").is(":checked")) {
      ggbApplet.setVisible(object.charAt(0) + "26", false);
      ggbApplet.setVisible(object.charAt(0) + "27", false);
      ggbApplet.setVisible(object.charAt(0) + "28", false);
      ggbApplet.setVisible(object.charAt(0) + "32", false);
    }
    ggbOrbits.find(o => o.ID === object.charAt(0)).showNodes = false;
    if (ggbApplet.getCaption(object.charAt(0) + "36") == "Polta") { ggbOrbits.find(o => o.ID === "D").showNodes = false; }
    if (ggbApplet.getCaption(object.charAt(0) + "36") == "Priax") { ggbOrbits.find(o => o.ID === "C").showNodes = false; }
  }
}

// handle GeoGebra diagram display options
function toggleNodes(isChecked) {

  // if the orbits are shown, affect all bodies
  if ($("#orbits").is(":checked")) {
    ggbOrbits.forEach(function(item, index) { 
      if (!item.showNodes && !item.isHidden) {
        if (item.Type == "body") {
          ggbApplet.setVisible(item.ID + "26", isChecked);
          ggbApplet.setVisible(item.ID + "27", isChecked);
          ggbApplet.setVisible(item.ID + "28", isChecked);
          ggbApplet.setVisible(item.ID + "32", isChecked);
        } else {
          ggbApplet.setVisible(item.ID + "apnode", isChecked);
          ggbApplet.setVisible(item.ID + "penode", isChecked);
          ggbApplet.setVisible(item.ID + "anode", isChecked);
          ggbApplet.setVisible(item.ID + "dnode", isChecked);
        }
      }
    });
  } 
  
  // otherwise just find the one that is showing (if any)
  else if (!$("#orbits").is(":checked")) {
    var obj = ggbOrbits.find(o => o.isSelected === true);
    if (obj && !obj.showNodes) {
      if (obj.Type == "body") {
        ggbApplet.setVisible(obj.ID + "26", isChecked);
        ggbApplet.setVisible(obj.ID + "27", isChecked);
        ggbApplet.setVisible(obj.ID + "28", isChecked);
        ggbApplet.setVisible(obj.ID + "32", isChecked);
      } else {
        ggbApplet.setVisible(obj.ID + "apnode", isChecked);
        ggbApplet.setVisible(obj.ID + "penode", isChecked);
        ggbApplet.setVisible(obj.ID + "anode", isChecked);
        ggbApplet.setVisible(obj.ID + "dnode", isChecked);
      }
    }
  }
}
function toggleLabels(isChecked) {
  ggbOrbits.forEach(function(item, index) { 
    if (!item.showName) {
      if (item.Type == "body") {
        ggbApplet.setLabelVisible(item.ID + "36", isChecked);
      } else {
        ggbApplet.setLabelVisible(item.ID + "position", isChecked);
      }
    }
  });
}
function toggleOrbits(isChecked) {
  ggbOrbits.forEach(function(item, index) { 
    if (!item.isSelected && !item.isHidden) {
      if (item.Type == "body") {
        ggbApplet.setVisible(item.ID + "23", isChecked);
      } else {
        ggbApplet.setVisible(item.ID + "conic", isChecked);
      }
    }
  });
  
  // clear any selected object
  var selectedObj = ggbOrbits.find(o => o.isSelected === true);
  if (selectedObj) { selectedObj.isSelected = false; }
  
  // we need to hide all nodes when hiding orbits, regardless of toggle, because nothing is selected
  if (!isChecked) {
    if ($("#nodes").is(":checked")) { $("#nodes").prop('checked', false); }
    ggbOrbits.forEach(function(item, index) { 
      if (item.Type == "body") {
        ggbApplet.setVisible(item.ID + "26", false);
        ggbApplet.setVisible(item.ID + "27", false);
        ggbApplet.setVisible(item.ID + "28", false);
        ggbApplet.setVisible(item.ID + "32", false);
      } else {
        ggbApplet.setVisible(item.ID + "apnode", false);
        ggbApplet.setVisible(item.ID + "penode", false);
        ggbApplet.setVisible(item.ID + "anode", false);
        ggbApplet.setVisible(item.ID + "dnode", false);
      }
    });
  }
  
  // if we're showing orbits and the nodes box is checked, we have to show all the nodes, regardless of toggle so can't call function
  else if ($("#nodes").is(":checked") && isChecked) { 
    ggbOrbits.forEach(function(item, index) { 
      if (item.Type == "body") {
        ggbApplet.setVisible(item.ID + "26", true);
        ggbApplet.setVisible(item.ID + "27", true);
        ggbApplet.setVisible(item.ID + "28", true);
        ggbApplet.setVisible(item.ID + "32", true);
      } else {
        ggbApplet.setVisible(item.ID + "apnode", true);
        ggbApplet.setVisible(item.ID + "penode", true);
        ggbApplet.setVisible(item.ID + "anode", true);
        ggbApplet.setVisible(item.ID + "dnode", true);
      }
    });
  }
}
function toggleRefLine(isChecked) {
  ggbApplet.setVisible("RefLine", isChecked);
}
function filterVesselOrbits(id, checked) {
  if (checked) {
    ggbOrbits.forEach(function(item, index) {
      if (id == item.Type) {
        ggbApplet.setVisible(item.ID + "position", true);
        ggbApplet.setVisible(item.ID + "penode", $("#nodes").is(':checked'));
        ggbApplet.setVisible(item.ID + "apnode", $("#nodes").is(':checked'));
        ggbApplet.setVisible(item.ID + "anode", $("#nodes").is(':checked'));
        ggbApplet.setVisible(item.ID + "dnode", $("#nodes").is(':checked'));
        ggbApplet.setLabelVisible(item.ID + "position", $("#labels").is(':checked'));
        item.isHidden = false;
        
        // only show orbit if orbits are checked
        if ($("#orbits").is(":checked")) { ggbApplet.setVisible(item.ID + "conic", true); }
      }
    });
  } else {
    ggbOrbits.forEach(function(item, index) {
      if (id == item.Type) {
        ggbApplet.setVisible(item.ID + "position", false);
        ggbApplet.setVisible(item.ID + "conic", false);
        ggbApplet.setVisible(item.ID + "penode", false);
        ggbApplet.setVisible(item.ID + "apnode", false);
        ggbApplet.setVisible(item.ID + "anode", false);
        ggbApplet.setVisible(item.ID + "dnode", false);
        ggbApplet.setLabelVisible(item.ID + "position", false);
        item.isHidden = true;
      }
    });
  }
}
function toggleSOI(isChecked) {
  ggbOrbits.forEach(function(item, index) { 
    if (item.Type == "body") {
      ggbApplet.setVisible(item.ID + "39", isChecked);
    }
  });
}