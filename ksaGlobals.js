// ==============================================================================
// KSA Operations Tracker - Global State Management
// ==============================================================================
// This file contains the centralized state management for the operations tracker.
// While consolidating into a single 'ops' object, additional cleanup and 
// modularization is recommended for long-term maintainability.
// ==============================================================================

// ------------------------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------------------------
const KSA_CONSTANTS = {
  // Time constants
  FOUNDING_MOMENT: luxon.DateTime.fromISO("2016-09-13T04:00:00-00:00", { setZone: true }),
  MS_FROM_1970_TO_KSA_FOUNDING: 1473739200000,
  
  // UI constants
  DEFAULT_MAX_MENU_HEIGHT: 340,
  
  // Map constants
  NO_MARK_BOX_BOUNDS: {
    northEast: { lat: 0.1978, lng: -74.8389 },
    southWest: { lat: -0.3516, lng: -74.2896 }
  },
  
  // Timing constants
  TIMEOUTS: {
    MAP_DIALOG_DELAY: 50,
    DECLUTTER_DELAY: 5000,
    MAP_MARKER_TIMEOUT: 100,
    VESSEL_IMG_UPDATE: 150,
    FLIGHT_TIMELINE_UPDATE: 1000
  },
  
  // Popup offsets
  POPUP_OFFSETS: {
    VESSEL_POSITION: { x: 0, y: -1 },
    FLIGHT_POSITION: { x: 0, y: -1 }
  }
};

// ------------------------------------------------------------------------------
// MAIN STATE OBJECT
// ------------------------------------------------------------------------------
// This structure contains all data that needs to be easily accessed for 
// debugging and runtime operations
var ops = {
  clock: new Date(),      // saves the time at which the page was loaded
  UT: null,               // assigned the current time on page load then used with currUT() to get the current time
  tickDelta: 0,           // number of ms since the page was loaded
  
  pageType: null,         // defines the type of data being shown - body, vessel, crew or crewFull for the entire roster. set only by swapContent() whenever a page type change is needed
  twitterSource: null,    // used in swapTwitterSource() to remember the current source of the twitter feed
  lastVisit: null,        // time of the user's last visit to badge new updates since then

  maxMenuHeight: KSA_CONSTANTS.DEFAULT_MAX_MENU_HEIGHT,  // default value for the menu on page load, changed dynamically based on contents of event box or menu resize

  vesselsToLoad: [],      // uses extractIDs() to hold the ids of all the vessels in the current SOI that need to have GGB orbits rendered & loads them
  updatesList: [],        // all the updates to various vessels, crew and events that will happen next while the page is loaded
  updateData: [],         // precaches new data on all crew and vessels that are active and have updates that could occur while the page is loaded
  craftsMenu: [],         // holds all data for displaying vessels in the menu
                            // badged - bool
                            // bodyRef - current SOI
                            // db - db name
                            // end - mission end UT
                            // name - vessel proper name to use in menu
                            // program - program name
                            // soi - full string of SOI field from record
                            // start - mission start UT or current SOI time if omitted
                            // type - named vessel type
                            // vessel - name of vessel for sorting
  crewMenu: [],           // holds all data for displaying crew in the menu
                            // assignment - from record field
                            // badged - bool
                            // db - db name
                            // name - from record field
                            // rank - from record field
                            // status - from record field
                            // UT - last update
  activeVessels: [],      // lists all active vessel db name for quick reference so entire 100s-long vessel catalog does not need to be searched
  bodyCatalog: [],        // hold properties information on all the bodies in the solar system from the Catalog DB
  ggbOrbits: [],          // stores trajectory information & visibility for orbits added to GGB after load
                            // id - ggb figure identifier
                            // type - "body" or named vessel type
                            // isHidden - bool
                            // isSelected - bool
                            // showName - bool
                            // showNodes - bool

  currentVesselPlot: {},  // structure of the paths and markers for the surface map orbital plot of the current vessel
                            // data: []   all the orbital paths for the vessel
                            // events: {} all the pe, ap, etc events along the plot with markers
                            // id         the vessel id
                            // eph        the time this orbital data is valid
  currentCrew: {},        // data for the last-viewed crew member at UT of that viewing
                            // Background: {}   all Crew table record fields from Catalog DB
                            // History: {}      all Background table record fields from Crew DB
                            // Missions: {}     all Missions table records from Crew DB
                            // Ribbons: {}      all Ribbons table records from Crew DB
                            // Stats: {}        all Kerbal Stats table record fields from Crew DB
  currentVessel: {},      // data for the last-viewed vessel at last-selected UT
                            // Catalog: {}            all Crafts table record fields from Catalog DB for this vessel
                            // Comms: {}              all Comms table record fields from Vessel DB along with
                              // NotNull                - whether to hide or show comms (loaded from AJAX)
                            // CraftData: {}          all Craft Data table record fields from Vessel DB along with
                              // pastEvent              - whether the current loaded event was from a UT before the current time
                              // prevContent            - what was loaded from the last update to prevent unecessary refreshes
                              // prevEph                - what was the orbital timestamp from the last update to trigger new calculations
                            // History: []            all records from Craft Data table UT & CraftDescTitle fields from Vessel DB
                            // LaunchTimes: []        all records from Launch Times table from Vessel DB
                            // Manifest: {}           all Manifest table fields from Vessel DB
                            // Orbit: {}              all Flight Data table record fields from Vessel DB
                            // OrbitalHistory: []     UT & period for all Flight Data records in Vessel DB
                            // Ports: {}              all Ports table record fields from Vessel DB
                            //Resources: {}           all Resources table record fields from Vessel DB plus
                              // resIndex               - current position in the fore/back listing of resources of a vessel
                              // resHTML                - tooltip for "Resources" text to check for diff
                              // NotNull                - whether to hide or show resources (loaded from AJAX)
                            // AscentData: []         all records from AscentData table from Vessel DB

  activeAscentFrame: {},  // contains the ascentData element for the current second of time being interpolated
  ascentData: {           // contains the ascent data loaded independent of the vessel so it only needs to be done once
    vessel: "",             // vessel this data belongs to
    active: false,          // whether or not the current time falls between the start/end times of the ascent
    isPaused: false,        // for archival playback, whether it is paused or not
    telemetry: []           // the second-by-second data for the ascent
  },
  surface: {              // contains anything related to the surface map
    map: null,                    // leaflet object reference
    Data: {},                     // contains record fields for the current UT from the Maps DB of the current body
    layerControl: null,           // contains the instance of the Leaflet layer control that shows various map markers and paths
    isLoading: false,             // whether an ajax call to load map data is awaiting a response or not
    loadingLayer: L.layerGroup()  // general message in layers box that new map data is being requested
  }
}

// nullify these objects until they are loaded
ops.currentCrew = null;
ops.currentVessel = null;
ops.currentVesselPlot = null;
ops.surface.Data = null;

// ------------------------------------------------------------------------------
// UI STATE MODULE
// ------------------------------------------------------------------------------
const KSA_UI_STATE = {
  // Content & view states
  isContentMoving: false,           // whether the surface map is being resized in the vessel view
  isMapShown: false,                // whether the surface map is shown or not
  isMapFullscreen: false,           // whether the map has been sized fullscreen or not
  isAscentPaused: false,            // whether the ascent data playback is paused or not
  isDirty: false,                   // tells the GGB figure that is loaded underneath a vessel to refresh
  isOrbitRenderCancelled: false,    // whether the Cancel button was clicked to stop orbital calculation early
  isVesObtRenderTerminated: false,  // whether the orbital calc was stopped due to changing a vessel or view
  isSfcObtRenderTerminated: false,  // whether the surface orbital calc was stopped due to changing a body
  isLivePastUT: false,              // whether the page was loaded with &live param to auto-update from a past UT
  optUpdateInterrupt: null,         // the state of the optional update interrupt checkbox
  
  // Loading states
  isMenuDataLoaded: false,       // when all the menu data has been loaded from AJAX
  isMenuSorted: false,           // when the menu has completed initial sorting
  isGGBAppletLoaded: false,      // when the GGB figure is ready to be displayed and updated
  isGGBAppletRefreshing: false,  // when the GGB figure is still loading any additional vessel orbits
  dataLoadQueue: [],             // holds urls of multiple AJAX data loads for debug and load checks
  
  // Menu state
  menuSaveSelected: null,        // saves the id of menu item that was last clicked on
  
  // Visual indices
  vesselRotationIndex: 0,        // current rotation angle of the vessel if its static image can be spun [currently unused]
  ascentColorsIndex: -1          // current color to use for plotting the ascent path
};

// ------------------------------------------------------------------------------
// TIMEOUT/INTERVAL HANDLES MODULE
// ------------------------------------------------------------------------------
const KSA_TIMERS = {
  mapDialogDelay: null,          // timeout handle to prevent the map dialog from showing if view switched
  timeoutHandle: null,           // ensures the GGB figure does not declutter too fast
  launchRefreshTimeout: null,    // cancel auto event refresh if update done while running
  maneuverRefreshTimeout: null,  // cancel auto event refresh if update done while running
  mapMarkerTimeout: null,        // ensures the 5s timer to declutter map is reset if new vessel loaded
  interpStart: null,             // ensures that ascent data interpolation sticks to the defined FPS
  flightTimelineInterval: null,  // handle for automatically updating the flight timeline data popup
  vesselImgTimeout: null,        // handle for updating the caption of the vessel image
  ascentInterpTimeout: null,     // timer that maintains ascent interpolation FPS
  tickTimer: null,               // main tick timer handle for interrupting the tick loop
  rapidFireTimer: null,          // timer for detecting 750ms hold on time advance controls
  menuRefresh: null,             // timer handle to make sure we don't stack multiple menu refreshes
  bodyLoadTimeout: null          // timer handle to wait for body load before proceeding with vessel load
};

// ------------------------------------------------------------------------------
// LEAFLET UI COMPONENTS MODULE
// ------------------------------------------------------------------------------
const KSA_MAP_CONTROLS = {
  // Leaflet UI button instances
  mapResizeButton: null,   // button for resizing the map (in vessel view)
  mapViewButton: null,     // button for switching from vessel map to surface map
  mapRefreshButton: null,  // button for reloading orbital trajectory data
  mapCloseButton: null,    // button for closing the surface map
  
  // Marker instances
  launchsiteMarker: null,  // marker for launch site
  vesselMarker: null,      // marker for vessel icon
  sunMarker: null,         // marker for sun position
  
  // Popup instances
  vesselPositionPopup: L.popup({
    offset: new L.Point(KSA_CONSTANTS.POPUP_OFFSETS.VESSEL_POSITION.x, 
                        KSA_CONSTANTS.POPUP_OFFSETS.VESSEL_POSITION.y),
    autoClose: false
  }),
  flightPositionPopup: L.popup({
    offset: new L.Point(KSA_CONSTANTS.POPUP_OFFSETS.FLIGHT_POSITION.x,
                        KSA_CONSTANTS.POPUP_OFFSETS.FLIGHT_POSITION.y),
    autoClose: false,
    maxWidth: 500
  }),
  ascentPopup: null,       // mouseover popup for ascent path and marker information
  timePopup: null,         // popup holding lat/lng/lt/spd and time information
  
  // Geometry objects
  terminator: null,        // surface map polygon that shapes the terminator
  vesselHorizon: {         // circle objects for vessel's view horizon
    vessel: null           // there used to be circles for polar and equatorial horizons too before switching to geodesic calculation
  },
  
  // Leaflet bounds
  noMarkBox: L.latLngBounds(
    L.latLng(KSA_CONSTANTS.NO_MARK_BOX_BOUNDS.northEast.lat, 
             KSA_CONSTANTS.NO_MARK_BOX_BOUNDS.northEast.lng),
    L.latLng(KSA_CONSTANTS.NO_MARK_BOX_BOUNDS.southWest.lat,
             KSA_CONSTANTS.NO_MARK_BOX_BOUNDS.southWest.lng)
  )
};

// ------------------------------------------------------------------------------
// MAP ICONS MODULE
// ------------------------------------------------------------------------------
const KSA_MAP_ICONS = {
  POIIcon: null,
  anomalyIcon: null,
  sunIcon: null,
  apIcon: null,
  peIcon: null,
  soiEntryIcon: null,
  soiExitIcon: null,
  nodeIcon: null,
  vesselIcon: null,
  flagIcon: null,
  labelIcon: null,
  airportIcon: null,
  omniIcon: null,
  dishIcon: null
};

// ------------------------------------------------------------------------------
// CALCULATION & TRACKING MODULE
// ------------------------------------------------------------------------------
const KSA_CALCULATIONS = {
  // Orbit calculations
  obtDataCalcVes: {
    isVessel: true,       // whether calculating for a vessel or surface path
    UT: null,             // current time of the orbital calculation
    obt: []               // lat/lng/alt/spd points for current calculated vessel trajectory
  },              
  obtDataCalcSfc: {
    isVessel: false,      // whether calculating for a vessel or surface path
    UT: null,             // current time of the orbital calculation
    obt: []               // lat/lng/alt/spd points for current calculated surface trajectory
  },
  
  // Flight tracking
  currentFlightIndex: null,        // index of path in fltPaths corresponding to clicked path
  currentFlightTimelineIndex: null,// last hovered-over index in flight path
  strPausedVesselCalculation: null,// id of vessel unloaded during orbital calculation
  strFltTrackLoading: null,        // id of flight track currently loading new body data
  
  // Event tracking
  strCurrentLaunchVessel: null,    // id of vessel next to launch
  strCurrentManeuverVessel: null,  // id of vessel next to maneuver
  launchCountdown: "null",         // UT of next launch
  maneuverCountdown: "null",       // UT of next maneuver
  strActiveAscent: "",             // id of vessel currently undergoing live ascent
  strTinyBodyLabel: "",            // id of body clicked to show its label
  
  // Load tracking
  flightsToLoad: null              // ids of multiple URL params of &flt to load
};

// ------------------------------------------------------------------------------
// DATA CATALOGS MODULE
// ------------------------------------------------------------------------------
const KSA_CATALOGS = {
  partsCatalog: [],     // info on all parts loaded from catalog db
  crewList: [],         // list of ids for all active crew members
  fltPaths: [],         // data for all aircraft flight paths loaded onto surface map
  ascentTracks: [],     // paths drawn for live ascent telemetry
  ascentMarks: [],      // marker instances for events along ascent paths
  
  bodyPaths: {          // ids of bodies needing orbits plotted & calculated paths
    bodyName: "",
    paths: [],
    layers: []
  }
};

// ------------------------------------------------------------------------------
// LAYER MANAGEMENT MODULE
// ------------------------------------------------------------------------------
const KSA_LAYERS = {
  // Ground Markers layer groups
  groundMarkers: {
    layerLabels: null,
    layerFlags: null,
    layerPOI: null,
    layerAnomalies: null,
    layerAirports: null,
    layerGroundStations: null,   // layer showing/hiding ground stations and vessel/body horizons
    layerSolar: null,            // layer group containing sun marker and terminator polygon
    layerPins: null              // layer showing/hiding custom pins on surface map
  },
  
  // Loading indicators for map layers
  surfaceTracksDataLoad: {
    obtTrackDataLoad: null,
    fltTrackDataLoad: null,
    vesselsTrackDataLoad: null,
    bodiesTrackDataLoad: null
  }
};

// ------------------------------------------------------------------------------
// COLOR SCHEMES MODULE
// ------------------------------------------------------------------------------
const KSA_COLORS = {
  // Orbit colors by vessel type
  orbitColors: {
    probe: "#FFD800",
    debris: "#ff0000",
    ship: "#0094FF",
    station: "#B200FF",
    asteroid: "#996633"
  },
  
  // Vessel orbit path colors (3 paths)
  vesselOrbitColors: [
    "#4CFF00",
    "#FFD800",
    "#FF0000"
  ],
  
  // Surface path colors (cycling through)
  surfacePathColors: [
    "#FFD800",
    "#FF0000",
    "#4CFF00",
    "#0026FF",
    "#00FFFF",
    "#B200FF",
    "#0094FF",
    "#4800FF",
    "#FF00DC",
    "#FF8EDD"
  ]
};

// ------------------------------------------------------------------------------
// SURFACE LOCATIONS MODULE
// ------------------------------------------------------------------------------
const KSA_LOCATIONS = {
  srfLocations: {
    KSC: [-0.0972, -74.5577]
  }
};

// ------------------------------------------------------------------------------
// BACKWARD COMPATIBILITY ALIASES
// ------------------------------------------------------------------------------
// All code has been refactored to use the new modular structure.
// The backward compatibility aliases have been removed.

// data from kerbalmaps.com for future surface base layer types
var mapElevationLegend = [
  { id: "Kerbin", Data: {
    "6800 m" : "#FFFFFF",
    "6000 m" : "#E6E1E1",
    "4000 m" : "#C39B87",
    "2000 m" : "#B97855",
    "1000 m" : "#B99B6E",
    "600 m" : "#5A825A",
    "200 m" : "#1E784B",
    "50 m" : "#0A6437",
    "0 m" : "#004120",
    "-500 m" : "#0F4B9B",
    "-100 m" : "#1E6E9B" } },
  { id: "Moho", Data: {
    "7000 m" : "#cdbea5",
    "6000 m" : "#a08773",
    "3000 m" : "#786455",
    "1500 m" : "#645046",
    "500 m" : "#4b3c32",
    "0 m" : "#322823" } },
  { id: "Eve", Data: {
    "7540 m" : "#000000",
    "6500 m" : "#0f0f1e",
    "6000 m" : "#1e1728",
    "3000 m" : "#2d1e37",
    "1500 m" : "#37283c",
    "500 m" : "#3c2841",
    "5 m" : "#4b3c55",
    "-5 m" : "#8c7d9b",
    "-500 m" : "#645573" } },
  { id: "Gilly", Data: {
    "6500 m" : "#b99b82",
    "4500 m" : "#a08273",
    "2500 m" : "#78695a",
    "1500 m" : "#554b41" } },
  { id: "Mun", Data: {
    "6700 m" : "#EBEBEB",
    "-70 m" : "#232323" } }
];
var mapBiomeLegend = [
  { id: "Kerbin", Data: {
    "Water" : "#00245E",
    "Shores" : "#B5D3D1",
    "Grasslands" : "#4BAC00",
    "Highlands" : "#1C7800",
    "Mountains" : "#824600",
    "Deserts" : "#CCB483",
    "Badlands" : "#FCD037",
    "Tundra" : "#89FA91",
    "Ice Caps" : "#FEFEFE" } },
  { id: "Mun", Data: {
    "Midlands" : "#737373",
    "Midland Craters" : "#4C3B4A",
    "Highlands" : "#ACACAC",
    "Highland Craters" : "#9E7FA3",
    "Poles" : "#65D4D9",
    "Polar Lowlands" : "#289C93",
    "Polar Crater" : "#2E2E63",
    "Northern Basin" : "#3A5B3B",
    "East Crater" : "#CFCF87",
    "Northwest Crater" : "#580707",
    "Southwest Crater" : "#B12D78",
    "Farside Crater" : "#63A53C",
    "East Farside Crater" : "#AA4848",
    "Twin Craters" : "#B3761A",
    "Canyons" : "#534600" } }
];

// icons defined for additional external information on vessels
var AddlResourceItems = [];
AddlResourceItems["Telemetry Data"] = "fa fa-table";
AddlResourceItems["Mission Report"] = "fab fa-twitter";
AddlResourceItems["Flight Analysis"] = "far fa-file";
AddlResourceItems["Launch Video"] = "fab fa-youtube";

// used to translate the JS date object month integer value to names
var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];