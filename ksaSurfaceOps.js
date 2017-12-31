function initializeMap() {

  // allow multiple popups to be open at the same time
  // http://jsfiddle.net/paulovieira/yVLJf/
  L.KSP.Map = L.KSP.Map.extend({
    openPopup: function(popup) {
      this._popup = popup;

      return this.addLayer(popup).fire('popupopen', {
        popup: this._popup
      });
    }
  });
  
  // create the map with some custom options
  // details on Leaflet API can be found here - http://leafletjs.com/reference.html
  surfaceMap = new L.KSP.Map('map', {
    center: [0,0],
    bodyControl: false,
    layersControl: false,
    scaleControl: true,
    minZoom: 0,
    maxZoom: 5,
    zoom: 2,
    fullscreenControl: true,
    fullscreenControlOptions: {
      position: 'topleft'
    }
  });

  // define the icons for the various layer markers and events
  flagIcon = L.icon({
    iconUrl: 'button_vessel_flag.png',
    iconSize: [16, 16],
  });
  POIIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'poi.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  anomalyIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'anomaly.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  labelIcon = L.icon({
    iconUrl: 'label.png',
    iconSize: [10, 10],
  });
  sunIcon = L.icon({
    iconUrl: 'sun.png',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
  apIcon = L.icon({
    iconUrl: 'ap.png',
    iconSize: [16, 16],
    iconAnchor: [8, 18],
    popupAnchor: [0, -4]
  });
  peIcon = L.icon({
    iconUrl: 'pe.png',
    iconSize: [16, 16],
    iconAnchor: [8, 18],
    popupAnchor: [0, -4]
  });
  soiExitIcon = L.icon({
    iconUrl: 'soiexit.png',
    iconSize: [16, 12],
    iconAnchor: [9, 6]
  });
  soiEntryIcon = L.icon({
    iconUrl: 'soientry.png',
    iconSize: [16, 12],
    iconAnchor: [9, 6]
  });
  nodeIcon = L.icon({
    iconUrl: 'node.png',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
  
  // show controls only when the cursor is over the map
  // only show the info control if looking at the big map, as the downsized map shows wrong coordinates for some reason
  if (!is_touch_device()) { 
    surfaceMap.on('mouseover', function(e) {
      if ($("#map").css("height") != "480px") { $(".leaflet-control-info").fadeIn(); }
      $(".leaflet-control-zoom").fadeIn();
      $(".leaflet-control-layers").fadeIn();
      $(".easy-button-container").fadeIn();
      $(".easy-button-button").fadeIn();
    });
    surfaceMap.on('mouseout', function(e) {
      $(".leaflet-control-info").fadeOut();
      $(".leaflet-control-zoom").fadeOut();
      $(".leaflet-control-layers").fadeOut();
      $(".easy-button-container").fadeOut();
    });
    surfaceMap.on('mousemove', function(e) {
    
      // wait to add the info control until mouse movement detected because it initializes to "undefined" coordinates
      // don't add the control if we're looking at the downsized map because the coordinates are off for some reason
      if (!infoControl && mapData && $("#map").css("height") != "480px") {
        infoControl = new L.KSP.Control.Info({
            elevInfo: mapData.Terrain,
            biomeInfo: mapData.Biome,
            slopeInfo: mapData.Slope
          });
        surfaceMap.addControl(infoControl);
      }
      
      // if we are still loading data, do not let the layer control collapse
      if (!layerControl.options.collapsed) { layerControl._expand(); }
    });
  }
  
  // add a layer control to let ppl know data is being loaded
  layerControl = L.control.groupedLayers().addTo(surfaceMap);
  layerControl.addOverlay(L.layerGroup(), "<i class='fa fa-cog fa-spin'></i> Loading Data...");
  layerControl._expand();
  layerControl.options.collapsed = false;

  // add the legend control to the map - will be automatically displayed by activating a base layer that uses it
  surfaceMap.addControl(new L.KSP.Control.Legend());

  // no idea why but doing this makes it work better for when loading straight to the map in the body view
  setTimeout(function() {
    if (pageType != "vessel") {
      $("#map").css("height", "885px");
      surfaceMap.invalidateSize();
    }
  }, 250);
}

function loadMap(map) {
  if (!map && strCurrentBody) { loadMap(strCurrentBody.split("-")[0]); return; }
  
  // can't continue if menu data hasn't loaded. Try again in 250ms
  if (!isMenuDataLoaded) {
    setTimeout(function() {
      loadMap(map);
    }, 250)
    return;
  }
  
  // call up the map data to load
  loadDB("loadMapData.asp?map=" + map + "&UT=" + currUT(), loadMapDataAJAX);
}

function loadMapDataAJAX(xhttp) {

  // could be nothing to load, so just exit
  if (xhttp.responseText == "null") return;
  
  // parse out the data
  var data = xhttp.responseText.split("^");

  // assign the map data and check for updates
  mapData = rsToObj(data[0]);
  console.log(mapData);
  if (data[1] != "null") { updatesList.push({ Type: "map", ID: strCurrentBody.split("-")[0], UT: parseFloat(data[1]) }); }
  
  // remove the previous control and load the base layer
  if (layerControl) surfaceMap.removeControl(layerControl);
  layerControl = L.control.groupedLayers().addTo(surfaceMap);
  if (mapData.Aerial) { var strSatLabel = "Aerial"; }
  if (mapData.Satellite) { var strSatLabel = "Sattelite"; }
  layerControl.addBaseLayer(
    L.KSP.tileLayer(L.KSP.TileLayer.TYPE_SATELLITE,
      L.KSP.TileLayer.DEFAULT_URL,
      L.KSP.CRS.EPSG4326, {
        body: strCurrentBody.split("-")[0].toLowerCase(),
        style: "sat"
      }
    ).addTo(surfaceMap), strSatLabel);
  if (mapData.Slope) {
    var slopeBase = L.KSP.tileLayer(
      L.KSP.TileLayer.TYPE_COLORRELIEF,
      L.KSP.TileLayer.DEFAULT_URL,
      L.KSP.CRS.EPSG4326, {
        body: strCurrentBody.split("-")[0].toLowerCase(),
        style: "slope",
        legend: L.KSP.Legend.SLOPE
      }
    )
    layerControl.addBaseLayer(slopeBase, "Slope");
  }
  
  // show the entire control until everything is finished loading
  layerControl._expand();
  layerControl.options.collapsed = false;
  
  // load the rest of the tile layers, where available
  if (mapData.Terrain) {
    var reliefBase = L.KSP.tileLayer(
      L.KSP.TileLayer.TYPE_COLORRELIEF,
      L.KSP.TileLayer.DEFAULT_URL,
      L.KSP.CRS.EPSG4326, {
        body: strCurrentBody.split("-")[0].toLowerCase(),
        style: "color",
        legend: mapElevationLegend.find(o => o.ID === strCurrentBody.split("-")[0]).Data
      }
    )
    layerControl.addBaseLayer(reliefBase, "Color Relief");
  }
  if (mapData.Biome) {
    var biomeBase = L.KSP.tileLayer(
      L.KSP.TileLayer.TYPE_COLORRELIEF,
      L.KSP.TileLayer.DEFAULT_URL,
      L.KSP.CRS.EPSG4326, {
        body: strCurrentBody.split("-")[0].toLowerCase(),
        style: "biome",
        legend: mapBiomeLegend.find(o => o.ID === strCurrentBody.split("-")[0]).Data
      }
    );
    layerControl.addBaseLayer(biomeBase, "Biome");
  }
  
  // place any and all flags
  if (mapData.Flags) {
    var flagData = mapData.Flags.split("|");
    var flagMarker;
    var layerFlags = L.layerGroup();
    flagData.forEach(function(item, index) {
      var flag = item.split(";");
      flagMarker = L.marker([flag[0],flag[1]], {icon: flagIcon, zIndexOffset: 100});
      flagMarker.bindPopup("<b>" + flag[3] + "</b><br />" + flag[4] + "<br />" + flag[6] + "<br />" + numeral(flag[2]/1000).format('0.000') + "km<br /><br />&quot;" + flag[5] + "&quot;<br /><br /><a target='_blank' href='" + flag[7] + "'>" + flag[8] + "</a>", {closeButton: false});
      layerFlags.addLayer(flagMarker);

      // set the ID to make the map click function ignore this popup and add it to the map
      flagMarker._myId = -1;
    });
    
    // add the layer to the map and if it is asked for in the URL variable show it immediately
    layerControl.addOverlay(layerFlags, "<img src='button_vessel_flag.png' style='width: 10px; vertical-align: 1px;'> Flags", "Ground Markers");
    if (getParameterByName("layers").includes("flag")) {
      layerFlags.addTo(surfaceMap);
    }
  }
  
  // place any and all points of interest
  if (mapData.POI) {
    var POIData = mapData.POI.split("|");
    var POIMarker;
    var layerPOI = L.layerGroup();
    POIData.forEach(function(item, index) {
      var POI = item.split(";");
      POIMarker = L.marker([POI[0],POI[1]], {icon: POIIcon, zIndexOffset: 100});
      strHTML = "<b>" + POI[3] + "</b><br>" + numeral(POI[2]/1000).format('0.000') + " km";
      if (POI[4] != "null") { strHTML += "<p>" + POI[4] + "</p>"; }
      POIMarker.bindPopup(strHTML, {closeButton: false});
      layerPOI.addLayer(POIMarker);
      POIMarker._myId = -1;
    });
    layerControl.addOverlay(layerPOI, "<img src='poi.png' style='width: 10px; vertical-align: 1px;'> Points of Interest", "Ground Markers");
    if (getParameterByName("layers").includes("poi")) {
      layerPOI.addTo(surfaceMap);
    }
  }
  
  // place any and all anomalies
  if (mapData.Anomalies) {
    var anomalyData = mapData.Anomalies.split("|");
    var anomalyMarker;
    var layerAnomalies = L.layerGroup();
    anomalyData.forEach(function(item, index) {
      var anomaly = item.split(";");
      anomalyMarker = L.marker([anomaly[0],anomaly[1]], {icon: anomalyIcon, zIndexOffset: 100});
      strHTML = "<b>";
      if (anomaly[3] != "null") { strHTML += anomaly[3]; } else { strHTML += "Unkown Anomaly"; }
      strHTML += "</b><br>" + numeral(anomaly[2]/1000).format('0.000') + " km";
      anomalyMarker.bindPopup(strHTML, {closeButton: false});
      layerAnomalies.addLayer(anomalyMarker);
      anomalyMarker._myId = -1;
    });
    layerControl.addOverlay(layerAnomalies, "<img src='anomaly.png' style='width: 10px; vertical-align: 1px;'> Anomalies", "Ground Markers");
    if (getParameterByName("layers").includes("anomal")) {
      layerAnomalies.addTo(surfaceMap);
    }
  }
  
  // place any and all labels
  if (mapData.Labels) {
    var labelData = mapData.Labels.split("|");
    var labelMarker;
    var layerLabels = L.layerGroup();
    labelData.forEach(function(item, index) {
      var label = item.split(";");
      labelMarker = L.marker([label[0],label[1]], {icon: labelIcon, zIndexOffset: 100}).bindLabel(label[2], {className: 'labeltext'});
      layerLabels.addLayer(labelMarker);
      labelMarker._myId = -1;
      
      // zoom the map all the way in and center on this marker when clicked
      labelMarker.on('click', function(e) {
        surfaceMap.setView(e.target.getLatLng(), 5);
      });
    });
    layerControl.addOverlay(layerLabels, "<img src='label.png' style='vertical-align: 1px;'> Labels", "Ground Markers");
    if (getParameterByName("layers").includes("label")) {
      layerLabels.addTo(surfaceMap);
    }
  }
  
  // hide map controls after 3 seconds if the user cursor isn't over the map
  // also set up future show/hide events
  setTimeout(function() {
    if (!$('#map').is(":hover")) { 
      $(".leaflet-control-info").fadeOut();
      $(".leaflet-control-zoom").fadeOut();
      $(".leaflet-control-layers").fadeOut();
      $(".easy-button-container").fadeOut();
    }
  }, 3000);

  // load straight to a map location?
  if (getParameterByName("center")) {
    var mapLocation = getParameterByName("center").split(",");
    surfaceMap.setView([mapLocation[0], mapLocation[1]], 3);
  }
  
  // load map pin(s) and caption(s)?
  if (getParameterByName("loc")) {
    var layerPins = L.featureGroup();
    var isMultiple = false;
    var pin;
    
    // get all pin locations and iterate through them
    getQueryParams("loc").forEach(function(item, index) {
      if (index > 0) isMultiple = true;
      mapLocation = item.split(",");
      if (mapLocation.length > 2) {
        pin = L.marker([mapLocation[0], mapLocation[1]]).bindPopup(mapLocation[2], {closeButton: false});
      } else {
        pin = L.marker([mapLocation[0], mapLocation[1]], {clickable: false});
      }
      layerPins.addLayer(pin);
      pin._myId = -1;
    });
    layerPins.addTo(surfaceMap);
    layerControl.addOverlay(layerPins, "<img src='defPin.png' style='width: 10px; height: 14px; vertical-align: 1px;'> Custom Pins", "Ground Markers");
    surfaceMap.fitBounds(layerPins.getBounds());
    
    // if only one marker was placed, open its popup
    if (!isMultiple) { pin.openPopup(); }
  }
  
  // load straight to a map?
  // Note that this is REQUIRED only when viewing a body page if you want to show the map straight away
  if (window.location.href.includes("&map") && pageType == "body") { showMap(); }
  
  // done with initial data load
  layerControl._collapse();
  layerControl.options.collapsed = true;
}

function renderMapData() {

  // check if we need to wait for the vessel to finish loading or if we need to wait for the base map layers to finish loading
  // or if we have to wait for the GGB to finish loading or if we need to wait for the content area to stop moving
  if ((!currentVesselData && pageType == "vessel") || 
      !layerControl.options.collapsed ||
      !isGGBAppletLoaded || isContentMoving) { setTimeout(renderMapData, 250); return; }
  
  // if there is a paused calculation we are returning to, then just resume calling the orbital batch
  if (strPausedVesselCalculation == strCurrentVessel) {
    
    // first re-show the progress dialog and reset the load state of the map
    $("#mapDialog").dialog("open");
    layerControl._expand();
    layerControl.options.collapsed = false;
    obtTrackDataLoad = L.layerGroup();
    layerControl.addOverlay(obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");
    strPausedVesselCalculation = null;
    orbitalCalc(renderVesselOrbit, currentVesselData.Orbit);

  // otherwise we need to calculate surface tracks for a single vessel that has orbital data not from a past event
  } else if (pageType == "vessel" && currentVesselData.Orbit && !currentVesselData.DynamicData.PastEvent) {
    
    // if 3 orbits are longer than 100,000s we need to inform the user that this could take a while
    if ((currentVesselData.Orbit.OrbitalPeriod * 3) > 100000) {
      $("#mapDialog").dialog( "option", "buttons", [{
        text: "Render Single Orbit",
        click: function() { 
          numOrbitRenders = 1;
          beginOrbitalCalc();
        }
      },{
        text: "Render All Orbits",
        click: function() { 
          numOrbitRenders = 3;
          beginOrbitalCalc();
        }
      }]);
      $("#mapDialog").dialog( "option", "title", "Calculation Notice");
      $("#dialogTxt").html("Calculating 3 orbits for this vessel could take a long time, but you can also cancel at any time and show what has been done up to that point if you wish");
      $("#dialogTxt").fadeIn();
      $("#mapDialog").dialog("open");
      
    // render out the default 3 orbits for this vessel
    } else {
      numOrbitRenders = 3;
      beginOrbitalCalc();
    }
    
  // this is not a vessel with any orbital data
  } else { 
  }
}

// does the initial display and configuration for vessel orbital data loading
function beginOrbitalCalc() {
  isOrbitRenderCancelled = false;
  currentVesselPlot = {
    Data: [],
    Events: {
      Pe: { Marker: null, UT: null },
      Ap: { Marker: null, UT: null },
      SoiEntry: { Marker: null },
      SoiExit: { Marker: null },
      Node: { Marker: null}
    }
  };
  $("#mapDialog").dialog( "option", "title", "Calculating Orbit #1 of " + numOrbitRenders);
  $("#mapDialog").dialog( "option", "buttons", [{
    text: "Cancel and Display",
    click: function() { 
      isOrbitRenderCancelled = true;
    }
  }]);
  $(".ui-progressbar-value").css("background-color", vesselOrbitColors[currentVesselPlot.Data.length]);
  $("#dialogTxt").fadeOut();
  $("#progressbar").progressbar("value", 0);
  $("#progressbar").fadeIn();
  $("#mapDialog").dialog("open");
  layerControl._expand();
  layerControl.options.collapsed = false;
  obtTrackDataLoad = L.layerGroup();
  layerControl.addOverlay(obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");
  
  // set the current UT from which the orbital data will be propagated forward
  obtCalcUT = currUT();
  orbitalCalc(renderVesselOrbit, currentVesselData.Orbit);
}

// draws the entire path of a vessel over a single or multiple orbits
function renderVesselOrbit() {
  
  // we have completed a batch of calculations, store the data
  currentVesselPlot.Data.push({
    Orbit: orbitDataCalc,
    Layer: null,
    StartUT: obtCalcUT-orbitDataCalc.length
  });

  // add the layer to the control in prep for adding paths and markers
  currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer = L.featureGroup();

  // get the times we'll reach Ap and Pe along this orbit if we haven't already done so
  if (!currentVesselPlot.Events.Ap.Marker || !currentVesselPlot.Events.Pe.Marker) {
    var n = Math.sqrt(bodyCatalog.find(o => o.Body === strCurrentBody).Gm/(Math.pow(Math.abs(currentVesselData.Orbit.SMA),3)));
    var newMean = toMeanAnomaly(currentVesselData.Orbit.TrueAnom, currentVesselData.Orbit.Eccentricity) + n * ((obtCalcUT-orbitDataCalc.length) - currentVesselData.Orbit.Eph);
    if (newMean < 0 || newMean > 2*Math.PI) {
      newMean = Math.abs(newMean - (2*Math.PI) * Math.floor(newMean / (2*Math.PI)));
    }
    var apTime = Math.round((Math.PI - newMean)/n);
    var peTime = Math.round((Math.PI*2 - newMean)/n);
    
    // close to Ap/Pe we can get a negative value, so handle that by just adding the period
    if (apTime <= 0) { apTime += Math.round(currentVesselData.Orbit.OrbitalPeriod); }
    if (peTime <= 0) { peTime += Math.round(currentVesselData.Orbit.OrbitalPeriod); }
    
    // stash away the times but convert them to UT instead of seconds from the start of this orbit
    currentVesselPlot.Events.Pe.UT = peTime + (obtCalcUT-orbitDataCalc.length);
    currentVesselPlot.Events.Ap.UT = apTime + (obtCalcUT-orbitDataCalc.length);
    
    // configure the Ap/Pe icons, ensuring that enough orbit has been plotted to display them
    if (!currentVesselPlot.Events.Ap.Marker && apTime < orbitDataCalc.length) { 

      // add the marker, assign its information popup and give it a callback for instant update when opened, then add it to the current layer
      currentVesselPlot.Events.Ap.Marker = L.marker(orbitDataCalc[apTime].Latlng, {icon: apIcon}); 
      var strTimeDate = UTtoDateTime(obtCalcUT-orbitDataCalc.length + apTime);
      currentVesselPlot.Events.Ap.Marker.bindPopup("<center>Time to Apoapsis<br><span id='apTime'>" + formatTime(apTime) + "</span><br><span id='apDate'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", {closeButton: true});
      currentVesselPlot.Events.Ap.Marker.on('click', function(e) {
        $('#apTime').html(formatTime(currentVesselPlot.Events.Ap.UT - currUT()));
      });
      currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer.addLayer(currentVesselPlot.Events.Ap.Marker);
    }
    if (!currentVesselPlot.Events.Pe.Marker && peTime < orbitDataCalc.length) { 
      currentVesselPlot.Events.Pe.Marker = L.marker(orbitDataCalc[peTime].Latlng, {icon: peIcon}); 
      var strTimeDate = UTtoDateTime(obtCalcUT-orbitDataCalc.length + peTime);
      currentVesselPlot.Events.Pe.Marker.bindPopup("<center>Time to Periapsis<br><span id='peTime'>" + formatTime(peTime) + "</span><br><span id='peDate'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", {closeButton: true});
      currentVesselPlot.Events.Pe.Marker.on('click', function(e) {
        $('#peTime').html(formatTime(currentVesselPlot.Events.Pe.UT - currUT()));
      });
      currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer.addLayer(currentVesselPlot.Events.Pe.Marker);
    }
  }
  
  // gather up the lat/lng positions into the paths to render
  var path = [];
  currentVesselPlot.Data[currentVesselPlot.Data.length-1].Orbit.forEach(function(position, posIndex) {
    
    // detect if we've crossed off the edge of the map and need to cut the orbital line
    // compare this lng to the prev and if it changed from negative to positive or vice versa, we hit the edge  
    // (check if the lng is over 100 to prevent detecting a sign change while crossing the meridian)
    if (path.length && (((position.Latlng.lng < 0 && path[path.length-1].lng > 0) && Math.abs(position.Latlng.lng) > 100) || ((position.Latlng.lng > 0 && path[path.length-1].lng < 0) && Math.abs(position.Latlng.lng) > 100))) { 
    
      // time to cut this path off and create a surface track to setup
      // add this path to the layer and reset to start building a new path
      currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer.addLayer(setupVesselSurfacePath(path, currentVesselPlot.Data.length-1));
      path = [];
    
    // still on the map, so create a new array entry for this location
    } else { path.push(position.Latlng); }
  });
  
  // setup the final path stretch and add it to the layer
  currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer.addLayer(setupVesselSurfacePath(path, currentVesselPlot.Data.length-1));
  
  // add the orbital layer to the control and the map
  layerControl.addOverlay(currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer, "<i class='fa fa-minus' style='color: " + vesselOrbitColors[currentVesselPlot.Data.length-1] + "'></i> Vessel Orbit #" + (currentVesselPlot.Data.length), "Orbital Tracks");
  currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer.addTo(surfaceMap)

  // delete and re-add the loading layer so it stays below the added paths
  layerControl.removeLayer(obtTrackDataLoad);
  obtTrackDataLoad = L.layerGroup();
  layerControl.addOverlay(obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");

  // go for more?
  if (numOrbitRenders > currentVesselPlot.Data.length && !isOrbitRenderCancelled) { 
    
    // update the dialog box and call another round
    $("#mapDialog").dialog( "option", "title", "Calculating Orbit #" + (currentVesselPlot.Data.length + 1) + " of " + numOrbitRenders);
    $(".ui-progressbar-value").css("background-color", vesselOrbitColors[currentVesselPlot.Data.length]);
    $("#progressbar").progressbar("value", 0);
    orbitDataCalc = [];
    orbitalCalc(renderVesselOrbit, currentVesselData.Orbit); 
    
  // calculation has been completed or cancelled
  } else { 
    
    // warn the user if they cancelled the calculations early before a full orbit was rendered
    if (currentVesselPlot.Data[0].Orbit.length < currentVesselData.Orbit.OrbitalPeriod && isOrbitRenderCancelled) {
      $("#mapDialog").dialog( "option", "title", "Render Notice");
      $("#progressbar").fadeOut();
      $("#dialogTxt").fadeIn();
      $("#dialogTxt").html("You have cancelled orbital calculation prior to one full orbit. As a result, some markers (Pe, Ap, node, etc) may be missing from the plot that is rendered");
      $("#mapDialog").dialog( "option", "buttons", [{
        text: "Okay",
        click: function() { 
          $("#mapDialog").dialog("close");
        }
      }]);
    } else { $("#mapDialog").dialog("close"); }
    
    // done with the loading notice
    layerControl._collapse();
    layerControl.options.collapsed = true;
    layerControl.removeLayer(obtTrackDataLoad);
    obtTrackDataLoad = null;
    
    // reset loading flags/triggers
    strPausedVesselCalculation = null;
    isOrbitRenderCancelled = false;

    // place the craft marker and assign its popup
    vesselIcon = L.icon({iconUrl: 'button_vessel_' + w2ui['menu'].get(strCurrentVessel).img.split("-")[1] + '.png', iconSize: [16, 16]});
    vesselMarker = L.marker(currentVesselPlot.Data[0].Orbit[0].Latlng, {icon: vesselIcon, zIndexOffset: 100}).addTo(surfaceMap);
    vesselMarker.bindPopup("Lat: <span id='lat'>-000.0000&deg;S</span><br>Lng: <span id='lng'>-000.0000&deg;W</span><br>Alt: <span id='alt'>000,000.000km</span><br>Vel: <span id='vel'>000,000.000km/s</span>", {closeButton: true});

    // set up a listener for popup events so we can immediately update the information and not have to wait for the next tick event
    vesselMarker.on('click', function(e) {
      var now = getPlotIndex();
      var cardinal = getLatLngCompass(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng);
      $('#lat').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng.lat).format('0.0000') + "&deg;" + cardinal.Lat);
      $('#lng').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng.lng).format('0.0000') + "&deg;" + cardinal.Lng);
      $('#alt').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Alt).format('0,0.000') + " km");
      $('#vel').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Vel).format('0,0.000') + " km/s");
    });
    
    // focus in on the vessel position
    console.log(currentVesselPlot);
    surfaceMap.setView(vesselMarker.getLatLng(), 3);
  }
}

function renderBodyOrbit() {
}

// this function will continually call itself to batch-run orbital calculations and not completely lock up the browser
// will calculate a full orbital period unless cancelled or otherwise interrupted by an event along the orbit, then pass control to the callback
function orbitalCalc(callback, orbit) {

  // load up on some data-fetching and conversions so we're not repeating them in the batch loop
  var gmu = bodyCatalog.find(o => o.Body === strCurrentBody).Gm; 
  var rotPeriod = bodyCatalog.find(o => o.Body === strCurrentBody).RotPeriod;
  var rotInit = bodyCatalog.find(o => o.Body === strCurrentBody).RotIni * .017453292519943295; 
  var bodRad = bodyCatalog.find(o => o.Body === strCurrentBody).Radius;
  var inc = orbit.Inclination * .017453292519943295;
  var raan = orbit.RAAN * .017453292519943295;
  var arg = orbit.Arg * .017453292519943295;
  var mean = toMeanAnomaly(orbit.TrueAnom, orbit.Eccentricity);
  
  for (x=0; x<=1500; x++) {
  
    //////////////////////
    // computeMeanMotion()
    //////////////////////
    
    // adjust for motion since the time of this orbit
    var n = Math.sqrt(gmu/(Math.pow(Math.abs(orbit.SMA),3)));
    var newMean = mean + n * (obtCalcUT - orbit.Eph);

    ////////////////
    // solveKepler()
    ////////////////
    
    var EccA = -1;
    if (orbit.Eccentricity < 1) {
      if (newMean < 0 || newMean > 2*Math.PI) {
      
        // expanded AngleZero2Pi() function
        // abs(mod(real(Angle),2*pi));
        // javascript has a modulo operator, but it doesn't work the way we need. Or something
        // so using the mod() function implementation from Math.js: x - y * floor(x / y)
        newMean = Math.abs(newMean - (2*Math.PI) * Math.floor(newMean / (2*Math.PI)));
      }
      
      if (Math.abs(newMean - 0) < 1E-8) {
        EccA = 0;
      } else if (Math.abs(newMean - Math.PI) < 1E-8 ) {
        EccA = Math.PI;
      }	
      
      /////////////
      // keplerEq()
      /////////////
      
      // since there is no function return to break ahead of this statement, test if variable was modified
      if (EccA == -1) {
        var En  = newMean;
        var Ens = En - (En-orbit.Eccentricity*Math.sin(En) - newMean)/(1 - orbit.Eccentricity*Math.cos(En));
        while (Math.abs(Ens-En) > 1E-10) {
          En = Ens;
          Ens = En - (En - orbit.Eccentricity*Math.sin(En) - newMean)/(1 - orbit.Eccentricity*Math.cos(En));
        }
        EccA = Ens;
      }
    
    // hyperbolic orbit
    } else {
      if (Math.abs(newMean - 0) < 1E-8) {
        EccA = 0;
      } else {
        
        ////////////////
        // keplerEqHyp()
        ////////////////
        
        if (orbit.Eccentricity < 1.6) {
          if ((-Math.PI < newMean && newMean < 0) || newMean > Math.PI) {
            H = newMean - orbit.Eccentricity;
          } else {
            H = newMean + orbit.Eccentricity;
          }
        } else {
          if (orbit.Eccentricity < 3.6 && Math.abs(newMean) > Math.PI) {
            H = newMean - Math.sign(newMean) * orbit.Eccentricity;
          } else {
            H = newMean/(orbit.Eccentricity - 1);
          }
        }
        
        Hn = newMean;
        Hn1 = H;
        while (Math.abs(Hn1 - Hn) > 1E-10) {
          Hn = Hn1;
          Hn1 = Hn + (newMean - orbit.Eccentricity * Math.sinh(Hn) + Hn) / (orbit.Eccentricity * Math.cosh(Hn) - 1);
        }
        
        EccA = Hn1;
      }
    }
    
    ///////////////////////////////
    // computeTrueAnomFromEccAnom()
    // computeTrueAnomFromHypAnom()
    ///////////////////////////////
    
    if (orbit.Eccentricity < 1) {
      // (1+orbit.Eccentricity) or (orbit.Eccentricity+1) ???
      var upper = Math.sqrt(1+orbit.Eccentricity) * Math.tan(EccA/2);
      var lower = Math.sqrt(1-orbit.Eccentricity);
     
      // expanded AngleZero2Pi() function
      // abs(mod(real(Angle),2*pi));
      // javascript has a modulo operator, but it doesn't work the way we need. Or something
      // so using the mod() function implementation from Math.js: x - y * floor(x / y)
      var tru = Math.abs((Math.atan2(upper, lower) * 2) - (2*Math.PI) * Math.floor((Math.atan2(upper, lower) * 2) / (2*Math.PI)));
    } else {
      var upper = Math.sqrt(orbit.Eccentricity+1) * Math.tanh(EccA/2);
      var lower = Math.sqrt(orbit.Eccentricity-1);
      var tru = Math.atan2(upper, lower) * 2;
    }
    
    ///////////////////////////
    // getStatefromKepler_Alg()
    ///////////////////////////
    
    // Special Case: Circular Equitorial
    if(orbit.Eccentricity < 1E-10 && (inc < 1E-10 || Math.abs(inc-Math.PI) < 1E-10)) {
      var l = raan + arg + tru;
      tru = l;
      raan = 0;
      arg = 0;
    }

    // Special Case: Circular Inclined
    if(orbit.Eccentricity < 1E-10 && inc >= 1E-10 && Math.abs(inc-Math.PI) >= 1E-10) {
      var u = arg + tru;
      tru = u;
      arg = 0.0;
    }

    // Special Case: Elliptical Equitorial
    if(orbit.Eccentricity >= 1E-10 && (inc < 1E-10 || Math.abs(inc-Math.PI) < 1E-10)) {
      raan = 0;
    }

    var p = orbit.SMA*(1-(Math.pow(orbit.Eccentricity,2)));
    
    // vector/matrix operations handled by Sylvester - http://sylvester.jcoglan.com/
    var rPQW = $V([p*Math.cos(tru) / (1 + orbit.Eccentricity*Math.cos(tru)),
                   p*Math.sin(tru) / (1 + orbit.Eccentricity*Math.cos(tru)),
                   0]);
    var vPQW = $V([-Math.sqrt(gmu/p)*Math.sin(tru),
                   Math.sqrt(gmu/p)*(orbit.Eccentricity + Math.cos(tru)),
                   0]);
    var TransMatrix = $M([
      [Math.cos(raan)*Math.cos(arg)-Math.sin(raan)*Math.sin(arg)*Math.cos(inc), -Math.cos(raan)*Math.sin(arg)-Math.sin(raan)*Math.cos(arg)*Math.cos(inc), Math.sin(raan)*Math.sin(inc)],
      [Math.sin(raan)*Math.cos(arg)+Math.cos(raan)*Math.sin(arg)*Math.cos(inc), -Math.sin(raan)*Math.sin(arg)+Math.cos(raan)*Math.cos(arg)*Math.cos(inc), -Math.cos(raan)*Math.sin(inc)],
      [Math.sin(arg)*Math.sin(inc), Math.cos(arg)*Math.sin(inc), Math.cos(inc)]
    ]);

    var rVect = TransMatrix.multiply(rPQW);
    var vVect = TransMatrix.multiply(vPQW);	

    /////////////////////
    // getBodySpinAngle()
    /////////////////////
    
    var bodySpinRate = 2*Math.PI/rotPeriod;
    
    // expanded AngleZero2Pi() function
    // abs(mod(real(Angle),2*pi));
    // javascript has a modulo operator, but it doesn't work the way we need. Or something
    // so using the mod() function implementation from Math.js: x - y * floor(x / y)
    var angle = rotInit + bodySpinRate*obtCalcUT;
    var spinAngle = Math.abs(angle - (2*Math.PI) * Math.floor(angle / (2*Math.PI)));

    //////////////////////////////////////
    // getFixedFrameVectFromInertialVect()
    //////////////////////////////////////

    var R = $M([
      [Math.cos(spinAngle), -Math.sin(spinAngle), 0],
      [Math.sin(spinAngle), Math.cos(spinAngle), 0],
      [0, 0, 1]
    ]);

    R = R.transpose();
    var rVectECEF = R.multiply(rVect);

    //////////////////////////////////
    // getLatLongAltFromInertialVect()
    //////////////////////////////////

    // 2-norm or Euclidean norm of vector
    var rNorm = Math.sqrt(rVectECEF.e(1) * rVectECEF.e(1) + rVectECEF.e(2) * rVectECEF.e(2) + rVectECEF.e(3) * rVectECEF.e(3));

    // convert to degrees from radians - angle / Math.PI * 180
    // expanded AngleZero2Pi() function
    // abs(mod(real(Angle),2*pi));
    // javascript has a modulo operator, but it doesn't work the way we need. Or something
    // so using the mod() function implementation from Math.js: x - y * floor(x / y)
    var longitude = (Math.abs(Math.atan2(rVectECEF.e(2),rVectECEF.e(1)) - (2*Math.PI) * Math.floor(Math.atan2(rVectECEF.e(2),rVectECEF.e(1)) / (2*Math.PI)))) * 57.29577951308232;
    var latitude = (Math.PI/2 - Math.acos(rVectECEF.e(3)/rNorm)) * 57.29577951308232;
    var alt = rNorm - bodRad;
    var vel = Math.sqrt(gmu*(2/rNorm - 1/orbit.SMA));
    
    // convert the lng to proper coordinates (-180 to 180)
    if (longitude >= 180) { longitude -= 360; }
    
    // store all the derived values and advance to the next second
    orbitDataCalc.push({Latlng: {lat: latitude, lng: longitude}, Alt: alt, Vel: vel});
    obtCalcUT++;
    
    // update the progress bar - will only show if loading data for a single vessel
    $('#progressbar').progressbar("value", (orbitDataCalc.length/orbit.OrbitalPeriod)*100);
    
    // exit the batch prematurely if we've reached the end of the orbital period
    if (orbitDataCalc.length >= orbit.OrbitalPeriod) { break; }
  }
  
  // let the callback know if we've completed all orbital calculations, or cancel out if requested by the user
  if (orbitDataCalc.length >= orbit.OrbitalPeriod || isOrbitRenderCancelled) {
    callback(); 
    
  // just exit and don't call anything if the calculations have been paused by switching away from the vessel
  } else if (strPausedVesselCalculation) {
    return;
    
  // otherwise call ourselves again for more calculations, with a small timeout to let other things happen
  } else {       
    setTimeout(orbitalCalc, 1, callback, orbit);
  }
}

function addMapResizeButton() {
  if (!mapResizeButton) {
    mapResizeButton = L.easyButton({
      states: [{
        stateName: 'raise',
        icon: 'fa-arrow-up',
        title: 'Enlarge map view',
        onClick: function(control) {
          raiseContent();
          $("#infoDialog").dialog("close")
          control.state('lower');
        }
      }, {
        stateName: 'lower',
        icon: 'fa-arrow-down',
        title: 'Reduce map view',
        onClick: function(control) {
          lowerContent();
          control.state('raise');
        }
      }]
    }).addTo(surfaceMap);
    if (!$(".leaflet-control-zoom").is(":visible")) $(".easy-button-container").hide();
  }
}
function addMapViewButton() {
  if (!mapViewButton) {
    mapViewButton = L.easyButton({
      states: [{
        stateName: 'global',
        icon: 'fa-globe',
        title: 'View all orbits for this body',
        onClick: function(control) {
          swapContent("body", strCurrentSystem);
          setTimeout(showMap, 1000);
        }
      }, {
        stateName: 'vessel',
        icon: 'fa-rocket',
        title: 'View vessel orbit',
        onClick: function(control) {
          swapMapView("vessel");
          control.state('global');
        }
      }]
    }).addTo(surfaceMap);
    if (!$(".leaflet-control-zoom").is(":visible")) $(".easy-button-container").hide();
  }
}
function removeVesselMapButtons() {
  if (mapResizeButton) {
    surfaceMap.removeControl(mapResizeButton);
    mapResizeButton = null;
  }
  if (mapViewButton) {
    surfaceMap.removeControl(mapViewButton);
    mapViewButton = null;
  }
}

function addMapCloseButton() {
  if (!mapCloseButton) {
    mapCloseButton = L.easyButton({
      states: [{
        stateName: 'raise',
        icon: 'fa-times',
        title: 'Close map view',
        onClick: function(control) { hideMap(); }
      }]
    }).addTo(surfaceMap);
  }
}
function removeMapCloseButton() {
  if (mapCloseButton) {
    surfaceMap.removeControl(mapCloseButton);
    mapCloseButton = null;
  }
}

function showMap() {
  $("#figureOptions").fadeOut();
  $("#vesselOrbitTypes").fadeOut();
  $("#figure").fadeOut();
  $("#figureDialog").dialog("close");
  $("#map").css("visibility", "visible");
  $("#map").fadeIn();
  removeVesselMapButtons()
  addMapCloseButton();
  $("#contentHeader").html(strCurrentBody.split("-")[0]);
  document.title = "KSA Operations Tracker - " + strCurrentBody.split("-")[0];
}

function hideMap() {
  if ($("#map").css("visibility") != "hidden") $("#map").fadeOut();
  if (!isGGBAppletLoading) {
    $("#figureOptions").fadeIn();
    $("#vesselOrbitTypes").fadeIn();
    $("#figure").fadeIn();
    $("#contentHeader").html(strCurrentSystem.replace("-", " "));
    document.title = "KSA Operations Tracker - " + strCurrentSystem.replace("-", " ");
  }
}

// because the vessel plot is broken up into distinct orbital periods, we need to do a bit of legwork
// to determine what index of what plot corresponds to the current UT
function getPlotIndex() {

  // get the total amount of seconds that have transpired since the start of the orbital plot
  var totalTime = currUT() - currentVesselPlot.Data[0].StartUT;
  
  // now determine what orbit this puts us in by comparing the elapsed time to the length of the orbit and cutting down until we find a lesser amount
  // note we are not just using the current vessel orbital period because this instead takes into account the orbital calc being cancelled early
  var currentOrbit = 0;
  for (; currentOrbit<currentVesselPlot.Data.length; currentOrbit++) {
    if (totalTime > currentVesselPlot.Data[currentOrbit].Orbit.length) { totalTime -= currentVesselPlot.Data[currentOrbit].Orbit.length; }
    else { break; }
  }
  
  // the time remaining is our current index
  return {ObtNum: currentOrbit, Index: totalTime};
}

// finds out which orbital data point most closely corresponds to the map location targeted by the cursor by
// traversing the orbit's position array and getting the difference between the current index and the location clicked
// if it is smaller than the margin, stop. If the entire orbit is searched, increase the margin and try again
function getDataPoint(obtNum, target) {
  var index = 0;
  var margin = 0.1;
  
  while (true) {
    if (Math.abs(currentVesselPlot.Data[obtNum].Orbit[index].Latlng.lat - target.lat) < margin && Math.abs(currentVesselPlot.Data[obtNum].Orbit[index].Latlng.lng - target.lng) < margin) { break; }
    index++;
    if (index >= currentVesselPlot.Data[obtNum].Orbit.length) {
      index = 0;
      margin += 0.1;
    }
  }

  return index;
}

// take care of all the details that need to be applied to a vessel's surface track as this needs to be done in two separate places
function setupVesselSurfacePath(path, obtIndex) {
  var srfTrack = L.polyline(path, {smoothFactor: 1.25, clickable: true, color: vesselOrbitColors[obtIndex], weight: 3, opacity: 1});
  
  // save the orbit index of this line to make it faster when searching for a data point by not having to look at all 3 orbits
  srfTrack._myId = obtIndex;
  
  // show the time and orbit for this position
  // ignore this when the map is downsized because for some reason the coordinates are off
  srfTrack.on('mouseover mousemove', function(e) {
    if ($("#map").css("height") != "480px") {
      if (timePopup) { surfaceMap.closePopup(timePopup); }
      timePopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
      timePopup.setLatLng(e.latlng);
      var strTimeDate = UTtoDateTime(currentVesselPlot.Data[e.target._myId].StartUT + getDataPoint(e.target._myId, e.latlng));
      timePopup.setContent("<center>Orbit #" + (e.target._myId+1) + "<br>" + strTimeDate.split("@")[0] + "<br>" + strTimeDate.split("@")[1] + " UTC</center>");
      timePopup.openOn(surfaceMap);
    }
  });
  
  // remove the mouseover popup
  srfTrack.on('mouseout', function(e) {
    if (timePopup) { surfaceMap.closePopup(timePopup); }
    timePopup = null;
  });
  
  // when clicking along this line, find the nearest data point to display for the user
  // ignore this when the map is downsized because for some reason the coordinates are off
  srfTrack.on('click', function(e) {
    if ($("#map").css("height") != "480px") {
      surfaceMap.closePopup(timePopup);
      timePopup = null;
      var index = getDataPoint(e.target._myId, e.latlng);
      var cardinal = getLatLngCompass(currentVesselPlot.Data[e.target._myId].Orbit[index].Latlng);
        
      // compose the popup HTML and place it on the cursor location then display it
      vesselPositionPopup.setLatLng(currentVesselPlot.Data[e.target._myId].Orbit[index].Latlng);
      vesselPositionPopup.setContent(UTtoDateTime(currentVesselPlot.Data[e.target._myId].StartUT + index) + ' UTC<br>Latitude: ' + numeral(currentVesselPlot.Data[e.target._myId].Orbit[index].Latlng.lat).format('0.0000') + '&deg;' + cardinal.Lat + '<br>Longitutde: ' + numeral(currentVesselPlot.Data[e.target._myId].Orbit[index].Latlng.lng).format('0.0000') + '&deg;' + cardinal.Lng + '<br>Altitude: ' + numeral(currentVesselPlot.Data[e.target._myId].Orbit[index].Alt).format('0,0.000') + " km<br>Velocity: " + numeral(currentVesselPlot.Data[e.target._myId].Orbit[index].Vel).format('0,0.000') + " km/s");
      vesselPositionPopup.openOn(surfaceMap);
    }
  });
  
  return srfTrack;
}

// decides which compass quadrant the current coordinates reside in
function getLatLngCompass(latlng) {
  if (latlng.lat < 0) {
    var cardinalLat = "S";
  } else {
    var cardinalLat = "N";
  }
  if (latlng.lng < 0) {
    cardinalLng = "W";
  } else {
    cardinalLng = "E";
  }
  return {Lat: cardinalLat, Lng: cardinalLng};
}