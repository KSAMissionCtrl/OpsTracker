// refactor complete

function initializeMap() {

  // create the map with some custom options
  // details on Leaflet API can be found here - http://leafletjs.com/reference.html
  ops.surface.map = new L.Map('map', {
    crs: L.CRS.Kerbin.Equirectangular,
    center: [0,0],
    bodyControl: false,
    layersControl: false,
    scaleControl: true,
    minZoom: 0,
    zoom: 2,
    maxBounds: [[-95,-190], [95,190]],
    maxBoundsViscosity: 0.5,
    closePopupOnClick: false,
    fullscreenControl: true,
    fullscreenControlOptions: {
      position: 'topleft'
    },
    contextmenu: true,
    contextmenuItems: [{
      text: 'Copy Coordinates',
      callback: coordCopy
    }]
  });
  
  // define the icons for the various layer markers and events
  KSA_MAP_ICONS.flagIcon = L.icon({
    iconUrl: 'button_vessel_flag.png',
    iconSize: [16, 16],
    iconAnchor: [6,21] 
  });
  KSA_MAP_ICONS.POIIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'poi.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  KSA_MAP_ICONS.anomalyIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'anomaly.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  KSA_MAP_ICONS.airportIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'airport.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  KSA_MAP_ICONS.omniIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'pinOmni.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  KSA_MAP_ICONS.dishIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'pinDish.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  KSA_MAP_ICONS.labelIcon = L.icon({
    iconUrl: 'label.png',
    iconSize: [10, 10],
  });
  KSA_MAP_ICONS.sunIcon = L.icon({
    iconUrl: 'sun.png',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
  KSA_MAP_ICONS.apIcon = L.icon({
    iconUrl: 'ap.png',
    iconSize: [16, 16],
    iconAnchor: [8, 18],
    popupAnchor: [0, -4]
  });
  KSA_MAP_ICONS.peIcon = L.icon({
    iconUrl: 'pe.png',
    iconSize: [16, 16],
    iconAnchor: [8, 18],
    popupAnchor: [0, -4]
  });
  KSA_MAP_ICONS.soiExitIcon = L.icon({
    iconUrl: 'soiexit.png',
    iconSize: [16, 12],
    iconAnchor: [9, 6]
  });
  KSA_MAP_ICONS.soiEntryIcon = L.icon({
    iconUrl: 'soientry.png',
    iconSize: [16, 12],
    iconAnchor: [9, 6]
  });
  KSA_MAP_ICONS.nodeIcon = L.icon({
    iconUrl: 'node.png',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  // do not allow the user to close or resize the map when it is in fullscreen
  ops.surface.map.on('enterFullscreen', function() {
    if (KSA_MAP_CONTROLS.mapCloseButton) KSA_MAP_CONTROLS.mapCloseButton.disable();
    if (KSA_MAP_CONTROLS.mapResizeButton) KSA_MAP_CONTROLS.mapResizeButton.disable();
    KSA_UI_STATE.isMapFullscreen = true;
  });
  ops.surface.map.on('exitFullscreen', function() {
    if (KSA_MAP_CONTROLS.mapCloseButton) KSA_MAP_CONTROLS.mapCloseButton.enable();
    if (KSA_MAP_CONTROLS.mapResizeButton) KSA_MAP_CONTROLS.mapResizeButton.enable();
    KSA_UI_STATE.isMapFullscreen = false;
  });
  
  // set up event listener for when layers are added
  ops.surface.map.on('overlayadd', function(e) {
    if (e.layer === KSA_LAYERS.groundMarkers.layerSolar) {
      updateTerminator();
    }
  });
  
  // show controls only when the cursor is over the map, unless this is a touch device
  if (!is_touch_device()) { 
    ops.surface.map.on('mouseover', function(e) {
      $(".leaflet-top.leaflet-right").fadeIn();
      $(".leaflet-top.leaflet-left").fadeIn();
      $(".leaflet-bottom.leaflet-left").fadeIn();
    });
    ops.surface.map.on('mouseout', function(e) {
      if (!checkDataLoad()) $(".leaflet-top.leaflet-right").fadeOut();
      $(".leaflet-top.leaflet-left").fadeOut();
      $(".leaflet-bottom.leaflet-left").fadeOut();
    });
    ops.surface.map.on('mousemove', function(e) {
    
      // if we are still loading data, do not let the layer control collapse
      if (ops.surface.layerControl && !ops.surface.layerControl.options.collapsed) ops.surface.layerControl._expand();
    });
  }
  
  // extend the measurement control to allow the user to see the position of all the points they placed
  var Ruler = L.Control.LinearMeasurement.extend({
    layerSelected: function(e) {
      var html = '<b>Selected Points:</b><p>';
      e.points.forEach(function(latlng, index) {
        if (index == 0) {
          html += latlng[0].lat + "," + latlng[0].lng + "<br>";
          html += latlng[1].lat + "," + latlng[1].lng + "<br>";
        } else {
          html += latlng[1].lat + "," + latlng[1].lng;
          if (index < e.points.length-1) html += "<br>";
        }
      });
      html += "</p>";
      e.total_label.bindPopup(L.popup().setContent(html), { offset: [45, 0] });
      e.total_label.openPopup();
    }
  });  
  ops.surface.map.addControl(new Ruler({
    unitSystem: 'metric', 
    color: '#FFD800',
    show_azimut: true,
    show_last_node: true,
    contrastingColor: '#FFD800'
  }));
  
  // add a coordinates control
  L.control.mousePosition().addTo(ops.surface.map);
  
  // add a scale control
  L.control.scale().addTo(ops.surface.map);
  
  // no idea why but doing this makes it work better for when loading straight to the map in the body view
  setTimeout(function() {
    if (ops.pageType != "vessel") {
      $("#map").css("height", "885px");
      ops.surface.map.invalidateSize();
    }
  }, 150);
}

// cleanup function to remove all Ground Markers layers from the map
function cleanupGroundMarkersLayers() {
  // remove Labels layer
  if (KSA_LAYERS.groundMarkers.layerLabels) {
    if (ops.surface.map.hasLayer(KSA_LAYERS.groundMarkers.layerLabels)) {
      ops.surface.map.removeLayer(KSA_LAYERS.groundMarkers.layerLabels);
    }
    KSA_LAYERS.groundMarkers.layerLabels = null;
  }
  
  // remove Flags layer
  if (KSA_LAYERS.groundMarkers.layerFlags) {
    if (ops.surface.map.hasLayer(KSA_LAYERS.groundMarkers.layerFlags)) {
      ops.surface.map.removeLayer(KSA_LAYERS.groundMarkers.layerFlags);
    }
    KSA_LAYERS.groundMarkers.layerFlags = null;
  }
  
  // remove POI layer
  if (KSA_LAYERS.groundMarkers.layerPOI) {
    if (ops.surface.map.hasLayer(KSA_LAYERS.groundMarkers.layerPOI)) {
      ops.surface.map.removeLayer(KSA_LAYERS.groundMarkers.layerPOI);
    }
    KSA_LAYERS.groundMarkers.layerPOI = null;
  }
  
  // remove Anomalies layer
  if (KSA_LAYERS.groundMarkers.layerAnomalies) {
    if (ops.surface.map.hasLayer(KSA_LAYERS.groundMarkers.layerAnomalies)) {
      ops.surface.map.removeLayer(KSA_LAYERS.groundMarkers.layerAnomalies);
    }
    KSA_LAYERS.groundMarkers.layerAnomalies = null;
  }
  
  // remove Airports layer
  if (KSA_LAYERS.groundMarkers.layerAirports) {
    if (ops.surface.map.hasLayer(KSA_LAYERS.groundMarkers.layerAirports)) {
      ops.surface.map.removeLayer(KSA_LAYERS.groundMarkers.layerAirports);
    }
    KSA_LAYERS.groundMarkers.layerAirports = null;
  }
  
  // remove Solar layer (Sun/Terminator)
  if (KSA_LAYERS.groundMarkers.layerSolar) {
    if (ops.surface.map.hasLayer(KSA_LAYERS.groundMarkers.layerSolar)) {
      ops.surface.map.removeLayer(KSA_LAYERS.groundMarkers.layerSolar);
    }
    KSA_LAYERS.groundMarkers.layerSolar = null;
  }
  
  // remove Ground Stations layer
  if (KSA_LAYERS.groundMarkers.layerGroundStations) {
    if (ops.surface.map.hasLayer(KSA_LAYERS.groundMarkers.layerGroundStations)) {
      ops.surface.map.removeLayer(KSA_LAYERS.groundMarkers.layerGroundStations);
    }
    KSA_LAYERS.groundMarkers.layerGroundStations = null;
  }
  
  // remove Custom Pins layer
  if (KSA_LAYERS.groundMarkers.layerPins) {
    if (ops.surface.map.hasLayer(KSA_LAYERS.groundMarkers.layerPins)) {
      ops.surface.map.removeLayer(KSA_LAYERS.groundMarkers.layerPins);
    }
    KSA_LAYERS.groundMarkers.layerPins = null;
  }
}

// cleanup function to remove all loading indicator layers
function cleanupLoadingLayers() {
  // remove Orbital Tracks loading indicator
  if (KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad) {
    if (ops.surface.layerControl && ops.surface.layerControl._layers) {
      ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad);
    }
    KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad = null;
  }
  
  // remove Flight Tracks loading indicator
  if (KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad) {
    if (ops.surface.layerControl && ops.surface.layerControl._layers) {
      ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad);
    }
    KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad = null;
  }
  
  // remove Bodies (Moons/Vessels) loading indicator
  if (KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad) {
    if (ops.surface.layerControl && ops.surface.layerControl._layers) {
      ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad);
    }
    KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad = null;
  }
  
  // remove Vessels loading indicator
  if (KSA_LAYERS.surfaceTracksDataLoad.vesselsTrackDataLoad) {
    if (ops.surface.layerControl && ops.surface.layerControl._layers) {
      ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.vesselsTrackDataLoad);
    }
    KSA_LAYERS.surfaceTracksDataLoad.vesselsTrackDataLoad = null;
  }
}

function loadMap(map) {
  if (ops.surface.Data && ops.surface.Data.Name == map) {

    // we don't need to fully reload the data but we do need to still do these things
    if (getParameterByName("flt") && ops.pageType == "body") {
      KSA_CALCULATIONS.flightsToLoad = getQueryParams("flt");
      do {
        var flight = KSA_CALCULATIONS.flightsToLoad.shift();
        if ((!KSA_CATALOGS.fltPaths || (KSA_CATALOGS.fltPaths && !KSA_CATALOGS.fltPaths.find(o => o.id === flight))) && KSA_UI_STATE.strFltTrackLoading != flight) {
          KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad = L.layerGroup();
          ops.surface.layerControl._expand();
          ops.surface.layerControl.options.collapsed = false;
          ops.surface.layerControl.addOverlay(KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Flight Tracks");
          loadDB("loadFltData.asp?data=" + flight, loadFltDataAJAX);
          KSA_UI_STATE.strFltTrackLoading = flight;
          break;
        }
      } while (KSA_CALCULATIONS.flightsToLoad.length);
      showMap();
    }
    return;
  }

  // add a new layer control to let ppl know data is being loaded
  if (!ops.surface.layerControl) { ops.surface.layerControl = L.control.groupedLayers().addTo(ops.surface.map); }
  ops.surface.layerControl.addOverlay(ops.surface.loadingLayer, "<i class='fa fa-cog fa-spin'></i> Loading Data...");
  ops.surface.layerControl._expand();
  ops.surface.layerControl.options.collapsed = false;

  // call up the map data to load 
  // any orbital calcs in progress should have been paused with content swap
  loadDB("loadMapData.asp?map=" + map + "&UT=" + currUT(), loadMapDataAJAX);
  ops.surface.isLoading = true;
}

function loadMapDataAJAX(xhttp) {
  ops.surface.isLoading = false;

  // could be nothing to load, so just exit
  if (xhttp.responseText == "null") {
    ops.surface.layerControl.removeLayer(ops.surface.loadingLayer);
    ops.surface.layerControl._collapse();
    ops.surface.layerControl.options.collapsed = true;
    ops.surface.Data = null;
    return;
  }

  // parse out the data
  var data = xhttp.responseText.split("^");

  // assign the map data
  ops.surface.Data = rsToObj(data[0]);
  if (data[1] != "null") ops.updatesList.push({ type: "map", 
                                                id: ops.bodyCatalog.find(o => o.selected === true).Body, 
                                                UT: parseFloat(data[1]) });
  
  // clean up any existing Ground Markers and loading indicator layers before loading new ones
  cleanupGroundMarkersLayers();
  cleanupLoadingLayers();
  
  // remove the previous control and load the base layer
  if (ops.surface.layerControl) ops.surface.map.removeControl(ops.surface.layerControl);
  ops.surface.layerControl = L.control.groupedLayers().addTo(ops.surface.map);
  
  if (ops.surface.Data.Aerial) { var strSatLabel = "Aerial"; }
  if (ops.surface.Data.Satellite) { var strSatLabel = "Satellite"; }
  ops.surface.layerControl.addBaseLayer(
    L.tileLayer.kerbalMaps({
        body: ops.bodyCatalog.find(o => o.selected === true).Body.toLowerCase(),
        style: "sat"
      }
    ).addTo(ops.surface.map), strSatLabel);

  // set up MutationObserver to monitor control collapse/expand state
  var controlContainer = ops.surface.layerControl._container;
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        var isExpanded = controlContainer.classList.contains('leaflet-control-layers-expanded');
        if (!isExpanded) {

          // don't let this happen if there is data loading
          if (checkDataLoad()) ops.surface.layerControl._expand(); 
        }
      }
    });
  });
  
  // Start observing the container for class attribute changes
  observer.observe(controlContainer, {
    attributes: true,
    attributeFilter: ['class']
  });

  // show the entire control until everything is finished loading
  ops.surface.layerControl._expand();
  ops.surface.layerControl.options.collapsed = false;
  
  // load the rest of the tile layers, where available
  if (ops.surface.Data.Slope) {
    var slopeBase = L.tileLayer.kerbalMaps({
        body: ops.bodyCatalog.find(o => o.selected === true).Body.toLowerCase(),
        style: "slope"
      }
    );
    ops.surface.layerControl.addBaseLayer(slopeBase, "Slope");
  }
  if (ops.surface.Data.Terrain) {
    var reliefBase = L.tileLayer.kerbalMaps({
        body: ops.bodyCatalog.find(o => o.selected === true).Body.toLowerCase(),
        style: "color"
      }
    );
    ops.surface.layerControl.addBaseLayer(reliefBase, "Color Relief");
  }
  if (ops.surface.Data.Biome) {
    var biomeBase = L.tileLayer.kerbalMaps({
        body: ops.bodyCatalog.find(o => o.selected === true).Body.toLowerCase(),
        style: "biome"
      }
    );
    ops.surface.layerControl.addBaseLayer(biomeBase, "Biome");
  }
  
  // the following only works for Kerbin at the moment
  if (ops.surface.Data.Name == "Kerbin") {

    // determine the current position of the sun given the body's degree of initial rotation and rotational period
    var sunLon = -ops.bodyCatalog.find(o => o.selected === true).RotIni - (((currUT() / ops.bodyCatalog.find(o => o.selected === true).SolarDay) % 1) * 360);
    var sunLat = 0
    if (sunLon < -180) sunLon += 360;
    
    // create the solar layer group and add the sun marker
    KSA_LAYERS.groundMarkers.layerSolar = L.layerGroup();
    KSA_MAP_CONTROLS.sunMarker = L.marker([sunLat,sunLon], { icon: KSA_MAP_ICONS.sunIcon, clickable: false });
    KSA_LAYERS.groundMarkers.layerSolar.addLayer(KSA_MAP_CONTROLS.sunMarker);
    
    // add to the layer selection control
    ops.surface.layerControl.addOverlay(KSA_LAYERS.groundMarkers.layerSolar, "<i class='fas fa-sun' style='color: #FFD800'></i> Sun/Terminator", "Ground Markers");
    if (getParameterByName("layers").includes("sun") || getParameterByName("layers").includes("terminator")) {
      KSA_LAYERS.groundMarkers.layerSolar.addTo(ops.surface.map);
    }
  }

  // place any and all labels
  if (ops.surface.Data.Labels) {
    var labelData = ops.surface.Data.Labels.split("|");
    var labelMarker;
    KSA_LAYERS.groundMarkers.layerLabels = L.layerGroup();
    labelData.forEach(function(item) {
      var label = item.split(";");
      labelMarker = L.marker([label[0],label[1]], { icon: KSA_MAP_ICONS.labelIcon, zIndexOffset: 100 }).bindTooltip(label[2], { direction: 'top', offset: [0,-10] });
      KSA_LAYERS.groundMarkers.layerLabels.addLayer(labelMarker);
      labelMarker._myId = -1;
      
      // zoom the map all the way in and center on this marker when clicked
      labelMarker.on('click', function(e) { ops.surface.map.setView(e.target.getLatLng(), 5); });
    });
    ops.surface.layerControl.addOverlay(KSA_LAYERS.groundMarkers.layerLabels, "<img src='label.png' style='vertical-align: 1px;'> Labels", "Ground Markers");
    if (getParameterByName("layers").includes("label") || getParameterByName("layers").includes("lbl")) {
      KSA_LAYERS.groundMarkers.layerLabels.addTo(ops.surface.map);
    }
  }

  // place any and all flags
  if (ops.surface.Data.Flags) {
    var flagData = ops.surface.Data.Flags.split("|");
    var flagMarker;
    KSA_LAYERS.groundMarkers.layerFlags = L.layerGroup();
    flagData.forEach(function(item) {
      var flag = item.split(";");
      flagMarker = L.marker([flag[0],flag[1]], { icon: KSA_MAP_ICONS.flagIcon, zIndexOffset: 100 });
      if (flag[4] == 'null') var strCrew = "";
      else var strCrew = flag[4] + "<br />";
      if (flag[8] == 'null') var strLink = "<span class='fauxLink' onclick=\"swapContent('vessel','" + flag[7] + "')\">View Vessel</span>";
      else var strLink = "<a target='_blank' href='" + flag[7] + "'>" + flag[8] + "</a>";
      if (flag[2] != "0") var strAlt = numeral(flag[2]/1000).format('0.000') + "km<br />";
      else var strAlt = "";
      flagMarker.bindPopup("<b>" + flag[3] + "</b><br />" + strCrew + UTtoDateTime(parseInt(flag[6])).split(" ")[0] + "<br />" + strAlt + "<br />&quot;" + flag[5] + "&quot;<br /><br />" + strLink, { offset: new L.Point(0,-9), autoClose: true });
      KSA_LAYERS.groundMarkers.layerFlags.addLayer(flagMarker);

      // set the id to make the map click function ignore this popup and add it to the map
      flagMarker._myId = -1;
    });
    
    // add the layer to the map and if it is asked for in the URL variable show it immediately
    ops.surface.layerControl.addOverlay(KSA_LAYERS.groundMarkers.layerFlags, "<img src='button_vessel_flag.png' style='width: 10px; vertical-align: 1px;'> Flags", "Ground Markers");
    if (getParameterByName("layers").includes("flag")) KSA_LAYERS.groundMarkers.layerFlags.addTo(ops.surface.map);
  }
  
  // place any and all points of interest
  if (ops.surface.Data.POI) {
    var POIData = ops.surface.Data.POI.split("|");
    var POIMarker;
    KSA_LAYERS.groundMarkers.layerPOI = L.layerGroup();
    POIData.forEach(function(item) {
      var POI = item.split(";");
      POIMarker = L.marker([POI[0],POI[1]], { icon: KSA_MAP_ICONS.POIIcon, zIndexOffset: 100 });
      strHTML = "<b>" + POI[3] + "</b><br>" + numeral(POI[2]/1000).format('0.000') + " km";
      if (POI[4] != "null") strHTML += "<p>" + POI[4] + "</p>";
      POIMarker.bindPopup(strHTML, { autoClose: false });
      KSA_LAYERS.groundMarkers.layerPOI.addLayer(POIMarker);
      POIMarker._myId = -1;
    });
    ops.surface.layerControl.addOverlay(KSA_LAYERS.groundMarkers.layerPOI, "<img src='poi.png' style='width: 10px; vertical-align: 1px;'> Points of Interest", "Ground Markers");
    if (getParameterByName("layers").includes("poi") || getParameterByName("layers").includes("interest")) {
      KSA_LAYERS.groundMarkers.layerPOI.addTo(ops.surface.map);
    }
  }
  
  // place any and all anomalies
  if (ops.surface.Data.Anomalies) {
    var anomalyData = ops.surface.Data.Anomalies.split("|");
    var anomalyMarker;
    KSA_LAYERS.groundMarkers.layerAnomalies = L.layerGroup();
    anomalyData.forEach(function(item) {
      var anomaly = item.split(";");
      anomalyMarker = L.marker([anomaly[0],anomaly[1]], { icon: KSA_MAP_ICONS.anomalyIcon, zIndexOffset: 100 });
      strHTML = "<b>";
      if (anomaly[3] != "null") strHTML += anomaly[3];
      else strHTML += "Unknown Anomaly";
      strHTML += "</b><br>" + numeral(anomaly[2]/1000).format('0.000') + " km";
      anomalyMarker.bindPopup(strHTML, { autoClose: false });
      KSA_LAYERS.groundMarkers.layerAnomalies.addLayer(anomalyMarker);
      anomalyMarker._myId = -1;
    });
    ops.surface.layerControl.addOverlay(KSA_LAYERS.groundMarkers.layerAnomalies, "<img src='anomaly.png' style='width: 10px; vertical-align: 1px;'> Anomalies", "Ground Markers");
    if (getParameterByName("layers").includes("anom")) KSA_LAYERS.groundMarkers.layerAnomalies.addTo(ops.surface.map);
  }
  
  // place any and all ground stations
  if (ops.surface.Data.GroundStations) {
    var grndData = ops.surface.Data.GroundStations.split("|");
    var grndMarker;
    var layerGrndStn = L.layerGroup();
    grndData.forEach(function(item) {
      var station = item.split(";");
      if (station[4] == "0") grndMarker = L.marker([station[0],station[1]], { icon: KSA_MAP_ICONS.dishIcon, zIndexOffset: 100 });
      else grndMarker = L.marker([station[0],station[1]], { icon: KSA_MAP_ICONS.omniIcon, zIndexOffset: 100 });
      strHTML = "<b>";
      strHTML += station[3];
      strHTML += "</b><br>Altitude: " + numeral(station[2]/1000).format('0.000') + " km";
      if (station[4] == "0") strHTML += "<br>Range: Entire Kerbin System";
      else strHTML += "<br>Range: " + numeral(station[4]/1000).format('0.000') + " km";
      grndMarker.bindPopup(strHTML, { autoClose: false });
      grndMarker._myId = station[4];
      layerGrndStn.addLayer(grndMarker);

      // create the range of visibility to the horizon for this station and add it to the layer group
      var stationHorizon = addHorizonCircle(
        [parseFloat(station[0]), parseFloat(station[1])],
        parseFloat(station[2]),
        { color: "#FFD800" }
      );
      layerGrndStn.addLayer(stationHorizon);
    });

    // Store the layer globally so vessel/body horizons can be added to it
    KSA_LAYERS.groundMarkers.layerGroundStations = layerGrndStn;

    ops.surface.layerControl.addOverlay(layerGrndStn, "<img src='pinGrndStation.png' style='width: 10px; vertical-align: 1px;'> Ground Stations", "Ground Markers");
    if (getParameterByName("layers").includes("ground") || getParameterByName("layers").includes("grnd") || getParameterByName("layers").includes("station")) {
      layerGrndStn.addTo(ops.surface.map);
    }
  }

  // place any and all airports
  if (ops.surface.Data.Airports) {
    var aptData = ops.surface.Data.Airports.split("|");
    var aptMarker;
    KSA_LAYERS.groundMarkers.layerAirports = L.layerGroup();
    aptData.forEach(function(item) {
      var airport = item.split(";");
      aptMarker = L.marker([airport[0],airport[1]], { icon: KSA_MAP_ICONS.airportIcon, zIndexOffset: 100 });
      strHTML = "<b>";
      strHTML += airport[3];
      strHTML += "</b><br>Altitude: " + numeral(airport[2]/1000).format('0.000') + " km";
      aptMarker.bindPopup(strHTML, { autoClose: false });
      KSA_LAYERS.groundMarkers.layerAirports.addLayer(aptMarker);
      aptMarker._myId = -1;
    });
    ops.surface.layerControl.addOverlay(KSA_LAYERS.groundMarkers.layerAirports, "<img src='airport.png' style='width: 10px; vertical-align: 1px;'> Airports", "Ground Markers");
    if (getParameterByName("layers").includes("apt") || getParameterByName("layers").includes("airport")) {
      KSA_LAYERS.groundMarkers.layerAirports.addTo(ops.surface.map);
    }
  }

  // if this is a different map than any orbit data already loaded, dump the other data
  if (KSA_CATALOGS.bodyPaths.bodyName && KSA_CATALOGS.bodyPaths.bodyName != ops.surface.Data.Name) {
    KSA_CATALOGS.bodyPaths.bodyName = ops.surface.Data.Name;
    // Ground Markers layers are now cleaned up in cleanupGroundMarkersLayers()
  } else if (!KSA_CATALOGS.bodyPaths.bodyName) KSA_CATALOGS.bodyPaths.bodyName = ops.surface.Data.Name;

  // load surface track data for any vessels and moons in orbit around this body
  // this is dependent on ops catalog data so needs to be in its own function
  loadSurfaceTracks();

  // hide map controls after 3 seconds if the user cursor isn't over the map (or dialog) at that time
  // unless this is a touchscreen device
  if (!is_touch_device()) { 
    setTimeout(function() {
      if (!$('#map').is(":hover")) { 
        if (!checkDataLoad()) $(".leaflet-top.leaflet-right").fadeOut();
        $(".leaflet-top.leaflet-left").fadeOut();
        $(".leaflet-bottom.leaflet-left").fadeOut();
      }
    }, 3000);
  }

  // load straight to a map location?
  if (getParameterByName("center")) {
    var mapLocation = getParameterByName("center").split(",");
    ops.surface.map.setView([mapLocation[0], mapLocation[1]], 3);
    if (ops.pageType == "body") showMap();
  }
  
  // load map pin(s) and caption(s)?
  if (getParameterByName("loc")) {
    KSA_LAYERS.groundMarkers.layerPins = L.featureGroup();
    var isMultiple = false;
    var pin;
    
    // get all pin locations and iterate through them
    getQueryParams("loc").forEach(function(item, index) {
      if (index > 0) isMultiple = true;
      mapLocation = item.split(",");

      // make a pin clickable only if it has a caption, not just a location
      if (mapLocation.length > 2) {
        pin = L.marker([mapLocation[0], mapLocation[1]]).bindPopup(mapLocation[2], { autoClose: false });
      } else {
        pin = L.marker([mapLocation[0], mapLocation[1]], { clickable: false });
      }
      KSA_LAYERS.groundMarkers.layerPins.addLayer(pin);
      pin._myId = -1;
    });

    // place the pins and size the map to show them all
    KSA_LAYERS.groundMarkers.layerPins.addTo(ops.surface.map);
    ops.surface.layerControl.addOverlay(KSA_LAYERS.groundMarkers.layerPins, "<img src='defPin.png' style='width: 10px; height: 14px; vertical-align: 1px;'> Custom Pins", "Ground Markers");
    ops.surface.map.fitBounds(KSA_LAYERS.groundMarkers.layerPins.getBounds());
    
    // if only one marker was placed, open its popup and zoom back out
    if (!isMultiple) {
      pin.openPopup();
      ops.surface.map.setView(pin.getLatLng(), 7);
    }
    if (ops.pageType == "body") showMap();
  }
  
  // load flight paths, taking into account they may already be loaded
  if (getParameterByName("flt") && ops.pageType == "body") {
    KSA_CALCULATIONS.flightsToLoad = getQueryParams("flt");
    do {
      var flight = KSA_CALCULATIONS.flightsToLoad.shift();
      if ((!KSA_CATALOGS.fltPaths || (KSA_CATALOGS.fltPaths && !KSA_CATALOGS.fltPaths.find(o => o.id === flight))) && KSA_UI_STATE.strFltTrackLoading != flight) {
        KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad = L.layerGroup();
        ops.surface.layerControl._expand();
        ops.surface.layerControl.options.collapsed = false;
        ops.surface.layerControl.addOverlay(KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Flight Tracks");
        loadDB("loadFltData.asp?data=" + flight, loadFltDataAJAX);
        KSA_UI_STATE.strFltTrackLoading = flight;
        break;
      }
    } while (KSA_CALCULATIONS.flightsToLoad.length);
    showMap();
  }
  
  // load straight to a map?
  // Note that &map is required ONLY when viewing a body page if you want to show the map straight away without using any other commands
  if ((window.location.href.includes("&map") || getParameterByName("layers")) && ops.pageType == "body") showMap();
  
  // done with data load?
  checkDataLoad();
}

function loadFltDataAJAX(xhttp) {
  
  // split and parse the flight data
  var fltInfo = rsToObj(xhttp.responseText.split("^")[0]);
  var fltData = [];
  xhttp.responseText.split("^")[1].split("|").forEach(function(item) { fltData.push(rsToObj(item)); });

  // get the min/max altitudes of the flight
  var altMin = fltData[0].ASL;
  var altMax = 0;
  fltData.forEach(function(dataPoint) { if (dataPoint.ASL > altMax) altMax = dataPoint.ASL });
  
  // make sure we don't overstep bounds on the color index
  if (KSA_CATALOGS.fltPaths.length >= KSA_COLORS.surfacePathColors.length) var colorIndex = KSA_CATALOGS.fltPaths.length - (KSA_COLORS.surfacePathColors.length * (Math.floor(KSA_CATALOGS.fltPaths.length/KSA_COLORS.surfacePathColors.length)));
  else var colorIndex = KSA_CATALOGS.fltPaths.length;
  KSA_CATALOGS.fltPaths.push({ info: fltInfo,
                  fltData: fltData,
                  layer: L.featureGroup(),
                  pins: [],
                  html: null,
                  id: xhttp.responseText.split("^")[2],
                  deleted: false,
                  elev: false,
                  color: KSA_COLORS.surfacePathColors[colorIndex],
                  index: KSA_CATALOGS.fltPaths.length,
                  minASL: altMin/1000,
                  maxASL: altMax/1000
                });
  
  // make sure that if a layer is hidden the current popup is too if that belongs to the layer
  KSA_CATALOGS.fltPaths[KSA_CATALOGS.fltPaths.length-1].layer._myId = KSA_CATALOGS.fltPaths[KSA_CATALOGS.fltPaths.length-1].info.Title;
  KSA_CATALOGS.fltPaths[KSA_CATALOGS.fltPaths.length-1].layer.on('remove', function(e) {
    if (KSA_MAP_CONTROLS.flightPositionPopup.getContent() && KSA_MAP_CONTROLS.flightPositionPopup.getContent().includes(e.target._myId)) ops.surface.map.closePopup(KSA_MAP_CONTROLS.flightPositionPopup);
  });

  // draw the ground track
  renderFltPath(KSA_CATALOGS.fltPaths.length-1);
  
  // delete the loading layer and add the flight path layer to the control and the map
  if (KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad) {
    ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad);
  }
  ops.surface.layerControl.addOverlay(KSA_CATALOGS.fltPaths[KSA_CATALOGS.fltPaths.length-1].layer, "<i class='fa fa-minus' style='color: " + KSA_CATALOGS.fltPaths[KSA_CATALOGS.fltPaths.length-1].color + "'></i> " + KSA_CATALOGS.fltPaths[KSA_CATALOGS.fltPaths.length-1].info.Title, "Flight Tracks");
  KSA_CATALOGS.fltPaths[KSA_CATALOGS.fltPaths.length-1].layer.addTo(ops.surface.map)
  
  // get more flight data?
  if (KSA_CALCULATIONS.flightsToLoad) {
    if (KSA_CALCULATIONS.flightsToLoad.length) {
      KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad = L.layerGroup();
      ops.surface.layerControl.addOverlay(KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Flight Tracks");
      var strFlightName = KSA_CALCULATIONS.flightsToLoad.shift();
      loadDB("loadFltData.asp?data=" + strFlightName, loadFltDataAJAX);
      KSA_UI_STATE.strFltTrackLoading = strFlightName;
  
    // done with data load?
    } else {
      KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad = null;
      KSA_CALCULATIONS.flightsToLoad = null;
      KSA_UI_STATE.strFltTrackLoading = null;
      checkDataLoad();
      
      // if there was only one track...
      if (KSA_CATALOGS.fltPaths.length == 1) {

        // select it in the menu
        selectMenuItem(KSA_CATALOGS.fltPaths[0].id);

        // check for in-progress flight
        if (!inFlight(KSA_CATALOGS.fltPaths[0])) {

          // if there are more than two layers the plot wraps around the meridian so just show the whole map
          // otherwise zoom in to fit the size of the plot
          // https://stackoverflow.com/questions/5223/length-of-a-javascript-object
          var polylines = getPolylinesFromLayer(KSA_CATALOGS.fltPaths[0].layer);
          if (polylines.length > 1) ops.surface.map.setView([0,0], 1);
          else ops.surface.map.fitBounds(polylines[0]._bounds);
        }
        
        // Update the URL to include this flight
        var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?body=Kerbin-System&flt=" + KSA_CATALOGS.fltPaths[0].id;
        history.pushState({type: "flt", db: KSA_CATALOGS.fltPaths[0].id}, document.title, strURL);
      // multiple tracks...
      } else {

        // just select and open the category
        w2ui['menu'].select("aircraft");
        w2ui['menu'].expand("aircraft");
        w2ui['menu'].expandParents("aircraft");
        w2ui['menu'].scrollIntoView("aircraft");

        // get the combined bounds of all the plots
        var isDblPlotted = false;
        var groupBounds = null;
        KSA_CATALOGS.fltPaths.forEach(function(item) {
          
          // if there are more than two layers the plot wraps around the meridian
          var polylines = getPolylinesFromLayer(item.layer);
          if (polylines.length > 1) isDblPlotted = true;
          else {
            if (!groupBounds) groupBounds = polylines[0]._bounds;
            else groupBounds.extend(polylines[0]._bounds);
          }
        });

        // if there is a double plot, just show the whole map otherwise fit the bounds
        if (isDblPlotted) ops.surface.map.setView([0,0], 1);
        else ops.surface.map.fitBounds(groupBounds);
      }
    }
  } else {

    // Select this flight in the menu
    selectMenuItem(KSA_CATALOGS.fltPaths[KSA_CATALOGS.fltPaths.length-1].id);

    // check for in-progress flight
    if (!inFlight(KSA_CATALOGS.fltPaths[KSA_CATALOGS.fltPaths.length-1])) {

      // zoom out to the full map if the new plot jumps the meridian otherwise fit its bounds
      var polylines = getPolylinesFromLayer(KSA_CATALOGS.fltPaths[KSA_CATALOGS.fltPaths.length-1].layer);
      if (polylines.length > 1) ops.surface.map.setView([0,0], 1);
      else ops.surface.map.fitBounds(polylines[0]._bounds);
    }

    // Update the URL to include this flight
    var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?body=Kerbin-System&flt=" + KSA_CATALOGS.fltPaths[KSA_CATALOGS.fltPaths.length-1].id;
    history.pushState({type: "flt", db: KSA_CATALOGS.fltPaths[KSA_CATALOGS.fltPaths.length-1].id}, document.title, strURL);

    KSA_LAYERS.surfaceTracksDataLoad.fltTrackDataLoad = null;
    checkDataLoad();
  }
  if (KSA_UI_STATE.strFltTrackLoading) KSA_UI_STATE.strFltTrackLoading = null;
}

function renderMapData(updated = false) {
  var bPopped = clearSurfacePlots();
  ops.currentVesselPlot = {
    obtData: [],
    numOrbitRenders: 3,
    isCentered: bPopped,
    events: {
      pe: { marker: null, UT: null },
      ap: { marker: null, UT: null },
      soi: { marker: null },
      node: { marker: null}
    },
    id: ops.currentVessel.Catalog.DB,
    eph: ops.currentVessel.Orbit.Eph
  };

  // check if we need to wait for the vessel to finish loading or if we need to wait for the base map layers to finish loading
  // or if we have to wait for the GGB to finish loading or if we need to wait for the content area to stop moving
  if ((!ops.currentVessel && ops.pageType == "vessel") || 
      (ops.surface.layerControl && !ops.surface.layerControl.options.collapsed) ||
      !KSA_UI_STATE.isGGBAppletLoaded || KSA_UI_STATE.isContentMoving) {

    // but wait! if this call was made during an orbital data update, ignore the map layer control being open, we need to cancel & restart
    if (!updated) return setTimeout(renderMapData, 150);
  }

  // don't let this proceed if there is no orbital data!
  if (!ops.currentVessel.Orbit.Eph) return;

  // if there is a paused calculation we are returning to, then just resume calling the orbital batch
  if (KSA_CALCULATIONS.strPausedVesselCalculation == ops.currentVessel.Catalog.DB) {
    
    // re-show the progress dialog for current state of calculation
    $("#mapDialog").dialog( "option", "title", "Calculating Orbit #" + ops.currentVesselPlot.obtData.length+1 + " of " + ops.currentVesselPlot.numOrbitRenders);
    $("#mapDialog").dialog( "option", "buttons", [{
      text: "Cancel and Display",
      click: function() { 
        KSA_UI_STATE.isOrbitRenderCancelled = true;
      }
    }]);
    $(".ui-progressbar-value").css("background-color", KSA_COLORS.vesselOrbitColors[ops.currentVesselPlot.obtData.length]);
    $("#dialogTxt").hide();
    $("#progressbar").progressbar("value", (KSA_CALCULATIONS.obtDataCalcVes.obt.length/ops.currentVessel.Orbit.OrbitalPeriod)*100);
    $("#progressbar").fadeIn();
    $("#mapDialog").dialog("open");

    // redraw any existing orbital data on the map
    if (ops.currentVesselPlot.obtData.length) redrawVesselPlots();
  
    // reset the load state of the map
    ops.surface.layerControl._expand();
    ops.surface.layerControl.options.collapsed = false;
    $(".leaflet-top.leaflet-right").fadeIn();
    KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad = L.layerGroup();
    ops.surface.layerControl.addOverlay(KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");
    KSA_CALCULATIONS.strPausedVesselCalculation = null;
    KSA_UI_STATE.isVesObtRenderTerminated = false;
    orbitalCalc(renderVesselOrbit, ops.currentVessel.Orbit, KSA_CALCULATIONS.obtDataCalcVes);

  // otherwise we need to calculate surface tracks for a single vessel
  } else if (ops.pageType == "vessel") {
    if (updated) KSA_UI_STATE.isVesObtRenderTerminated = true;

    // check if another vessel rendering was interrupted and be sure the user wants to continue
    if (KSA_CALCULATIONS.strPausedVesselCalculation) {
      $("#mapDialog").dialog( "option", "buttons", [{
        text: "Proceed",
        click: function() { 
          beginOrbitalCalc();
        }
      },{
        text: "Return",
        click: function() { 
          swapContent("vessel", KSA_CALCULATIONS.strPausedVesselCalculation);
        }
      }]);
      $("#mapDialog").dialog( "option", "title", "Calculation Notice");
      $("#dialogTxt").html("A previous calculation was started for another vessel. Do you wish to calculate orbital data for this vessel or return to the paused calculation?");
      $("#dialogTxt").fadeIn();
      $("#progressbar").hide();

      // gives time for any map buttons to hide
      KSA_TIMERS.mapDialogDelay = setTimeout(function() { 
        $("#mapDialog").dialog("open"); 
        KSA_TIMERS.mapDialogDelay = null;
      }, 1000);
    } else beginOrbitalCalc();
  }
}

// does the initial display and configuration for vessel orbital data loading
function beginOrbitalCalc(numOrbitRenders = 3) {

  KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad = null;
  KSA_CALCULATIONS.strPausedVesselCalculation = null;
  KSA_CALCULATIONS.obtDataCalcVes.obt.length = 0;
  KSA_UI_STATE.isOrbitRenderCancelled = false;
  KSA_UI_STATE.isVesObtRenderTerminated = false;
    
  // make sure there's any point in rendering an orbit before we start the process, 
  // if there is an SOI event that has already occured then the orbital data is invalid
  if (ops.currentVessel.Orbit.SOIEvent && parseInt(ops.currentVessel.Orbit.SOIEvent.split(";")[0]) <= currUT()) {
    $("#mapDialog").dialog("close");
    renderVesselOrbit();
    return;
  }

  ops.currentVesselPlot.numOrbitRenders = numOrbitRenders;
  $("#mapDialog").dialog( "option", "title", "Calculating Orbit #1 of " + ops.currentVesselPlot.numOrbitRenders);
  $("#mapDialog").dialog( "option", "buttons", [{
    text: "Cancel and Display",
    click: function() {
      KSA_UI_STATE.isOrbitRenderCancelled = true;
    }
  }]);
  $(".ui-progressbar-value").css("background-color", KSA_COLORS.vesselOrbitColors[ops.currentVesselPlot.obtData.length]);
  $("#dialogTxt").hide();
  $("#progressbar").progressbar("value", 0);
  $("#progressbar").fadeIn();
  $("#mapDialog").dialog("open");
  ops.surface.layerControl._expand();
  ops.surface.layerControl.options.collapsed = false;
  $(".leaflet-top.leaflet-right").fadeIn();
  KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad = L.layerGroup();
  ops.surface.layerControl.addOverlay(KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");
  
  // set the current UT from which the orbital data will be propagated forward
  KSA_CALCULATIONS.obtDataCalcVes.UT = currUT();
  orbitalCalc(renderVesselOrbit, ops.currentVessel.Orbit, KSA_CALCULATIONS.obtDataCalcVes);
}

// draws the entire path of a vessel over a single or multiple orbits
function renderVesselOrbit() {

  // we have completed a batch of calculations?
  if (KSA_CALCULATIONS.obtDataCalcVes.obt.length) {

    // store the data
    ops.currentVesselPlot.obtData.push({
      orbit: KSA_CALCULATIONS.obtDataCalcVes.obt.slice(0),
      layer: L.featureGroup(),
      startUT: KSA_CALCULATIONS.obtDataCalcVes.UT-KSA_CALCULATIONS.obtDataCalcVes.obt.length,
      endUT: KSA_CALCULATIONS.obtDataCalcVes.UT
    });

    // get the times we'll reach Ap and Pe along this orbit if we haven't already done so
    if (!ops.currentVesselPlot.events.ap.marker || !ops.currentVesselPlot.events.pe.marker) {
      var n = Math.sqrt(ops.bodyCatalog.find(o => o.selected === true).Gm/(Math.pow(Math.abs(ops.currentVessel.Orbit.SMA),3)));
      var newMean = toMeanAnomaly(Math.radians(ops.currentVessel.Orbit.TrueAnom), ops.currentVessel.Orbit.Eccentricity) + n * ((KSA_CALCULATIONS.obtDataCalcVes.UT-KSA_CALCULATIONS.obtDataCalcVes.obt.length) - ops.currentVessel.Orbit.Eph);
      if (newMean < 0 || newMean > 2*Math.PI) {
        newMean = Math.abs(newMean - (2*Math.PI) * Math.floor(newMean / (2*Math.PI)));
      }
      var apTime = Math.round((Math.PI - newMean)/n);
      var peTime = Math.round((Math.PI*2 - newMean)/n);
      
      // close to Ap/Pe we can get a negative value, so handle that by just adding the period
      if (apTime <= 0) apTime += Math.round(ops.currentVessel.Orbit.OrbitalPeriod);
      if (peTime <= 0) peTime += Math.round(ops.currentVessel.Orbit.OrbitalPeriod);
      
      // stash away the times but convert them to UT instead of seconds from the start of this orbit
      ops.currentVesselPlot.events.pe.UT = peTime + (KSA_CALCULATIONS.obtDataCalcVes.UT-KSA_CALCULATIONS.obtDataCalcVes.obt.length);
      ops.currentVesselPlot.events.ap.UT = apTime + (KSA_CALCULATIONS.obtDataCalcVes.UT-KSA_CALCULATIONS.obtDataCalcVes.obt.length);
      
      // configure the Ap/Pe icons, ensuring that enough orbit has been plotted to display them
      if (!ops.currentVesselPlot.events.ap.marker && apTime < KSA_CALCULATIONS.obtDataCalcVes.obt.length) { 

        // add the marker, assign its information popup and give it a callback for instant update when opened, then add it to the current layer
        ops.currentVesselPlot.events.ap.marker = L.marker(KSA_CALCULATIONS.obtDataCalcVes.obt[apTime].latlng, {icon: KSA_MAP_ICONS.apIcon}); 
        var strTimeDate = UTtoDateTime(KSA_CALCULATIONS.obtDataCalcVes.UT-KSA_CALCULATIONS.obtDataCalcVes.obt.length + apTime);
        ops.currentVesselPlot.events.ap.marker.bindPopup("<center>" + numeral(KSA_CALCULATIONS.obtDataCalcVes.obt[apTime].alt).format('0,0.000') + "km<br>Time to Apoapsis<br><span id='apTime'>" + formatTime(apTime) + "</span><br><span id='apDate'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
        ops.currentVesselPlot.events.ap.marker.on('click', function(e) {
          $('#apTime').html(formatTime(ops.currentVesselPlot.events.ap.UT - currUT()));
        });
        ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer.addLayer(ops.currentVesselPlot.events.ap.marker);
      }
      if (!ops.currentVesselPlot.events.pe.marker && peTime < KSA_CALCULATIONS.obtDataCalcVes.obt.length) { 
        ops.currentVesselPlot.events.pe.marker = L.marker(KSA_CALCULATIONS.obtDataCalcVes.obt[peTime].latlng, {icon: KSA_MAP_ICONS.peIcon}); 
        var strTimeDate = UTtoDateTime(KSA_CALCULATIONS.obtDataCalcVes.UT-KSA_CALCULATIONS.obtDataCalcVes.obt.length + peTime);
        ops.currentVesselPlot.events.pe.marker.bindPopup("<center>" + numeral(KSA_CALCULATIONS.obtDataCalcVes.obt[peTime].alt).format('0,0.000') + "km<br>Time to Periapsis<br><span id='peTime'>" + formatTime(peTime) + "</span><br><span id='peDate'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
        ops.currentVesselPlot.events.pe.marker.on('click', function(e) {
          $('#peTime').html(formatTime(ops.currentVesselPlot.events.pe.UT - currUT()));
        });
        ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer.addLayer(ops.currentVesselPlot.events.pe.marker);
      }
    }

    // does this orbit terminate in an SOI event?
    if (ops.currentVessel.Orbit.SOIEvent && parseInt(ops.currentVessel.Orbit.SOIEvent.split(";")[0]) <= KSA_CALCULATIONS.obtDataCalcVes.UT) {
      var strEvent;
      var latlng = {lat: parseFloat(ops.currentVessel.Orbit.SOIEvent.split(";")[3]), 
                    lng: parseFloat(ops.currentVessel.Orbit.SOIEvent.split(";")[4])};
      if (ops.currentVessel.Orbit.SOIEvent.split(";")[1] == "entry") {
        strEvent = "Atmospheric Entry";
        ops.currentVesselPlot.events.soi.marker = L.marker(latlng, {icon: KSA_MAP_ICONS.soiEntryIcon}); 
      } 
      else if (ops.currentVessel.Orbit.SOIEvent.split(";")[1] == "exit") {
        strEvent = "SOI Exit";
        ops.currentVesselPlot.events.soi.marker = L.marker(latlng, {icon: KSA_MAP_ICONS.soiExitIcon}); 
      }
 
      // add the marker, assign its information popup and give it a callback for instant update when opened, then add it to the current layer
      ops.currentVesselPlot.events.soi.UT = parseInt(ops.currentVessel.Orbit.SOIEvent.split(";")[0]);
      var strTimeDate = UTtoDateTime(ops.currentVesselPlot.events.soi.UT);
      ops.currentVesselPlot.events.soi.marker.bindPopup("<center>Time to " + strEvent + "<br><span id='soiTime'>" + formatTime(ops.currentVesselPlot.events.soi.UT) + "</span><br><span id='soiDate'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
      ops.currentVesselPlot.events.soi.marker.on('click', function(e) {
        $('#soiTime').html(formatTime(ops.currentVesselPlot.events.soi.UT - currUT()));
      });
      ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer.addLayer(ops.currentVesselPlot.events.soi.marker);
   }

    // gather up the lat/lng positions into the paths to render
    var path = [];
    ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].orbit.forEach(function(position) {
      
      // detect if we've crossed off the edge of the map and need to cut the orbital line
      // compare this lng to the prev and if it changed from negative to positive or vice versa, we hit the edge  
      // (check if the lng is over 100 to prevent detecting a sign change while crossing the meridian)
      if (path.length && (((position.latlng.lng < 0 && path[path.length-1].lng > 0) && Math.abs(position.latlng.lng) > 100) || ((position.latlng.lng > 0 && path[path.length-1].lng < 0) && Math.abs(position.latlng.lng) > 100))) { 
      
        // time to cut this path off and create a surface track to setup
        // add this path to the layer and reset to start building a new path
        ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer.addLayer(setupVesselSurfacePath(path, ops.currentVesselPlot.obtData.length-1));
        path.length = 0;
      } 
      path.push(position.latlng);
    });
    
    // setup the final path stretch and add it to the layer
    ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer.addLayer(setupVesselSurfacePath(path, ops.currentVesselPlot.obtData.length-1));
    
    // add the orbital layer to the control and the map
    ops.surface.layerControl.addOverlay(ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer, "<i class='fa fa-minus' style='color: " + KSA_COLORS.vesselOrbitColors[ops.currentVesselPlot.obtData.length-1] + "'></i> Vessel Orbit #" + (ops.currentVesselPlot.obtData.length), "Orbital Tracks");
    ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer.addTo(ops.surface.map)

    // delete and re-add the loading layer so it stays below the added paths
    ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad);
    KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad = L.layerGroup();
    ops.surface.layerControl.addOverlay(KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");
  
  // if there is no orbit then there was an SOI event prior to this UT
  } else {
      var latlng = {lat: parseFloat(ops.currentVessel.Orbit.SOIEvent.split(";")[3]), 
                    lng: parseFloat(ops.currentVessel.Orbit.SOIEvent.split(";")[4])};
      if (ops.currentVessel.Orbit.SOIEvent.split(";")[1] == "entry") {
        ops.currentVesselPlot.events.soi.marker = L.marker(latlng, {icon: KSA_MAP_ICONS.soiEntryIcon}); 
      } 
      else if (ops.currentVessel.Orbit.SOIEvent.split(";")[1] == "exit") {
        ops.currentVesselPlot.events.soi.marker = L.marker(latlng, {icon: KSA_MAP_ICONS.soiExitIcon}); 
      }
    ops.currentVesselPlot.events.soi.marker.addTo(ops.surface.map)
    ops.currentVesselPlot.events.soi.marker.bindPopup("<center>" + UTtoDateTime(parseInt(ops.currentVessel.Orbit.SOIEvent.split(";")[0])).split("@")[1] + " UTC<br>Telemetry data invalid due to " + ops.currentVessel.Orbit.SOIEvent.split(";")[2] + "<br>Please stand by for update</center>", { autoClose: false });
    ops.currentVesselPlot.events.soi.marker.openPopup();
    ops.surface.map.setView(ops.currentVesselPlot.events.soi.marker.getLatLng());
  }

  // are there still more orbits to render? Don't continue if the rendering has been cancelled or there are SOI markers present
  if (ops.currentVesselPlot.numOrbitRenders > ops.currentVesselPlot.obtData.length && !KSA_UI_STATE.isOrbitRenderCancelled && (!ops.currentVesselPlot.events.soi.marker)) { 
    
    // update the dialog box and call another round
    $(".ui-progressbar-value").css("background-color", KSA_COLORS.vesselOrbitColors[ops.currentVesselPlot.obtData.length]);
    $("#progressbar").progressbar("value", 0);
    KSA_CALCULATIONS.obtDataCalcVes.obt.length = 0;
    orbitalCalc(renderVesselOrbit, ops.currentVessel.Orbit, KSA_CALCULATIONS.obtDataCalcVes); 
    
  // calculation has been completed or cancelled
  } else if (ops.currentVesselPlot.obtData.length) { 
    
    // warn the user if they cancelled the calculations early before a full orbit was rendered
    if (ops.currentVesselPlot.obtData[0].orbit.length < ops.currentVessel.Orbit.OrbitalPeriod && KSA_UI_STATE.isOrbitRenderCancelled) {
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
    } else $("#mapDialog").dialog("close");
    
    // done with the loading notice
    ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad);
    KSA_LAYERS.surfaceTracksDataLoad.obtTrackDataLoad = null;
    checkDataLoad();
    
    // reset loading flags/triggers
    KSA_CALCULATIONS.strPausedVesselCalculation = null;
    KSA_UI_STATE.isOrbitRenderCancelled = false;
    KSA_UI_STATE.isVesObtRenderTerminated = false;

    // place the craft marker and assign its popup
    KSA_MAP_ICONS.vesselIcon = L.icon({iconUrl: 'button_vessel_' + currType(ops.currentVessel.Catalog.Type) + '.png', iconSize: [16, 16]});
    KSA_MAP_CONTROLS.vesselMarker = L.marker(ops.currentVesselPlot.obtData[0].orbit[0].latlng, {icon: KSA_MAP_ICONS.vesselIcon, zIndexOffset: 100}).addTo(ops.surface.map);
    var strPopupContent = "Latitude: <span id='lat'>-000.0000&deg;S</span><br>";
    strPopupContent += "Longitude: <span id='lng'>-000.0000&deg;W</span><br>";
    strPopupContent += "Altitude: <span id='alt'>000,000.000km</span><br>";
    strPopupContent += "Velocity: <span id='vel'>000,000.000km/s</span><br>";
    strPopupContent += "<br><center><span class='fauxLink' id='centerVesselLink' onclick='setVesselCenterFlag()'>&nbsp;</span></center>";
    KSA_MAP_CONTROLS.vesselMarker.bindPopup(strPopupContent, {autoClose: false, keepInView: false, autoPan: false});

    // create horizon circle for the vessel
    if (!KSA_MAP_CONTROLS.vesselHorizon.vessel) {
      KSA_MAP_CONTROLS.vesselHorizon.vessel = addHorizonCircle(
        ops.currentVesselPlot.obtData[0].orbit[0].latlng,
        ops.currentVesselPlot.obtData[0].orbit[0].alt * 1000,
        { color: KSA_COLORS.vesselOrbitColors[0] }
      );
      // Add horizon to ground station layer so it only shows when that layer is active
      KSA_LAYERS.groundMarkers.layerGroundStations.addLayer(KSA_MAP_CONTROLS.vesselHorizon.vessel);
    }

    // set up a listener for popup events so we can immediately update the information and not have to wait for the next tick event
    KSA_MAP_CONTROLS.vesselMarker.on('popupopen', function(e) {
      var now = getPlotIndex();
      var cardinal = getLatLngCompass(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng);
      $('#lat').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng.lat).format('0.0000') + "&deg;" + cardinal.lat);
      $('#lng').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng.lng).format('0.0000') + "&deg;" + cardinal.lng);
      $('#alt').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].alt).format('0,0.000') + " km");
      $('#vel').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].vel).format('0,0.000') + " km/s");
      if (!ops.currentVesselPlot.isCentered) $('#centerVesselLink').text("Lock on Vessel");
      else $('#centerVesselLink').text("Lock off Vessel");
    });
    
    // focus in on the vessel position?
    if (ops.currentVesselPlot.isCentered) {
      ops.currentVesselPlot.isCentered = false;
      ops.surface.map.setView(KSA_MAP_CONTROLS.vesselMarker.getLatLng(), 3);
      KSA_MAP_CONTROLS.vesselMarker.openPopup();
    }
    addMapRefreshButton();
  }
}

// this function will continually call itself to batch-run orbital calculations and not completely lock up the browser
// will calculate a full orbital period unless cancelled or otherwise interrupted by an event along the orbit, then pass control to the callback
// orbital period self-assigned to keep from having to call the catalog for this information
// dataArray parameter allows specifying which array to store calculation results
function orbitalCalc(callback, orbit, dataArray, batchCount = 1000, limit) {

  // we can get passed an empty orbit with just UT data, so if that's the case then go straight to callback
  if (orbit.Eph == null) {
    callback();
    return;
  }
  
  if (!limit) limit = orbit.OrbitalPeriod;
  if ((KSA_UI_STATE.isVesObtRenderTerminated && dataArray.isVessel) || 
      (KSA_UI_STATE.isSfcObtRenderTerminated && !dataArray.isVessel)) return;
  if (KSA_CALCULATIONS.strPausedVesselCalculation && dataArray.isVessel) return;
  var bSOILimit = false;

  // update the dialog title with the current date & time being calculated
  if (dataArray.isVessel && $("#mapDialog").dialog("isOpen") && $("#mapDialog").dialog("option").title != "Render Notice") {
    var strDialogTitle = "Calculating Orbit #" + (ops.currentVesselPlot.obtData.length + 1) + " of " + ops.currentVesselPlot.numOrbitRenders + " - ";
    strDialogTitle += UTtoDateTime(dataArray.UT, true);
    $("#mapDialog").dialog("option", "title", strDialogTitle);
    $('#progressbar').progressbar("value", (dataArray.obt.length/limit)*100);
  }

  // load up on some data-fetching and conversions so we're not repeating them in the batch loop
  var gmu = ops.bodyCatalog.find(o => o.selected === true).Gm; 
  var rotPeriod = ops.bodyCatalog.find(o => o.selected === true).RotPeriod;
  var rotInit = Math.radians(ops.bodyCatalog.find(o => o.selected === true).RotIni); 
  var bodRad = ops.bodyCatalog.find(o => o.selected === true).Radius;
  var inc = Math.radians(orbit.Inclination);
  var raan = Math.radians(orbit.RAAN);
  var arg = Math.radians(orbit.Arg);
  var mean = toMeanAnomaly(Math.radians(orbit.TrueAnom), orbit.Eccentricity);
  
  for (x=0; x<=batchCount; x++) {
  
    //////////////////////
    // computeMeanMotion()
    // all function comments are from https://github.com/Arrowstar/ksptot
    //////////////////////////////////////////////////////////////////////
    
    // adjust for motion since the time of this orbit
    var n = Math.sqrt(gmu/(Math.pow(Math.abs(orbit.SMA),3)));
    var newMean = mean + n * (dataArray.UT - orbit.Eph);

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
    var angle = rotInit + bodySpinRate*dataArray.UT;
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
    longitude = normalizeLongitude(longitude);
    
    // store all the derived values and advance to the next second
    dataArray.obt.push({latlng: {lat: latitude, lng: longitude}, alt: alt, vel: vel});
    dataArray.UT++;
    
    // exit the batch prematurely if we've reached the end of the calculation period
    if (dataArray.obt.length > limit) break; 

    // exit the batch prematurely if we've hit an SOI event
    if (orbit.SOIEvent && parseInt(orbit.SOIEvent.split(";")[0]) < dataArray.UT) { 
      bSOILimit = true;
      break;
    }
  }
  
  // let the callback know if we've completed all orbital calculations, or cancel out if requested by the user
  // or if an altitude was breached
  if (dataArray.obt.length >= limit || (KSA_UI_STATE.isOrbitRenderCancelled && dataArray.isVessel) || bSOILimit) {
    callback();

    // otherwise call ourselves again for more calculations, with a small timeout to let other things happen
  } else setTimeout(orbitalCalc, 1, callback, orbit, dataArray, batchCount, limit);
}

function addMapResizeButton() {
  if (!KSA_MAP_CONTROLS.mapResizeButton) {
    KSA_MAP_CONTROLS.mapResizeButton = L.easyButton({
      states: [{
        stateName: 'raise',
        icon: 'fa-arrow-up',
        title: 'Enlarge map view',
        onClick: function(control) {
          raiseContent(500);
          $("#infoDialog").dialog("close")
          control.state('lower');
        }
      }, {
        stateName: 'lower',
        icon: 'fa-arrow-down',
        title: 'Reduce map view',
        onClick: function(control) {
          lowerContent(500);
          control.state('raise');
        }
      }]
    }).addTo(ops.surface.map);
  }
}
function removeMapResizeButton() {
  if (KSA_MAP_CONTROLS.mapResizeButton) {
    ops.surface.map.removeControl(KSA_MAP_CONTROLS.mapResizeButton);
    KSA_MAP_CONTROLS.mapResizeButton = null;
  }
}
function addMapViewButton() {
  if (!KSA_MAP_CONTROLS.mapViewButton) {
    KSA_MAP_CONTROLS.mapViewButton = L.easyButton({
      states: [{
        stateName: 'global',
        icon: 'fa-globe',
        title: 'View all orbits for this body',
        onClick: function(control) {
          var currBody = ops.bodyCatalog.find(o => o.selected === true).Body;
          swapContent("body", currBody);
          setTimeout(function() {
            showMap();
            
            // After map is shown, check if we need to select a vessel
            if (ops.currentVessel) {
              selectVesselOnBodyMap(ops.currentVessel.Catalog.DB);
            }
          }, 1000);
          selectMenuItem(currBody + "-System");
        }
      }]
    }).addTo(ops.surface.map);
  } else ops.surface.map.addControl(KSA_MAP_CONTROLS.mapViewButton);
}
function removeMapViewButton() {
  if (KSA_MAP_CONTROLS.mapViewButton) ops.surface.map.removeControl(KSA_MAP_CONTROLS.mapViewButton);
}
function removeVesselMapButtons() {
  removeMapResizeButton();
  removeMapViewButton();
  removeMapRefreshButton();
}

// these buttons will go on both vessel and body maps
function addMapRefreshButton() {
  if (!KSA_MAP_CONTROLS.mapRefreshButton) {
    KSA_MAP_CONTROLS.mapRefreshButton = L.easyButton({
      states: [{
        stateName: 'refresh',
        icon: 'fa-undo',
        title: 'Reload all orbits',
        onClick: function(control) {
          renderMapData();
        }
      }]
    }).addTo(ops.surface.map);
  }
}
function removeMapRefreshButton() {
  if (KSA_MAP_CONTROLS.mapRefreshButton) {
    ops.surface.map.removeControl(KSA_MAP_CONTROLS.mapRefreshButton);
    KSA_MAP_CONTROLS.mapRefreshButton = null;
  }
}
function addMapCloseButton() {
  if (!KSA_MAP_CONTROLS.mapCloseButton) {
    KSA_MAP_CONTROLS.mapCloseButton = L.easyButton({
      states: [{
        stateName: 'raise',
        icon: 'fa-times',
        title: 'Close map view',
        onClick: function(control) { 
          hideMap(); 
        }
      }]
    }).addTo(ops.surface.map);
  }
}
function removeMapCloseButton() {
  if (KSA_MAP_CONTROLS.mapCloseButton) {
    ops.surface.map.removeControl(KSA_MAP_CONTROLS.mapCloseButton);
    KSA_MAP_CONTROLS.mapCloseButton = null;
  }
}

function showMap() {
  if (!KSA_UI_STATE.isMapShown) {
    setTimeout(function() { ops.surface.map.invalidateSize(); }, 500);

    // what type of page are we showing the map for?
    if (ops.pageType == "body") {
      $("#figureOptions").fadeOut();
      $("#vesselOrbitTypes").fadeOut();
      $("#figure").fadeOut();
      $("#figureDialog").dialog("close");
      removeVesselMapButtons();
      removeMapRefreshButton();
      addMapCloseButton();
      redrawFlightPlots();
      $("#contentHeader").spin(false);
      $("#contentTitle").html(ops.bodyCatalog.find(o => o.selected === true).Body);
      $("#tags").fadeIn();
      document.title = "KSA Operations Tracker - " + ops.bodyCatalog.find(o => o.selected === true).Body;
      if (KSA_MAP_CONTROLS.launchsiteMarker) ops.surface.map.removeLayer(KSA_MAP_CONTROLS.launchsiteMarker);
      $(".leaflet-top.leaflet-right").fadeIn();
      $(".leaflet-top.leaflet-left").fadeIn();
      $(".leaflet-bottom.leaflet-left").fadeIn();

      // add body path layers to the layer control if they are loaded
      var strType;
      for (const layer of KSA_CATALOGS.bodyPaths.layers) {
        strType = capitalizeFirstLetter(layer.type);
        if (!layer.isLoaded) break;
        if (!strType.endsWith("s")) strType += "s";
        if (layer.group) ops.surface.layerControl.addOverlay(layer.group, "<img src='icon_" + layer.type + ".png' style='width: 15px;'> " + strType, "Orbital Tracks");
      }
      const allLoaded = KSA_CATALOGS.bodyPaths.layers.every(layer => layer.isLoaded);

      // check if anything is still loading
      var currObj = KSA_CATALOGS.bodyPaths.paths.find(o => o.isCalculating === true);
      if (currObj) {
        ops.surface.layerControl._expand();
        ops.surface.layerControl.options.collapsed = false;

        // if there was a break that means strType is what's still loading
        // otherwise we are refreshing some data
        if (!allLoaded) {
          if (!KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad) KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad = L.layerGroup();
          ops.surface.layerControl.addOverlay(KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading " + strType + " Data...", "Orbital Tracks");
        } else {
          if (currObj.isVessel) var strObjName = currName(ops.activeVessels.find(o => o.db === currObj.name));
          else var strObjName = currObj.name;
          if (!KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad) KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad = L.layerGroup();
          ops.surface.layerControl.addOverlay(KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Refreshing " + strObjName + " Data...", "Orbital Tracks");
        }
      }
    } else if (ops.pageType == "vessel") {
      $("#content").fadeOut();
    }

    $("#map").css("visibility", "visible");
    $("#map").fadeIn();
    KSA_UI_STATE.isMapShown = true;

    // hide map controls after 3 seconds if the user cursor isn't over the map (or dialog) at that time
    // unless this is a touchscreen device
    if (!is_touch_device()) { 
      setTimeout(function() {
        if (!$('#map').is(":hover")) { 
          if (!checkDataLoad()) $(".leaflet-top.leaflet-right").fadeOut();
          $(".leaflet-top.leaflet-left").fadeOut();
          $(".leaflet-bottom.leaflet-left").fadeOut();
        }
      }, 3000);
    }
  }
}

function hideMap() {
  if (KSA_UI_STATE.isMapShown) {
    if ($("#map").css("visibility") != "hidden") $("#map").fadeOut();
    $("#mapDialog").dialog("close");
    $("#aircraftAltitudeKey").fadeOut();
    removeMapRefreshButton();
    if (!KSA_UI_STATE.isGGBAppletRefreshing && ops.pageType == "body") {
      $("#figureOptions").fadeIn();
      if (!$("#asteroid-filter").prop("disabled") || !$("#debris-filter").prop("disabled") || !$("#probe-filter").prop("disabled") || !$("#ship-filter").prop("disabled") || !$("#station-filter").prop("disabled")) $("#vesselOrbitTypes").fadeIn();
      $("#figure").fadeIn();
      $("#contentHeader").spin(false);
      $("#contentTitle").html(ops.bodyCatalog.find(o => o.selected === true).Body + " System");
      $("#tags").fadeIn();
      document.title = "KSA Operations Tracker - " + ops.bodyCatalog.find(o => o.selected === true).Body + " System";
    }
    KSA_UI_STATE.isMapShown = false;
  }
}

// handles selection and centering of a vessel marker after switching from vessel page to body map
// will cancel itself if the body changes
function selectVesselOnBodyMap(vesselId) {
  var vesselObj = KSA_CATALOGS.bodyPaths.paths.find(o => o.name === vesselId);
  
  // vessel not found in paths - it may not have orbital data
  if (!vesselObj) return;
  
  // check if the vessel's data has finished loading and calculating
  if (!vesselObj.isCalculated) {
    setTimeout(selectVesselOnBodyMap, 100, vesselId);
    return;
  }
  
  // find the layer this vessel belongs to
  var vesselLayer = KSA_CATALOGS.bodyPaths.layers.find(o => o.type === vesselObj.type);
  
  // make sure the layer group exists and is loaded
  if (!vesselLayer || !vesselLayer.group || !vesselLayer.isLoaded) {
    setTimeout(selectVesselOnBodyMap, 100, vesselId);
    return;
  }

  // add the layer to the map if it's not already visible
  if (!ops.surface.map.hasLayer(vesselLayer.group)) {
    vesselLayer.group.addTo(ops.surface.map);
  }

  // center on the vessel marker, or an SOI event
  if (vesselObj.obtData.marker) {
    ops.surface.map.setView(vesselObj.obtData.marker.getLatLng(), 3);
    vesselObj.obtData.marker.openPopup();
  } else if (vesselObj.obtData.events.soi.marker) {
    ops.surface.map.setView(vesselObj.obtData.events.soi.marker.getLatLng(), 3);
    vesselObj.obtData.events.soi.marker.openPopup();
  }
}

// because the vessel plot is broken up into distinct orbital periods, we need to do a bit of legwork
// to determine what index of what plot corresponds to the given UT
function getPlotIndex(targetUT, returnField = null) {
  if (!targetUT) targetUT = currUT();
  
  // check that this UT is even feasible by seeing if it is greater than the last UT of this orbit
  var lastIndex = ops.currentVesselPlot.obtData.length-1;
  if (ops.currentVesselPlot.obtData[lastIndex].startUT + ops.currentVesselPlot.obtData[lastIndex].orbit.length < targetUT) return null;

  // get the total amount of seconds that have transpired since the start of the orbital plot
  var totalTime = targetUT - ops.currentVesselPlot.obtData[0].startUT;
  
  // now determine what orbit this puts us in by comparing the elapsed time to the length of the orbit and cutting down until we find a lesser amount
  // note we are not just using the current vessel orbital period because this instead takes into account the orbital calc being cancelled early
  var currentOrbit = 0;
  for (; currentOrbit<ops.currentVesselPlot.obtData.length; currentOrbit++) {
    if (totalTime > ops.currentVesselPlot.obtData[currentOrbit].orbit.length) totalTime -= ops.currentVesselPlot.obtData[currentOrbit].orbit.length;
    else break;
  }
  
  // the time remaining is our current index
  if (totalTime == ops.currentVesselPlot.obtData[currentOrbit].orbit.length) totalTime--;
  if (returnField) return ops.currentVesselPlot.obtData[currentOrbit].orbit[totalTime][returnField];
  else return {obtNum: currentOrbit, index: totalTime};
}

// finds out which orbital data point most closely corresponds to the map location targeted by the cursor by
// traversing the orbit's position array and getting the difference between the current index and the location clicked
// if it is smaller than the margin, stop. If the entire orbit is searched, increase the margin and try again
function getDataPoint(obtNum, target) {
  var index = 0;
  var margin = 0.1;
  
  while (true) {
    if (Math.abs(ops.currentVesselPlot.obtData[obtNum].orbit[index].latlng.lat - target.lat) < margin && Math.abs(ops.currentVesselPlot.obtData[obtNum].orbit[index].latlng.lng - target.lng) < margin) break; 
    index++;
    if (index >= ops.currentVesselPlot.obtData[obtNum].orbit.length) {
      index = 0;
      margin += 0.1;
    }
  }
  return index;
}

// same as above, but for a specific orbit not the general vessel plot
function getDataPointObject(obj, target) {
  var index = 0;
  var margin = 0.1;

  while (true) {
    if (Math.abs(obj.orbit[index].latlng.lat - target.lat) < margin && Math.abs(obj.orbit[index].latlng.lng - target.lng) < margin) break; 
    index++;
    if (index >= obj.orbit.length) {
      index = 0;
      margin += 0.1;
    }
  }
  return index;
}

// take care of all the details that need to be applied to a flight's surface track as this needs to be done in two separate places
function setupFlightSurfacePath(path, index, startIndex, length) {

  // we are rendering a hotline showing elevation changes
  if (KSA_CATALOGS.fltPaths[index].elev) {
    var srfTrack = L.hotline(path, {
      smoothFactor: 1.75, 
      clickable: true, 
      weight: 3, 
      outlineWidth: 1,
      min: KSA_CATALOGS.fltPaths[index].minASL,
      max: KSA_CATALOGS.fltPaths[index].maxASL,
      palette: {
        0.0: '#267F00',
        0.125: '#00FF21',
        0.25: '#0094FF',
        0.375: '#00FFFF',
        0.5: '#FFD800',
        0.625: '#FF6A00',
        0.75: '#FF0000',
        0.875: '#808080',
        1.0: '#ffffff'
      }
    });
  } 
  
  // we are rendering a normal line
  else {
    var srfTrack = L.polyline(path, {
      smoothFactor: 1.75, 
      clickable: true, 
      color: KSA_CATALOGS.fltPaths[index].color, 
      weight: 3, 
      opacity: 1
    });
  }

  // save the beginning index of this line to make it faster when searching for a data point by not having to look through the whole array
  // also save the current flight index to identify the data needed for the popups
  // also also save the length of the path
  srfTrack._myId = startIndex + "," + index + "," + length;
  
  // show the time and data for this position
  srfTrack.on('mouseover mousemove', function(e) {
    flightTrackHover(e);
  });
  
  // remove the mouseover popup
  srfTrack.on('mouseout', function(e) {
    if (KSA_MAP_CONTROLS.timePopup) ops.surface.map.closePopup(KSA_MAP_CONTROLS.timePopup);
    KSA_MAP_CONTROLS.timePopup = null;
  });
  
  // when clicking along this line, display the mission data info
  srfTrack.on('click', function(e) {
    // generate the timePopup content for this location (needed for the full popup)
    flightTrackHover(e);
    
    var indexFlt = parseInt(e.target._myId.split(",")[1]);
    w2ui['menu'].select(KSA_CATALOGS.fltPaths[indexFlt].id);
    w2ui['menu'].expandParents(KSA_CATALOGS.fltPaths[indexFlt].id);
    w2ui['menu'].scrollIntoView(KSA_CATALOGS.fltPaths[indexFlt].id);

    // fill, position and display the popup
    var strNewHtml = "<span id='fltTimelineData'>";
    strNewHtml += KSA_MAP_CONTROLS.timePopup.getContent().replace("<p>Click for additional options</p>", "");
    strNewHtml += "</span><p><center><button id='prevFltData' onclick='prevFltData()' class='flightTimelineButton'>&lt;&lt;</button> <button id='prevFltDataOnce' onclick='prevFltDataOnce()' class='flightTimelineButton'>&lt;</button> <b>Timeline Controls</b><sup><a href='https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#timeline-playback' target='_blank' style='text-decoration: none'>(?)</a></sup> <button id='nextFltDataOnce' onclick='nextFltDataOnce()' class='flightTimelineButton'>&gt;</button> <button id='nextFltData' onclick='nextFltData()' class='flightTimelineButton'>&gt;&gt;</button>";
    strNewHtml += "<br><span class='fauxLink' onclick='missionInfoDlg(" + indexFlt + ")'>Mission Info</span> | ";
    strNewHtml += "<span class='fauxLink' onclick='removeFltPath(" + indexFlt + ")'>Remove Track</span> | <span class='fauxLink' onclick='fltElev(" + indexFlt + ")'>";
    if (KSA_CATALOGS.fltPaths[index].elev) strNewHtml += "Hide Altitude";
    else strNewHtml += "Show Altitude";
    strNewHtml += "</span><br><span class='fauxLink' onclick='downloadFlightDataCSV(" + indexFlt + ")'>Download CSV</span> | <span class='fauxLink' onclick='replayFlightPath(" + indexFlt + ")'>Animate Flight</span></center></p>";
    KSA_MAP_CONTROLS.flightPositionPopup.setContent(strNewHtml);
    KSA_MAP_CONTROLS.flightPositionPopup.setLatLng(e.latlng);
    
    // move popup to the correct layer (the layer for this specific flight path)
    var targetLayer = KSA_CATALOGS.fltPaths[indexFlt].layer;
    if (targetLayer) {
      // check if popup needs to be moved to a different layer
      if (!KSA_MAP_CONTROLS.flightPositionPopup._currentLayer || KSA_MAP_CONTROLS.flightPositionPopup._currentLayer !== targetLayer) {
        // remove from old layer if it exists
        if (KSA_MAP_CONTROLS.flightPositionPopup._currentLayer) {
          KSA_MAP_CONTROLS.flightPositionPopup._currentLayer.removeLayer(KSA_MAP_CONTROLS.flightPositionPopup);
        }
        // add to new layer and track it
        targetLayer.addLayer(KSA_MAP_CONTROLS.flightPositionPopup);
        KSA_MAP_CONTROLS.flightPositionPopup._currentLayer = targetLayer;
      }
    }
    
    KSA_MAP_CONTROLS.flightPositionPopup.openOn(ops.surface.map);
    ops.surface.map.setView(e.latlng);
    ops.surface.map.closePopup(KSA_MAP_CONTROLS.timePopup);
    KSA_MAP_CONTROLS.timePopup = null;

    // save the index for later
    KSA_CALCULATIONS.currentFlightIndex = indexFlt;
  });
  
  return srfTrack;
}

// take care of all the details that need to be applied to a vessel's surface track as this needs to be done in two separate places
function setupVesselSurfacePath(path, obtIndex) {
  var srfTrack = L.polyline(path, { smoothFactor: 1.25, clickable: true, color: KSA_COLORS.vesselOrbitColors[obtIndex], weight: 3, opacity: 1 });
  
  // save the orbit index of this line to make it faster when searching for a data point by not having to look at all 3 orbits
  srfTrack._myId = obtIndex;
  
  // show the time and orbit for this position
  srfTrack.on('mouseover mousemove', function(e) {
    if (KSA_MAP_CONTROLS.timePopup) ops.surface.map.closePopup(KSA_MAP_CONTROLS.timePopup);
    KSA_MAP_CONTROLS.timePopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
    KSA_MAP_CONTROLS.timePopup.setLatLng(e.latlng);
    var strTimeDate = UTtoDateTime(ops.currentVesselPlot.obtData[e.target._myId].startUT + getDataPoint(e.target._myId, e.latlng));
    KSA_MAP_CONTROLS.timePopup.setContent("<center>Orbit #" + (e.target._myId+1) + "<br>" + strTimeDate.split("@")[0] + "<br>" + strTimeDate.split("@")[1] + " UTC</center>");
    KSA_MAP_CONTROLS.timePopup.openOn(ops.surface.map);
  });
  
  // remove the mouseover popup
  srfTrack.on('mouseout', function(e) {
    if (KSA_MAP_CONTROLS.timePopup) ops.surface.map.closePopup(KSA_MAP_CONTROLS.timePopup);
    KSA_MAP_CONTROLS.timePopup = null;
  });
  
  // when clicking along this line, find the nearest data point to display for the user
  srfTrack.on('click', function(e) {
    ops.surface.map.closePopup(KSA_MAP_CONTROLS.timePopup);
    KSA_MAP_CONTROLS.timePopup = null;
    var index = getDataPoint(e.target._myId, e.latlng);
    var cardinal = getLatLngCompass(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].latlng);
      
    // compose the popup HTML and place it on the cursor location then display it
    KSA_MAP_CONTROLS.vesselPositionPopup.setLatLng(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].latlng);
    KSA_MAP_CONTROLS.vesselPositionPopup.setContent(UTtoDateTime(ops.currentVesselPlot.obtData[e.target._myId].startUT + index) + ' UTC<br>Latitude: ' + numeral(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].latlng.lat).format('0.0000') + '&deg;' + cardinal.lat + '<br>Longitude: ' + numeral(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].latlng.lng).format('0.0000') + '&deg;' + cardinal.lng + '<br>Altitude: ' + numeral(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].alt).format('0,0.000') + " km<br>Velocity: " + numeral(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].vel).format('0,0.000') + " km/s<br>&nbsp;<br><span class='fauxLink' onclick='centerOnVesselMarker()'>Center on Vessel Marker</span>");
    
    // move popup to the correct layer (the layer for this specific orbit)
    var targetLayer = ops.currentVesselPlot.obtData[e.target._myId].layer;
    if (targetLayer) {
      // check if popup needs to be moved to a different layer
      if (!KSA_MAP_CONTROLS.vesselPositionPopup._currentLayer || KSA_MAP_CONTROLS.vesselPositionPopup._currentLayer !== targetLayer) {
        // remove from old layer if it exists
        if (KSA_MAP_CONTROLS.vesselPositionPopup._currentLayer) {
          KSA_MAP_CONTROLS.vesselPositionPopup._currentLayer.removeLayer(KSA_MAP_CONTROLS.vesselPositionPopup);
        }
        // add to new layer and track it
        targetLayer.addLayer(KSA_MAP_CONTROLS.vesselPositionPopup);
        KSA_MAP_CONTROLS.vesselPositionPopup._currentLayer = targetLayer;
      }
    }
    
    KSA_MAP_CONTROLS.vesselPositionPopup.openOn(ops.surface.map);
    ops.surface.map.setView(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].latlng);
  });
  
  return srfTrack;
}

// decides which compass quadrant the current coordinates reside in
function getLatLngCompass(latlng) {
  if (latlng.lat < 0) var cardinalLat = "S";
  else var cardinalLat = "N";
  if (latlng.lng < 0) var cardinalLng = "W";
  else var cardinalLng = "E";
  return {lat: cardinalLat, lng: cardinalLng};
}

// removes all ground plots from the map along with any associated markers
// checks for any markers with an open popup
function clearSurfacePlots() {
  var bPopped = false;
  if (ops.currentVesselPlot) {
    for (var event in ops.currentVesselPlot.events) {
      if (ops.currentVesselPlot.events[event].marker) {
        if (ops.currentVesselPlot.events[event].marker.isPopupOpen()) bPopped = true;
        ops.surface.map.removeLayer(ops.currentVesselPlot.events[event].marker);
      }
    }
    if (KSA_MAP_CONTROLS.vesselMarker) {
      if (KSA_MAP_CONTROLS.vesselMarker.isPopupOpen()) bPopped = true;
      ops.surface.map.removeLayer(KSA_MAP_CONTROLS.vesselMarker);
    }
    if (KSA_MAP_CONTROLS.vesselHorizon.vessel) KSA_LAYERS.groundMarkers.layerGroundStations.removeLayer(KSA_MAP_CONTROLS.vesselHorizon.vessel);
    KSA_MAP_CONTROLS.vesselHorizon.vessel = null;
    ops.currentVesselPlot.obtData.forEach(function(item) { 
      if (item.layer) {
        ops.surface.layerControl.removeLayer(item.layer); 
        ops.surface.map.removeLayer(item.layer);
      }
    });
  } else bPopped = true;  // first load, so do center on marker
  if (KSA_CATALOGS.fltPaths.length) {
    KSA_CATALOGS.fltPaths.forEach(function(path) {
      ops.surface.layerControl.removeLayer(path.layer); 
      ops.surface.map.removeLayer(path.layer);
      
      path.pins.forEach(function(pin) {
        pin.group.forEach(function(marker) {
          if (marker.pin) ops.surface.map.removeLayer(marker.pin);
        });
      });
    });
  }
  if (KSA_CATALOGS.bodyPaths.layers.length) {
    KSA_CATALOGS.bodyPaths.layers.forEach(function(layer) {
      if (layer.group) {
        ops.surface.layerControl.removeLayer(layer.group);
        ops.surface.map.removeLayer(layer.group);
      }
    });
  }
  removeMapRefreshButton();
  return bPopped;
}

// puts an existing plot of vessel orbits back onto the map
function redrawVesselPlots() {
  ops.currentVesselPlot.obtData.forEach(function(item, index) { 
    ops.surface.layerControl.addOverlay(item.layer, "<i class='fa fa-minus' style='color: " + KSA_COLORS.vesselOrbitColors[index] + "'></i> Vessel Orbit #" + (index+1), "Orbital Tracks");
    item.layer.addTo(ops.surface.map);
  });
  for (var event in ops.currentVesselPlot.events) {
    if (event.marker) {
      event.marker.addTo(ops.surface.map);
      
      // figure out which layer to add this to, if we can
      var index = getPlotIndex(event.UT);
      if (index) ops.currentVesselPlot.obtData[index.obtNum].layer.addLayer(event.marker);
    }
  }
  if (KSA_MAP_CONTROLS.vesselMarker) {
    KSA_MAP_CONTROLS.vesselMarker.addTo(ops.surface.map);
    addMapRefreshButton();
    ops.surface.map.setView(KSA_MAP_CONTROLS.vesselMarker.getLatLng(), 3); 
    KSA_MAP_CONTROLS.vesselMarker.openPopup();
    if (KSA_MAP_CONTROLS.vesselHorizon.vessel) KSA_LAYERS.groundMarkers.layerGroundStations.addLayer(KSA_MAP_CONTROLS.vesselHorizon.vessel);
  }
  ops.surface.map.invalidateSize();
}

// puts any existing plots of flights back onto the map
function redrawFlightPlots() {
  if (KSA_CATALOGS.fltPaths.length) {
    KSA_CATALOGS.fltPaths.forEach(function(path, index) {
      if (!path.deleted) {
        if (index >= KSA_COLORS.surfacePathColors.length) var colorIndex = index - (KSA_COLORS.surfacePathColors.length * (Math.floor(index/KSA_COLORS.surfacePathColors.length)));
        else var colorIndex = index;
        ops.surface.layerControl.addOverlay(path.layer, "<i class='fa fa-minus' style='color: " + KSA_COLORS.surfacePathColors[colorIndex] + "'></i> " + path.info.Title, "Flight Tracks");
        path.layer.addTo(ops.surface.map)
        if (path.elev) $("#aircraftAltitudeKey").fadeIn();
      }
    });
  }
}

// ensures the layer control does not collapse until all data is loaded
// checks data object and if anything is not nulled out it skips the rest of the function, which would end the loading
function checkDataLoad() {
  var isDataLoading = false;
  Object.entries(KSA_LAYERS.surfaceTracksDataLoad).forEach(function(items) {
    if (items[1]) isDataLoading = true;
  });
  if (!isDataLoading) {
    var layerControlElement = $('.leaflet-control-layers-expanded')[0];
    var isHovered = layerControlElement && layerControlElement.matches(':hover');
    if (!ops.surface.layerControl.options.collapsed && !isHovered) ops.surface.layerControl._collapse();
    ops.surface.layerControl.options.collapsed = true;

    // if the cursor is not on the map, hide the layer control
    if (!$('#map').is(":hover")) $('.leaflet-top.leaflet-right').fadeOut();
  }
  return isDataLoading;
}

// places a pin or group of pins when a link is clicked in a flight path mission data window
function popupMarkerOpen(indexFlt, linkNum) {
  ops.surface.map.closePopup(KSA_MAP_CONTROLS.flightPositionPopup);

  for (pinIndex=0; pinIndex<KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group.length; pinIndex++) {
  
    // don't create this pin if it is already created
    if (!KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin) {
      KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin = L.marker([KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group[pinIndex].lat, KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group[pinIndex].lng]).bindPopup(decodeURI(KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group[pinIndex].html, {autoClose: false}) + "<p><center><span onclick='popupMarkerClose(" + indexFlt + "," + linkNum + "," + pinIndex + ")' style='color: blue; cursor: pointer;'>Remove Pin</span></center></p>", {closeButton: true}).addTo(ops.surface.map);
      KSA_CATALOGS.fltPaths[indexFlt].layer.addLayer(KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin);
      
      // if there is just one pin, open the popup
      if (KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group.length == 1) KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin.openPopup();
      
    // if the pin is already created, open the popup
    } else KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin.openPopup();
  }
}

// removes a single pin when user clicks link in pin popup
function popupMarkerClose(indexFlt, linkNum, pinIndex) {
  KSA_CATALOGS.fltPaths[indexFlt].layer.removeLayer(KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin);
  KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin = null;
}

// removes a single flight path, but doesn't actually delete it in case the request for it is made again
function removeFltPath(index) {
  if (KSA_MAP_CONTROLS.flightPositionPopup.isOpen()) ops.surface.map.closePopup(KSA_MAP_CONTROLS.flightPositionPopup);
  ops.surface.layerControl.removeLayer(KSA_CATALOGS.fltPaths[index].layer);
  ops.surface.map.removeLayer(KSA_CATALOGS.fltPaths[index].layer);

  KSA_CATALOGS.fltPaths[index].pins.forEach(function(pin) {
    pin.Group.forEach(function(marker) {
      if (marker.pin) ops.surface.map.removeLayer(marker.pin);
    });
  });
  KSA_CATALOGS.fltPaths[index].deleted = true;
}

// copies the current location of the mouse cursor to the clipboard
// https://stackoverflow.com/questions/33855641/copy-output-of-a-javascript-variable-to-the-clipboard
function coordCopy(context) {

  // Create a dummy input to copy the variable inside it
  var dummy = document.createElement("input");

  // Add it to the document
  document.body.appendChild(dummy);

  // Set its id
  dummy.setAttribute("id", "dummy_id");

  // Output the array into it
  document.getElementById("dummy_id").value=context.latlng.lat + "," + context.latlng.lng;

  // Select it
  dummy.select();

  // Copy its contents
  document.execCommand("copy");

  // Remove it as its not needed anymore
  document.body.removeChild(dummy);
}

// display or hide a flight path with the line colored to show elevation changes
function fltElev(index, checkOtherDataDisplayed = true) {

  // cancel any timeline playing since we have to destroy and redraw the line
  if (KSA_TIMERS.flightTimelineInterval) clearInterval(KSA_TIMERS.flightTimelineInterval);

  // there can only be one, so if another path is showing elevation data, return it to normal
  if (checkOtherDataDisplayed) {
    var elevPath = KSA_CATALOGS.fltPaths.find(o => o.elev === true);
    if (elevPath && elevPath.index != index) fltElev(elevPath.index, false);
  }

  // toggle the state of our elevation display
  KSA_CATALOGS.fltPaths[index].elev = !KSA_CATALOGS.fltPaths[index].elev;

  // remove the current path and reset for a new one
  removeFltPath(index);
  KSA_CATALOGS.fltPaths[index].deleted = false;
  KSA_CATALOGS.fltPaths[index].layer = L.featureGroup();

  // redraw the flight path and add it back to the layer control
  // the icon used depends on whether elevation is shown or not
  renderFltPath(index);
  if (KSA_CATALOGS.fltPaths[index].elev) {
    ops.surface.layerControl.addOverlay(KSA_CATALOGS.fltPaths[index].layer, "<i class='far fa-chart-bar'></i>" + KSA_CATALOGS.fltPaths[index].info.Title, "Flight Tracks");
    $("#alt1").html("&nbsp;" + numeral(KSA_CATALOGS.fltPaths[index].minASL).format('0.000') + " - " + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.125).format('0.000') + " km");
    $("#alt2").html("&nbsp;" + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.125).format('0.000') + " - " + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.25).format('0.000') + " km");
    $("#alt3").html("&nbsp;" + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.25).format('0.000') + " - " + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.375).format('0.000') + " km");
    $("#alt4").html("&nbsp;" + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.375).format('0.000') + " - " + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.5).format('0.000') + " km");
    $("#alt5").html("&nbsp;" + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.5).format('0.000') + " - " + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.625).format('0.000') + " km");
    $("#alt6").html("&nbsp;" + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.625).format('0.000') + " - " + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.75).format('0.000') + " km");
    $("#alt7").html("&nbsp;" + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.75).format('0.000') + " - " + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.875).format('0.000') + " km");
    $("#alt8").html("&nbsp;" + numeral(KSA_CATALOGS.fltPaths[index].maxASL*0.875).format('0.000') + " - " + numeral(KSA_CATALOGS.fltPaths[index].maxASL).format('0.000') + " km");
    $("#alt9").html("&nbsp;" + numeral(KSA_CATALOGS.fltPaths[index].maxASL).format('0.000') + " km");
    $("#aircraftAltitudeKey").fadeIn();
  } else {
    ops.surface.layerControl.addOverlay(KSA_CATALOGS.fltPaths[index].layer, "<i class='fa fa-minus' style='color: " + KSA_CATALOGS.fltPaths[index].color + "'></i> " + KSA_CATALOGS.fltPaths[index].info.Title, "Flight Tracks");
    if (checkOtherDataDisplayed) $("#aircraftAltitudeKey").fadeOut();
  }
  KSA_CATALOGS.fltPaths[index].layer.addTo(ops.surface.map)
}

// plots out the various lat,lng points onto the surface map
function renderFltPath(pathIndex) {
  var path = [];
  var startIndex = 0;
  KSA_CATALOGS.fltPaths[pathIndex].fltData.forEach(function(position, index) {
  
    // detect if we've crossed off the edge of the map and need to cut the path
    // compare this lng to the prev and if it changed from negative to positive or vice versa, we hit the edge  
    // (check if the lng is over 100 to prevent detecting a sign change while crossing the meridian)
    if (path.length && (((position.Lng < 0 && path[path.length-1].lng > 0) && Math.abs(position.Lng) > 100) || ((position.Lng > 0 && path[path.length-1].lng < 0) && Math.abs(position.Lng) > 100))) { 
    
      // time to cut this path off and create a surface track to setup
      // add this path to the layer and reset to start building a new path
      KSA_CATALOGS.fltPaths[pathIndex].layer.addLayer(setupFlightSurfacePath(path, pathIndex, startIndex, path.length));
      path.length = 0;
      startIndex = index;
    }

    // data required depends on whether elevation is being shown or not
    if (KSA_CATALOGS.fltPaths[pathIndex].elev) path.push([position.Lat, position.Lng, position.ASL/1000]);
    else path.push({lat: position.Lat, lng: position.Lng});
  });
  KSA_CATALOGS.fltPaths[pathIndex].layer.addLayer(setupFlightSurfacePath(path, pathIndex, startIndex, path.length));
}

// opens a modal dialog box that holds the mission information
function missionInfoDlg(indexFlt) {

  // compose the dialog HTML?    
  if (!KSA_CATALOGS.fltPaths[indexFlt].html) {

    var strHTML = "<table style='border: 0px; border-collapse: collapse;'><tr><td style='vertical-align: top; width: 256px;'>";
    strHTML += "<img src='" + KSA_CATALOGS.fltPaths[indexFlt].info.Img + "' width='256px'></td>";
    strHTML += "<td style='vertical-align: top;'>";
    
    // see if there is a marker link in the description
    if (KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf("loc=") >= 0) {
      
      // cut up to the link
      strHTML += KSA_CATALOGS.fltPaths[indexFlt].info.Desc.slice(0, KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf("<a"));
      
      // extract the popup data, checking for multiple links
      var charLinkIndex = 0;
      for (linkNum=0; linkNum<KSA_CATALOGS.fltPaths[indexFlt].info.Desc.match(/<a/g).length; linkNum++) {
        
        // push a new pin group to the list
        KSA_CATALOGS.fltPaths[indexFlt].pins.push({Group: []});
        
        // get the full link text
        var linkStr = KSA_CATALOGS.fltPaths[indexFlt].info.Desc.slice(KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf("<a", charLinkIndex), KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf('">', charLinkIndex));

        // iterate through all the pins
        var charPinIndex = 0;
        for (pinNum=0; pinNum<linkStr.match(/loc=/g).length; pinNum++) {
        
          // get the pin from the link
          // this works except for the last pin
          if (pinNum < linkStr.match(/loc=/g).length-1) {
            var pinData = KSA_CATALOGS.fltPaths[indexFlt].info.Desc.slice(KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf("loc=", charLinkIndex + charPinIndex)+4, KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf('&amp', KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf("loc=", charLinkIndex + charPinIndex))).split(",");
          } else {
            var pinData = KSA_CATALOGS.fltPaths[indexFlt].info.Desc.slice(KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf("loc=", charLinkIndex + charPinIndex)+4, KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf('"', KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf("loc=", charLinkIndex + charPinIndex))).split(",");
          }
          
          // push the data to the group
          KSA_CATALOGS.fltPaths[indexFlt].pins[linkNum].Group.push({lat: pinData[0],
                                                      lng: pinData[1],
                                                      html: pinData[2],
                                                      pin: null});
                                                                              
          // set the index so we search past the previous location
          charPinIndex = KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf("loc=", charLinkIndex + charPinIndex)+4;
        }

        // set the link name
        strHTML += "<span onclick='popupMarkerOpen(" + indexFlt + "," + linkNum + ")' style='color: blue; cursor: pointer'>" + KSA_CATALOGS.fltPaths[indexFlt].info.Desc.slice(KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf('">', charLinkIndex)+2, KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf('</a>', charLinkIndex)) + "</span>";
        
        // set the index so we search past the previous link
        charLinkIndex = KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf("</a>", charLinkIndex)+4;
          
        // if we're going around for more links, get the text between this and the next one
        if (KSA_CATALOGS.fltPaths[indexFlt].info.Desc.match(/<a/g).length > 1) {
          strHTML += KSA_CATALOGS.fltPaths[indexFlt].info.Desc.slice(charLinkIndex, KSA_CATALOGS.fltPaths[indexFlt].info.Desc.indexOf("<a", charLinkIndex));
        }
      }
        
      // get the rest of the text
      strHTML += KSA_CATALOGS.fltPaths[indexFlt].info.Desc.slice(charLinkIndex, KSA_CATALOGS.fltPaths[indexFlt].info.Desc.length);
    } else strHTML += KSA_CATALOGS.fltPaths[indexFlt].info.Desc;
    strHTML += "<p><a href='" + KSA_CATALOGS.fltPaths[indexFlt].info.Report + "' target='_blank'>Mission Report</a></td></tr></table>";
    KSA_CATALOGS.fltPaths[indexFlt].html = strHTML;
  }
  
  // setup and display the dialog
  $("#mapDialog").dialog("option", "modal", true);
  $("#mapDialog").dialog("option", "title", KSA_CATALOGS.fltPaths[indexFlt].info.Title);
  $("#mapDialog").dialog( "option", "buttons", [{
    text: "Close",
    click: function() { 
      $("#mapDialog").dialog("close");
      $("#mapDialog").dialog("option", "modal", false);
    }
  }]);
  $("#progressbar").fadeOut();
  $("#dialogTxt").fadeIn();
  $("#dialogTxt").html(KSA_CATALOGS.fltPaths[indexFlt].html);
  $("#mapDialog").dialog("open");

  // inform the user they have to exit fullscreen if it is enabled
  if (KSA_UI_STATE.isMapFullscreen) {
    KSA_MAP_CONTROLS.flightPositionPopup.setContent("Please press Esc key<br>to exit fullscreen mode!");
    setTimeout(function() { ops.surface.map.closePopup(KSA_MAP_CONTROLS.flightPositionPopup); }, 3000);
  }
}

// functions to control the playback of flight data
function prevFltData() {
  clearInterval(KSA_TIMERS.flightTimelineInterval);

  // stop the playback
  if ($("#prevFltData").html().includes("X")) {
    $("#prevFltData").html("<<");
    
  // otherwise start the playback
  } else {
    KSA_TIMERS.flightTimelineInterval = setInterval(prevFltDataOnce, 1000);
    prevFltDataOnce();
    $("#prevFltData").html("XX");
    $("#nextFltData").html(">>");
  }
}
function prevFltDataOnce() {
  $("#nextFltData").prop("disabled", false);
  $("#nextFltDataOnce").prop("disabled", false);

  // cancel if the popup is closed
  if (!KSA_MAP_CONTROLS.flightPositionPopup.isOpen() && KSA_TIMERS.flightTimelineInterval) clearInterval(KSA_TIMERS.flightTimelineInterval);

  // check if we hit the beginning
  if (KSA_CALCULATIONS.currentFlightTimelineIndex <= 0) {
    if (KSA_TIMERS.flightTimelineInterval) clearInterval(KSA_TIMERS.flightTimelineInterval);
    $("#prevFltData").prop("disabled", true);
    $("#prevFltData").html("<<");
    $("#prevFltDataOnce").prop("disabled", true);
    return;
  }
  KSA_CALCULATIONS.currentFlightTimelineIndex--;

  // update the popup
  var latlngData = { lat: KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].Lat, lng: KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].Lng };
  KSA_MAP_CONTROLS.flightPositionPopup.setLatLng(latlngData);
  ops.surface.map.setView(latlngData);
  $("#fltTimelineData").html(UTtoDateTime(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].UT) + ' UTC<br>Latitude: ' + numeral(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].Lat).format('0.0000') + '&deg;' + getLatLngCompass(latlngData).lat + '<br>Longitude: ' + numeral(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].Lng).format('0.0000') + '&deg;' + getLatLngCompass(latlngData).lng + '<br>Altitude ASL: ' + numeral(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].ASL/1000).format('0,0.000') + ' km<br>Altitude AGL: ' + numeral(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].AGL/1000).format('0,0.000') + " km<br>Velocity: " + numeral(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].Spd).format('0,0.000') + " m/s" + '<br>Distance from KSC: ' + numeral(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].Dist/1000).format('0,0.000') + " km");
}
function nextFltData() {
  clearInterval(KSA_TIMERS.flightTimelineInterval);

  // stop the playback
  if ($("#nextFltData").html().includes("X")) {
    $("#nextFltData").html(">>");
    
  // otherwise start the playback
  } else {
    KSA_TIMERS.flightTimelineInterval = setInterval(nextFltDataOnce, 1000);
    nextFltDataOnce();
    $("#nextFltData").html("XX");
    $("#prevFltData").html("<<");
  }
}
function nextFltDataOnce() {
  $("#prevFltData").prop("disabled", false);
  $("#prevFltDataOnce").prop("disabled", false);

  // cancel if the popup is closed
  if (!KSA_MAP_CONTROLS.flightPositionPopup.isOpen() && KSA_TIMERS.flightTimelineInterval) clearInterval(KSA_TIMERS.flightTimelineInterval);

  // check if we hit the end
  if (KSA_CALCULATIONS.currentFlightTimelineIndex >= KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData.length-1) {
    if (KSA_TIMERS.flightTimelineInterval) clearInterval(KSA_TIMERS.flightTimelineInterval);
    $("#nextFltData").prop("disabled", true);
    $("#nextFltData").html(">>");
    $("#nextFltDataOnce").prop("disabled", true);
    return;
  }
  KSA_CALCULATIONS.currentFlightTimelineIndex++;

  // update the popup
  var latlngData = { lat: KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].Lat, lng: KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].Lng };
  KSA_MAP_CONTROLS.flightPositionPopup.setLatLng(latlngData);
  ops.surface.map.setView(latlngData);
  $("#fltTimelineData").html(UTtoDateTime(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].UT) + ' UTC<br>Latitude: ' + numeral(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].Lat).format('0.0000') + '&deg;' + getLatLngCompass(latlngData).lat + '<br>Longitude: ' + numeral(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].Lng).format('0.0000') + '&deg;' + getLatLngCompass(latlngData).lng + '<br>Altitude ASL: ' + numeral(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].ASL/1000).format('0,0.000') + ' km<br>Altitude AGL: ' + numeral(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].AGL/1000).format('0,0.000') + " km<br>Velocity: " + numeral(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].Spd).format('0,0.000') + " m/s" + '<br>Distance from KSC: ' + numeral(KSA_CATALOGS.fltPaths[KSA_CALCULATIONS.currentFlightIndex].fltData[KSA_CALCULATIONS.currentFlightTimelineIndex].Dist/1000).format('0,0.000') + " km");
}

// load surface track data for any vessels and moons in orbit around this body
function loadSurfaceTracks() {
  KSA_UI_STATE.isSfcObtRenderTerminated = false;

  // dependent on ops and body catalog data so call back if it's not all loaded yet
  if (!ops.bodyCatalog.length || (!ops.updateData.length || (ops.updateData.length && ops.updateData.find(o => o.isLoading === true)))) {
    setTimeout(loadSurfaceTracks, 50);
    return;
  }

  // show the layers control
  $('.leaflet-top.leaflet-right').fadeIn();

  // does this body have any moons? If so, add them to the list
  var bodyData = ops.bodyCatalog.find(o => o.Body === KSA_CATALOGS.bodyPaths.bodyName);
  if (bodyData.Moons) {
    bodyData.Moons.split(",").forEach(function(item) {
      moonData = ops.bodyCatalog.find(o => o.Body === item.trim());
      KSA_CATALOGS.bodyPaths.paths.push({
        name: item.trim(),
        orbit: {
          Arg: moonData.Arg,
          Eccentricity: moonData.Ecc,
          Eph: moonData.Eph,
          Inclination: moonData.Inc,
          OrbitalPeriod: moonData.ObtPeriod,
          RAAN: moonData.RAAN,
          SMA: moonData.SMA,
          TrueAnom: moonData.TrueAnom
        },
        obtData: null,
        index: KSA_CATALOGS.bodyPaths.paths.length,
        isVessel: false,
        isCalculated: false,
        isCalculating: false,
        isLoaded: true,
        isSelected: false,
        type: "moon"
      });
    });
    KSA_CATALOGS.bodyPaths.layers.push({
      type: "moon",
      group: null,
      isLoaded: false
    });
  }
  
  // search the menu for any vessels within the current map SOI
  var vesselPaths = [];
  ops.activeVessels.forEach(function(item) {
    if (item.bodyRef == bodyData.ID) {
      vesselPaths.push({
        name: item.db,
        orbit: null,
        obtData: null,
        index: vesselPaths.length,
        isVessel: true,
        isCalculated: false,
        isCalculating: false,
        isLoaded: false,
        isSelected: false,
        type: item.type
      });
      if (!KSA_CATALOGS.bodyPaths.layers.find(o => o.type === item.type)) {
        KSA_CATALOGS.bodyPaths.layers.push({
          type: item.type,
          group: null,
          isLoaded: false
        });
      }
    }
  });
  if (vesselPaths.length) {

    // sort vessel paths alphabetically by type
    vesselPaths.sort((a, b) => a.type.localeCompare(b.type));

    // append sorted vessel paths to the main paths array
    vesselPaths.forEach(function(vessel) {
      vessel.index = KSA_CATALOGS.bodyPaths.paths.length;
      KSA_CATALOGS.bodyPaths.paths.push(vessel);
    });
  }

  // if this body has vessels or moons that need rendering then get it done
  if (KSA_CATALOGS.bodyPaths.paths.length) calculateSurfaceTracks();
}

// run through all surface tracks that need to be calculated for any body
function calculateSurfaceTracks(currObj = null) {

  // if there are already objects being calculated then just exit
  if (KSA_CATALOGS.bodyPaths.paths.find(o => o.isCalculating)) return;

  // get the next object that hasn't been calculated if one wasn't passed in
  if (!currObj) {
    currObj = KSA_CATALOGS.bodyPaths.paths.find(o => o.isCalculated === false);
    if (!currObj) {
      checkDataLoad();
      return;
    }
  }

  // setup the layer control to show data load in progress only if we're looking at a body page
  // use the allLoaded flag to check whether this is an initial load or a refresh
  const allLoaded = KSA_CATALOGS.bodyPaths.layers.every(layer => layer.isLoaded);
  if (!KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad && ops.pageType == "body") {
    $(".leaflet-top.leaflet-right").fadeIn();
    ops.surface.layerControl._expand();
    ops.surface.layerControl.options.collapsed = false;
    KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad = L.layerGroup();
    if (!allLoaded) {
      var strType;
      for (const layer of KSA_CATALOGS.bodyPaths.layers) {
        strType = capitalizeFirstLetter(layer.type);
        if (!layer.isLoaded) break;
        if (!strType.endsWith("s")) strType += "s";
        ops.surface.layerControl.addOverlay(layer.group, "<img src='icon_" + layer.type + ".png' style='width: 15px;'> " + strType, "Orbital Tracks");
      }
      ops.surface.layerControl.addOverlay(KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading " + strType + " Data...", "Orbital Tracks");
    } else {
      if (currObj.isVessel) var strObjName = currName(ops.activeVessels.find(o => o.db === currObj.name));
      else var strObjName = currObj.name;
      ops.surface.layerControl.addOverlay(KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Refreshing " + strObjName + " Data...", "Orbital Tracks");
    }
  }

  // if the object is not loaded, we need to send out for data
  if (!currObj.isLoaded) {
    loadDB("loadVesselOrbitData.asp?db=" + currObj.name + "&ut=" + currUT(), loadVesselOrbitAJAX, currObj);
    return;
  }

  // have we begun to calculate its orbit data? If not then kick that off
  // we run a lower batch count since the full surface map has more to interact with and should remain responsive
  // orbits are rendered for one orbital period or 24 hours, whichever is shorter
  if (!currObj.isCalculated && currObj.orbit) {
    console.log("Calculating surface track for " + currObj.name);
    KSA_CALCULATIONS.obtDataCalcSfc.UT = currUT();
    KSA_CALCULATIONS.obtDataCalcSfc.obt.length = 0;
    KSA_UI_STATE.isVesObtRenderTerminated = false;
    currObj.isCalculating = true;
    if (currObj.orbit.OrbitalPeriod > 86400) orbitalCalc(renderBodyOrbit, currObj.orbit, KSA_CALCULATIONS.obtDataCalcSfc, 500, 86400);
    else orbitalCalc(renderBodyOrbit, currObj.orbit, KSA_CALCULATIONS.obtDataCalcSfc, 500);
    return;
  } else {

    // if there are any layers not loaded then this is an initial load of all orbital data
    if (!allLoaded) {

      // check if this object is the last one 
      if (currObj.index == KSA_CATALOGS.bodyPaths.paths.length-1) {
        if (KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad) {
          ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad);
          KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad = null;
        }
        var currLayer = KSA_CATALOGS.bodyPaths.layers.find(o => o.type === currObj.type)
        currLayer.isLoaded = true;
        if (currLayer.group) {
          if (ops.pageType == "body") {
            if (KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad) {
              ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad);
              KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad = L.layerGroup();
            }
            var strType = capitalizeFirstLetter(currObj.type);
            if (!strType.endsWith("s")) strType += "s";
            ops.surface.layerControl.addOverlay(currLayer.group, "<img src='icon_" + currObj.type + ".png' style='width: 15px'> " + strType, "Orbital Tracks");
            
            // check if this layer should be automatically selected based on URL parameters
            if (getParameterByName("layers").includes(currObj.type) || getParameterByName("layers").includes(strType.toLowerCase())) {
              currLayer.group.addTo(ops.surface.map);
            }
          }
        }
        checkDataLoad();
        console.log(KSA_CATALOGS.bodyPaths)
        return;

      // or if the next object is not of the same type we need to update the layer control
      } else if (currObj.type != KSA_CATALOGS.bodyPaths.paths[currObj.index + 1].type) {
      
        // show the current group we were loading?
        // the group only has an object if an orbit completed calculation for it
        var currLayer = KSA_CATALOGS.bodyPaths.layers.find(o => o.type === currObj.type)
        currLayer.isLoaded = true;
        if (currLayer.group) {
          if (ops.pageType == "body") {
            ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad);
            var strType = capitalizeFirstLetter(currObj.type);
            if (!strType.endsWith("s")) strType += "s";
            ops.surface.layerControl.addOverlay(currLayer.group, "<img src='icon_" + currObj.type + ".png' style='width: 15px'> " + strType, "Orbital Tracks");
            
            // check if this layer should be automatically selected based on URL parameters
            if (getParameterByName("layers").includes(currObj.type) || getParameterByName("layers").includes(strType.toLowerCase())) {
              currLayer.group.addTo(ops.surface.map);
            }

            // set the next group to loading
            KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad = L.layerGroup();
            ops.surface.layerControl.addOverlay(KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading " + capitalizeFirstLetter(KSA_CATALOGS.bodyPaths.paths[currObj.index + 1].type) + " Data...", "Orbital Tracks");
          }
        }
      }

    // if all layers are loaded but not all objects are calculated, then we must be refreshing data for a single object
    } else {
      if (ops.pageType == "body" && KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad) {
        ops.surface.layerControl.removeLayer(KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad);
        KSA_LAYERS.surfaceTracksDataLoad.bodiesTrackDataLoad = null;
      }
    }

    // check for more objects to calculate
    calculateSurfaceTracks();
  }
}

// create the orbital polygons and add them to the current layer
function renderBodyOrbit() {

  // add the calculated data to teh current object
  var currObj = KSA_CATALOGS.bodyPaths.paths.find(o => o.isCalculating === true);
  
  // if we switched views while calculating, the object may no longer exist - just return
  if (!currObj) return;
  console.log("Completed surface track for " + currObj.name);

  // clean up the old path data if it exists since we're re-rendering
  var bReturnFocus = false;
  if (currObj.obtData) {
    var currLayer = KSA_CATALOGS.bodyPaths.layers.find(o => o.type === currObj.type);
    if (currLayer && currLayer.group) {

      // check every marker for an open popup before removal
      if (currObj.obtData.marker && currObj.obtData.marker.isPopupOpen()) bReturnFocus = true;
      if (currObj.obtData.events.ap.marker && currObj.obtData.events.ap.marker.isPopupOpen()) bReturnFocus = true;
      if (currObj.obtData.events.pe.marker && currObj.obtData.events.pe.marker.isPopupOpen()) bReturnFocus = true;
      if (currObj.obtData.events.soi.marker && currObj.obtData.events.soi.marker.isPopupOpen()) bReturnFocus = true;
      if (currObj.obtData.events.node.marker && currObj.obtData.events.node.marker.isPopupOpen()) bReturnFocus = true;

      // remove the main marker
      if (currObj.obtData.marker) {
        currLayer.group.removeLayer(currObj.obtData.marker);
      }
      
      // remove all path data
      if (currObj.obtData.pathData) {
        currObj.obtData.pathData.forEach(function(path) {
          currLayer.group.removeLayer(path);
        });
      }
      
      // remove event markers
      if (currObj.obtData.events.ap.marker) currLayer.group.removeLayer(currObj.obtData.events.ap.marker);
      if (currObj.obtData.events.pe.marker) currLayer.group.removeLayer(currObj.obtData.events.pe.marker);
      if (currObj.obtData.events.soi.marker) currLayer.group.removeLayer(currObj.obtData.events.soi.marker);
      if (currObj.obtData.events.node.marker) currLayer.group.removeLayer(currObj.obtData.events.node.marker);
    }
  }

  currObj.obtData = {
    orbit: KSA_CALCULATIONS.obtDataCalcSfc.obt.slice(0),
    startUT: KSA_CALCULATIONS.obtDataCalcSfc.UT-KSA_CALCULATIONS.obtDataCalcSfc.obt.length,
    endUT: KSA_CALCULATIONS.obtDataCalcSfc.UT,
    marker: null,
    pathData: [],
    isCentered: false,
    events: {
      pe: { marker: null, UT: null },
      ap: { marker: null, UT: null },
      soi: { marker: null },
      node: { marker: null}
    }
  };

  // flag calculations complete
  currObj.isCalculating = false;
  currObj.isCalculated = true;

  // if there is no orbit then this was removed from the map and we can end here
  if (!currObj.obtData.orbit.length) {
    calculateSurfaceTracks(currObj);
    return;
  }

  // enable this layer for display
  var currLayer = KSA_CATALOGS.bodyPaths.layers.find(o => o.type === currObj.type);
  if (!currLayer.group) currLayer.group = L.layerGroup();

  // get the times we'll reach Ap and Pe along this orbit, if it has any
  if (currObj.orbit.Eccentricity > 0) {
    var n = Math.sqrt(ops.bodyCatalog.find(o => o.selected === true).Gm/(Math.pow(Math.abs(currObj.orbit.SMA),3)));
    var newMean = toMeanAnomaly(Math.radians(currObj.orbit.TrueAnom), currObj.orbit.Eccentricity) + n * ((KSA_CALCULATIONS.obtDataCalcSfc.UT-KSA_CALCULATIONS.obtDataCalcSfc.obt.length) - currObj.orbit.Eph);
    if (newMean < 0 || newMean > 2*Math.PI) {
      newMean = Math.abs(newMean - (2*Math.PI) * Math.floor(newMean / (2*Math.PI)));
    }
    var apTime = Math.round((Math.PI - newMean)/n);
    var peTime = Math.round((Math.PI*2 - newMean)/n);
    
    // close to Ap/Pe we can get a negative value, so handle that by just adding the period
    if (apTime <= 0) apTime += Math.round(currObj.orbit.OrbitalPeriod);
    if (peTime <= 0) peTime += Math.round(currObj.orbit.OrbitalPeriod);
    
    // stash away the times but convert them to UT instead of seconds from the start of this orbit
    currObj.obtData.events.pe.UT = peTime + (KSA_CALCULATIONS.obtDataCalcSfc.UT-KSA_CALCULATIONS.obtDataCalcSfc.obt.length);
    currObj.obtData.events.ap.UT = apTime + (KSA_CALCULATIONS.obtDataCalcSfc.UT-KSA_CALCULATIONS.obtDataCalcSfc.obt.length);
    
    // configure the Ap/Pe icons, ensuring that enough orbit has been plotted to display them
    if (apTime < KSA_CALCULATIONS.obtDataCalcSfc.obt.length) { 

      // add the marker, assign its information popup and give it a callback for instant update when opened, then add it to the current layer
      currObj.obtData.events.ap.marker = L.marker(KSA_CALCULATIONS.obtDataCalcSfc.obt[apTime].latlng, {icon: KSA_MAP_ICONS.apIcon}); 
      var strTimeDate = UTtoDateTime(KSA_CALCULATIONS.obtDataCalcSfc.UT-KSA_CALCULATIONS.obtDataCalcSfc.obt.length + apTime);
      currObj.obtData.events.ap.marker.bindPopup("<center>" + numeral(KSA_CALCULATIONS.obtDataCalcSfc.obt[apTime].alt).format('0,0.000') + "km<br>Time to Apoapsis<br><span id='apTimeSurface'>" + formatTime(apTime) + "</span><br><span id='apDateSurface'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
      currObj.obtData.events.ap.marker.on('click', function(e) {
        $('#apTimeSurface').html(formatTime(currObj.obtData.events.ap.UT - currUT()));
      });
    }
    if (peTime < KSA_CALCULATIONS.obtDataCalcSfc.obt.length) { 
      currObj.obtData.events.pe.marker = L.marker(KSA_CALCULATIONS.obtDataCalcSfc.obt[peTime].latlng, {icon: KSA_MAP_ICONS.peIcon}); 
      var strTimeDate = UTtoDateTime(KSA_CALCULATIONS.obtDataCalcSfc.UT-KSA_CALCULATIONS.obtDataCalcSfc.obt.length + peTime);
      currObj.obtData.events.pe.marker.bindPopup("<center>" + numeral(KSA_CALCULATIONS.obtDataCalcSfc.obt[peTime].alt).format('0,0.000') + "km<br>Time to Periapsis<br><span id='peTimeSurface'>" + formatTime(peTime) + "</span><br><span id='peDateSurface'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
      currObj.obtData.events.pe.marker.on('click', function(e) {
        $('#peTimeSurface').html(formatTime(currObj.obtData.events.pe.UT - currUT()));
      });
    }
  }

  // only need to consider this for vessels
  if (currObj.isVessel) {

    // does this orbit terminate in an SOI event?
    if (currObj.orbit.SOIEvent) {
      var strEvent;
      var latlng = {lat: parseFloat(currObj.orbit.SOIEvent.split(";")[3]), 
                    lng: parseFloat(currObj.orbit.SOIEvent.split(";")[4])};
      if (currObj.orbit.SOIEvent.split(";")[1] == "entry") {
        strEvent = "Atmospheric Entry";
        currObj.obtData.events.soi.marker = L.marker(latlng, {icon: KSA_MAP_ICONS.soiEntryIcon}); 
      } 
      else if (currObj.orbit.SOIEvent.split(";")[1] == "exit") {
        strEvent = "SOI Exit";
        currObj.obtData.events.soi.marker = L.marker(latlng, {icon: KSA_MAP_ICONS.soiExitIcon}); 
      }

      // add the marker, assign its information popup and give it a callback for instant update when opened, then add it to the current layer
      currObj.obtData.events.soi.UT = parseInt(currObj.orbit.SOIEvent.split(";")[0]);
      var strTimeDate = UTtoDateTime(currObj.obtData.events.soi.UT);
      currObj.obtData.events.soi.marker.bindPopup("<center>Time to " + strEvent + "<br><span id='soiTimeSurface'>" + formatTime(currObj.obtData.events.soi.UT) + "</span><br><span id='soiDateSurface'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
      currObj.obtData.events.soi.marker.on('click', function(e) {
        $('#soiTimeSurface').html(formatTime(currObj.obtData.events.soi.UT - currUT()));
      });
      currLayer.group.addLayer(currObj.obtData.events.soi.marker);
      currObj.obtData.events.soi.reason = currObj.orbit.SOIEvent.split(";")[2];
    }
  }

  // gather up the lat/lng positions into the paths to render
  var path = [];
  currObj.obtData.orbit.forEach(function(position) {
    
    // detect if we've crossed off the edge of the map and need to cut the orbital line
    // compare this lng to the prev and if it changed from negative to positive or vice versa, we hit the edge  
    // (check if the lng is over 100 to prevent detecting a sign change while crossing the meridian)
    if (path.length && (((position.latlng.lng < 0 && path[path.length-1].lng > 0) && Math.abs(position.latlng.lng) > 100) || ((position.latlng.lng > 0 && path[path.length-1].lng < 0) && Math.abs(position.latlng.lng) > 100))) { 
    
      // time to cut this path off and create a surface track to setup
      // add this path to the layer and reset to start building a new path
      currObj.obtData.pathData.push(setupSurfacePath(path, currObj));
      currLayer.group.addLayer(currObj.obtData.pathData[currObj.obtData.pathData.length-1]);
      path.length = 0;
    } 
    path.push(position.latlng);
  });
  
  // setup the final path stretch and add it to the layer
  currObj.obtData.pathData.push(setupSurfacePath(path, currObj));
  currLayer.group.addLayer(currObj.obtData.pathData[currObj.obtData.pathData.length-1]);

  // place the craft marker and assign its popup
  var icon = L.icon({iconUrl: 'icon_' + currObj.type + '.png', iconSize: [16, 16]});
  currObj.obtData.marker = L.marker(currObj.obtData.orbit[0].latlng, {icon: icon, zIndexOffset: 100});
  var now = currUT() - currObj.obtData.startUT;
  var cardinal = getLatLngCompass(currObj.obtData.orbit[now].latlng);
  if (currObj.isVessel) var strName = currName(ops.activeVessels.find(o => o.db === currObj.name));
  else var strName = currObj.name;
  if (currObj.isCentered) var strLock = currObj.isVessel ? "Lock off Vessel" : "Lock off Body";
  else var strLock = currObj.isVessel ? "Lock on Vessel" : "Lock on Body";
  currObj.obtData.marker.bindPopup("<h2>" + strName + "</h2>" + 
                                   "Lat: <span id='latSurface'>" + numeral(currObj.obtData.orbit[now].latlng.lat).format('0.0000') + "&deg;" + cardinal.lat + "</span><br>" + 
                                   "Lng: <span id='lngSurface'>" + numeral(currObj.obtData.orbit[now].latlng.lng).format('0.0000') + "&deg;" + cardinal.lng + "</span><br>" + 
                                   "Alt: <span id='altSurface'>" + numeral(currObj.obtData.orbit[now].alt).format('0,0.000') + " km" + "</span><br>" + 
                                   "Vel: <span id='velSurface'>" + numeral(currObj.obtData.orbit[now].vel).format('0,0.000') + " km/s" + "</span><br>&nbsp;<br>" + 
                                   "<span class='fauxLink' onclick='markerHandler(\"" + currObj.name + "\", " + currObj.isVessel + ")'>" + (currObj.isVessel ? "View Vessel Page" : "View Body Orbits") + "</span><br>" + 
                                   "<span class='fauxLink' id='centerObjectLink' onclick='setObjectCenterFlag()'>"+ strLock +"</span>", {autoClose: false, keepInView: false, autoPan: false});
  currObj.obtData.marker._myId = currObj.name;
  currLayer.group.addLayer(currObj.obtData.marker);

  // set up a listener for popup events so we can immediately update the information and not have to wait for the next tick event
  currObj.obtData.marker.on('popupopen', function(e) {

    // get the selected object and the layer it belongs to
    var obj = KSA_CATALOGS.bodyPaths.paths.find(o => o.name === e.target._myId);
    var currLayer = KSA_CATALOGS.bodyPaths.layers.find(o => o.type === obj.type);

    // if this object isn't selected that means another one might be, so look for it
    if (!obj.isSelected) {
      var selectedObj = KSA_CATALOGS.bodyPaths.paths.find(o => o.isSelected === true);

      // if another object is selected, hide its popup to unselect it
      if (selectedObj) {
        selectedObj.isSelected = false;
        ops.surface.map.closePopup(selectedObj.obtData.marker.getPopup());
      }
    }

    // show the markers for this object
    obj.isSelected = true;
    if (obj.isVessel) {
      obj.obtData.pathData.forEach(function(path) {
        path.setStyle({color: "#00ff3c"});
      });
    }
    if (obj.obtData.events.ap.marker) currLayer.group.addLayer(obj.obtData.events.ap.marker);
    if (obj.obtData.events.pe.marker) currLayer.group.addLayer(obj.obtData.events.pe.marker);

    // create the horizon
    var now = currUT() - obj.obtData.startUT;
    KSA_MAP_CONTROLS.vesselHorizon.vessel = addHorizonCircle(
      obj.obtData.marker.getLatLng(),
      obj.obtData.orbit[now].alt * 1000
    );

    // Add horizon to ground station layer so it only shows when ground stations are shown
    KSA_LAYERS.groundMarkers.layerGroundStations.addLayer(KSA_MAP_CONTROLS.vesselHorizon.vessel);

    // setup the popup
    var now = currUT() - obj.obtData.startUT;
    var cardinal = getLatLngCompass(obj.obtData.orbit[now].latlng);
    if (obj.isVessel) var strName = currName(ops.activeVessels.find(o => o.db === obj.name));
    else var strName = obj.name;
    if (obj.isCentered) var strLock = obj.isVessel ? "Lock off Vessel" : "Lock off Body";
    else var strLock = obj.isVessel ? "Lock on Vessel" : "Lock on Body";
    obj.obtData.marker.getPopup().setContent("<h2>" + strName + "</h2>" + 
                                             "Lat: <span id='latSurface'>" + numeral(currObj.obtData.orbit[now].latlng.lat).format('0.0000') + "&deg;" + cardinal.lat + "</span><br>" + 
                                             "Lng: <span id='lngSurface'>" + numeral(currObj.obtData.orbit[now].latlng.lng).format('0.0000') + "&deg;" + cardinal.lng + "</span><br>" + 
                                             "Alt: <span id='altSurface'>" + numeral(currObj.obtData.orbit[now].alt).format('0,0.000') + " km" + "</span><br>" + 
                                             "Vel: <span id='velSurface'>" + numeral(currObj.obtData.orbit[now].vel).format('0,0.000') + " km/s" + "</span><br>&nbsp;<br>" + 
                                             "<span class='fauxLink' onclick='markerHandler(\"" + currObj.name + "\", " + currObj.isVessel + ")'>" + (currObj.isVessel ? "View Vessel Page" : "View Body Orbits") + "</span><br>" +
                                             "<span class='fauxLink' id='centerObjectLink' onclick='setObjectCenterFlag()'>"+ strLock +"</span>");
  });

  // de-selects the object
  currObj.obtData.marker.on('popupclose', function(e) {
    var obj = KSA_CATALOGS.bodyPaths.paths.find(o => o.name === e.target._myId);
    var currLayer = KSA_CATALOGS.bodyPaths.layers.find(o => o.type === obj.type);
    if (obj.isVessel) {
      obj.obtData.pathData.forEach(function(path) {
        path.setStyle({color: KSA_COLORS.orbitColors[obj.type]});
      });
    }
    if (obj.obtData.events.ap.marker) currLayer.group.removeLayer(obj.obtData.events.ap.marker);
    if (obj.obtData.events.pe.marker) currLayer.group.removeLayer(obj.obtData.events.pe.marker);
    if (KSA_MAP_CONTROLS.vesselHorizon.vessel) {
      KSA_LAYERS.groundMarkers.layerGroundStations.removeLayer(KSA_MAP_CONTROLS.vesselHorizon.vessel);
      KSA_MAP_CONTROLS.vesselHorizon.vessel = null;
    }
  });

  // if we need to return focus to an open popup after re-rendering, do that now
  if (bReturnFocus) {
    ops.surface.map.setView(currObj.obtData.marker.getLatLng(), 3);
    currObj.obtData.marker.openPopup();
  }

  // continue to calculate any additional paths
  calculateSurfaceTracks(currObj);
}

// take care of all the details that need to be applied to a surface track as this needs to be done in two separate places
function setupSurfacePath(path, object) {

  var strColor = "";
  var currBody = ops.bodyCatalog.find(o => o.Body === object.name);
  if (object.isVessel) strColor = KSA_COLORS.orbitColors[object.type];
  else {
    ops.ggbOrbits.forEach(function(body) {
      if (currBody.Body == ggbApplet.getCaption(body.id + "36")) strColor = ggbApplet.getColor(body.id + "36")
    });
  }
  var srfTrack = L.polyline(path, { smoothFactor: 1.25, clickable: true, color: strColor, weight: 3, opacity: 1 });

  // save the name of this object for future reference
  srfTrack._myId = object.name;
  
  // show the time and orbit for this position
  srfTrack.on('mouseover mousemove', function(e) {
    if (KSA_MAP_CONTROLS.timePopup) ops.surface.map.closePopup(KSA_MAP_CONTROLS.timePopup);
    KSA_MAP_CONTROLS.timePopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
    KSA_MAP_CONTROLS.timePopup.setLatLng(e.latlng);
    var obj = KSA_CATALOGS.bodyPaths.paths.find(o => o.name === e.target._myId);
    var strTimeDate = UTtoDateTime(obj.obtData.startUT + getDataPointObject(obj.obtData, e.latlng));
    KSA_MAP_CONTROLS.timePopup.setContent("<center>" + strTimeDate.split("@")[0] + "<br>" + strTimeDate.split("@")[1] + " UTC</center>");
    KSA_MAP_CONTROLS.timePopup.openOn(ops.surface.map);
  });
  
  // remove the mouseover popup
  srfTrack.on('mouseout', function(e) {
    if (KSA_MAP_CONTROLS.timePopup) ops.surface.map.closePopup(KSA_MAP_CONTROLS.timePopup);
    KSA_MAP_CONTROLS.timePopup = null;
  });
  
  // when clicking along this line, find the nearest data point to display for the user
  srfTrack.on('click', function(e) {
    ops.surface.map.closePopup(KSA_MAP_CONTROLS.timePopup);
    KSA_MAP_CONTROLS.timePopup = null;
    var obj = KSA_CATALOGS.bodyPaths.paths.find(o => o.name === e.target._myId);
    var index = getDataPointObject(obj.obtData, e.latlng);
    var cardinal = getLatLngCompass(obj.obtData.orbit[index].latlng);
      
    // compose the popup HTML and place it on the cursor location then display it
    KSA_MAP_CONTROLS.vesselPositionPopup.setLatLng(obj.obtData.orbit[index].latlng);
    if (obj.isVessel) var strName = currName(ops.activeVessels.find(o => o.db === e.target._myId));
    else var strName = obj.name;
    KSA_MAP_CONTROLS.vesselPositionPopup.setContent("<h2>" + strName + "</h2>" + UTtoDateTime(obj.obtData.startUT + index) + ' UTC<br>Latitude: ' + numeral(obj.obtData.orbit[index].latlng.lat).format('0.0000') + '&deg;' + cardinal.lat + '<br>Longitude: ' + numeral(obj.obtData.orbit[index].latlng.lng).format('0.0000') + '&deg;' + cardinal.lng + '<br>Altitude: ' + numeral(obj.obtData.orbit[index].alt).format('0,0.000') + " km<br>Velocity: " + numeral(obj.obtData.orbit[index].vel).format('0,0.000') + " km/s<br>&nbsp;<br><span class='fauxLink' onclick='centerOnMarker(\"" + obj.name + "\")'>Center on Marker</span>");
    
    // move popup to the correct layer if needed
    var targetLayer = KSA_CATALOGS.bodyPaths.layers.find(o => o.type === obj.type);
    if (targetLayer && targetLayer.group) {
      // check if popup needs to be moved to a different layer
      if (!KSA_MAP_CONTROLS.vesselPositionPopup._currentLayer || KSA_MAP_CONTROLS.vesselPositionPopup._currentLayer !== targetLayer.group) {
        // remove from old layer if it exists
        if (KSA_MAP_CONTROLS.vesselPositionPopup._currentLayer) {
          KSA_MAP_CONTROLS.vesselPositionPopup._currentLayer.removeLayer(KSA_MAP_CONTROLS.vesselPositionPopup);
        }
        // add to new layer and track it
        targetLayer.group.addLayer(KSA_MAP_CONTROLS.vesselPositionPopup);
        KSA_MAP_CONTROLS.vesselPositionPopup._currentLayer = targetLayer.group;
      }
    }
    
    KSA_MAP_CONTROLS.vesselPositionPopup.openOn(ops.surface.map);
    ops.surface.map.setView(obj.obtData.orbit[index].latlng);
  });
  
  return srfTrack;
}

// store orbital data for active vessels drawn on the map surface
function loadVesselOrbitAJAX(xhttp, currObj) {
  if (xhttp.responseText.split("*")[1].split("|")[0] != "null") {
    currObj.orbit = rsToObj(xhttp.responseText.split("*")[1].split("|")[0])
  } else {
    currObj.orbit = null;
    currObj.isCalculated = true;
  }

  // possible end of mission, no more orbital data but there is a UT record
  if (currObj.orbit && currObj.orbit.Eph == null) {
    currObj.orbit = null;
    currObj.isCalculated = true;
  }
  currObj.isLoaded = true;
  calculateSurfaceTracks(currObj);
}

// determines if a flight is currently active and adjusts the map accordingly
function inFlight(fltPath) {

  // if the track has a start time prior to and end time later than the current time, find the time closest to it
  if (fltPath.fltData[0].UT < currUT(true) && fltPath.fltData[fltPath.fltData.length-1].UT > currUT(true)) {
    for (dataIndex=0; dataIndex<fltPath.fltData.length; dataIndex++) {
      if (fltPath.fltData[dataIndex].UT > currUT(true)) {

        // if there is more than one layer we need to find the layer that holds the coordinates
        var fltLayer;
        var polylines = getPolylinesFromLayer(fltPath.Layer);
        if (polylines.length > 1) {
          polylines.forEach(function(item) {
            if (item._bounds.contains([fltPath.fltData[dataIndex].Lat,fltPath.fltData[dataIndex].Lng])) fltLayer = item;
          });
        } else fltLayer = polylines[0];

        // fire a click event after popping up the initial data
        fltLayer.fire("mouseover", { 
          target: { 
            _myId: fltPath.index
          },
          latlng: L.latLng(fltPath.fltData[dataIndex].Lat,fltPath.fltData[dataIndex].Lng)
        });
        setTimeout(function(){
          fltLayer.fire("click", { 
            target: { 
              _myId: fltPath.index
            },
            latlng: L.latLng(fltPath.fltData[dataIndex].Lat,fltPath.fltData[dataIndex].Lng)
          });
        }, 250, fltLayer);
        return true;
      }
    }
  }

  // otherwise if the plot has already run its course
  else return false;
}

// display a popup with data from the current track location
function flightTrackHover(e) {
  var idStr = e.target._myId.split(",");
  var index = parseInt(idStr[0]);
  var indexFlt = parseInt(idStr[1]);
  var margin = 0.1;
  
  // traverse the latlon array and get the diff between the current index and the location hovered
  // if it is smaller than the margin, stop. If the entire path is searched, increase the margin and try again
  while (true) {
    if (Math.abs(KSA_CATALOGS.fltPaths[indexFlt].fltData[index].Lat - e.latlng.lat) < margin && Math.abs(KSA_CATALOGS.fltPaths[indexFlt].fltData[index].Lng - e.latlng.lng) < margin) break;
    index++;
    
    // be sure to account for running to the end of the array
    if (index >= KSA_CATALOGS.fltPaths[indexFlt].fltData.length) {
      index = parseInt(idStr[0]);
      margin += 0.1;
    }
    if (margin > 5) break;
  }
  KSA_CALCULATIONS.currentFlightTimelineIndex = index;

  // compose the popup HTML and place it on the cursor location then display it
  var cardinal = getLatLngCompass({lat: KSA_CATALOGS.fltPaths[indexFlt].fltData[index].Lat, lng: KSA_CATALOGS.fltPaths[indexFlt].fltData[index].Lng});
  if (KSA_MAP_CONTROLS.timePopup) ops.surface.map.closePopup(KSA_MAP_CONTROLS.timePopup); 
  KSA_MAP_CONTROLS.timePopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
  KSA_MAP_CONTROLS.timePopup.setLatLng(e.latlng);
  KSA_MAP_CONTROLS.timePopup.setContent(UTtoDateTime(KSA_CATALOGS.fltPaths[indexFlt].fltData[index].UT) + ' UTC<br>Latitude: ' + numeral(KSA_CATALOGS.fltPaths[indexFlt].fltData[index].Lat).format('0.0000') + '&deg;' + cardinal.lat + '<br>Longitude: ' + numeral(KSA_CATALOGS.fltPaths[indexFlt].fltData[index].Lng).format('0.0000') + '&deg;' + cardinal.lng + '<br>Altitude ASL: ' + numeral(KSA_CATALOGS.fltPaths[indexFlt].fltData[index].ASL/1000).format('0,0.000') + ' km<br>Altitude AGL: ' + numeral(KSA_CATALOGS.fltPaths[indexFlt].fltData[index].AGL/1000).format('0,0.000') + " km<br>Velocity: " + numeral(KSA_CATALOGS.fltPaths[indexFlt].fltData[index].Spd).format('0,0.000') + " m/s" + '<br>Distance from KSC: ' + numeral(KSA_CATALOGS.fltPaths[indexFlt].fltData[index].Dist/1000).format('0,0.000') + " km<p>Click for additional options</p>");
  KSA_MAP_CONTROLS.timePopup.openOn(ops.surface.map);
}

// download the entire flight path data as CSV
function downloadFlightDataCSV(indexFlt) {
  // create CSV header
  var csv = 'UT,Date,Time (UTC),Latitude,Latitude (decimal),Longitude,Longitude (decimal),Altitude ASL (km),Altitude ASL (m),Altitude AGL (km),Altitude AGL (m),Velocity (m/s),Distance from KSC (km),Distance from KSC (m)\n';
  
  // loop through all data points in the flight path
  KSA_CATALOGS.fltPaths[indexFlt].fltData.forEach(function(data) {
    var cardinal = getLatLngCompass({lat: data.Lat, lng: data.Lng});
    
    // get formatted date/time
    var dateTime = UTtoDateTime(data.UT);
    var date = dateTime.split('@')[0];
    var time = dateTime.split('@')[1];
    
    // add data row
    csv += data.UT + ',';
    csv += '"' + date + '",';
    csv += '"' + time + '",';
    csv += '"' + numeral(data.Lat).format('0.0000') + ' ' + cardinal.lat + '",';
    csv += data.Lat + ',';
    csv += '"' + numeral(data.Lng).format('0.0000') + ' ' + cardinal.lng + '",';
    csv += data.Lng + ',';
    csv += numeral(data.ASL/1000).format('0,0.000') + ',';
    csv += data.ASL + ',';
    csv += numeral(data.AGL/1000).format('0,0.000') + ',';
    csv += data.AGL + ',';
    csv += data.Spd + ',';
    csv += numeral(data.Dist/1000).format('0,0.000') + ',';
    csv += data.Dist + '\n';
  });
  
  // create a blob and download it
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  var url = URL.createObjectURL(blob);
  
  // generate filename with flight name
  var filename = 'flight_data_' + KSA_CATALOGS.fltPaths[indexFlt].info.Title.replace(/[^a-z0-9]/gi, '_') + '.csv';
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// replay the flight path with snake animation
function replayFlightPath(indexFlt) {
  // save the popup location before closing it
  var popupLatLng = KSA_MAP_CONTROLS.flightPositionPopup.getLatLng();
  var popupContent = KSA_MAP_CONTROLS.flightPositionPopup.getContent();
  
  // close the popup
  ops.surface.map.closePopup(KSA_MAP_CONTROLS.flightPositionPopup);
  
  // if there's already an animation running, don't start another
  if (KSA_CATALOGS.fltPaths[indexFlt]._isAnimating) {
    return;
  }
  KSA_CATALOGS.fltPaths[indexFlt]._isAnimating = true;
  
  // save the elev state and turn off elevation if it's active
  var wasElevShown = KSA_CATALOGS.fltPaths[indexFlt].elev;
  if (wasElevShown) {
    fltElev(indexFlt);
  }
  
  // save the original layer and its bounds
  var originalLayer = KSA_CATALOGS.fltPaths[indexFlt].layer;
  var layerBounds = originalLayer.getBounds();
  
  // immediately hide the path
  ops.surface.map.removeLayer(originalLayer);
  
  // setup global error handler for this animation
  var animationErrorHandler = function(event) {
    if (event.error && event.error.message && event.error.message.includes('Invalid LatLng')) {
      console.error("Caught LatLng error during animation, restoring original path and popup");
      event.preventDefault();
      
      // restore the original layer if it's not already on the map
      if (!ops.surface.map.hasLayer(originalLayer)) {
        try {
          if (window.currentAnimLayer) {
            ops.surface.map.removeLayer(window.currentAnimLayer);
          }
        } catch(e) {}
        
        originalLayer.addTo(ops.surface.map);
        
        if (wasElevShown) {
          fltElev(indexFlt);
        }
        
        // restore the popup
        KSA_MAP_CONTROLS.flightPositionPopup.setLatLng(popupLatLng);
        KSA_MAP_CONTROLS.flightPositionPopup.setContent(popupContent);
        KSA_MAP_CONTROLS.flightPositionPopup.openOn(ops.surface.map);
      }
      
      KSA_CATALOGS.fltPaths[indexFlt]._isAnimating = false;
      window.removeEventListener('error', animationErrorHandler);
    }
  };
  
  window.addEventListener('error', animationErrorHandler);
  
  // fit the map to show the entire flight path using saved bounds
  ops.surface.map.fitBounds(layerBounds);
  
  // wait for map to finish adjusting before starting animation
  setTimeout(function() {
    // create a new layer for the animation
    var animLayer = L.featureGroup();
    var segments = [];
    
    // build the path segments
    var path = [];
    
    KSA_CATALOGS.fltPaths[indexFlt].fltData.forEach(function(position, index) {
      
      // validate coordinates before adding
      if (isNaN(position.Lat) || isNaN(position.Lng)) {
        console.error("Invalid coordinates at index", index, position);
        return;
      }
      
      // detect if we've crossed off the edge of the map and need to cut the path
      if (path.length && (((position.Lng < 0 && path[path.length-1][1] > 0) && Math.abs(position.Lng) > 100) || ((position.Lng > 0 && path[path.length-1][1] < 0) && Math.abs(position.Lng) > 100))) { 
        
        // only create segment if we have at least 2 points
        if (path.length >= 2) {
          // create a completely new polyline with validated coordinates
          // start with 0 opacity to prevent flash
          var segment = L.polyline(path, {
            smoothFactor: 1.75,
            color: KSA_CATALOGS.fltPaths[indexFlt].color,
            weight: 3,
            opacity: 0,
            snakingSpeed: 400
          });
          
          segments.push(segment);
          animLayer.addLayer(segment);
        }
        path = [];
      }
      
      // add position to path as simple array [lat, lng]
      path.push([position.Lat, position.Lng]);
    });
    
    // add the final segment
    if (path.length >= 2) {
      var finalSegment = L.polyline(path, {
        smoothFactor: 1.75,
        color: KSA_CATALOGS.fltPaths[indexFlt].color,
        weight: 3,
        opacity: 0,
        snakingSpeed: 400
      });
      
      segments.push(finalSegment);
      animLayer.addLayer(finalSegment);
    }
    
    // add the animation layer to the map first
    animLayer.addTo(ops.surface.map);
    
    // store reference for error handler
    window.currentAnimLayer = animLayer;
    
    // ensure map is stable before starting animation
    ops.surface.map.invalidateSize();
    
    // wait for the layer to be fully added and rendered before starting animation
    setTimeout(function() {
      // double-check that all segments are properly attached to the map
      var allSegmentsValid = true;
      segments.forEach(function(seg) {
        if (!seg._map || !seg._latlngs || seg._latlngs.length === 0) {
          console.error("Invalid segment found", seg);
          allSegmentsValid = false;
        }
      });
      
      if (!allSegmentsValid) {
        console.error("Animation cancelled - invalid segments");
        ops.surface.map.removeLayer(animLayer);
        originalLayer.addTo(ops.surface.map);
        
        // restore the popup
        KSA_MAP_CONTROLS.flightPositionPopup.setLatLng(popupLatLng);
        KSA_MAP_CONTROLS.flightPositionPopup.setContent(popupContent);
        KSA_MAP_CONTROLS.flightPositionPopup.openOn(ops.surface.map);
        
        KSA_CATALOGS.fltPaths[indexFlt]._isAnimating = false;
        window.removeEventListener('error', animationErrorHandler);
        return;
      }
      
      // function to clean up and restore original layer
      var cleanupAndRestore = function(restorePopup) {
        // remove global error handler
        window.removeEventListener('error', animationErrorHandler);
        window.currentAnimLayer = null;
        
        segments.forEach(function(seg) {
          seg._snaking = false;
          seg._snakeLatLngs = null;
        });
        
        try {
          ops.surface.map.removeLayer(animLayer);
        } catch(e) {
          console.error("Error removing animation layer:", e);
        }
        
        originalLayer.addTo(ops.surface.map);
        
        if (wasElevShown) {
          fltElev(indexFlt);
        }
        
        // restore the popup if requested (on error)
        if (restorePopup) {
          KSA_MAP_CONTROLS.flightPositionPopup.setLatLng(popupLatLng);
          KSA_MAP_CONTROLS.flightPositionPopup.setContent(popupContent);
          KSA_MAP_CONTROLS.flightPositionPopup.openOn(ops.surface.map);
        }
        
        KSA_CATALOGS.fltPaths[indexFlt]._isAnimating = false;
      };
      
      // listen for errors on all segments
      segments.forEach(function(seg) {
        seg.on('error', function(e) {
          console.error("Error during snake animation:", e);
          cleanupAndRestore(true);
        });
      });
      
      // start the snake animation with error handling
      try {
        animLayer.once('snakeend', function() {
          cleanupAndRestore(false);
        });
        animLayer.snakeIn();
        
        // restore opacity immediately after starting animation
        // the snakeIn() function will have already reset the polylines to show just the first point
        segments.forEach(function(seg) {
          seg.setStyle({opacity: 1});
        });
      } catch(e) {
        console.error("Error starting snake animation:", e);
        cleanupAndRestore(true);
      }
    }, 200);
  }, 350);
}

// handler for clicking on a surface marker to go to the vessel or body page
function markerHandler(objName, isVessel) {
  var obj;
  if (isVessel) {
    swapContent("vessel", ops.activeVessels.find(o => o.db === objName).db);
  } else {
    obj = ops.bodyCatalog.find(o => o.Body === objName);
  }
}

// handler for centering map on orbital marker and closing popup
function centerOnMarker(objName) {
  var obj = KSA_CATALOGS.bodyPaths.paths.find(o => o.name === objName);
  if (obj && obj.obtData && obj.obtData.marker) {
    if (KSA_MAP_CONTROLS.vesselPositionPopup) ops.surface.map.closePopup(KSA_MAP_CONTROLS.vesselPositionPopup);
    ops.surface.map.setView(obj.obtData.marker.getLatLng(), ops.surface.map.getZoom());
    obj.isCentered = true;
    if (obj.obtData.marker.isPopupOpen()) $('#centerObjectLink').text("Lock off Vessel");
    else obj.obtData.marker.openPopup();
  }
}

// handler for centering map on current vessel marker and closing popup
function centerOnVesselMarker() {
  if (KSA_MAP_CONTROLS.vesselMarker) {
    if (KSA_MAP_CONTROLS.vesselPositionPopup) ops.surface.map.closePopup(KSA_MAP_CONTROLS.vesselPositionPopup);
    ops.surface.map.setView(KSA_MAP_CONTROLS.vesselMarker.getLatLng(), ops.surface.map.getZoom());
    ops.currentVesselPlot.isCentered = true;
    if (KSA_MAP_CONTROLS.vesselMarker.isPopupOpen()) $('#centerVesselLink').text("Lock off Vessel");
    else KSA_MAP_CONTROLS.vesselMarker.openPopup();
  }
}

function setVesselCenterFlag() {
  ops.currentVesselPlot.isCentered = !ops.currentVesselPlot.isCentered;
  if (!ops.currentVesselPlot.isCentered) $('#centerVesselLink').text("Lock on Vessel");
  else $('#centerVesselLink').text("Lock off Vessel");
}

function setObjectCenterFlag() {
  var obj = KSA_CATALOGS.bodyPaths.paths.find(o => o.isSelected);
  if (obj) {
    obj.isCentered = !obj.isCentered;
    if (!obj.isCentered) $('#centerObjectLink').text(obj.isVessel ? "Lock on Vessel" : "Lock on Body");
    else $('#centerObjectLink').text(obj.isVessel ? "Lock off Vessel" : "Lock off Body");
  }
}