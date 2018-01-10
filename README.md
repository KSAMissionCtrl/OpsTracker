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
* [Leaflet.EasyButton](https://github.com/CliffCloud/Leaflet.EasyButton)
* [Font Awesome](http://fontawesome.io/icons/)

### Known Issues

- **Operations Tracker is currently in active development, so visiting the page may cause browser errors, failures to load, etc. However after it has been worked on it is left in a usable state**
- Leaflet map can be finicky in a number of ways - most notably it doesn't mousewheel zoom centered on the cursor and can sometimes load showing off the edge of the map or refuse to load tiles. Generally can be fixed by upsizing/downsizing or going fullscreen
- Leaflet map tiles can load slowly or not fully. If any grey tiles appear, changing zoom levels up/down and back again will display cached tiles and force a reload for any missing tiles
- The downsized default map view for vessel pages does not interpret coordinates properly, so the info control is disabled as well as some features, but everything works fine if you size up the map view
- In rare instances the menu will fail to load properly on initial page load. A full refresh (Ctrl+F5) seems to fix it every time
- Collapsing/Expanding the [Operations Menu](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation) can sometimes cause the entire area to go blank the next time something in it is clicked on

### Future Fixes/Changes/Additions

* New sat/terrain/biome maps for OPM
* Updated biome maps for stock planets
* Ground tracking for rovers. Resolution of movement dependent on whether max zoom level can be increased
* 2-3 additional zoom levels for dynamic map
* Allow surface maps for gas giants just for the sake of vessel/moon plotting
* note the number of crew aboard and use that to calculate in real-time the remaining duration for any included life support resources (need to decide what life support system to use first - USI or TAC)
* back-end interface that allows creation/modification of records through the website when detecting the missionctrl cookie for updating craft and crew databases
* [push notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)?
* [Animate rover tracks](https://github.com/IvanSanchez/Leaflet.Polyline.SnakeAnim)? (for drawing old drive paths upon page load, not as a means to do "live" pathing)
* Be able to tell if a trajectory intercepting the atmosphere is an aerobrake or re-entry
* Detect trajectories that hit the surface on airless bodies and show a landing mark
* Proper terminator display taking orbital inclination into account ([Leaflet.Curve](https://github.com/elfalem/Leaflet.curve)) - can possibly adapt [ScanSat code](https://forum.kerbalspaceprogram.com/index.php?/topic/87351-ksp-130-scansat-v179-dev-version-june-28-2017/&do=findComment&comment=2993781)
* Communicate with the website to display update badges on the menu items for Flight Tracker and Crew Roster
* Playback controls for aircraft ground track data. Include in popup windows to let ppl jump to beginning or end of track and see a real-time update of data (center popup, move along track)
* Allow download of aircraft flight data in spreadsheet form via the More Info pop-up
* Upgrade to the latest version of Leaflet using a [new maps library](https://gitlab.com/IvanSanchez/Leaflet.Kerbal)
* Hyperbolic orbit rendering in GeoGebra figures

### Change Log

Versioning Key (v#1.#2.#3): #1=New features #2=Changes to existing features #3=Fixes to existing features

**v1.1.1** (1/9/18)

Fixes:
  - When collapsing the menu the current selection is scrolled back into view
  - [Vessel Details](Vessel Details) now give the option to see more information about a future upcoming event in the Mission History navigation dropdown
  - [Events Calendar](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) now properly swaps the page content without reloading instead of linking to an entirely new page when selecting the vessel displayed
  - The [Twitter Feed](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Twitter-Feed) could be hidden in some instances and not re-shown on page load
  - Additional Resources in the Vessel Details now properly links to each resource and loads it in a new tab

**v1.1.0** (1/9/18)

Fixes:
  - found some more strings that were being compared to numbers without first being converted into numbers themselves
  - `loadVessel()` was using a local variable named the same as a global and changed the name to avoid confusino

Changes:
  - [Events Calendar](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) and [Operations Menu](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation) have been linked to update events so they provide new data when it is available for vessels. The Events Calendar updating is pretty obvious, but for items in the Operations Menu that could be hidden from view, the top-level will expand if it isn't already and badges will appear next to folders/bodies that contain updated vessels with a count of how many. The updated vessels themselves will have their names bolded
  - The events calendar can now show vessel names that take up more than one line

**v1.0.0** (1/4/18)   
(all fixes/changes/additions listed are based on v4.12 of the [Flight Tracker](https://github.com/KSAMissionCtrl/FlightTracker#change-log))

Fixes:
  - [Body Information Dialog](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Orbital-View#body-information-dialog) now displays body mass properly
  - [Clock](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) is now always accurate to within 1-2 seconds rather than being anywhere from 40-90s slow
  - The shift to/from DST is now handled properly so times for events are all shown at the proper local and UTC values
  - Clock adjusts to no longer be one second off after page load is complete
  - [Surface tracks](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details#orbital-tracking) of orbital vessels no longer have a small gap between where one orbit ends and the next begins

Changes:
  - All pages unified into a single page that can dynamically adjust its content to display information on crew, vessels or bodies. This means the page can reload parts of itself independently rather than needing to reload the entire page when a small amount of information needs to be updated
  - Clicking on spacecraft no longer brings up an information window, but instead shows its orbital nodes and name. Clicking on its position again will load up its [Vessel Details](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details)
  - [Operations Menu](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation#the-operations-menu) items no longer show tooltip discriptions of the vessels/crew (but looking to bring this back at some point)
  - Operations Menu now shows crew and vessels at the same time
  - Body information Dialog can be repositioned and updates if a new planet is selected, but if it is closed it opens up again in the default position
  - Clicking on a moon in the menu will load the figure of the planetary system in which it resides
  - Inactive Vessels are organized into folders sorted by year descending and then month ascending
  - Active Vessels are listed in alphabetical order
  - The [Twitter Feed](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Twitter-Feed) shown can be changed in some instances to view only tweets relevant to the vessel/crew member
  - Clicking for additional vessel/crew information no longer pulls up text but instead opens a dialog box containing the text, which can be moved and resized. When closed, it will re-open over top the vessel/crew image again next time
  - The [Surface Map](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map) when viewed in the vessel page can now be expanded to fill the entire content area in addition to going fullscreen
  - Full Roster view tooltips now show additional data for # of missions completed and ribbons earned
  - After all custom pins are loaded the map veiw will size to encompass them all at the smallest zoom level possible
  - [Layers control](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#layers-control) stays open and does not collapse until all map layers are loaded, but still hides with the rest of map controls when the cursor is off the map
  - Detecting what to show using the `&layers` command is much more lenient. For example you can say `anomalies` or `anomaly`
  - The `&map` command to show the surface map of a body on page load no longer needs a value, is no longer required in conjunction with other commands and should always be placed at the end of the URL
  - Vessel orbits are always rendered in full by default, from 1 up to a max of 3. However you can cancel the calculations at anytime and what has been calculated will be rendered
  - After each full orbit is rendered it is immediately added to the map
  - If the view is changed to a body or crew while a vessel orbit is calculating, it will be paused. If you return to that vessel before any other, the calculation will pickup where it left off. Otherwise it will be tossed out and new calculations begun for a new vessel
  - Orbital calculation batch size has been reduced from 1500 to 1000 calculations to allow for smoother browser performance due to the slightly increased browser load brought on with the Geogebra figure

Additions:
  - When viewing a system that has vessels in orbit, they are dynamically loaded and added to the GeoGebra figure
  - Can show/hide the orbits of various types of vessels
  - Re-sorting the crew menu will also re-sort the Full Roster display if it is visible. If not then when loaded it will always sort crew in the same order as the current menu sort selection
  - Custom pins placed on the map through the `&loc` option will show up in their own map layer so they can be shown/hidden as a group
  - Map button when viewing a vessel that lets you jump to the planet/system overview and see all the orbit tracks
  - If a crew member has ribbons that have been superseded by higher achievements, the option is given to show all the ribbons earned, then also hide them again if wanted
  - Vessels can have additional sources of material listed that links to things like various reports on the mission, launch telemetry data, etc. These appear as file icons in the Data Box that can be clicked, with tooltips describing the nature of each
  - The Layers control in the upper-right of the map now contains a layer for each vessel orbit that is plotted, which allows the user to show/hide any orbits and their accompanying markers
  - After surface tracks are complete a button on the map will allow you to refresh them at any time (currently they will not refresh themselves at the end of a plot but eventually they will do so and this button will remain)
