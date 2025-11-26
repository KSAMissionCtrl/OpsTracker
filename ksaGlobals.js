// This is horrible and I DON'T CARE HAHAHAHAHAHAGAGAJABSVSAHCSAJHSG,JDVKWHBDWLEBD,EBDFKESNFL.JSCSDE;VDF

// this structure is all the data that needs to be easily accessed for debugging purposes
var ops = {
  clock: new Date(),      // saves the time at which the page was loaded
  UT: null,               // assigned the current time on page load then used with currUT() to get the current time
  UTC: 5,                 // time zone DST UTC offset, set at page load
  tickDelta: 0,           // number of seconds since the page was loaded
  
  pageType: null,         // defines the type of data being shown - body, vessel, crew or crewFull for the entire roster. set only by swapContent() whenever a page type change is needed
  twitterSource: null,    // used in swapTwitterSource() to remember the current source of the twitter feed

  maxMenuHeight: 340,     // default value for the menu on page load, changed dynamically based on contents of event box or menu resize
  updatesListSize: 0,     // the current size of the updatesList structure since it was last checked so any added items can be detected

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
                              // commsHTML              - tooltip for "Comms" text to check for diff
                              // NotNull                - whether to hide or show comms (loaded from AJAX)
                            // CraftData: {}          all Craft Data table record fields from Vessel DB along with
                              // pastEvent              - whether the current loaded event was from a UT before the current time
                              // prevContent            - what was loaded from the last update to prevent unecessary refreshes
                              // prevEph                - what was the orbital timestamp from the last update to trigger new calculations
                            // History: []            all records from Craft Data table UT & CraftDescTitle fields from Vessel DB
                            // LaunchTimes: []        all records from Launch Times table from Vessel DB
                            // Manifest: {}           all Manifest table fields from Vessel DB plus
                              // crewHTML               - check for diff
                            // Orbit: {}              all Flight Data table record fields from Vessel DB plus
                              // orbitalPeriodHTML      - tooltip for orbital period to check for diff
                              // velocityHTML           - tooltip for velocity to check for diff
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

// whether the surface map is being resized in the vessel view
var isContentMoving = false;

// timeout handle to prevent the map dialog from showing if the view is switched away before the timer ends
var mapDialogDelay;

// used to ensure the GGB figure does not declutter too fast - resets the 5s timer on each new GGB load if timer is running
var timeoutHandle;

// used to cancel auto event refresh events if an update is done while it is running
var launchRefreshTimeout = null;
var maneuverRefreshTimeout = null;

// contains the instance of the Leaflet UI button for resizing the map (in vessel view)
var mapResizeButton;

// contains the instance of the Leaflet UI button for switching from vessel map to just the surface map
var mapViewButton;

// contains the instance of the Leaflet UI button for reloading orbital trajectory data
var mapRefreshButton;

// contains the instance of the Leaflet UI button for closing the surface map to view the orbital display
var mapCloseButton;

// contains the instance of the marker object for a launch site
var launchsiteMarker;

// contains the instance of the marker object for a vessel icon
var vesselMarker;

// contains the instance of the marker object for the sun position
var sunMarker;

// ensures the 5s timmer to declutter the map is reset if a new vessel is loaded before the timer completes
var mapMarkerTimeout;

// NOT USED
// would have displayed data in a lower-left map box
var infoControl;

// icons for the various map markers - all just a single icon
var POIIcon;
var anomalyIcon;
var sunIcon;
var apIcon;
var peIcon;
var soiEntryIcon;
var soiExitIcon;
var nodeIcon;
var vesselIcon;
var flagIcon;
var labelIcon;

// how many orbits should be rendered onto the surface map for the current vessel
var numOrbitRenders;

// the starting time of the orbit to calculate
var obtCalcUT;

// contains the instance of the surface map popup holding lat/lng/lt/spd and time information when hovering over a path
var timePopup;

// saves the index of the path in fltPaths that corresponds to the one last clicked on to display additional data popup
var currentFlightIndex;

// saves the last hovered-over index in the flight path, which would also be the last point the user clicked
// it then serves as the starting point for moving back/fore in the timeline data popup
var currentFlightTimelineIndex;

// the id of the vessel that was unloaded during orbital calculation so it can be resumed if reloaded
var strPausedVesselCalculation;

// the id of the vessel the event calendar has found is next to launch
// make a property of bodies so it can be flagged as current
var strCurrentLaunchVessel;

// the id of the vessel the event calendar has found is next to maneuver
// make a property of bodies so it can be flagged as current
var strCurrentManeuverVessel;

// holds all ids of multiple URL params of &flt and loads them one at a time until all are done
var flightsToLoad;

// the UT of the next launch the event calendar is displaying
var launchCountdown;

// the UT of the next maneuver the event calendar is displaying
var maneuverCountdown;

// holds the instance of the surface map polygon that shapes the terminator
var terminator;

// ensures that ascent data interpolation sticks to the defined FPS
// add to ascent data structure
var interpStart;

// contains instance of leaflet popup for vessel data
var vesselPositionPopup = L.popup({offset: new L.Point(0,-1), autoClose: false});

// contains instance of leaflet popup for flight data
var flightPositionPopup = L.popup({offset: new L.Point(0,-1), autoClose: false, maxWidth: 500});

// defines the area around KSC where ascent trajectory path & markers should not be shown until vessel is further downrange
var noMarkBox = L.latLngBounds(L.latLng(0.1978, -74.8389), L.latLng(-0.3516, -74.2896));

// reference to the layer group that contains the terminator polygon
var layerSolar = L.layerGroup();

// saves the id of menu item that was last clicked on
var menuSaveSelected = null;

// handle of the interval() call to automatically update the flight timeline data popup
var flightTimelineInterval = null;

// handle for updating the caption of the vessel image
var vesselImgTimeout = null;

// handle to the timer that maintains ascent interpolation FPS so it can be cancelled when needed
// make a part of ascent structure
var ascentInterpTimeout = null;

// saves the id of the flight track currently loading new body data via ajax
var strFltTrackLoading = null;

// mouseover popup instance to show ascent path and marker information
var ascentPopup = null;

// instance of the layer object that shows/hides custom pins on the surface map
var layerPins = null;

// flags to tell when certain things have finished loading
var isMenuDataLoaded = false;
var isGGBAppletLoaded = false;      // when the GGB figure is ready to be displayed and updated
var isGGBAppletRefreshing = false;  // when the GGB figure is still loading any additional vessel orbits

// used to tell the GGB figure that is loaded underneath a vessel to refresh so labels are shown for a few seconds
var isDirty = false;

// NOT USED
var isTipShow = false;

// whether the Cancel button was clicked to stop orbital calculation early
var isOrbitRenderCancelled = false;

// whether the orbital calc was stopped due to changing a vessel or view
var isOrbitRenderTerminated = false;

// NOT USED
var isNewUser = false;

// whether the surface map is shown or not
var isMapShown = false;

// whether the map has been sized fullscreen or not
var isMapFullscreen = false;

// whether the ascent data playback is paused or not
var isAscentPaused = false;

// number of ms from 1970/01/01 to 2016/09/13 = 1473739200000
// used as a base when calculating time since KSA began
var foundingMoment = luxon.DateTime.fromISO("2016-09-13T04:00:00-00:00", { setZone: true });

// the current rotation angle of the vessel if its static image can be spun
var vesselRotationIndex = 0;

// current color to use for plotting the ascent path
var ascentColorsIndex = -1;

// NOT USED
var planetLabels = [];

// NOT USED?
// same definition as nodes for w2ui menu, but likely meant for node indicators on orbital display
var nodes = [];

// NOT USED
var nodesVisible = [];

// NOT USED
var distanceCatalog = [];

// holds info on all parts loaded from the catalog db
var partsCatalog = [];

// contains all the lat/lng/alt/spd points for the current calculated trajectory
var orbitDataCalc = [];

// holds list of ids for all active crew members so they can be shown in the full roster view
var crewList = [];

// contains data for all aircraft flight paths loaded onto the surface map
var fltPaths = [];

// NOT USED
var vesselPaths = [];

// contains the paths that are drawn out for live ascent telemetry
var ascentTracks = [];

// contains the instances of markers that mark events along the ascent paths
var ascentMarks = [];

// stores id of the body that was clicked on to show its label and identify its position because its too small to see easily
var strTinyBodyLabel = "";

// holds the id of the vessel that is currently undergoing a live ascent
// make a property of bodies so it can be flagged as current
var strActiveAscent = "";

// contains the instances of the circle objects for a vessel's view horizon of the body
var vesselHorizon = {
  vessel: null,
  eastWest: null,
  northSouth: null
};

// contains the ids of bodies that need orbits plotted for the surface map and also the paths calculated for the body
var bodyPaths = {
  bodyName: "",
  paths: [],
  layers: []
};

// defines the color of the surface path or GGB orbit that associates with a type of vessel
var orbitColors = {
  probe: "#FFD800",
  debris: "#ff0000",
  ship: "#0094FF",
  station: "#B200FF",
  asteroid: "#996633"
};

// holds instances of the leaflet layer that defines a spinning load icon for a specific map layer
// used to check also if a layer is still loading data via checkDataLoad()
var surfaceTracksDataLoad = {
  obtTrackDataLoad: null,
  fltTrackDataLoad: null,
  vesselsTrackDataLoad: null,
  bodiesTrackDataLoad: null
};

// the colors of the 3 surface paths that can be rendered for a vessel in orbit
var vesselOrbitColors = [
  "#4CFF00",
  "#FFD800",
  "#FF0000"
];

// the colors that are cycled through when rendering ascent phases or aircraft paths on the surface map
var surfacePathColors = [
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
];

//  pre-defined points on the surface that can be used for reference
var srfLocations = {
  KSC: [-0.0972, -74.5577]
};

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