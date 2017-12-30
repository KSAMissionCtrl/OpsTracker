function initializeMap() {

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
  if (!is_touch_device()) { 
    surfaceMap.on('mouseover', function(e) {
      $(".leaflet-control-info").fadeIn();
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
      if (!infoControl && mapData) {
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
  
  // time to diverge based on which type of page is being used to look at the map
  renderMapData();
}

function renderMapData() {
  // check if we need to wait for the vessel to finish loading
  if (!currentVesselData && pageType == "vessel") { setTimeout(renderMapData, 250); return; }

  if (pageType == "vessel" && currentVesselData.Orbit) {
    layerControl._expand();
    layerControl.options.collapsed = false;
    
    // for some reason this doesn't actually add the layer during an intial page load
    if (!obtTrackDataLoad) {
      obtTrackDataLoad = L.layerGroup();
      layerControl.addOverlay(obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");
    }
    
    // if calculating 3 orbits would take longer than 100,000s we need to inform the user that this could take a while
    if ((currentVesselData.Orbit.OrbitalPeriod * 3) > 100000) {
      $("#mapDialog").dialog( "option", "buttons", [{
        text: "OK",
        click: function() { 
          obtRenderAmount = 100000;
          $("#mapDialog").dialog("close");
        }
      }]);
      $("#mapDialog").dialog( "option", "buttons", [{
        text: "Render Complete Orbit",
        click: function() { 
          obtRenderAmount = currentVesselData.Orbit.OrbitalPeriod;
          $("#mapDialog").dialog("close");
        }
      }]);
    }
    
    // calculate the data we need to render the orbits to the map
    isOrbitRenderCancelled = false;
    $("#mapDialog").dialog( "option", "buttons", [{
      text: "Cancel",
      click: function() { 
        isOrbitRenderCancelled = true;
        $("#mapDialog").dialog("close");
      }
    }]);
    $("#progressbar").progressbar("value", 50);
    $("#progressbar").fadeIn();
    $("#mapDialog").dialog("open");
    
    
    renderVesselOrbits();
  } else { 
    if (obtTrackDataLoad) layerControl.removeLayer(obtTrackDataLoad);
    if (srfTrackDataLoad) layerControl.removeLayer(srfTrackDataLoad);
    obtTrackDataLoad = null;
    srfTrackDataLoad = null;
    layerControl._collapse();
    layerControl.options.collapsed = true;
  }
}

function renderVesselOrbits(amount) {
//$("#infoDialog").dialog("option", "title", "R);
}

function renderBodyOrbits() {
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

