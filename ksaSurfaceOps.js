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
  flagIcon = L.icon({
    iconUrl: 'button_vessel_flag.png',
    iconSize: [16, 16],
    iconAnchor: [6,21] 
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
  airportIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'airport.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  omniIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'pinOmni.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  dishIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'pinDish.png', 
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

  // do not allow the user to close or resize the map when it is in fullscreen
  ops.surface.map.on('enterFullscreen', function() {
    if (mapCloseButton) mapCloseButton.disable();
    if (mapResizeButton) mapResizeButton.disable();
    isMapFullscreen = true;
  });
  ops.surface.map.on('exitFullscreen', function() {
    if (mapCloseButton) mapCloseButton.enable();
    if (mapResizeButton) mapResizeButton.enable();
    isMapFullscreen = false;
  });
  
  // show controls only when the cursor is over the map, unless this is a touch device
  if (!is_touch_device()) { 
    ops.surface.map.on('mouseover', function(e) {
      $(".leaflet-top").fadeIn();
      $(".leaflet-bottom.leaflet-left").fadeIn();
    });
    ops.surface.map.on('mouseout', function(e) {
      $(".leaflet-top").fadeOut();
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

function loadMap(map) {
  if (ops.surface.Data && ops.surface.Data.Name == map) {

    // we don't need to fully reload the data but we do need to still do these things
    if (getParameterByName("flt") && ops.pageType == "body") {
      flightsToLoad = getQueryParams("flt");
      do {
        var flight = flightsToLoad.shift();
        if (!fltPaths || (fltPaths && !fltPaths.find(o => o.id === flight))) {
          surfaceTracksDataLoad.fltTrackDataLoad = L.layerGroup();
          ops.surface.layerControl._expand();
          ops.surface.layerControl.options.collapsed = false;
          ops.surface.layerControl.addOverlay(surfaceTracksDataLoad.fltTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Flight Tracks");
          loadDB("loadFltData.asp?data=" + flight, loadFltDataAJAX);
          break;
        }
      } while (flightsToLoad.length);
      showMap();
    }
    return;
  }

  // add a new layer control to let ppl know data is being loaded
  if (!ops.surface.layerControl) { ops.surface.layerControl = L.control.groupedLayers().addTo(ops.surface.map); }
  ops.surface.layerControl.addOverlay(ops.surface.loadingLayer, "<i class='fa fa-cog fa-spin'></i> Loading Data...");
  ops.surface.layerControl._expand();
  ops.surface.layerControl.options.collapsed = false;

  // call up the map data to load & terminate any orbital calculations
  loadDB("loadMapData.asp?map=" + map + "&UT=" + currUT(), loadMapDataAJAX);
  ops.surface.isLoading = true;
  isOrbitRenderTerminated = true;
}

function loadMapDataAJAX(xhttp) {
  ops.surface.isLoading = false;

  // could be nothing to load, so just exit
  if (xhttp.responseText == "null") {
    ops.surface.layerControl.removeLayer(ops.surface.loadingLayer);
    ops.surface.layerControl._collapse();
    ops.surface.layerControl.options.collapsed = true;
    return;
  }

  // parse out the data
  var data = xhttp.responseText.split("^");

  // assign the map data
  ops.surface.Data = rsToObj(data[0]);
  if (data[1] != "null") ops.updatesList.push({ type: "map", 
                                                id: ops.bodyCatalog.find(o => o.selected === true).Body, 
                                                UT: parseFloat(data[1]) });
  
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
  
  // place any and all labels
  if (ops.surface.Data.Labels) {
    var labelData = ops.surface.Data.Labels.split("|");
    var labelMarker;
    var layerLabels = L.layerGroup();
    labelData.forEach(function(item) {
      var label = item.split(";");
      labelMarker = L.marker([label[0],label[1]], { icon: labelIcon, zIndexOffset: 100 }).bindTooltip(label[2], { direction: 'top', offset: [0,-10] });
      layerLabels.addLayer(labelMarker);
      labelMarker._myId = -1;
      
      // zoom the map all the way in and center on this marker when clicked
      labelMarker.on('click', function(e) { ops.surface.map.setView(e.target.getLatLng(), 5); });
    });
    ops.surface.layerControl.addOverlay(layerLabels, "<img src='label.png' style='vertical-align: 1px;'> Labels", "Ground Markers");
    if (getParameterByName("layers").includes("label") || getParameterByName("layers").includes("lbl")) {
      layerLabels.addTo(ops.surface.map);
    }
  }

  // place any and all flags
  if (ops.surface.Data.Flags) {
    var flagData = ops.surface.Data.Flags.split("|");
    var flagMarker;
    var layerFlags = L.layerGroup();
    flagData.forEach(function(item) {
      var flag = item.split(";");
      flagMarker = L.marker([flag[0],flag[1]], { icon: flagIcon, zIndexOffset: 100 });
      if (flag[4] == 'null') var strCrew = "";
      else var strCrew = flag[4] + "<br />";
      if (flag[8] == 'null') var strLink = "<span class='fauxLink' onclick=\"swapContent('vessel','" + flag[7] + "')\">View Vessel</span>";
      else var strLink = "<a target='_blank' href='" + flag[7] + "'>" + flag[8] + "</a>";
      if (flag[2] != "0") var strAlt = numeral(flag[2]/1000).format('0.000') + "km<br />";
      else var strAlt = "";
      flagMarker.bindPopup("<b>" + flag[3] + "</b><br />" + strCrew + UTtoDateTime(parseInt(flag[6])).split(" ")[0] + "<br />" + strAlt + "<br />&quot;" + flag[5] + "&quot;<br /><br />" + strLink, { offset: new L.Point(0,-9), autoClose: true });
      layerFlags.addLayer(flagMarker);

      // set the id to make the map click function ignore this popup and add it to the map
      flagMarker._myId = -1;
    });
    
    // add the layer to the map and if it is asked for in the URL variable show it immediately
    ops.surface.layerControl.addOverlay(layerFlags, "<img src='button_vessel_flag.png' style='width: 10px; vertical-align: 1px;'> Flags", "Ground Markers");
    if (getParameterByName("layers").includes("flag")) layerFlags.addTo(ops.surface.map);
  }
  
  // place any and all points of interest
  if (ops.surface.Data.POI) {
    var POIData = ops.surface.Data.POI.split("|");
    var POIMarker;
    var layerPOI = L.layerGroup();
    POIData.forEach(function(item) {
      var POI = item.split(";");
      POIMarker = L.marker([POI[0],POI[1]], { icon: POIIcon, zIndexOffset: 100 });
      strHTML = "<b>" + POI[3] + "</b><br>" + numeral(POI[2]/1000).format('0.000') + " km";
      if (POI[4] != "null") strHTML += "<p>" + POI[4] + "</p>";
      POIMarker.bindPopup(strHTML, { autoClose: false });
      layerPOI.addLayer(POIMarker);
      POIMarker._myId = -1;
    });
    ops.surface.layerControl.addOverlay(layerPOI, "<img src='poi.png' style='width: 10px; vertical-align: 1px;'> Points of Interest", "Ground Markers");
    if (getParameterByName("layers").includes("poi") || getParameterByName("layers").includes("interest")) {
      layerPOI.addTo(ops.surface.map);
    }
  }
  
  // place any and all anomalies
  if (ops.surface.Data.Anomalies) {
    var anomalyData = ops.surface.Data.Anomalies.split("|");
    var anomalyMarker;
    var layerAnomalies = L.layerGroup();
    anomalyData.forEach(function(item) {
      var anomaly = item.split(";");
      anomalyMarker = L.marker([anomaly[0],anomaly[1]], { icon: anomalyIcon, zIndexOffset: 100 });
      strHTML = "<b>";
      if (anomaly[3] != "null") strHTML += anomaly[3];
      else strHTML += "Unknown Anomaly";
      strHTML += "</b><br>" + numeral(anomaly[2]/1000).format('0.000') + " km";
      anomalyMarker.bindPopup(strHTML, { autoClose: false });
      layerAnomalies.addLayer(anomalyMarker);
      anomalyMarker._myId = -1;
    });
    ops.surface.layerControl.addOverlay(layerAnomalies, "<img src='anomaly.png' style='width: 10px; vertical-align: 1px;'> Anomalies", "Ground Markers");
    if (getParameterByName("layers").includes("anom"))layerAnomalies.addTo(ops.surface.map);
  }
  
  // place any and all ground stations
  if (ops.surface.Data.GroundStations) {
    var grndData = ops.surface.Data.GroundStations.split("|");
    var grndMarker;
    var layerGrndStn = L.layerGroup();
    grndData.forEach(function(item) {
      var station = item.split(";");
      if (station[4] == "0") grndMarker = L.marker([station[0],station[1]], { icon: dishIcon, zIndexOffset: 100 });
      else grndMarker = L.marker([station[0],station[1]], { icon: omniIcon, zIndexOffset: 100 });
      strHTML = "<b>";
      strHTML += station[3];
      strHTML += "</b><br>Altitude: " + numeral(station[2]/1000).format('0.000') + " km";
      if (station[4] == "0") strHTML += "<br>Range: Entire Kerbin System";
      else strHTML += "<br>Range: " + numeral(station[4]/1000).format('0.000') + " km";
      grndMarker.bindPopup(strHTML, { autoClose: false });
      grndMarker._myId = station[4];
      layerGrndStn.addLayer(grndMarker);

      // create the range of visibility to the horizon for this station and add it to the layer group
      var stationHorizon = L.circle([station[0],station[1]], { 
        radius: (Math.sqrt(parseFloat(station[2])*(600000 * 2 + parseFloat(station[2])))*10),
        color: "#FFD800",
        weight: 2,
        interactive: false
      })
      layerGrndStn.addLayer(stationHorizon);

      // we need to temporarily add this to the map to measure it
      stationHorizon.addTo(ops.surface.map);

      // special case for ground stations near the edge of map that go off it
      // add a second circle to the other side of the map
      var eastWest = 0;
      if (stationHorizon.getBounds().getWest() < -180) eastWest = 1;
      else if (stationHorizon.getBounds().getEast() > 180) eastWest = -1;
      if (eastWest) {
        layerGrndStn.addLayer(L.circle([station[0],parseFloat(station[1]) + (360*eastWest)], { 
          radius: (Math.sqrt(parseFloat(station[2])*(600000 * 2 + parseFloat(station[2])))*10),
          color: "#FFD800",
          weight: 2,
          interactive: false
        }));
      }
      ops.surface.map.removeLayer(stationHorizon);
    });

    ops.surface.layerControl.addOverlay(layerGrndStn, "<img src='pinGrndStation.png' style='width: 10px; vertical-align: 1px;'> Ground Stations", "Ground Markers");
    if (getParameterByName("layers").includes("ground") || getParameterByName("layers").includes("grnd") || getParameterByName("layers").includes("station")) {
      layerGrndStn.addTo(ops.surface.map);
    }
  }

  // place any and all airports
  if (ops.surface.Data.Airports) {
    var aptData = ops.surface.Data.Airports.split("|");
    var aptMarker;
    var layerAirports = L.layerGroup();
    aptData.forEach(function(item) {
      var airport = item.split(";");
      aptMarker = L.marker([airport[0],airport[1]], { icon: airportIcon, zIndexOffset: 100 });
      strHTML = "<b>";
      strHTML += airport[3];
      strHTML += "</b><br>Altitude: " + numeral(airport[2]/1000).format('0.000') + " km";
      aptMarker.bindPopup(strHTML, { autoClose: false });
      layerAirports.addLayer(aptMarker);
      aptMarker._myId = -1;
    });
    ops.surface.layerControl.addOverlay(layerAirports, "<img src='airport.png' style='width: 10px; vertical-align: 1px;'> Airports", "Ground Markers");
    if (getParameterByName("layers").includes("apt") || getParameterByName("layers").includes("airport")) {
      layerAirports.addTo(ops.surface.map);
    }
  }

  // if this is a different map than any orbit data already loaded, dump the other data
  if (bodyPaths.bodyName && bodyPaths.bodyName != ops.surface.Data.Name) {
    bodyPaths.bodyName = ops.surface.Data.Name;

  // TODO - have to remove any layers that have already been created
  } else if (!bodyPaths.bodyName) bodyPaths.bodyName = ops.surface.Data.Name;

  // load surface track data for any vessels and moons in orbit around this body
  // this is dependent on ops catalog data so needs to be in its own function
  loadSurfaceTracks();
  
  // the following only works for Kerbin at the moment
  if (ops.surface.Data.Name == "Kerbin") {

    // determine the current position of the sun given the body's degree of initial rotation and rotational period
    var sunLon = -ops.bodyCatalog.find(o => o.selected === true).RotIni - (((currUT() / ops.bodyCatalog.find(o => o.selected === true).SolarDay) % 1) * 360);
    var sunLat = 0
    if (sunLon < -180) sunLon += 360;
    
    // place the sun marker
    sunMarker = L.marker([sunLat,sunLon], { icon: sunIcon, clickable: false });
    layerSolar.addLayer(sunMarker);
    
    // add to the layer selection control
    ops.surface.layerControl.addOverlay(layerSolar, "<i class='fas fa-sun' style='color: #FFD800'></i> Sun/Terminator", "Ground Markers");
    if (getParameterByName("layers").includes("sun") || getParameterByName("layers").includes("terminator")) {
      layerSolar.addTo(ops.surface.map);
    }
  }

  // hide map controls after 3 seconds if the user cursor isn't over the map (or dialog) at that time
  // unless this is a touchscreen device
  if (!is_touch_device()) { 
    setTimeout(function() {
      if (!$('#map').is(":hover")) { 
        $(".leaflet-top").fadeOut();
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
    layerPins = L.featureGroup();
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
      layerPins.addLayer(pin);
      pin._myId = -1;
    });

    // place the pins and size the map to show them all
    layerPins.addTo(ops.surface.map);
    ops.surface.layerControl.addOverlay(layerPins, "<img src='defPin.png' style='width: 10px; height: 14px; vertical-align: 1px;'> Custom Pins", "Ground Markers");
    ops.surface.map.fitBounds(layerPins.getBounds());
    
    // if only one marker was placed, open its popup and zoom back out
    if (!isMultiple) {
      pin.openPopup();
      ops.surface.map.setView(pin.getLatLng(), 7);
    }
    if (ops.pageType == "body") showMap();
  }
  
  // load flight paths, taking into account they may already be loaded
  if (getParameterByName("flt") && ops.pageType == "body") {
    flightsToLoad = getQueryParams("flt");
    do {
      var flight = flightsToLoad.shift();
      if (!fltPaths || (fltPaths && !fltPaths.find(o => o.id === flight))) {
        surfaceTracksDataLoad.fltTrackDataLoad = L.layerGroup();
        ops.surface.layerControl._expand();
        ops.surface.layerControl.options.collapsed = false;
        ops.surface.layerControl.addOverlay(surfaceTracksDataLoad.fltTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Flight Tracks");
        loadDB("loadFltData.asp?data=" + flight, loadFltDataAJAX);
        strFltTrackLoading = flight;
        break;
      }
    } while (flightsToLoad.length);
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
  if (fltPaths.length >= surfacePathColors.length) var colorIndex = fltPaths.length - (surfacePathColors.length * (Math.floor(fltPaths.length/surfacePathColors.length)));
  else var colorIndex = fltPaths.length;
  fltPaths.push({ info: fltInfo,
                  fltData: fltData,
                  layer: L.featureGroup(),
                  pins: [],
                  html: null,
                  id: xhttp.responseText.split("^")[2],
                  deleted: false,
                  elev: false,
                  color: surfacePathColors[colorIndex],
                  index: fltPaths.length,
                  minASL: altMin/1000,
                  maxASL: altMax/1000
                });
  
  // make sure that if a layer is hidden the current popup is too if that belongs to the layer
  fltPaths[fltPaths.length-1].layer._myId = fltPaths[fltPaths.length-1].info.Title;
  fltPaths[fltPaths.length-1].layer.on('remove', function(e) {
    if (flightPositionPopup.getContent() && flightPositionPopup.getContent().includes(e.target._myId)) ops.surface.map.closePopup(flightPositionPopup);
  });

  // draw the ground track
  renderFltPath(fltPaths.length-1);
  
  // delete the loading layer and add the flight path layer to the control and the map
  ops.surface.layerControl.removeLayer(surfaceTracksDataLoad.fltTrackDataLoad);
  ops.surface.layerControl.addOverlay(fltPaths[fltPaths.length-1].layer, "<i class='fa fa-minus' style='color: " + fltPaths[fltPaths.length-1].color + "'></i> " + fltPaths[fltPaths.length-1].info.Title, "Flight Tracks");
  fltPaths[fltPaths.length-1].layer.addTo(ops.surface.map)
  
  // get more flight data?
  if (flightsToLoad) {
    if (flightsToLoad.length) {
      surfaceTracksDataLoad.fltTrackDataLoad = L.layerGroup();
      ops.surface.layerControl.addOverlay(surfaceTracksDataLoad.fltTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Flight Tracks");
      var strFlightName = flightsToLoad.shift();
      loadDB("loadFltData.asp?data=" + strFlightName, loadFltDataAJAX);
      strFltTrackLoading = strFlightName;
  
    // done with data load?
    } else {
      surfaceTracksDataLoad.fltTrackDataLoad = null;
      flightsToLoad = null;
      checkDataLoad();
      
      // if there was only one track...
      if (fltPaths.length == 1) {

        // select it in the menu
        selectMenuItem(fltPaths[0].id);

        // check for in-progress flight
        if (!inFlight(fltPaths[0])) {

          // if there are more than two layers the plot wraps around the meridian so just show the whole map
          // otherwise zoom in to fit the size of the plot
          // https://stackoverflow.com/questions/5223/length-of-a-javascript-object
          if (Object.keys(fltPaths[0].layer._layers).length > 1) ops.surface.map.setView([0,0], 1);
          else ops.surface.map.fitBounds(Object.values(fltPaths[0].layer._layers)[0]._bounds);
        }
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
        fltPaths.forEach(function(item) {
          
          // if there are more than two layers the plot wraps around the meridian
          if (Object.keys(item.layer._layers).length > 1) isDblPlotted = true;
          else {
            if (!groupBounds) groupBounds = Object.values(item.layer._layers)[0]._bounds;
            else groupBounds.extend(Object.values(item.layer._layers)[0]._bounds);
          }
        });

        // if there is a double plot, just show the whole map otherwise fit the bounds
        if (isDblPlotted) ops.surface.map.setView([0,0], 1);
        else ops.surface.map.fitBounds(groupBounds);
      }
    }
  } else {

    // check for in-progress flight
    if (!inFlight(fltPaths[fltPaths.length-1])) {

      // zoom out to the full map if the new plot jumps the meridian otherwise fit its bounds
      if (Object.keys(fltPaths[fltPaths.length-1].layer._layers).length > 1) ops.surface.map.setView([0,0], 1);
      else ops.surface.map.fitBounds(Object.values(fltPaths[fltPaths.length-1].layer._layers)[0]._bounds);
    }

    surfaceTracksDataLoad.fltTrackDataLoad = null;
    checkDataLoad();
  }
  if (strFltTrackLoading) strFltTrackLoading = null;
}

function renderMapData(updated = false) {
  if (!ops.currentVesselPlot) {
    ops.currentVesselPlot = {
      obtData: [],
      numOrbitRenders: 3,
      events: {
        pe: { marker: null, UT: null },
        ap: { marker: null, UT: null },
        soiEntry: { marker: null },
        soiExit: { marker: null },
        node: { marker: null}
      },
      id: ops.currentVessel.Catalog.DB,
      eph: ops.currentVessel.Orbit.Eph
    };
  }

  // check if we need to wait for the vessel to finish loading or if we need to wait for the base map layers to finish loading
  // or if we have to wait for the GGB to finish loading or if we need to wait for the content area to stop moving
  if ((!ops.currentVessel && ops.pageType == "vessel") || 
      (ops.surface.layerControl && !ops.surface.layerControl.options.collapsed) ||
      !isGGBAppletLoaded || isContentMoving) {
    
    // but wait! if this call was made during an orbital data update, ignore the map layer control being open, we need to cancel & restart
    if (!updated) return setTimeout(renderMapData, 150);
  }

  // don't let this proceed if there is no orbital data!
  if (!ops.currentVessel.Orbit.Eph) return;

  // check for an SOI event that may have already occured, which would invalidate any orbital data and so no need to plot anything
  if (ops.currentVessel.Orbit.SOIEvent && parseInt(ops.currentVessel.Orbit.SOIEvent.split(";")[0]) <= currUT()) {
    $("#mapDialog").dialog("close");
    var latlng = { lat: parseFloat(ops.currentVessel.Orbit.SOIEvent.split(";")[3]), 
                   lng: parseFloat(ops.currentVessel.Orbit.SOIEvent.split(";")[4]) };
    if (ops.currentVessel.Orbit.SOIEvent.split(";")[1] == "entry") {
      ops.currentVesselPlot.events.soiEntry.marker = L.marker([latlng.lat, latlng.lng], { icon: soiEntryIcon }).addTo(ops.surface.map);
      ops.currentVesselPlot.events.soiEntry.marker.bindPopup("<center>" + UTtoDateTime(parseInt(ops.currentVessel.Orbit.SOIEvent.split(";")[0])).split("@")[1] + " UTC <br>Telemetry data invalid due to " + ops.currentVessel.Orbit.SOIEvent.split(";")[2] + "<br>Please stand by for update</center>", { autoClose: false });
      ops.surface.map.setView(ops.currentVesselPlot.events.soiEntry.marker.getLatLng(), 3);
      ops.currentVesselPlot.events.soiEntry.marker.openPopup();
    } else if (ops.currentVessel.Orbit.SOIEvent.split(";")[1] == "exit") {
      ops.currentVesselPlot.events.soiExit.marker = L.marker([latlng.lat, latlng.lng], { icon: soiExitIcon }).addTo(ops.surface.map);
      ops.currentVesselPlot.events.soiExit.marker.bindPopup("<center>" + UTtoDateTime(parseInt(ops.currentVessel.Orbit.SOIEvent.split(";")[0])).split("@")[1] + " UTC <br>Telemetry data invalid due to " + ops.currentVessel.Orbit.SOIEvent.split(";")[2] + "<br>Please stand by for update</center>", { autoClose: false });
      ops.surface.map.setView(ops.currentVesselPlot.events.soiExit.marker.getLatLng(), 3);
      ops.currentVesselPlot.events.soiExit.marker.openPopup();
    }

  // if there is a paused calculation we are returning to, then just resume calling the orbital batch
  } else if (strPausedVesselCalculation == ops.currentVessel.Catalog.DB) {
    
    // re-show the progress dialog for current state of calculation
    $("#mapDialog").dialog( "option", "title", "Calculating Orbit #" + ops.currentVesselPlot.obtData.length+1 + " of " + ops.currentVesselPlot.numOrbitRenders);
    $("#mapDialog").dialog( "option", "buttons", [{
      text: "Cancel and Display",
      click: function() { 
        isOrbitRenderCancelled = true;
      }
    }]);
    $(".ui-progressbar-value").css("background-color", vesselOrbitColors[ops.currentVesselPlot.obtData.length]);
    $("#dialogTxt").hide();
    $("#progressbar").progressbar("value", (orbitDataCalc.length/ops.currentVessel.Orbit.OrbitalPeriod)*100);
    $("#progressbar").fadeIn();
    $("#mapDialog").dialog("open");
  
    // reset the load state of the map
    ops.surface.layerControl._expand();
    ops.surface.layerControl.options.collapsed = false;
    surfaceTracksDataLoad.obtTrackDataLoad = L.layerGroup();
    ops.surface.layerControl.addOverlay(surfaceTracksDataLoad.obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");
    strPausedVesselCalculation = null;
    isOrbitRenderTerminated = false;
    orbitalCalc(renderVesselOrbit, ops.currentVessel.Orbit);

  // otherwise we need to calculate surface tracks for a single vessel
  } else if (ops.pageType == "vessel") {
    if (updated) isOrbitRenderTerminated = true;

    // if 3 orbits are longer than 100,000s we need to inform the user that this could take a while
    if ((ops.currentVessel.Orbit.OrbitalPeriod * 3) > 100000) {
      $("#mapDialog").dialog( "option", "buttons", [{
        text: "Render Single Orbit",
        click: function() { 
          beginOrbitalCalc(1);
        }
      },{
        text: "Render All Orbits",
        click: function() { 
          beginOrbitalCalc();
        }
      }]);
      if (!updated) $("#mapDialog").dialog( "option", "title", "Calculation Notice");
      else $("#mapDialog").dialog( "option", "title", "Calculation Notice - New Orbital Data");
      $("#dialogTxt").html("Calculating 3 orbits for this vessel could take a long time, but you can also cancel at any time and show what has been done up to that point if you wish");
      $("#dialogTxt").fadeIn();
      $("#progressbar").hide();

      // gives time for any map buttons to hide
      mapDialogDelay = setTimeout(function() { 
        $("#mapDialog").dialog("open"); 
        mapDialogDelay = null;
      }, 1000);
      
    } else {

      // check if another vessel rendering was interrupted and be sure the user wants to continue
      if (strPausedVesselCalculation) {
        $("#mapDialog").dialog( "option", "buttons", [{
          text: "Proceed",
          click: function() { 
            beginOrbitalCalc();
          }
        },{
          text: "Return",
          click: function() { 
            swapContent("vessel", strPausedVesselCalculation);
          }
        }]);
        $("#mapDialog").dialog( "option", "title", "Calculation Notice");
        $("#dialogTxt").html("A previous calculation was started for another vessel. Do you wish to calculate orbital data for this vessel or return to the paused calculation?");
        $("#dialogTxt").fadeIn();
        $("#progressbar").hide();
  
        // gives time for any map buttons to hide
        mapDialogDelay = setTimeout(function() { 
          $("#mapDialog").dialog("open"); 
          mapDialogDelay = null;
        }, 1000);
      } else beginOrbitalCalc();
    }
    
  // this is not a vessel with any orbital data
  } else { 
  }
}

// does the initial display and configuration for vessel orbital data loading
function beginOrbitalCalc(numOrbitRenders = 3) {

  // if there are surface orbits being calculated, we need to cancel that first
  // just give enough time for the orbital function to call itself again and cancel the batch
  if (!isOrbitRenderTerminated && bodyPaths.paths.length && bodyPaths.paths.find(o => o.isCalculating === true)) {
    isOrbitRenderTerminated = true;
    setTimeout(beginOrbitalCalc, 15, numOrbitRenders);
    return;
  }

  clearSurfacePlots();
  surfaceTracksDataLoad.obtTrackDataLoad = null;
  strPausedVesselCalculation = null;

  if (ops.currentVesselPlot) ops.currentVesselPlot.obtData.length = 0;
  ops.currentVesselPlot = {
    obtData: [],
    numOrbitRenders: 3,
    events: {
      pe: { marker: null, UT: null },
      ap: { marker: null, UT: null },
      soiEntry: { marker: null },
      soiExit: { marker: null },
      node: { marker: null}
    },
    id: ops.currentVessel.Catalog.DB,
    eph: ops.currentVessel.Orbit.Eph
  };

  isOrbitRenderCancelled = false;
  isOrbitRenderTerminated = false;
  ops.currentVesselPlot.numOrbitRenders = numOrbitRenders;
  $("#mapDialog").dialog( "option", "title", "Calculating Orbit #1 of " + ops.currentVesselPlot.numOrbitRenders);
  $("#mapDialog").dialog( "option", "buttons", [{
    text: "Cancel and Display",
    click: function() { 
      isOrbitRenderCancelled = true;
    }
  }]);
  $(".ui-progressbar-value").css("background-color", vesselOrbitColors[ops.currentVesselPlot.obtData.length]);
  $("#dialogTxt").hide();
  $("#progressbar").progressbar("value", 0);
  $("#progressbar").fadeIn();
  $("#mapDialog").dialog("open");
  ops.surface.layerControl._expand();
  ops.surface.layerControl.options.collapsed = false;
  surfaceTracksDataLoad.obtTrackDataLoad = L.layerGroup();
  ops.surface.layerControl.addOverlay(surfaceTracksDataLoad.obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");
  
  // set the current UT from which the orbital data will be propagated forward
  obtCalcUT = currUT();
  orbitDataCalc.length = 0;
  orbitalCalc(renderVesselOrbit, ops.currentVessel.Orbit);
}

// draws the entire path of a vessel over a single or multiple orbits
function renderVesselOrbit() {

  // we have completed a batch of calculations, store the data
  ops.currentVesselPlot.obtData.push({
    orbit: orbitDataCalc.slice(0),
    layer: L.featureGroup(),
    startUT: obtCalcUT-orbitDataCalc.length,
    endUT: obtCalcUT
  });

  // get the times we'll reach Ap and Pe along this orbit if we haven't already done so
  if (!ops.currentVesselPlot.events.ap.marker || !ops.currentVesselPlot.events.pe.marker) {
    var n = Math.sqrt(ops.bodyCatalog.find(o => o.selected === true).Gm/(Math.pow(Math.abs(ops.currentVessel.Orbit.SMA),3)));
    var newMean = toMeanAnomaly(Math.radians(ops.currentVessel.Orbit.TrueAnom), ops.currentVessel.Orbit.Eccentricity) + n * ((obtCalcUT-orbitDataCalc.length) - ops.currentVessel.Orbit.Eph);
    if (newMean < 0 || newMean > 2*Math.PI) {
      newMean = Math.abs(newMean - (2*Math.PI) * Math.floor(newMean / (2*Math.PI)));
    }
    var apTime = Math.round((Math.PI - newMean)/n);
    var peTime = Math.round((Math.PI*2 - newMean)/n);
    
    // close to Ap/Pe we can get a negative value, so handle that by just adding the period
    if (apTime <= 0) apTime += Math.round(ops.currentVessel.Orbit.OrbitalPeriod);
    if (peTime <= 0) peTime += Math.round(ops.currentVessel.Orbit.OrbitalPeriod);
    
    // stash away the times but convert them to UT instead of seconds from the start of this orbit
    ops.currentVesselPlot.events.pe.UT = peTime + (obtCalcUT-orbitDataCalc.length);
    ops.currentVesselPlot.events.ap.UT = apTime + (obtCalcUT-orbitDataCalc.length);
    
    // configure the Ap/Pe icons, ensuring that enough orbit has been plotted to display them
    if (!ops.currentVesselPlot.events.ap.marker && apTime < orbitDataCalc.length) { 

      // add the marker, assign its information popup and give it a callback for instant update when opened, then add it to the current layer
      ops.currentVesselPlot.events.ap.marker = L.marker(orbitDataCalc[apTime].latlng, {icon: apIcon}); 
      var strTimeDate = UTtoDateTime(obtCalcUT-orbitDataCalc.length + apTime);
      ops.currentVesselPlot.events.ap.marker.bindPopup("<center>Time to Apoapsis<br><span id='apTime'>" + formatTime(apTime) + "</span><br><span id='apDate'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
      ops.currentVesselPlot.events.ap.marker.on('click', function(e) {
        $('#apTime').html(formatTime(ops.currentVesselPlot.events.ap.UT - currUT()));
      });
      ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer.addLayer(ops.currentVesselPlot.events.ap.marker);
    }
    if (!ops.currentVesselPlot.events.pe.marker && peTime < orbitDataCalc.length) { 
      ops.currentVesselPlot.events.pe.marker = L.marker(orbitDataCalc[peTime].latlng, {icon: peIcon}); 
      var strTimeDate = UTtoDateTime(obtCalcUT-orbitDataCalc.length + peTime);
      ops.currentVesselPlot.events.pe.marker.bindPopup("<center>Time to Periapsis<br><span id='peTime'>" + formatTime(peTime) + "</span><br><span id='peDate'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
      ops.currentVesselPlot.events.pe.marker.on('click', function(e) {
        $('#peTime').html(formatTime(ops.currentVesselPlot.events.pe.UT - currUT()));
      });
      ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer.addLayer(ops.currentVesselPlot.events.pe.marker);
    }
  }

  // does this path terminate in an entry to Kerbin's atmosphere?
  if (orbitDataCalc[orbitDataCalc.length-1].alt <= 70) {

    // add the marker, assign its information popup and give it a callback for instant update when opened, then add it to the current layer
    ops.currentVesselPlot.events.soiEntry.UT = obtCalcUT;
    ops.currentVesselPlot.events.soiEntry.marker = L.marker(orbitDataCalc[orbitDataCalc.length-1].latlng, {icon: soiEntryIcon}); 
    var strTimeDate = UTtoDateTime(ops.currentVesselPlot.events.soiEntry.UT);
    ops.currentVesselPlot.events.soiEntry.marker.bindPopup("<center>Time to Atmospheric Entry<br><span id='soiEntryTime'>" + formatTime(ops.currentVesselPlot.events.soiEntry.UT) + "</span><br><span id='soiEntryDate'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
    ops.currentVesselPlot.events.soiEntry.marker.on('click', function(e) {
      $('#soiEntryTime').html(formatTime(ops.currentVesselPlot.events.soiEntry.UT - currUT()));
    });
    ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer.addLayer(ops.currentVesselPlot.events.soiEntry.marker);
  } 

  // does this path terminate in an exit of Kerbin's SOI?
  else if (orbitDataCalc[orbitDataCalc.length-1].alt >= 83559.2865) {

    // add the marker, assign its information popup and give it a callback for instant update when opened, then add it to the current layer
    ops.currentVesselPlot.events.soiExit.UT = obtCalcUT;
    ops.currentVesselPlot.events.soiExit.marker = L.marker(orbitDataCalc[orbitDataCalc.length-1].latlng, {icon: soiExitIcon}); 
    var strTimeDate = UTtoDateTime(ops.currentVesselPlot.events.soiExit.UT);
    ops.currentVesselPlot.events.soiExit.marker.bindPopup("<center>Time to Kerbin SOI Exit<br><span id='soiExitTime'>" + formatTime(ops.currentVesselPlot.events.soiExit.UT) + "</span><br><span id='soiExitDate'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
    ops.currentVesselPlot.events.soiExit.marker.on('click', function(e) {
      $('#soiExitTime').html(formatTime(ops.currentVesselPlot.events.soiExit.UT - currUT()));
    });
    ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer.addLayer(ops.currentVesselPlot.events.soiExit.marker);
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
  ops.surface.layerControl.addOverlay(ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer, "<i class='fa fa-minus' style='color: " + vesselOrbitColors[ops.currentVesselPlot.obtData.length-1] + "'></i> Vessel Orbit #" + (ops.currentVesselPlot.obtData.length), "Orbital Tracks");
  ops.currentVesselPlot.obtData[ops.currentVesselPlot.obtData.length-1].layer.addTo(ops.surface.map)

  // delete and re-add the loading layer so it stays below the added paths
  ops.surface.layerControl.removeLayer(surfaceTracksDataLoad.obtTrackDataLoad);
  surfaceTracksDataLoad.obtTrackDataLoad = L.layerGroup();
  ops.surface.layerControl.addOverlay(surfaceTracksDataLoad.obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");

  // are there still more orbits to render? Don't continue if the rendering has been cancelled or there are SOI markers present
  if (ops.currentVesselPlot.numOrbitRenders > ops.currentVesselPlot.obtData.length && !isOrbitRenderCancelled && (!ops.currentVesselPlot.events.soiExit.marker && !ops.currentVesselPlot.events.soiEntry.marker)) { 
    
    // update the dialog box and call another round
    $(".ui-progressbar-value").css("background-color", vesselOrbitColors[ops.currentVesselPlot.obtData.length]);
    $("#progressbar").progressbar("value", 0);
    orbitDataCalc.length = 0;
    orbitalCalc(renderVesselOrbit, ops.currentVessel.Orbit); 
    
  // calculation has been completed or cancelled
  } else { 
    
    // warn the user if they cancelled the calculations early before a full orbit was rendered
    if (ops.currentVesselPlot.obtData[0].orbit.length < ops.currentVessel.Orbit.OrbitalPeriod && isOrbitRenderCancelled) {
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
    ops.surface.layerControl.removeLayer(surfaceTracksDataLoad.obtTrackDataLoad);
    surfaceTracksDataLoad.obtTrackDataLoad = null;
    checkDataLoad();
    
    // reset loading flags/triggers
    strPausedVesselCalculation = null;
    isOrbitRenderCancelled = false;
    isOrbitRenderTerminated = false;

    // place the craft marker and assign its popup
    vesselIcon = L.icon({iconUrl: 'button_vessel_' + currType(ops.currentVessel.Catalog.Type) + '.png', iconSize: [16, 16]});
    vesselMarker = L.marker(ops.currentVesselPlot.obtData[0].orbit[0].latlng, {icon: vesselIcon, zIndexOffset: 100}).addTo(ops.surface.map);
    vesselMarker.bindPopup("Lat: <span id='lat'>-000.0000&deg;S</span><br>Lng: <span id='lng'>-000.0000&deg;W</span><br>Alt: <span id='alt'>000,000.000km</span><br>Vel: <span id='vel'>000,000.000km/s</span>", {autoClose: false, keepInView: false, autoPan: false});

    // set up a listener for popup events so we can immediately update the information and not have to wait for the next tick event
    vesselMarker.on('popupopen', function(e) {
      var now = getPlotIndex();
      var cardinal = getLatLngCompass(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng);
      $('#lat').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng.lat).format('0.0000') + "&deg;" + cardinal.lat);
      $('#lng').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng.lng).format('0.0000') + "&deg;" + cardinal.lng);
      $('#alt').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].alt).format('0,0.000') + " km");
      $('#vel').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].vel).format('0,0.000') + " km/s");
    });
    
    // focus in on the vessel position
    ops.surface.map.setView(vesselMarker.getLatLng(), 3);
    
    // open the vessel popup then hide it after 5s
    if (!vesselMarker.getPopup().isOpen()) {
      vesselMarker.openPopup();
      setTimeout(function() { if (vesselMarker) vesselMarker.closePopup(); }, 5000);
    }

    // check if we should resume calculation on body paths
    if (bodyPaths.paths.length) {
      var currObj = bodyPaths.paths.find(o => o.isCalculating === true);
      if (currObj) {
        obtCalcUT = currUT();
        orbitDataCalc.length = 0;
        if (currObj.orbit.OrbitalPeriod > 86400) orbitalCalc(renderBodyOrbit, currObj.orbit, 500, 86400);
        else orbitalCalc(renderBodyOrbit, currObj.orbit, 500);
      }
    }
  }
}

// this function will continually call itself to batch-run orbital calculations and not completely lock up the browser
// will calculate a full orbital period unless cancelled or otherwise interrupted by an event along the orbit, then pass control to the callback
// orbital period self-assigned to keep from having to call the catalog for this information
function orbitalCalc(callback, orbit, batchCount = 1000, limit) {
  if (!limit) limit = orbit.OrbitalPeriod;
  if (isOrbitRenderTerminated) return;
  var bAltLimit = false;

  // update the dialog title with the current date & time being calculated
  if ($("#mapDialog").dialog("isOpen") && $("#mapDialog").dialog("option").title != "Render Notice") {
    var strDialogTitle = "Calculating Orbit #" + (ops.currentVesselPlot.obtData.length + 1) + " of " + ops.currentVesselPlot.numOrbitRenders + " - ";
    strDialogTitle += UTtoDateTime(obtCalcUT, true);
    $("#mapDialog").dialog("option", "title", strDialogTitle);
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
    if (longitude >= 180) longitude -= 360;
    
    // store all the derived values and advance to the next second
    orbitDataCalc.push({latlng: {lat: latitude, lng: longitude}, alt: alt, vel: vel});
    obtCalcUT++;
    
    // update the progress bar - will only show if loading data for a single vessel
    if ($("#mapDialog").dialog("isOpen")) $('#progressbar').progressbar("value", (orbitDataCalc.length/limit)*100);
    
    // exit the batch prematurely if we've reached the end of the calculation period
    if (orbitDataCalc.length >= limit) break; 

    // exit the batch prematurely if we've hit Kerbin's atmosphere
    if (alt <= 70) { 
      bAltLimit = true;
      break;
    }

    // exit the batch prematurely if we've exited Kerbin's SOI
    if (alt >= 83559.2865) {
      bAltLimit = true;
      break;
    }
  }
  
  // let the callback know if we've completed all orbital calculations, or cancel out if requested by the user
  // or if an altitude was breached
  if (orbitDataCalc.length >= limit || isOrbitRenderCancelled || bAltLimit) {
    callback();
    
  // just exit and don't call anything if the calculations have been paused by switching away from the vessel
  } else if (strPausedVesselCalculation) {
    return;
    
  // otherwise call ourselves again for more calculations, with a small timeout to let other things happen
  } else setTimeout(orbitalCalc, 1, callback, orbit, batchCount, limit);
}

function addMapResizeButton() {
  if (!mapResizeButton) {
    mapResizeButton = L.easyButton({
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
  if (mapResizeButton) {
    ops.surface.map.removeControl(mapResizeButton);
    mapResizeButton = null;
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
          var currBody = ops.bodyCatalog.find(o => o.selected === true).Body;
          swapContent("body", currBody);
          setTimeout(showMap, 1000);
          selectMenuItem(currBody + "-System");
        }
      }]
    }).addTo(ops.surface.map);
  } else ops.surface.map.addControl(mapViewButton);
}
function removeMapViewButton() {
  if (mapViewButton) ops.surface.map.removeControl(mapViewButton);
}
function removeVesselMapButtons() {
  removeMapResizeButton();
  removeMapViewButton();
}

// these buttons will go on both vessel and body maps
function addMapRefreshButton() {
  if (!mapRefreshButton) {
    mapRefreshButton = L.easyButton({
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
  if (mapRefreshButton) {
    ops.surface.map.removeControl(mapRefreshButton);
    mapRefreshButton = null;
  }
}
function addMapCloseButton() {
  if (!mapCloseButton) {
    mapCloseButton = L.easyButton({
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
  if (mapCloseButton) {
    ops.surface.map.removeControl(mapCloseButton);
    mapCloseButton = null;
  }
}

function showMap() {
  if (!isMapShown) {
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
      $("#contentHeader").html(ops.bodyCatalog.find(o => o.selected === true).Body);
      document.title = "KSA Operations Tracker - " + ops.bodyCatalog.find(o => o.selected === true).Body;
      if (launchsiteMarker) ops.surface.map.removeLayer(launchsiteMarker);
      $(".leaflet-top").fadeIn();
      $(".leaflet-bottom.leaflet-left").fadeIn();
    } else if (ops.pageType == "vessel") {
      $("#content").fadeOut();
    }

    $("#map").css("visibility", "visible");
    $("#map").fadeIn();
    isMapShown = true;
  }
}

function hideMap() {
  if (isMapShown) {
    if ($("#map").css("visibility") != "hidden") $("#map").fadeOut();
    $("#mapDialog").dialog("close");
    $("#aircraftAltitudeKey").fadeOut();
    removeMapRefreshButton();
    if (!isGGBAppletRefreshing && ops.pageType == "body") {
      $("#figureOptions").fadeIn();
      if (!$("#asteroid-filter").prop("disabled") || !$("#debris-filter").prop("disabled") || !$("#probe-filter").prop("disabled") || !$("#ship-filter").prop("disabled") || !$("#station-filter").prop("disabled")) $("#vesselOrbitTypes").fadeIn();
      $("#figure").fadeIn();
      $("#contentHeader").html(ops.bodyCatalog.find(o => o.selected === true).Body + " System");
      document.title = "KSA Operations Tracker - " + ops.bodyCatalog.find(o => o.selected === true).Body + " System";
    }
    isMapShown = false;
  }
}

// because the vessel plot is broken up into distinct orbital periods, we need to do a bit of legwork
// to determine what index of what plot corresponds to the given UT
function getPlotIndex(targetUT) {
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
  return {obtNum: currentOrbit, index: totalTime};
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
  if (fltPaths[index].elev) {
    var srfTrack = L.hotline(path, {
      smoothFactor: 1.75, 
      clickable: true, 
      weight: 3, 
      outlineWidth: 1,
      min: fltPaths[index].minASL,
      max: fltPaths[index].maxASL,
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
      color: fltPaths[index].color, 
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
    if (!flightPositionPopup.isOpen()) {
      flightTrackHover(e);
    }
  });
  
  // remove the mouseover popup
  srfTrack.on('mouseout', function(e) {
    if (timePopup) ops.surface.map.closePopup(timePopup);
    timePopup = null;
  });
  
  // when clicking along this line, display the mission data info
  srfTrack.on('click', function(e) {
    if (flightPositionPopup.isOpen()) {
      ops.surface.map.closePopup(flightPositionPopup);
      flightTrackHover(e);
      return;
    }
    var indexFlt = parseInt(e.target._myId.split(",")[1]);
    w2ui['menu'].select(fltPaths[indexFlt].id);
    w2ui['menu'].expandParents(fltPaths[indexFlt].id);
    w2ui['menu'].scrollIntoView(fltPaths[indexFlt].id);

    // fill, position and display the popup
    var strNewHtml = "<span id='fltTimelineData'>";
    strNewHtml += timePopup.getContent().replace("<p>Click for additional options</p>", "");
    strNewHtml += "</span><p><center><button id='prevFltData' onclick='prevFltData()' class='flightTimelineButton'>&lt;&lt;</button> <button id='prevFltDataOnce' onclick='prevFltDataOnce()' class='flightTimelineButton'>&lt;</button> <b>Timeline Controls</b><sup><a href='https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#timeline-playback' target='_blank' style='text-decoration: none'>(?)</a></sup> <button id='nextFltDataOnce' onclick='nextFltDataOnce()' class='flightTimelineButton'>&gt;</button> <button id='nextFltData' onclick='nextFltData()' class='flightTimelineButton'>&gt;&gt;</button>";
    strNewHtml += "<br><span class='fauxLink' onclick='missionInfoDlg(" + indexFlt + ")'>Mission Info</span> | ";
    strNewHtml += "<span class='fauxLink' onclick='removeFltPath(" + indexFlt + ")'>Remove Track</span> | <span class='fauxLink' onclick='fltElev(" + indexFlt + ")'>";
    if (fltPaths[index].elev) strNewHtml += "Hide Altitude";
    else strNewHtml += "Show Altitude";
    strNewHtml += "</span></center></p>";
    flightPositionPopup.setContent(strNewHtml);
    flightPositionPopup.setLatLng(e.latlng);
    flightPositionPopup.openOn(ops.surface.map);
    ops.surface.map.setView(e.latlng);
    ops.surface.map.closePopup(timePopup);
    timePopup = null;

    // save the index for later
    currentFlightIndex = indexFlt;
  });
  
  return srfTrack;
}

// take care of all the details that need to be applied to a vessel's surface track as this needs to be done in two separate places
function setupVesselSurfacePath(path, obtIndex) {
  var srfTrack = L.polyline(path, { smoothFactor: 1.25, clickable: true, color: vesselOrbitColors[obtIndex], weight: 3, opacity: 1 });
  
  // save the orbit index of this line to make it faster when searching for a data point by not having to look at all 3 orbits
  srfTrack._myId = obtIndex;
  
  // show the time and orbit for this position
  srfTrack.on('mouseover mousemove', function(e) {
    if (timePopup) ops.surface.map.closePopup(timePopup);
    timePopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
    timePopup.setLatLng(e.latlng);
    var strTimeDate = UTtoDateTime(ops.currentVesselPlot.obtData[e.target._myId].startUT + getDataPoint(e.target._myId, e.latlng));
    timePopup.setContent("<center>Orbit #" + (e.target._myId+1) + "<br>" + strTimeDate.split("@")[0] + "<br>" + strTimeDate.split("@")[1] + " UTC</center>");
    timePopup.openOn(ops.surface.map);
  });
  
  // remove the mouseover popup
  srfTrack.on('mouseout', function(e) {
    if (timePopup) ops.surface.map.closePopup(timePopup);
    timePopup = null;
  });
  
  // when clicking along this line, find the nearest data point to display for the user
  srfTrack.on('click', function(e) {
    ops.surface.map.closePopup(timePopup);
    timePopup = null;
    var index = getDataPoint(e.target._myId, e.latlng);
    var cardinal = getLatLngCompass(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].latlng);
      
    // compose the popup HTML and place it on the cursor location then display it
    vesselPositionPopup.setLatLng(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].latlng);
    vesselPositionPopup.setContent(UTtoDateTime(ops.currentVesselPlot.obtData[e.target._myId].startUT + index) + ' UTC<br>Latitude: ' + numeral(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].latlng.lat).format('0.0000') + '&deg;' + cardinal.lat + '<br>Longitude: ' + numeral(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].latlng.lng).format('0.0000') + '&deg;' + cardinal.lng + '<br>Altitude: ' + numeral(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].alt).format('0,0.000') + " km<br>Velocity: " + numeral(ops.currentVesselPlot.obtData[e.target._myId].orbit[index].vel).format('0,0.000') + " km/s");
    vesselPositionPopup.openOn(ops.surface.map);
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
function clearSurfacePlots() {
  if (ops.currentVesselPlot) {
    ops.currentVesselPlot.obtData.forEach(function(item) { 
      if (item.layer) {
        ops.surface.layerControl.removeLayer(item.layer); 
        ops.surface.map.removeLayer(item.layer);
      }
    });
    for (var event in ops.currentVesselPlot.events) {
      if (ops.currentVesselPlot.events[event].marker) ops.surface.map.removeLayer(ops.currentVesselPlot.events[event].marker);
    }
    if (vesselMarker) ops.surface.map.removeLayer(vesselMarker);
    if (vesselHorizon.vessel) ops.surface.map.removeLayer(vesselHorizon.vessel); vesselHorizon.vessel = null;
    if (vesselHorizon.eastWest) ops.surface.map.removeLayer(vesselHorizon.eastWest); vesselHorizon.eastWest = null;
    if (vesselHorizon.northSouth) ops.surface.map.removeLayer(vesselHorizon.northSouth); vesselHorizon.northSouth = null;
  }
  if (fltPaths.length) {
    fltPaths.forEach(function(path) {
      ops.surface.layerControl.removeLayer(path.layer); 
      ops.surface.map.removeLayer(path.layer);
      
      path.pins.forEach(function(pin) {
        pin.group.forEach(function(marker) {
          if (marker.pin) ops.surface.map.removeLayer(marker.pin);
        });
      });
    });
  }
  if (bodyPaths.layers.length) {
    bodyPaths.layers.forEach(function(layer) {
      if (layer.group) {
        ops.surface.layerControl.removeLayer(layer.group);
        ops.surface.map.removeLayer(layer.group);
      }
    });
  }
removeMapRefreshButton();
}

// puts an existing plot of vessel orbits back onto the map
function redrawVesselPlots() {
  ops.currentVesselPlot.obtData.forEach(function(item, index) { 
    ops.surface.layerControl.addOverlay(item.layer, "<i class='fa fa-minus' style='color: " + vesselOrbitColors[index] + "'></i> Vessel Orbit #" + (index+1), "Orbital Tracks");
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
  if (vesselMarker) {
    vesselMarker.addTo(ops.surface.map);
    
    // open the vessel popup then hide it after 5s
    ops.surface.map.setView(vesselMarker.getLatLng(), 3); 
    if (!vesselMarker.getPopup().isOpen()) {
      vesselMarker.openPopup();
      setTimeout(function() { vesselMarker.closePopup(); }, 5000);
    }
    if (vesselHorizon.vessel) vesselHorizon.vessel.addTo(ops.surface.map); vesselHorizon.vessel = null;
    if (vesselHorizon.eastWest) vesselHorizon.eastWest.addTo(ops.surface.map); vesselHorizon.eastWest = null;
    if (vesselHorizon.northSouth) vesselHorizon.northSouth.addTo(ops.surface.map); vesselHorizon.northSouth = null;
  }
  ops.surface.map.invalidateSize();
}

// puts any existing plots of flights back onto the map
function redrawFlightPlots() {
  if (fltPaths.length) {
    fltPaths.forEach(function(path, index) {
      if (!path.deleted) {
        if (index >= surfacePathColors.length) var colorIndex = index - (surfacePathColors.length * (Math.floor(index/surfacePathColors.length)));
        else var colorIndex = index;
        ops.surface.layerControl.addOverlay(path.layer, "<i class='fa fa-minus' style='color: " + surfacePathColors[colorIndex] + "'></i> " + path.info.Title, "Flight Tracks");
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
  Object.entries(surfaceTracksDataLoad).forEach(function(items) {
    if (items[1]) isDataLoading = true;
  });
  if (!isDataLoading) {
    if (!ops.surface.layerControl.options.collapsed && !$('.leaflet-control-layers-expanded').is(":hover")) ops.surface.layerControl._collapse();
    ops.surface.layerControl.options.collapsed = true;
  }
}

// places a pin or group of pins when a link is clicked in a flight path mission data window
function popupMarkerOpen(indexFlt, linkNum) {
  ops.surface.map.closePopup(flightPositionPopup);

  for (pinIndex=0; pinIndex<fltPaths[indexFlt].pins[linkNum].Group.length; pinIndex++) {
  
    // don't create this pin if it is already created
    if (!fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin) {
      fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin = L.marker([fltPaths[indexFlt].pins[linkNum].Group[pinIndex].lat, fltPaths[indexFlt].pins[linkNum].Group[pinIndex].lng]).bindPopup(decodeURI(fltPaths[indexFlt].pins[linkNum].Group[pinIndex].html, {autoClose: false}) + "<p><center><span onclick='popupMarkerClose(" + indexFlt + "," + linkNum + "," + pinIndex + ")' style='color: blue; cursor: pointer;'>Remove Pin</span></center></p>", {closeButton: true}).addTo(ops.surface.map);
      fltPaths[indexFlt].layer.addLayer(fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin);
      
      // if there is just one pin, open the popup
      if (fltPaths[indexFlt].pins[linkNum].Group.length == 1) fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin.openPopup();
      
    // if the pin is already created, open the popup
    } else fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin.openPopup();
  }
}

// removes a single pin when user clicks link in pin popup
function popupMarkerClose(indexFlt, linkNum, pinIndex) {
  fltPaths[indexFlt].layer.removeLayer(fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin);
  fltPaths[indexFlt].pins[linkNum].Group[pinIndex].pin = null;
}

// removes a single flight path, but doesn't actually delete it in case the request for it is made again
function removeFltPath(index) {
  if (flightPositionPopup.isOpen()) ops.surface.map.closePopup(flightPositionPopup);
  ops.surface.layerControl.removeLayer(fltPaths[index].layer);
  ops.surface.map.removeLayer(fltPaths[index].layer);

  fltPaths[index].pins.forEach(function(pin) {
    pin.Group.forEach(function(marker) {
      if (marker.pin) ops.surface.map.removeLayer(marker.pin);
    });
  });
  fltPaths[index].deleted = true;
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
  if (flightTimelineInterval) clearInterval(flightTimelineInterval);

  // there can only be one, so if another path is showing elevation data, return it to normal
  if (checkOtherDataDisplayed) {
    var elevPath = fltPaths.find(o => o.elev === true);
    if (elevPath && elevPath.index != index) fltElev(elevPath.index, false);
  }

  // toggle the state of our elevation display
  fltPaths[index].elev = !fltPaths[index].elev;

  // remove the current path and reset for a new one
  removeFltPath(index);
  fltPaths[index].deleted = false;
  fltPaths[index].layer = L.featureGroup();

  // redraw the flight path and add it back to the layer control
  // the icon used depends on whether elevation is shown or not
  renderFltPath(index);
  if (fltPaths[index].elev) {
    ops.surface.layerControl.addOverlay(fltPaths[index].layer, "<i class='far fa-chart-bar'></i>" + fltPaths[index].info.Title, "Flight Tracks");
    $("#alt1").html("&nbsp;" + numeral(fltPaths[index].minASL).format('0.000') + " - " + numeral(fltPaths[index].maxASL*0.125).format('0.000') + " km");
    $("#alt2").html("&nbsp;" + numeral(fltPaths[index].maxASL*0.125).format('0.000') + " - " + numeral(fltPaths[index].maxASL*0.25).format('0.000') + " km");
    $("#alt3").html("&nbsp;" + numeral(fltPaths[index].maxASL*0.25).format('0.000') + " - " + numeral(fltPaths[index].maxASL*0.375).format('0.000') + " km");
    $("#alt4").html("&nbsp;" + numeral(fltPaths[index].maxASL*0.375).format('0.000') + " - " + numeral(fltPaths[index].maxASL*0.5).format('0.000') + " km");
    $("#alt5").html("&nbsp;" + numeral(fltPaths[index].maxASL*0.5).format('0.000') + " - " + numeral(fltPaths[index].maxASL*0.625).format('0.000') + " km");
    $("#alt6").html("&nbsp;" + numeral(fltPaths[index].maxASL*0.625).format('0.000') + " - " + numeral(fltPaths[index].maxASL*0.75).format('0.000') + " km");
    $("#alt7").html("&nbsp;" + numeral(fltPaths[index].maxASL*0.75).format('0.000') + " - " + numeral(fltPaths[index].maxASL*0.875).format('0.000') + " km");
    $("#alt8").html("&nbsp;" + numeral(fltPaths[index].maxASL*0.875).format('0.000') + " - " + numeral(fltPaths[index].maxASL).format('0.000') + " km");
    $("#alt9").html("&nbsp;" + numeral(fltPaths[index].maxASL).format('0.000') + " km");
    $("#aircraftAltitudeKey").fadeIn();
  } else {
    ops.surface.layerControl.addOverlay(fltPaths[index].layer, "<i class='fa fa-minus' style='color: " + fltPaths[index].color + "'></i> " + fltPaths[index].info.Title, "Flight Tracks");
    if (checkOtherDataDisplayed) $("#aircraftAltitudeKey").fadeOut();
  }
  fltPaths[index].layer.addTo(ops.surface.map)
}

// plots out the various lat,lng points onto the surface map
function renderFltPath(pathIndex) {
  var path = [];
  var startIndex = 0;
  fltPaths[pathIndex].fltData.forEach(function(position, index) {
  
    // detect if we've crossed off the edge of the map and need to cut the path
    // compare this lng to the prev and if it changed from negative to positive or vice versa, we hit the edge  
    // (check if the lng is over 100 to prevent detecting a sign change while crossing the meridian)
    if (path.length && (((position.Lng < 0 && path[path.length-1].lng > 0) && Math.abs(position.Lng) > 100) || ((position.Lng > 0 && path[path.length-1].lng < 0) && Math.abs(position.Lng) > 100))) { 
    
      // time to cut this path off and create a surface track to setup
      // add this path to the layer and reset to start building a new path
      fltPaths[pathIndex].layer.addLayer(setupFlightSurfacePath(path, pathIndex, startIndex, path.length));
      path.length = 0;
      startIndex = index;
    }

    // data required depends on whether elevation is being shown or not
    if (fltPaths[pathIndex].elev) path.push([position.Lat, position.Lng, position.ASL/1000]);
    else path.push({lat: position.Lat, lng: position.Lng});
  });
  fltPaths[pathIndex].layer.addLayer(setupFlightSurfacePath(path, pathIndex, startIndex, path.length));
}

// opens a modal dialog box that holds the mission information
function missionInfoDlg(indexFlt) {

  // compose the dialog HTML?    
  if (!fltPaths[indexFlt].html) {

    var strHTML = "<table style='border: 0px; border-collapse: collapse;'><tr><td style='vertical-align: top; width: 256px;'>";
    strHTML += "<img src='" + fltPaths[indexFlt].info.Img + "' width='256px'></td>";
    strHTML += "<td style='vertical-align: top;'>";
    
    // see if there is a marker link in the description
    if (fltPaths[indexFlt].info.Desc.indexOf("loc=") >= 0) {
      
      // cut up to the link
      strHTML += fltPaths[indexFlt].info.Desc.slice(0, fltPaths[indexFlt].info.Desc.indexOf("<a"));
      
      // extract the popup data, checking for multiple links
      var charLinkIndex = 0;
      for (linkNum=0; linkNum<fltPaths[indexFlt].info.Desc.match(/<a/g).length; linkNum++) {
        
        // push a new pin group to the list
        fltPaths[indexFlt].pins.push({Group: []});
        
        // get the full link text
        var linkStr = fltPaths[indexFlt].info.Desc.slice(fltPaths[indexFlt].info.Desc.indexOf("<a", charLinkIndex), fltPaths[indexFlt].info.Desc.indexOf('">', charLinkIndex));

        // iterate through all the pins
        var charPinIndex = 0;
        for (pinNum=0; pinNum<linkStr.match(/loc=/g).length; pinNum++) {
        
          // get the pin from the link
          // this works except for the last pin
          if (pinNum < linkStr.match(/loc=/g).length-1) {
            var pinData = fltPaths[indexFlt].info.Desc.slice(fltPaths[indexFlt].info.Desc.indexOf("loc=", charLinkIndex + charPinIndex)+4, fltPaths[indexFlt].info.Desc.indexOf('&amp', fltPaths[indexFlt].info.Desc.indexOf("loc=", charLinkIndex + charPinIndex))).split(",");
          } else {
            var pinData = fltPaths[indexFlt].info.Desc.slice(fltPaths[indexFlt].info.Desc.indexOf("loc=", charLinkIndex + charPinIndex)+4, fltPaths[indexFlt].info.Desc.indexOf('"', fltPaths[indexFlt].info.Desc.indexOf("loc=", charLinkIndex + charPinIndex))).split(",");
          }
          
          // push the data to the group
          fltPaths[indexFlt].pins[linkNum].Group.push({lat: pinData[0],
                                                      lng: pinData[1],
                                                      html: pinData[2],
                                                      pin: null});
                                                                              
          // set the index so we search past the previous location
          charPinIndex = fltPaths[indexFlt].info.Desc.indexOf("loc=", charLinkIndex + charPinIndex)+4;
        }

        // set the link name
        strHTML += "<span onclick='popupMarkerOpen(" + indexFlt + "," + linkNum + ")' style='color: blue; cursor: pointer'>" + fltPaths[indexFlt].info.Desc.slice(fltPaths[indexFlt].info.Desc.indexOf('">', charLinkIndex)+2, fltPaths[indexFlt].info.Desc.indexOf('</a>', charLinkIndex)) + "</span>";
        
        // set the index so we search past the previous link
        charLinkIndex = fltPaths[indexFlt].info.Desc.indexOf("</a>", charLinkIndex)+4;
          
        // if we're going around for more links, get the text between this and the next one
        if (fltPaths[indexFlt].info.Desc.match(/<a/g).length > 1) {
          strHTML += fltPaths[indexFlt].info.Desc.slice(charLinkIndex, fltPaths[indexFlt].info.Desc.indexOf("<a", charLinkIndex));
        }
      }
        
      // get the rest of the text
      strHTML += fltPaths[indexFlt].info.Desc.slice(charLinkIndex, fltPaths[indexFlt].info.Desc.length);
    } else strHTML += fltPaths[indexFlt].info.Desc;
    strHTML += "<p><a href='" + fltPaths[indexFlt].info.Report + "' target='_blank'>Mission Report</a></td></tr></table>";
    fltPaths[indexFlt].html = strHTML;
  }
  
  // setup and display the dialog
  $("#mapDialog").dialog("option", "modal", true);
  $("#mapDialog").dialog("option", "title", fltPaths[indexFlt].info.Title);
  $("#mapDialog").dialog( "option", "buttons", [{
    text: "Close",
    click: function() { 
      $("#mapDialog").dialog("close");
      $("#mapDialog").dialog("option", "modal", false);
    }
  }]);
  $("#progressbar").fadeOut();
  $("#dialogTxt").fadeIn();
  $("#dialogTxt").html(fltPaths[indexFlt].html);
  $("#mapDialog").dialog("open");

  // inform the user they have to exit fullscreen if it is enabled
  if (isMapFullscreen) {
    flightPositionPopup.setContent("Please press Esc key<br>to exit fullscreen mode!");
    setTimeout(function() { ops.surface.map.closePopup(flightPositionPopup); }, 3000);
  }
}

// functions to control the playback of flight data
function prevFltData() {
  clearInterval(flightTimelineInterval);

  // stop the playback
  if ($("#prevFltData").html().includes("X")) {
    $("#prevFltData").html("<<");
    
  // otherwise start the playback
  } else {
    flightTimelineInterval = setInterval(prevFltDataOnce, 1000);
    prevFltDataOnce();
    $("#prevFltData").html("XX");
    $("#nextFltData").html(">>");
  }
}
function prevFltDataOnce() {
  $("#nextFltData").prop("disabled", false);
  $("#nextFltDataOnce").prop("disabled", false);

  // cancel if the popup is closed
  if (!flightPositionPopup.isOpen() && flightTimelineInterval) clearInterval(flightTimelineInterval);

  // check if we hit the beginning
  if (currentFlightTimelineIndex <= 0) {
    if (flightTimelineInterval) clearInterval(flightTimelineInterval);
    $("#prevFltData").prop("disabled", true);
    $("#prevFltData").html("<<");
    $("#prevFltDataOnce").prop("disabled", true);
    return;
  }
  currentFlightTimelineIndex--;

  // update the popup
  var latlngData = { lat: fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].Lat, lng: fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].Lng };
  flightPositionPopup.setLatLng(latlngData);
  ops.surface.map.setView(latlngData);
  $("#fltTimelineData").html(UTtoDateTime(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].UT) + ' UTC<br>Latitude: ' + numeral(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].Lat).format('0.0000') + '&deg;' + getLatLngCompass(latlngData).lat + '<br>Longitude: ' + numeral(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].Lng).format('0.0000') + '&deg;' + getLatLngCompass(latlngData).lng + '<br>Altitude ASL: ' + numeral(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].ASL/1000).format('0,0.000') + ' km<br>Altitude AGL: ' + numeral(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].AGL/1000).format('0,0.000') + " km<br>Velocity: " + numeral(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].Spd).format('0,0.000') + " m/s" + '<br>Distance from KSC: ' + numeral(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].Dist/1000).format('0,0.000') + " km");
}
function nextFltData() {
  clearInterval(flightTimelineInterval);

  // stop the playback
  if ($("#nextFltData").html().includes("X")) {
    $("#nextFltData").html(">>");
    
  // otherwise start the playback
  } else {
    flightTimelineInterval = setInterval(nextFltDataOnce, 1000);
    nextFltDataOnce();
    $("#nextFltData").html("XX");
    $("#prevFltData").html("<<");
  }
}
function nextFltDataOnce() {
  $("#prevFltData").prop("disabled", false);
  $("#prevFltDataOnce").prop("disabled", false);

  // cancel if the popup is closed
  if (!flightPositionPopup.isOpen() && flightTimelineInterval) clearInterval(flightTimelineInterval);

  // check if we hit the end
  if (currentFlightTimelineIndex >= fltPaths[currentFlightIndex].fltData.length-1) {
    if (flightTimelineInterval) clearInterval(flightTimelineInterval);
    $("#nextFltData").prop("disabled", true);
    $("#nextFltData").html(">>");
    $("#nextFltDataOnce").prop("disabled", true);
    return;
  }
  currentFlightTimelineIndex++;

  // update the popup
  var latlngData = { lat: fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].Lat, lng: fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].Lng };
  flightPositionPopup.setLatLng(latlngData);
  ops.surface.map.setView(latlngData);
  $("#fltTimelineData").html(UTtoDateTime(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].UT) + ' UTC<br>Latitude: ' + numeral(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].Lat).format('0.0000') + '&deg;' + getLatLngCompass(latlngData).lat + '<br>Longitude: ' + numeral(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].Lng).format('0.0000') + '&deg;' + getLatLngCompass(latlngData).lng + '<br>Altitude ASL: ' + numeral(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].ASL/1000).format('0,0.000') + ' km<br>Altitude AGL: ' + numeral(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].AGL/1000).format('0,0.000') + " km<br>Velocity: " + numeral(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].Spd).format('0,0.000') + " m/s" + '<br>Distance from KSC: ' + numeral(fltPaths[currentFlightIndex].fltData[currentFlightTimelineIndex].Dist/1000).format('0,0.000') + " km");
}

// load surface track data for any vessels and moons in orbit around this body
function loadSurfaceTracks() {
  bodyPaths.paths.length = 0;

  // dependent on ops and body catalog data so call back if it's not all loaded yet
  if (!ops.bodyCatalog.length || (!ops.updateData.length || (ops.updateData.length && ops.updateData.find(o => o.isLoading === true)))) {
    setTimeout(loadSurfaceTracks, 50);
    return;
  }

  // does this body have any moons? If so, add them to the list
  var bodyData = ops.bodyCatalog.find(o => o.Body === bodyPaths.bodyName);
  if (bodyData.Moons) {
    bodyData.Moons.split(",").forEach(function(item) {
      moonData = ops.bodyCatalog.find(o => o.Body === item.trim());
      bodyPaths.paths.push({
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
        index: bodyPaths.paths.length,
        isVessel: false,
        isCalculated: false,
        isCalculating: false,
        isLoaded: true,
        isSelected: false,
        type: "moon"
      });
    });
    bodyPaths.layers.push({
      type: "moon",
      group: null,
      isLoaded: false
    });
  }
  
  // search the menu for any vessels within the current map SOI
  ops.activeVessels.forEach(function(item) {
    if (item.bodyRef == bodyData.ID) {
      bodyPaths.paths.push({
        name: item.db,
        orbit: {
          Arg: 0,
          Eccentricity: 0,
          Eph: 0,
          Inclination: 0,
          OrbitalPeriod: 0,
          RAAN: 0,
          SMA: 0,
          TrueAnom: 0
        },
        obtData: null,
        index: bodyPaths.paths.length,
        isVessel: true,
        isCalculated: false,
        isCalculating: false,
        isLoaded: false,
        isSelected: false,
        type: item.type
      });
      if (!bodyPaths.layers.find(o => o.type === item.type)) {
        bodyPaths.layers.push({
          type: item.type,
          group: null,
          isLoaded: false
        });
      }
    }
  });

  // if this body has vessels or moons that need rendering then get it done
  if (bodyPaths.paths.length) calculateSurfaceTracks(bodyPaths.paths[0].name, bodyPaths.paths[0].type);
}

// run through all surface tracks that need to be calculated for any body
function calculateSurfaceTracks(currentName, currentType) {

  // setup the layer control to show data load in progress only if we're looking at a body page
  if (!surfaceTracksDataLoad.bodiesTrackDataLoad && ops.pageType == "body") {
    ops.surface.layerControl._expand();
    ops.surface.layerControl.options.collapsed = false;
    bodyPaths.layers.forEach(function(layer) {
      if (layer.isLoaded) {
        var strType = capitalizeFirstLetter(layer.type);
        if (!strType.endsWith("s")) strType += "s";
        ops.surface.layerControl.addOverlay(layer.group, "<img src='icon_" + layer.type + ".png' style='width: 15px;'> " + strType, "Orbital Tracks");
      }
    });
    surfaceTracksDataLoad.bodiesTrackDataLoad = L.layerGroup();
    ops.surface.layerControl.addOverlay(surfaceTracksDataLoad.bodiesTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading " + capitalizeFirstLetter(currentType) + " Data...", "Orbital Tracks");
  }

  // remove the layer entirely if we switched to a vessel page
  if (surfaceTracksDataLoad.bodiesTrackDataLoad && ops.pageType == "vessel") ops.surface.layerControl.removeLayer(surfaceTracksDataLoad.bodiesTrackDataLoad);

  // get the current object being worked on
  var currObj = bodyPaths.paths.find(o => o.name === currentName);

  // if the object is not loaded, we need to send out for data
  if (!currObj.isLoaded) {
    loadDB("loadVesselOrbitData.asp?db=" + currObj.name + "&ut=" + currUT(), loadVesselOrbitAJAX, {name: currentName, type: currentType});
    return;
  }

  // have we begun to calculate its orbit data? If not then kick that off
  // we run a lower batch count since the full surface map has more to interact with and should remain responsive
  // orbits are rendered for one orbital period or 24 hours, whichever is shorter
  if (!currObj.isCalculated && currObj.orbit) {
    obtCalcUT = currUT();
    orbitDataCalc.length = 0;
    isOrbitRenderTerminated = false;
    if (currObj.orbit.OrbitalPeriod > 86400) orbitalCalc(renderBodyOrbit, currObj.orbit, 500, 86400);
    else orbitalCalc(renderBodyOrbit, currObj.orbit, 500);
    currObj.isCalculating = true;
    return;
  } else {

    // find the next object of the current type to begin loading
    currentName = null;
    bodyPaths.paths.forEach(function(obj) {
      if (obj.type == currentType && !obj.isCalculated) currentName = obj.name;
    });
    if (!currentName) {

      // show the current group we were loading?
      // the group only has an object if an orbit completed calculation for it
      var currLayer = bodyPaths.layers.find(o => o.type === currentType)
      if (currLayer.group) {
        currLayer.isLoaded = true;
        if (ops.pageType == "body") {
          if (surfaceTracksDataLoad.bodiesTrackDataLoad) {
            ops.surface.layerControl.removeLayer(surfaceTracksDataLoad.bodiesTrackDataLoad);
            surfaceTracksDataLoad.bodiesTrackDataLoad = L.layerGroup();
          }
          var strType = capitalizeFirstLetter(currentType);
          if (!strType.endsWith("s")) strType += "s";
          ops.surface.layerControl.addOverlay(currLayer.group, "<img src='icon_" + currentType + ".png' style='width: 15px'> " + strType, "Orbital Tracks");
        }
      }

      // look for a new type of object to load
      bodyPaths.paths.forEach(function(obj) {
        if (!currentName && obj.type != currentType && !obj.isCalculated) {
          currentName = obj.name;
          currentType = obj.type;
        }
      });
      
      // if we found a new object, start a new loading layer otherwise we are done
      if (currentName) {
        if (ops.pageType == "body") {
          if (surfaceTracksDataLoad.bodiesTrackDataLoad) {
            ops.surface.layerControl.removeLayer(surfaceTracksDataLoad.bodiesTrackDataLoad);
            surfaceTracksDataLoad.bodiesTrackDataLoad = L.layerGroup();
          }
          ops.surface.layerControl.addOverlay(surfaceTracksDataLoad.bodiesTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading " + capitalizeFirstLetter(currentType) + " Data...", "Orbital Tracks");
        }
      } else {
        if (surfaceTracksDataLoad.bodiesTrackDataLoad) {
          ops.surface.layerControl.removeLayer(surfaceTracksDataLoad.bodiesTrackDataLoad);
          surfaceTracksDataLoad.bodiesTrackDataLoad = null;
        }
        checkDataLoad();
        console.log(bodyPaths)
        return;
      }
    }
  }

  // keep calling ourselves until everything is loaded
  setTimeout(calculateSurfaceTracks, 100, currentName, currentType);
}

// create the orbital polygons and add them to the current layer
function renderBodyOrbit() {

  // add the calculated data to teh current object
  var currObj = bodyPaths.paths.find(o => o.isCalculating === true);
  currObj.obtData = {
    orbit: orbitDataCalc.slice(0),
    startUT: obtCalcUT-orbitDataCalc.length,
    endUT: obtCalcUT,
    marker: null,
    pathData: [],
    events: {
      pe: { marker: null, UT: null },
      ap: { marker: null, UT: null },
      soiEntry: { marker: null },
      soiExit: { marker: null },
      node: { marker: null}
    }
  };

  // flag calculations complete
  currObj.isCalculating = false;
  currObj.isCalculated = true;

  // enable this layer for display
  var currLayer = bodyPaths.layers.find(o => o.type === currObj.type);
  if (!currLayer.group) currLayer.group = L.layerGroup();

  // get the times we'll reach Ap and Pe along this orbit, if it has any
  if (currObj.orbit.Eccentricity > 0) {
    var n = Math.sqrt(ops.bodyCatalog.find(o => o.selected === true).Gm/(Math.pow(Math.abs(currObj.orbit.SMA),3)));
    var newMean = toMeanAnomaly(Math.radians(currObj.orbit.TrueAnom), currObj.orbit.Eccentricity) + n * ((obtCalcUT-orbitDataCalc.length) - currObj.orbit.Eph);
    if (newMean < 0 || newMean > 2*Math.PI) {
      newMean = Math.abs(newMean - (2*Math.PI) * Math.floor(newMean / (2*Math.PI)));
    }
    var apTime = Math.round((Math.PI - newMean)/n);
    var peTime = Math.round((Math.PI*2 - newMean)/n);
    
    // close to Ap/Pe we can get a negative value, so handle that by just adding the period
    if (apTime <= 0) apTime += Math.round(currObj.orbit.OrbitalPeriod);
    if (peTime <= 0) peTime += Math.round(currObj.orbit.OrbitalPeriod);
    
    // stash away the times but convert them to UT instead of seconds from the start of this orbit
    currObj.obtData.events.pe.UT = peTime + (obtCalcUT-orbitDataCalc.length);
    currObj.obtData.events.ap.UT = apTime + (obtCalcUT-orbitDataCalc.length);
    
    // configure the Ap/Pe icons, ensuring that enough orbit has been plotted to display them
    if (apTime < orbitDataCalc.length) { 

      // add the marker, assign its information popup and give it a callback for instant update when opened, then add it to the current layer
      currObj.obtData.events.ap.marker = L.marker(orbitDataCalc[apTime].latlng, {icon: apIcon}); 
      var strTimeDate = UTtoDateTime(obtCalcUT-orbitDataCalc.length + apTime);
      currObj.obtData.events.ap.marker.bindPopup("<center>Time to Apoapsis<br><span id='apTimeSurface'>" + formatTime(apTime) + "</span><br><span id='apDateSurface'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
      currObj.obtData.events.ap.marker.on('click', function(e) {
        $('#apTimeSurface').html(formatTime(currObj.obtData.events.ap.UT - currUT()));
      });
    }
    if (peTime < orbitDataCalc.length) { 
      currObj.obtData.events.pe.marker = L.marker(orbitDataCalc[peTime].latlng, {icon: peIcon}); 
      var strTimeDate = UTtoDateTime(obtCalcUT-orbitDataCalc.length + peTime);
      currObj.obtData.events.pe.marker.bindPopup("<center>Time to Periapsis<br><span id='peTimeSurface'>" + formatTime(peTime) + "</span><br><span id='peDateSurface'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
      currObj.obtData.events.pe.marker.on('click', function(e) {
        $('#peTimeSurface').html(formatTime(currObj.obtData.events.pe.UT - currUT()));
      });
    }
  }

  // only need to consider this for vessels
  if (currObj.isVessel) {

    // does this path terminate in an entry to Kerbin's atmosphere?
    if (orbitDataCalc[orbitDataCalc.length-1].alt <= 70) {

      // add the marker, assign its information popup and give it a callback for instant update when opened, then add it to the current layer
      currObj.obtData.events.soiEntry.UT = obtCalcUT;
      currObj.obtData.events.soiEntry.marker = L.marker(orbitDataCalc[orbitDataCalc.length-1].latlng, {icon: soiEntryIcon}); 
      var strTimeDate = UTtoDateTime(currObj.obtData.events.soiEntry.UT);
      currObj.obtData.events.soiEntry.marker.bindPopup("<center>Time to Atmospheric Entry<br><span id='soiEntryTimeSurface'>" + formatTime(currObj.obtData.events.soiEntry.UT) + "</span><br><span id='soiEntryDateSurface'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
      currObj.obtData.events.soiEntry.marker.on('click', function(e) {
        $('#soiEntryTimeSurface').html(formatTime(currObj.obtData.events.soiEntry.UT - currUT()));
      });
      currLayer.group.addLayer(currObj.obtData.events.soiEntry.marker);
    } 

    // does this path terminate in an exit of Kerbin's SOI?
    else if (orbitDataCalc[orbitDataCalc.length-1].alt >= 83559.2865) {

      // add the marker, assign its information popup and give it a callback for instant update when opened, then add it to the current layer
      currObj.obtData.events.soiExit.UT = obtCalcUT;
      currObj.obtData.events.soiExit.marker = L.marker(orbitDataCalc[orbitDataCalc.length-1].latlng, {icon: soiExitIcon}); 
      var strTimeDate = UTtoDateTime(currObj.obtData.events.soiExit.UT);
      currObj.obtData.events.soiExit.marker.bindPopup("<center>Time to Kerbin SOI Exit<br><span id='soiExitTimeSurface'>" + formatTime(currObj.obtData.events.soiExit.UT) + "</span><br><span id='soiExitDateSurface'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", { autoClose: false });
      currObj.obtData.events.soiExit.marker.on('click', function(e) {
        $('#soiExitTimeSurface').html(formatTime(currObj.obtData.events.soiExit.UT - currUT()));
      });
      currLayer.group.addLayer(currObj.obtData.events.soiExit.marker);
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
  currObj.obtData.marker.bindPopup("Lat: <span id='latSurface'>" + numeral(currObj.obtData.orbit[now].latlng.lat).format('0.0000') + "&deg;" + cardinal.lat + "</span><br>Lng: <span id='lngSurface'>" + numeral(currObj.obtData.orbit[now].latlng.lng).format('0.0000') + "&deg;" + cardinal.lng + "</span><br>Alt: <span id='altSurface'>" + numeral(currObj.obtData.orbit[now].alt).format('0,0.000') + " km" + "</span><br>Vel: <span id='velSurface'>" + numeral(currObj.obtData.orbit[now].vel).format('0,0.000') + " km/s" + "</span>", {autoClose: false, keepInView: false, autoPan: false});
  currObj.obtData.marker._myId = currObj.name;
  currLayer.group.addLayer(currObj.obtData.marker);

  // set up a listener for popup events so we can immediately update the information and not have to wait for the next tick event
  currObj.obtData.marker.on('popupopen', function(e) {

    // get the selected object and the layer it belongs to
    var obj = bodyPaths.paths.find(o => o.name === e.target._myId);
    var currLayer = bodyPaths.layers.find(o => o.type === obj.type);

    // if this object isn't selected that means another one might be, so look for it
    if (!obj.isSelected) {
      var selectedObj = bodyPaths.paths.find(o => o.isSelected === true);

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

    // create the horizon(s)
    var now = currUT() - obj.obtData.startUT;
    var horizonRadius = Math.sqrt((obj.obtData.orbit[now].alt*1000)*((ops.bodyCatalog.find(o => o.selected === true).Radius*1000) * 2 + (obj.obtData.orbit[now].alt*1000)))*10;
    //if (horizonRadius/10 > ops.bodyCatalog.find(o => o.selected === true).Radius*1000) horizonRadius = (ops.bodyCatalog.find(o => o.selected === true).Radius*1000)*10;
    vesselHorizon.vessel = L.circle(obj.obtData.marker.getLatLng(), { 
      radius: horizonRadius,
      color: "#00ff3c",
      weight: 2,
      interactive: false
    });
    currLayer.group.addLayer(vesselHorizon.vessel);
    if (vesselHorizon.vessel.getBounds().getWest() < -180 || vesselHorizon.vessel.getBounds().getEast() > 180) {
      var eastWest = 0;
      if (vesselHorizon.vessel.getBounds().getWest() < -180) eastWest = 1;
      else if (vesselHorizon.vessel.getBounds().getEast() > 180) eastWest = -1;
      vesselHorizon.eastWest = L.circle([obj.obtData.marker.getLatLng().lat, obj.obtData.marker.getLatLng().lng + (360 * eastWest)], { 
        radius: horizonRadius,
        color: "#00ff3c",
        weight: 2,
        interactive: false
      });
      currLayer.group.addLayer(vesselHorizon.eastWest);
    }
    if (vesselHorizon.vessel.getBounds().getSouth() < -90 || vesselHorizon.vessel.getBounds().getNorth() > 90) {
      var northSouth = 0;
      if (vesselHorizon.vessel.getBounds().getSouth() < -90) northSouth = 1;
      else if (vesselHorizon.vessel.getBounds().getNorth() > 90) northSouth = -1;
      vesselHorizon.northSouth = L.circle([obj.obtData.marker.getLatLng().lat + (180 * northSouth), obj.obtData.marker.getLatLng().lng], { 
        radius: horizonRadius,
        color: "#00ff3c",
        weight: 2,
        interactive: false
      });
      currLayer.group.addLayer(vesselHorizon.northSouth);
    }

    // setup the popup
    var now = currUT() - obj.obtData.startUT;
    var cardinal = getLatLngCompass(obj.obtData.orbit[now].latlng);
    obj.obtData.marker.getPopup().setContent("Lat: <span id='latSurface'>" + numeral(obj.obtData.orbit[now].latlng.lat).format('0.0000') + "&deg;" + cardinal.lat + "</span><br>Lng: <span id='lngSurface'>" + numeral(obj.obtData.orbit[now].latlng.lng).format('0.0000') + "&deg;" + cardinal.lng + "</span><br>Alt: <span id='altSurface'>" + numeral(obj.obtData.orbit[now].alt).format('0,0.000') + " km" + "</span><br>Vel: <span id='velSurface'>" + numeral(obj.obtData.orbit[now].vel).format('0,0.000') + " km/s" + "</span>");
  });

  // de-selects the object
  currObj.obtData.marker.on('popupclose', function(e) {
    var obj = bodyPaths.paths.find(o => o.name === e.target._myId);
    var currLayer = bodyPaths.layers.find(o => o.type === obj.type);
    if (obj.isVessel) {
      obj.obtData.pathData.forEach(function(path) {
        path.setStyle({color: orbitColors[obj.type]});
      });
    }
    if (obj.obtData.events.ap.marker) currLayer.group.removeLayer(obj.obtData.events.ap.marker);
    if (obj.obtData.events.pe.marker) currLayer.group.removeLayer(obj.obtData.events.pe.marker);
    if (vesselHorizon.vessel) {
      currLayer.group.removeLayer(vesselHorizon.vessel);
      vesselHorizon.eastWest = vessel;
    }
    if (vesselHorizon.eastWest) {
      currLayer.group.removeLayer(vesselHorizon.eastWest);
      vesselHorizon.eastWest = null;
    }
    if (vesselHorizon.northSouth) {
      currLayer.group.removeLayer(vesselHorizon.northSouth);
      vesselHorizon.northSouth = null;
    }
  });

  // continue to calculate any additional paths
  calculateSurfaceTracks(currObj.name, currObj.type);
}

// take care of all the details that need to be applied to a surface track as this needs to be done in two separate places
function setupSurfacePath(path, object) {

  var strColor = "";
  var currBody = ops.bodyCatalog.find(o => o.Body === object.name);
  if (object.isVessel) strColor = orbitColors[object.type];
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
    if (timePopup) ops.surface.map.closePopup(timePopup);
    timePopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
    timePopup.setLatLng(e.latlng);
    var obj = bodyPaths.paths.find(o => o.name === e.target._myId);
    var strTimeDate = UTtoDateTime(obj.obtData.startUT + getDataPointObject(obj.obtData, e.latlng));
    timePopup.setContent("<center>" + strTimeDate.split("@")[0] + "<br>" + strTimeDate.split("@")[1] + " UTC</center>");
    timePopup.openOn(ops.surface.map);
  });
  
  // remove the mouseover popup
  srfTrack.on('mouseout', function(e) {
    if (timePopup) ops.surface.map.closePopup(timePopup);
    timePopup = null;
  });
  
  // when clicking along this line, find the nearest data point to display for the user
  srfTrack.on('click', function(e) {
    ops.surface.map.closePopup(timePopup);
    timePopup = null;
    var obj = bodyPaths.paths.find(o => o.name === e.target._myId);
    var index = getDataPointObject(obj.obtData, e.latlng);
    var cardinal = getLatLngCompass(obj.obtData.orbit[index].latlng);
      
    // compose the popup HTML and place it on the cursor location then display it
    vesselPositionPopup.setLatLng(obj.obtData.orbit[index].latlng);
    if (obj.isVessel) var strName = ops.activeVessels.find(o => o.db === e.target._myId).name;
    else var strName = obj.name;
    vesselPositionPopup.setContent("<h2>" + strName + "</h2>" + UTtoDateTime(obj.obtData.startUT + index) + ' UTC<br>Latitude: ' + numeral(obj.obtData.orbit[index].latlng.lat).format('0.0000') + '&deg;' + cardinal.lat + '<br>Longitude: ' + numeral(obj.obtData.orbit[index].latlng.lng).format('0.0000') + '&deg;' + cardinal.lng + '<br>Altitude: ' + numeral(obj.obtData.orbit[index].alt).format('0,0.000') + " km<br>Velocity: " + numeral(obj.obtData.orbit[index].vel).format('0,0.000') + " km/s");
    vesselPositionPopup.openOn(ops.surface.map);
  });
  
  return srfTrack;
}

// store orbital data for active vessels drawn on the map surface
function loadVesselOrbitAJAX(xhttp, data) {
  var currObj = bodyPaths.paths.find(o => o.name === data.name);
  if (xhttp.responseText.split("*")[1].split("|")[0] != "null") {
    var orbitData = rsToObj(xhttp.responseText.split("*")[1].split("|")[0])
    currObj.orbit.Arg = orbitData.Arg;
    currObj.orbit.Eccentricity = orbitData.Eccentricity;
    currObj.orbit.Eph = orbitData.Eph;
    currObj.orbit.Inclination = orbitData.Inclination;
    currObj.orbit.OrbitalPeriod = orbitData.OrbitalPeriod;
    currObj.orbit.RAAN = orbitData.RAAN;
    currObj.orbit.SMA = orbitData.SMA;
    currObj.orbit.TrueAnom = orbitData.TrueAnom;
  } else {
    currObj.orbit = null;
    currObj.isCalculated = true;
  }
  currObj.isLoaded = true;
  calculateSurfaceTracks(data.name, data.type);
}

// determines if a flight is currently active and adjusts the map accordingly
function inFlight(fltPath) {

  // if the track has a start time prior to and end time later than the current time, find the time closest to it
  if (fltPath.fltData[0].UT < currUT(true) && fltPath.fltData[fltPath.fltData.length-1].UT > currUT(true)) {
    for (dataIndex=0; dataIndex<fltPath.fltData.length; dataIndex++) {
      if (fltPath.fltData[dataIndex].UT > currUT(true)) {

        // if there is more than one layer we need to find the layer that holds the coordinates
        var fltLayer;
        if (Object.keys(fltPath.Layer._layers).length > 1) {
          Object.values(fltPath.Layer._layers).forEach(function(item) {
            if (item._bounds.contains([fltPath.fltData[dataIndex].Lat,fltPath.fltData[dataIndex].Lng])) fltLayer = item;
          });
        } else fltLayer = Object.values(fltPath.Layer._layers)[0];

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
    if (Math.abs(fltPaths[indexFlt].fltData[index].Lat - e.latlng.lat) < margin && Math.abs(fltPaths[indexFlt].fltData[index].Lng - e.latlng.lng) < margin) break;
    index++;
    
    // be sure to account for running to the end of the array
    if (index >= fltPaths[indexFlt].fltData.length) {
      index = parseInt(idStr[0]);
      margin += 0.1;
    }
    if (margin > 5) break;
  }
  currentFlightTimelineIndex = index;

  // compose the popup HTML and place it on the cursor location then display it
  var cardinal = getLatLngCompass({lat: fltPaths[indexFlt].fltData[index].Lat, lng: fltPaths[indexFlt].fltData[index].Lng});
  if (timePopup) ops.surface.map.closePopup(timePopup); 
  timePopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
  timePopup.setLatLng(e.latlng);
  timePopup.setContent(UTtoDateTime(fltPaths[indexFlt].fltData[index].UT) + ' UTC<br>Latitude: ' + numeral(fltPaths[indexFlt].fltData[index].Lat).format('0.0000') + '&deg;' + cardinal.lat + '<br>Longitude: ' + numeral(fltPaths[indexFlt].fltData[index].Lng).format('0.0000') + '&deg;' + cardinal.lng + '<br>Altitude ASL: ' + numeral(fltPaths[indexFlt].fltData[index].ASL/1000).format('0,0.000') + ' km<br>Altitude AGL: ' + numeral(fltPaths[indexFlt].fltData[index].AGL/1000).format('0,0.000') + " km<br>Velocity: " + numeral(fltPaths[indexFlt].fltData[index].Spd).format('0,0.000') + " m/s" + '<br>Distance from KSC: ' + numeral(fltPaths[indexFlt].fltData[index].Dist/1000).format('0,0.000') + " km<p>Click for additional options</p>");
  timePopup.openOn(ops.surface.map);
}