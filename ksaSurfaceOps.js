function loadMap() {

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

  // load the default satellite/aerial layer for Kerbin
  var layerControl = L.control.groupedLayers().addTo(surfaceMap);
  layerControl.addBaseLayer(
    L.KSP.tileLayer(L.KSP.TileLayer.TYPE_SATELLITE,
      L.KSP.TileLayer.DEFAULT_URL,
      L.KSP.CRS.EPSG4326, {
        body: "kerbin",
        style: "sat"
      }
    ).addTo(surfaceMap), "Aerial");

  // add the legend control to the map - will be automatically displayed by activating a base layer that uses it
  surfaceMap.addControl(new L.KSP.Control.Legend());
  
  // hide map controls after 3 seconds if the user cursor isn't over the map
  // also set up future show/hide events
  setTimeout(function() {
    if (!$('#map').is(":hover")) { 
      $(".leaflet-control-info").fadeOut();
      $(".leaflet-control-zoom").fadeOut();
      $(".leaflet-control-layers").fadeOut();
      $(".easy-button-button").fadeOut();
    }

    // touchscreens don't register the cursor location, so only show location data if this isn't a touchscreen
    // leaflet.js was modified to remove the biome, slope and elevation data displays
    // show controls only when the cursor is over the map
    if (!is_touch_device()) { 
      infoControl = new L.KSP.Control.Info({
          elevInfo: false,
          biomeInfo: false,
          slopeInfo: false
        });
      surfaceMap.addControl(infoControl);
      $(".leaflet-control-info").css("display", "none");
      surfaceMap.on('mouseover', function(e) {
        $(".leaflet-control-info").fadeIn();
        $(".leaflet-control-zoom").fadeIn();
        $(".leaflet-control-layers").fadeIn();
        $(".easy-button-button").fadeIn();
      });
      surfaceMap.on('mouseout', function(e) {
        $(".leaflet-control-info").fadeOut();
        $(".leaflet-control-zoom").fadeOut();
        $(".leaflet-control-layers").fadeOut();
        $(".easy-button-button").fadeOut();
      });
    }
  }, 3000);

  // no idea why but doing this makes it work better for when loading straight to the map in the body view
  setTimeout(function() {
    if (pageType != "vessel") {
      $("#map").css("height", "885px");
      surfaceMap.invalidateSize();
      $("#map").fadeOut();
    }
  }, 250);
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
  }
}
function removeMapResizeButton() {
  if (mapResizeButton) {
    surfaceMap.removeControl(mapResizeButton);
    mapResizeButton = null;
  }
}

function addMapCloseButton() {
  if (!mapCloseButton) {
    mapCloseButton = L.easyButton({
      states: [{
        stateName: 'raise',
        icon: 'fa-window-close',
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
  removeMapResizeButton()
  addMapCloseButton();
}

function hideMap() {
  $("#map").fadeOut();
  $("#figureOptions").fadeIn();
  $("#vesselOrbitTypes").fadeIn();
  $("#figure").fadeIn();
}