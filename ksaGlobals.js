// This is horrible and I DON'T CARE HAHAHAHAHAHAGAGAJABSVSAHCSAJHSG,JDVKWHBDWLEBD,EBDFKESNFL.JSCSDE;VDF

var UT;
var timeoutHandle;
var pageType;
var vesselPastUT;
var currentVesselData;
var currentCrewData;
var twitterSource;
var surfaceMap;
var mapResizeButton;
var mapViewButton;
var mapRefreshButton;
var mapCloseButton;
var launchsiteMarker;
var vesselMarker;
var mapMarkerTimeout;
var layerControl;
var infoControl;
var mapData;
var flagIcon;
var POIIcon;
var anomalyIcon;
var labelIcon;
var sunIcon;
var apIcon;
var peIcon;
var soiEntryIcon;
var soiExitIcon;
var nodeIcon;
var vesselIcon;
var numOrbitRenders;
var obtCalcUT;
var timePopup;
var currentVesselPlot;
var strPausedVesselCalculation;
var strCurrentBody;
var strCurrentSystem;
var strCurrentCrew;
var strCurrentLaunchVessel;
var strCurrentManeuverVessel;
var flightsToLoad;
var vesselsToLoad;
var launchCountdown;
var maneuverCountdown;
var clock = new Date();
var vesselPositionPopup = L.popup({offset: new L.Point(0,-1), closeButton: true, closeOnClick: false});
var flightPositionPopup = L.popup({offset: new L.Point(0,-1), closeButton: true, maxWidth: 500});
var obtTrackDataLoad = null;
var srfTrackDataLoad = null;
var fltTrackDataLoad = null;
var isGGBAppletLoaded = false;
var isMenuDataLoaded = false;
var isEventDataLoaded = false;
var isOrbitDataLoaded = false;
var isGGBAppletLoading = false;
var isDirty = false;
var isTipShow = false;
var isVesselUsingMap = true;
var isOrbitRenderCancelled = false;
var isContentMoving = false;
var isOrbitRenderTerminated = false;
var isNewUser = false;
var maxMenuHeight = 340;
var UTC = 4;
var tickDelta = 0;
var updatesListSize = 0;
var vesselRotationIndex = 0;
var planetLabels = [];
var nodes = [];
var nodesVisible = [];
var ggbOrbits = [];
var craftsMenu = [];
var crewMenu = [];
var distanceCatalog = [];
var bodyCatalog = [];
var partsCatalog = [];
var opsCatalog = [];
var orbitDataCalc = [];
var updatesList = [];
var crewList = [];
var fltPaths = [];
var strTinyBodyLabel = "";
var strCurrentVessel = "undefined";
var orbitColors = {
  probe: "#FFD800",
  debris: "#ff0000",
  ship: "#0094FF",
  station: "#B200FF",
  asteroid: "#996633"
};
var vesselOrbitColors = [
  "#4CFF00",
  "#FFD800",
  "#FF0000"
];
var surfacePathColors = [
  "#FF0000",
  "#FFD800",
  "#4CFF00",
  "#00FFFF",
  "#0094FF",
  "#0026FF",
  "#4800FF",
  "#B200FF",
  "#FF00DC",
  "#FF006E"
];
var srfLocations = {
  KSC: [-0.0972, -74.5577]
};
var mapElevationLegend = [
  { ID: "Kerbin", Data: {
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
  { ID: "Moho", Data: {
    "7000 m" : "#cdbea5",
    "6000 m" : "#a08773",
    "3000 m" : "#786455",
    "1500 m" : "#645046",
    "500 m" : "#4b3c32",
    "0 m" : "#322823" } },
  { ID: "Eve", Data: {
    "7540 m" : "#000000",
    "6500 m" : "#0f0f1e",
    "6000 m" : "#1e1728",
    "3000 m" : "#2d1e37",
    "1500 m" : "#37283c",
    "500 m" : "#3c2841",
    "5 m" : "#4b3c55",
    "-5 m" : "#8c7d9b",
    "-500 m" : "#645573" } },
  { ID: "Gilly", Data: {
    "6500 m" : "#b99b82",
    "4500 m" : "#a08273",
    "2500 m" : "#78695a",
    "1500 m" : "#554b41" } },
  { ID: "Mun", Data: {
    "6700 m" : "#EBEBEB",
    "-70 m" : "#232323" } }
];
var mapBiomeLegend = [
  { ID: "Kerbin", Data: {
    "Water" : "#00245E",
    "Shores" : "#B5D3D1",
    "Grasslands" : "#4BAC00",
    "Highlands" : "#1C7800",
    "Mountains" : "#824600",
    "Deserts" : "#CCB483",
    "Badlands" : "#FCD037",
    "Tundra" : "#89FA91",
    "Ice Caps" : "#FEFEFE" } },
  { ID: "Mun", Data: {
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
var AddlResourceItems = [];
AddlResourceItems["Telemetry Data"] = "fa fa-table";
AddlResourceItems["Mission Report"] = "fab fa-twitter";
AddlResourceItems["Flight Analysis"] = "far fa-file";
