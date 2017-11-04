# KSA Operations Tracker
A means of dynamically displaying information online for vessels, bodies and crew in Kerbal Space Program

The following KSP mods/apps are used to provide the data the Operations Tracker requires:

* [KSPTOT](http://forum.kerbalspaceprogram.com/threads/36476-WIN-KSP-Trajectory-Optimization-Tool-v0-12-2-Mission-Architect-Update!)
* [Final Frontier](http://forum.kerbalspaceprogram.com/threads/67246)
* [VOID](http://forum.kerbalspaceprogram.com/threads/54533-0-23-VOID-Vessel-Orbital-Informational-Display)
* [FAR](http://forum.kerbalspaceprogram.com/threads/20451-0-23-Ferram-Aerospace-Research-v0-12-5-2-Aero-Fixes-For-Planes-Rockets-1-7-14)
* [kOS](https://github.com/KSP-KOS/KOS)

The following JavaScript libraries are used:

* [Leaflet](http://leafletjs.com/)
* [Leaflet.KSP](https://github.com/saik0/Leaflet.KSP)
* [Sylvester](http://sylvester.jcoglan.com/)
* [Leaflet.Label](https://github.com/Leaflet/Leaflet.label)
* [Numeral](http://numeraljs.com/)
* [Tipped](http://www.tippedjs.com/)
* [Codebird](https://github.com/jublonet/codebird-js)
* [Spin.js](http://fgnass.github.io/spin.js/)
* [Rrose](http://erictheise.github.io/rrose/)
* [Leaflet.Fullscreen](https://github.com/brunob/leaflet.fullscreen)
* [Leaflet.GroupedLayerControl](https://github.com/ismyrnow/Leaflet.groupedlayercontrol)
* [GeoGebra](https://wiki.geogebra.org/en/Reference:JavaScript)
* [JQuery UI](https://jqueryui.com/)
* [w2ui sidebar](http://w2ui.com/web/demo/sidebar)

Blank template MDB Access files are included.

### Known Issues

- **Operations Tracker is currently in active development, so visiting the page may cause browser errors, failures to load, etc. However after it has been worked on it is usually left in a workable state**

### Future Fixes/Changes/Additions

* [FT] New sat/terrain/biome maps for OPM
* [FT] Updated biome maps for stock planets
* [FT] Ground tracking for rovers. Resolution of movement dependent on whether max zoom level can be increased
* [FT] 2-3 additional zoom levels for dynamic map
* [FT] Allow surface maps for gas giants just for the sake of vessel/moon plotting
* [FT] note the number of crew aboard and use that to calculate in real-time the remaining duration for any included life support resources (need to decide what life support system to use first - USI or TAC)
* [FT/CR] back-end interface that allows creation/modification of records through the website when detecting the missionctrl cookie for updating craft and crew databases
* [FT/CR] [push notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)?
* [FT] [Animate rover tracks](https://github.com/IvanSanchez/Leaflet.Polyline.SnakeAnim)? (for drawing old drive paths upon page load, not as a means to do "live" pathing)
* [FT] Be able to tell if a trajectory intercepting the atmosphere is an aerobrake or re-entry
* [FT] Detect trajectories that hit the surface on airless bodies and show a landing mark
* [FT] Fix issues with Sketchfab model support (button display for new hoverbox behavior, start/stop on show/hide)
* [FT] Multiple thruster/engine images to account for image of current craft rotation position
* [FT] Proper terminator display taking orbital inclination into account ([Leaflet.Curve](https://github.com/elfalem/Leaflet.curve)) - can possiblt adapt [ScanSat code](https://forum.kerbalspaceprogram.com/index.php?/topic/87351-ksp-130-scansat-v179-dev-version-june-28-2017/&do=findComment&comment=2993781)
* [FT/CR] Communicate with the website to display update badges on the menu items for Flight Tracker and Crew Roster
* [CR] when hovering over a ribbon, clicking will show previous types of that ribbon below the current one earned so ppl can hover over them for dates and info. Moving mouse off will hide them. Border needed around them or they will just seem to replace any other ribbons below
* [FT] Playback controls for ground track data. Include in popup windows to let ppl jump to beginning or end of track and see a real-time update of data (center popup, move along track)
* [FT] Allow download of aircraft flight data in spreadsheet form via the More Info pop-up
* [FT] Upgrade to the latest version of Leaflet using a [new maps library](https://gitlab.com/IvanSanchez/Leaflet.Kerbal)
* [CR] Reverse-order mission listing so newest is at top
* [FT] Hyperbolic orbit rendering in GeoGebra figures

### Change Log

**v1.00** (TBD)   
(all major fixes/changes/additions listed are based on v4.12 of the [Flight Tracker](https://github.com/KSAMissionCtrl/FlightTracker#change-log))

Fixes:
  - Body info window now displays body mass properly
  - Clock displayed on the page is now accurate to the second rather than being anywhere from 40-90s slow
  - The shift to/from DST is now handled properly so times for events are all shown to the proper local and UTC values
  - Clock adjusts to no longer be one second off after page load is complete

Changes:
  - All pages unified into a single page that can dynamically adjust its content to display information on crew, vessels or bodies. This means the page can reload parts of itself independently rather than needing to reload the entire page when a small amount of information needs to be updated
  - Clicking on spacecraft no longer brings up an information window, but instead pulls up its detailed information view
  - Clicking on the orbit of a spacecraft is used to show its name along with its nodes
  - Menu items no longer show tooltip discriptions of the vessels/crew
  - Menu now shows crew and vessels at the same time
  - Body info window can be repositioned and updates if a new planet is selected, but if it is closed it opens up again in the default position
  - Clicking on a moon in the menu will load the figure of the planetary system in which it resides
  - Inactive Vessels are organized into folders sorted by year descending and then month ascending
  - Active Vessels are listed in alphabetical order
  - The twitter stream shown can be changed in some instances to view only tweets relevant to the mission/vessel/crew member

Additions:
  - When viewing a system that has vessels in orbit, they are dynamically loaded and added to the GeoGebra figure
  - Can show/hide the orbits of various types of vessels
