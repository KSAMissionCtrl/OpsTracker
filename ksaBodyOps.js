// refactor complete
// SECURITY: All user-supplied data from database is sanitized with sanitizeHTML()
// before insertion into DOM to prevent XSS attacks. Use sanitizeHTML() for any
// new code that inserts database content into HTML.

// ---------------------------------------------------------------------------
// Three.js scene engine — replaces GeoGebra applet
// ---------------------------------------------------------------------------

var threeScene     = null;
var threeCamera    = null;
var threeRenderer  = null;
var threeControls  = null;
var threeLabelRenderer = null;
var threeAnimFrameId   = null;
var threeRefLine       = null;  // reference line across the scene (X-axis)
var threeNodeRadius    = 1;     // node marker radius; set by buildBodyScene() and reused in addOrbitAJAX()
var threeMaxBodyRadius   = 1;     // largest physical body radius in the current system; used by _updateBodySphereScales()
var threeCentralBodyMaxR = Infinity; // hard cap on central body display radius (= fraction of innermost child orbit SMA)
var _mouseDownPos         = { x: 0, y: 0 }; // for drag-vs-click detection in onSceneClick
// Orbital math uses ZXZ Euler sequence so Z is the orbital north pole.
// OrbitControls must share this convention so horizontal drag yaws around Z
// (keeping orbits face-on) and vertical drag pitches into/out of the plane.
var _threeWorldUp         = null; // deferred until initScene() — THREE loads as an ES module
var _keysDown             = {}; // tracks currently held arrow keys for keyboard camera control
var _ctrlDown             = false; // tracks whether Ctrl is held (for pan/zoom key variants)
var _sceneKeydownHandler  = null; // stored for removal in disposeScene
var _sceneKeyupHandler    = null;
var threeSunLight         = null; // PointLight (Kerbol-system) or DirectionalLight (planet/moon system)
var _sunOrbitalElements   = null; // orbital elements used to recompute DirectionalLight direction per tick
var _atnBodyMaxSMA        = 0;    // largest planet SMA in the Kerbol system; set by buildBodyScene() for ATN camera framing (used by resetFigure)

// Apply one frame of keyboard-driven camera movement.
//   Plain arrows:  ArrowLeft/Right yaw,  ArrowUp/Down pitch.
//   Ctrl+arrows:   Ctrl+Left/Right pan,  Ctrl+Up/Down zoom.
function _applyKeyNavigation() {
  if (!threeCamera || !threeControls) return;
  if (!_keysDown.ArrowLeft && !_keysDown.ArrowRight &&
      !_keysDown.ArrowUp   && !_keysDown.ArrowDown) return;

  var offset = new THREE.Vector3().subVectors(threeCamera.position, threeControls.target);
  var radius = offset.length();
  if (radius === 0) return;

  if (_ctrlDown) {
    // ── Ctrl+Left/Right: pan along the camera's screen-horizontal axis ──────
    if (_keysDown.ArrowLeft || _keysDown.ArrowRight) {
      // Column 0 of the camera matrix is its local right (+X screen) vector.
      var right = new THREE.Vector3().setFromMatrixColumn(threeCamera.matrix, 0);
      var panDelta = (_keysDown.ArrowLeft ? -1 : 1) * radius * 0.01;
      var panVec   = right.multiplyScalar(panDelta);
      threeCamera.position.add(panVec);
      threeControls.target.add(panVec);
    }

    // ── Ctrl+Up/Down: zoom (scale camera-to-target distance) ─────────────
    if (_keysDown.ArrowUp || _keysDown.ArrowDown) {
      var ZOOM_STEP   = 0.05; // fraction of current distance per frame
      var zoomFactor  = _keysDown.ArrowUp ? 1 - ZOOM_STEP : 1 + ZOOM_STEP;
      var newRadius   = THREE.MathUtils.clamp(
        radius * zoomFactor,
        threeControls.minDistance,
        threeControls.maxDistance
      );
      offset.setLength(newRadius);
      threeCamera.position.copy(threeControls.target).add(offset);
    }
  } else {
    // ── Plain ArrowLeft/Right: yaw around world Z-up ──────────────────────
    var SPEED = 0.02; // radians per frame (~1.2 rad/s at 60 fps)
    if (_keysDown.ArrowLeft || _keysDown.ArrowRight) {
      var yawDelta = (_keysDown.ArrowLeft ? -1 : 1) * SPEED;
      offset.applyQuaternion(
        new THREE.Quaternion().setFromAxisAngle(_threeWorldUp, yawDelta)
      );
    }

    // ── Plain ArrowUp/Down: pitch around the camera's right axis ─────────
    if (_keysDown.ArrowUp || _keysDown.ArrowDown) {
      var currentPhi = Math.acos(THREE.MathUtils.clamp(offset.z / radius, -1, 1));
      var pitchDelta = (_keysDown.ArrowUp ? -1 : 1) * SPEED;
      var newPhi     = THREE.MathUtils.clamp(
        currentPhi + pitchDelta,
        threeControls.minPolarAngle,
        threeControls.maxPolarAngle
      );
      var actualDelta = newPhi - currentPhi;
      if (Math.abs(actualDelta) > 1e-9) {
        var pitchAxis = new THREE.Vector3().crossVectors(_threeWorldUp, offset).normalize();
        offset.applyQuaternion(
          new THREE.Quaternion().setFromAxisAngle(pitchAxis, actualDelta)
        );
      }
    }

    threeCamera.position.copy(threeControls.target).add(offset);
  }

  // Re-orient after any movement so the camera always faces the target cleanly.
  threeCamera.up.copy(_threeWorldUp);
  threeCamera.lookAt(threeControls.target);
}

// Initialise a fresh Three.js scene inside the #figure div.
// Called by loadBody() every time a new body/system is loaded.
function initScene(width, height) {
  // Lazy-init globals that depend on THREE (loaded as an ES module after parse)
  if (!_threeWorldUp) _threeWorldUp = new THREE.Vector3(0, 0, 1);

  var container = document.getElementById('figure');
  if (!container) return;

  // WebGL renderer
  threeRenderer = new THREE.WebGLRenderer({ antialias: true });
  threeRenderer.setPixelRatio(window.devicePixelRatio);
  threeRenderer.setSize(width, height);
  threeRenderer.setClearColor(0x000000, 1);
  container.appendChild(threeRenderer.domElement);

  // CSS2D renderer for text labels (sits on top of WebGL canvas)
  threeLabelRenderer = new THREE.CSS2DRenderer();
  threeLabelRenderer.setSize(width, height);
  threeLabelRenderer.domElement.style.position = 'absolute';
  threeLabelRenderer.domElement.style.top = '0px';
  threeLabelRenderer.domElement.style.pointerEvents = 'none';
  container.style.position = 'relative';
  container.appendChild(threeLabelRenderer.domElement);

  // Perspective camera — looks nearly straight down the -Z axis (orbital north pole).
  // A small Y offset (~5.7°) avoids the gimbal singularity at the exact pole.
  threeCamera = new THREE.PerspectiveCamera(45, width / height, 1, 1e15);
  threeCamera.position.set(0, height * 100, height * 1000); // initial distance; refined when orbits are added
  threeCamera.up.copy(_threeWorldUp);
  threeCamera.lookAt(0, 0, 0);

  // Orbit controls
  threeControls = new THREE.OrbitControls(threeCamera, threeRenderer.domElement);
  threeControls.object.up.copy(_threeWorldUp);
  threeControls.enableDamping = true;
  threeControls.dampingFactor = 0.08;
  threeControls.screenSpacePanning = true;
  threeControls.enablePan = true;
  threeControls.minPolarAngle = 0.01;
  threeControls.maxPolarAngle = Math.PI - 0.01;
  threeControls.minDistance = 1;
  threeControls.maxDistance = 1e14;

  // track mousedown position so onSceneClick can ignore drag-as-click events
  threeRenderer.domElement.addEventListener('mousedown', function(e) {
    _mouseDownPos.x = e.clientX;
    _mouseDownPos.y = e.clientY;
  });

  // Keyboard camera controls:
  //   Plain arrows     → yaw / pitch
  //   Ctrl+Left/Right  → pan    Ctrl+Up/Down → zoom
  // Ignored when focus is inside a text input so typed arrows still work normally.
  _sceneKeydownHandler = function(e) {
    if (e.key === 'Control') { _ctrlDown = true; return; }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowRight' ||
        e.key === 'ArrowUp'    || e.key === 'ArrowDown') {
      var tag = (e.target.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      _keysDown[e.key] = true;
      e.preventDefault(); // prevent page scroll / browser back-forward
    }
  };
  _sceneKeyupHandler = function(e) {
    if (e.key === 'Control') _ctrlDown = false;
    delete _keysDown[e.key];
  };
  document.addEventListener('keydown', _sceneKeydownHandler);
  document.addEventListener('keyup',   _sceneKeyupHandler);

  // Scene and lighting
  threeScene = new THREE.Scene();
  threeScene.add(new THREE.AmbientLight(0xffffff, 0.15));
  // Context-aware sun lighting is added by buildBodyScene() once the central body is known.

  // Render loop
  function animate() {
    threeAnimFrameId = requestAnimationFrame(animate);

    threeControls.update();
    _applyKeyNavigation();
    _updateBodySphereScales();
    threeRenderer.render(threeScene, threeCamera);
    threeLabelRenderer.render(threeScene, threeCamera);
  }
  animate();
}

// Tear down the current Three.js scene completely.
// Called before building a new one for a different body/system.
function disposeScene() {
  if (threeAnimFrameId !== null) {
    cancelAnimationFrame(threeAnimFrameId);
    threeAnimFrameId = null;
  }
  if (threeScene) {
    threeScene.traverse(function(obj) {
      if (obj.isMesh || obj.isLine) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(function(m) { m.dispose(); });
          else obj.material.dispose();
        }
      }
    });
    threeScene = null;
  }
  if (threeControls) { threeControls.dispose(); threeControls = null; }
  if (threeRenderer) { threeRenderer.dispose(); threeRenderer = null; }
  threeLabelRenderer = null;
  threeCamera = null;
  threeRefLine = null;
  threeMaxBodyRadius   = 1;
  threeCentralBodyMaxR = Infinity;
  _soiEnabled          = false;
  // Remove keyboard listeners registered by initScene.
  if (_sceneKeydownHandler) { document.removeEventListener('keydown', _sceneKeydownHandler); _sceneKeydownHandler = null; }
  if (_sceneKeyupHandler)   { document.removeEventListener('keyup',   _sceneKeyupHandler);   _sceneKeyupHandler   = null; }
  _keysDown = {};
  _ctrlDown = false;
  threeSunLight       = null;
  _sunOrbitalElements = null;
}

// Reset camera to default near-top-down view (looking mostly along -Z orbital north),
// with a small Y offset to avoid the gimbal singularity at the exact pole.
function resetSceneView() {
  if (!threeCamera || !threeControls) return;
  var dist = threeCamera.position.length();
  threeCamera.position.set(0, dist * 0.1, dist * 0.995);
  threeCamera.up.copy(_threeWorldUp);
  threeCamera.lookAt(0, 0, 0);
  threeControls.target.set(0, 0, 0);
  threeControls.update();
  threeCamera.up.copy(_threeWorldUp);
}

// ---------------------------------------------------------------------------
// Phase 3: Body rendering helpers and buildBodyScene()
// ---------------------------------------------------------------------------

// Null-safe visibility toggle.
// Sets .visible on the object and cascades to any CSS2DObject children
// (e.g. Pe/Ap/AN/DN node meshes carry a label CSS2DObject child).
function _setVisible(obj, vis) {
  if (!obj) return;
  obj.visible = vis;
  for (var i = 0; i < obj.children.length; i++) {
    if (obj.children[i].isCSS2DObject) obj.children[i].visible = vis;
  }
}

// Create a CSS2DObject label div for use as a body/vessel name overlay.
// offsetX/offsetY (optional) are pixel values applied as CSS margin to shift the
// label in screen space — used to separate co-located node labels (Pe/Ap/AN/DN).

// Apply the current checkbox state to a newly-added orbit/asteroid entry so its
// meshes are immediately in the correct visible state — no reliance on declutterScene().
function _applyOrbitVisibility(entry) {
  if (!entry || !entry.meshes) return;
  var showOrbits = $("#orbits").is(":checked");
  var showNodes  = showOrbits && $("#nodes").is(":checked");
  var showLabels = $("#labels").is(":checked");
  _setVisible(entry.meshes.orbit,  showOrbits);
  _setVisible(entry.meshes.penode, showNodes);
  _setVisible(entry.meshes.apnode, showNodes);
  _setVisible(entry.meshes.anode,  showNodes);
  _setVisible(entry.meshes.dnode,  showNodes);
  _setVisible(entry.meshes.label,  showLabels);
  // SOI and position sphere keep the Three.js default (visible) — handled by other systems
}

function _makeBodyLabel(text, colorHex, offsetX, offsetY) {
  var div = document.createElement('div');
  div.className = 'three-label';
  div.style.color = '#' + colorHex;
  div.textContent = sanitizeHTML(text);
  if (offsetX) div.style.marginLeft = offsetX + 'px';
  if (offsetY) div.style.marginTop  = offsetY + 'px';
  return new THREE.CSS2DObject(div);
}

// Create a small sphere mesh for Pe/Ap/AN/DN node markers.
// colorHex is a 6-char hex string without '#' (e.g. '0099ff').
function _makeNodeMarker(position, colorHex, nodeRadius) {
  var geo = new THREE.SphereGeometry(nodeRadius, 8, 8);
  var mat = new THREE.MeshBasicMaterial({ color: parseInt(colorHex, 16) });
  var mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  return mesh;
}

// Dispose all Three.js meshes for a vessel orbit: removes them from the scene
// and releases GPU memory.  The vessel name label is a child of the position mesh
// so its DOM element must be cleaned up explicitly.
function _disposeVesselMeshes(meshes) {
  if (!meshes || !threeScene) return;
  // Position marker (vessel name label is a child — clean up its DOM element too)
  if (meshes.position) {
    if (meshes.label && meshes.label.element && meshes.label.element.parentNode) {
      meshes.label.element.parentNode.removeChild(meshes.label.element);
    }
    threeScene.remove(meshes.position);
    if (meshes.position.geometry) meshes.position.geometry.dispose();
    if (meshes.position.material) meshes.position.material.dispose();
  }
  // Orbit line (may be a Group of solid + dashed segments)
  if (meshes.orbit) {
    threeScene.remove(meshes.orbit);
    if (meshes.orbit.isGroup) {
      meshes.orbit.children.forEach(function(child) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    } else {
      if (meshes.orbit.geometry) meshes.orbit.geometry.dispose();
      if (meshes.orbit.material) meshes.orbit.material.dispose();
    }
  }
  // Node markers (Pe, Ap, AN, DN) — CSS2DObject label children go with the mesh
  [meshes.penode, meshes.apnode, meshes.anode, meshes.dnode].forEach(function(node) {
    if (!node) return;
    threeScene.remove(node);
    if (node.geometry) node.geometry.dispose();
    if (node.material) node.material.dispose();
  });
}

// Return the SOI radius in km for a body, or 0 if the catalog field is absent.
function _soiRadiusKm(bodyData) {
  var r = parseFloat(bodyData.SOI);
  return (r > 0) ? r : 0;
}

// Return the atmosphere shell radius in km (body radius + AtmoHeight), or 0 if no atmosphere.
function _atmoRadiusKm(bodyData) {
  var h = parseFloat(bodyData.AtmoHeight);
  if (!(h > 0)) return 0;
  var r = parseFloat(bodyData.Radius) || 0;
  return r + h;
}

// Create a translucent SOI shell mesh at the given position.
// FrontSide culls the sphere when the camera is inside it (desired).
// depthWrite: false keeps it from occluding transparent/opaque objects behind it.
function _makeSoiMesh(soiR, colorInt, segs) {
  var s = segs || 32;
  var mesh = new THREE.Mesh(
    new THREE.SphereGeometry(soiR, s, s),
    new THREE.MeshBasicMaterial({
      color:       colorInt,
      transparent: true,
      opacity:     0.35,
      depthWrite:  false,
      side:        THREE.FrontSide
    })
  );
  mesh.userData.physicalRadius = soiR;
  mesh.userData.segs = s;
  return mesh;
}

// Split an array of orbit points into contiguous above-atmosphere and inside-atmosphere
// segments. Boundary points are included in both the ending and starting segment so
// the rendered lines meet without gaps.
// Returns { above: [[...pts...], ...], inside: [[...pts...], ...] }
function _splitOrbitByAtmo(points, atmoR) {
  var r2 = atmoR * atmoR;
  var aboveSegs = [], insideSegs = [];
  var curAbove = null, curInside = null;

  for (var i = 0; i < points.length; i++) {
    var inAtmo = points[i].lengthSq() < r2;
    if (i === 0) {
      if (inAtmo) curInside = [points[i]];
      else        curAbove  = [points[i]];
      continue;
    }
    var prevInAtmo = points[i - 1].lengthSq() < r2;
    if (inAtmo !== prevInAtmo) {
      if (prevInAtmo) {
        // inside → above: close inside seg including boundary, open above seg at boundary
        curInside.push(points[i]);
        insideSegs.push(curInside);
        curInside = null;
        curAbove  = [points[i]];
      } else {
        // above → inside: close above seg including boundary, open inside seg at boundary
        curAbove.push(points[i]);
        aboveSegs.push(curAbove);
        curAbove  = null;
        curInside = [points[i]];
      }
    } else {
      if (inAtmo) curInside.push(points[i]);
      else        curAbove.push(points[i]);
    }
  }
  if (curAbove  && curAbove.length  >= 2) aboveSegs.push(curAbove);
  if (curInside && curInside.length >= 2) insideSegs.push(curInside);
  return { above: aboveSegs, inside: insideSegs };
}

// Build a THREE.Group containing the orbit line, split at the central body's atmosphere
// boundary. Above-atmosphere segments are solid; inside-atmosphere segments are dashed.
// If there is no atmosphere (atmoR = 0) or the orbit never enters it, returns a single
// solid line in the group. orbitId is stored on both the group and every child line so
// recursive raycasting can find the entry from any hit object.
function _buildOrbitGroup(pts, colorInt, atmoR, orbitId) {
  var group = new THREE.Group();
  group.userData.orbitId = orbitId;
  group.userData.atmoR   = atmoR;   // stored so _updateBodySphereScales can adjust dash sizes

  function makeSolid(seg) {
    var line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(seg),
      new THREE.LineBasicMaterial({ color: colorInt })
    );
    line.userData.orbitId = orbitId;
    return line;
  }

  function makeDashed(seg, dashSize) {
    var geo = new THREE.BufferGeometry().setFromPoints(seg);
    var line = new THREE.Line(geo,
      new THREE.LineDashedMaterial({ color: colorInt, dashSize: dashSize, gapSize: dashSize * 0.5 })
    );
    line.computeLineDistances();
    line.userData.orbitId = orbitId;
    return line;
  }

  if (!(atmoR > 0)) {
    group.add(makeSolid(pts));
    return group;
  }

  var split = _splitOrbitByAtmo(pts, atmoR);
  if (!split.inside.length) {
    group.add(makeSolid(pts));
    return group;
  }

  // Dash size: fixed km value; tweak _ATMO_DASH_KM to adjust
  var dashSize = _ATMO_DASH_KM;

  split.above.forEach(function(seg)  { group.add(makeSolid(seg)); });
  split.inside.forEach(function(seg) { group.add(makeDashed(seg, dashSize)); });
  return group;
}

// Create a translucent atmosphere shell mesh. Fixed physical size (not zoom-scaled).
function _makeAtmoMesh(atmoR, colorInt) {
  var mesh = new THREE.Mesh(
    new THREE.SphereGeometry(atmoR, 32, 32),
    new THREE.MeshBasicMaterial({
      color:       colorInt,
      transparent: true,
      opacity:     0.15,
      depthWrite:  false,
      side:        THREE.FrontSide
    })
  );
  mesh.userData.physicalRadius = atmoR;
  mesh.userData.segs = 32;
  return mesh;
}

// ---------------------------------------------------------------------------
// Sphere LOD helpers — adaptive segment counts
// ---------------------------------------------------------------------------
// Segment-count tiers. Geometry is only rebuilt when the tier changes, avoiding
// per-frame allocation. Tiers are wide enough that minor zoom oscillations don't
// trigger constant rebuilds.
var _SEG_TIERS = [16, 24, 32, 48, 64, 96, 128, 192, 256];

// Returns the smallest tier count whose polygon-edge error is < 1 screen pixel.
// Derivation: for N segments the mid-edge inset is r*(1-cos(π/N)); setting that
// below 1 px gives N ≈ π*sqrt(apparentPx/2) (small-angle approximation, N >> 1).
function _segmentsForApparentPx(px) {
  var needed = Math.ceil(Math.PI * Math.sqrt(Math.max(px, 1) / 2));
  for (var i = 0; i < _SEG_TIERS.length; i++) {
    if (_SEG_TIERS[i] >= needed) return _SEG_TIERS[i];
  }
  return _SEG_TIERS[_SEG_TIERS.length - 1];
}

// Rebuild a sphere mesh's geometry if the optimal tier has changed.
// `radius`     — geometry radius (not the display/scaled radius).
// `apparentPx` — current apparent screen-pixel radius.
function _lod_updateSphereGeometry(mesh, radius, apparentPx) {
  if (!mesh) return;
  var needed = _segmentsForApparentPx(apparentPx);
  if (needed === mesh.userData.segs) return;
  mesh.geometry.dispose();
  mesh.geometry = new THREE.SphereGeometry(radius, needed, needed);
  mesh.userData.segs = needed;
}

// ---------------------------------------------------------------------------
// Zoom-adaptive sphere sizing
// ---------------------------------------------------------------------------
// Called every animation frame. Rescales each body sphere mesh so its apparent
// screen-pixel radius stays inside [_SPHERE_MIN_PX, _SPHERE_LARGE_PX] regardless
// of zoom distance, while preserving relative size differences between bodies
// via a power-law compression of their physical radii ratios.
var _SPHERE_LARGE_PX        = 10;   // target screen-pixel radius for the largest body in the system
var _SPHERE_MIN_PX          = 4;    // minimum screen-pixel radius for any body sphere
var _SPHERE_REL_EXP         = 0.75; // relative-size exponent: 0 = all equal, 1 = physically accurate
var _SPHERE_CENTRAL_CAP     = 0.40; // central body display radius capped at this fraction of the innermost child orbit SMA
var _NODE_PX                = 2.5;    // target screen-pixel radius for Pe/Ap/AN/DN node markers
var _POSITION_PX            = 4;    // target screen-pixel radius for vessel position markers
var _POSITION_PX_DEFAULT    = _POSITION_PX; // saved so toggleSOI can restore it
var _ATMO_DASH_KM              = 100;  // base dash length in scene units (km) at apparent size ≤ threshold (gap = half dash)
var _ATMO_DASH_PX_THRESHOLD    = 100;  // central body apparent screen-pixel radius above which dashes start shrinking (raise to kick in sooner/further out)
var _ATMO_DASH_SCALE_DECAY     = 1.5; // exponent: 1 = linear shrink, 2 = faster, 0.5 = slower
var _ATMO_DASH_DEBUG           = false; // set false to silence the console readout
var _soiEnabled             = false; // when true, body spheres use 1:1 physical scale instead of zoom-adaptive normalisation

function _updateBodySphereScales() {
  if (!threeCamera || !threeControls || !threeRenderer) return;
  var viewH = threeRenderer.domElement.clientHeight || 530;
  var tanHalfFov = Math.tan(THREE.MathUtils.degToRad(threeCamera.fov / 2));
  var camDist = threeCamera.position.distanceTo(threeControls.target);
  if (camDist <= 0) return;
  var worldPerPx = (2 * camDist * tanHalfFov) / viewH;
  var maxR = threeMaxBodyRadius || 1;

  ops.orbits.forEach(function(entry) {
    if (entry.type !== 'body') return;
    var sphere = entry.meshes && entry.meshes.sphere;
    if (!sphere) return;
    var physR = sphere.userData.physicalRadius;
    if (!(physR > 0)) return;

    if (_soiEnabled) {2
      // SOI on: render at true physical radius (scale = 1)
      sphere.scale.setScalar(1);
    } else {
      // Relative radius normalised to the largest body in the scene (0..1).
      var normR      = physR / maxR;
      // Target apparent size: largest body = _SPHERE_LARGE_PX px; others use power-law
      // compression so smaller bodies stay visible without all looking identical.
      var targetPx   = Math.max(_SPHERE_MIN_PX, _SPHERE_LARGE_PX * Math.pow(normR, _SPHERE_REL_EXP));
      var targetWorldR = targetPx * worldPerPx;
      // Never shrink a sphere below its physical radius (handles close-in zoom to a body).
      var displayR   = Math.max(physR, targetWorldR);
      // Central body: hard-cap display radius so it never overlaps the innermost orbit.
      // (Skip the cap when Sarnus is the central body — its ring system makes the cap unnecessary.)
      var _centralBodyEntry = ops.bodyCatalog.find(o => o.selected === true) || {};
      if (entry.id === _centralBodyEntry.Body && _centralBodyEntry.Body !== 'Sarnus') {
        displayR = Math.min(displayR, threeCentralBodyMaxR);
      }
      sphere.scale.setScalar(displayR / physR);
    }
  });

  // Adaptive LOD: rebuild sphere geometries when apparent size crosses a tier boundary.
  // Body spheres:  apparent px = display radius (physR × scale) / worldPerPx.
  // SOI / atmo:    no zoom-scaling, so apparent px = physicalRadius / worldPerPx.
  ops.orbits.forEach(function(entry) {
    if (entry.type !== 'body' || !entry.meshes) return;
    var m = entry.meshes;
    if (m.sphere && m.sphere.userData.physicalRadius > 0) {
      var dispR = m.sphere.userData.physicalRadius * m.sphere.scale.x;
      _lod_updateSphereGeometry(m.sphere, m.sphere.userData.physicalRadius, dispR / worldPerPx);
    }
    if (m.soi && m.soi.userData.physicalRadius > 0) {
      _lod_updateSphereGeometry(m.soi, m.soi.userData.physicalRadius, m.soi.userData.physicalRadius / worldPerPx);
    }
    if (m.atmo && m.atmo.userData.physicalRadius > 0) {
      _lod_updateSphereGeometry(m.atmo, m.atmo.userData.physicalRadius, m.atmo.userData.physicalRadius / worldPerPx);
    }
  });

  // Scale all node markers (Pe/Ap/AN/DN) and vessel/asteroid position markers.
  // Node markers use the global worldPerPx (they sit on orbits near the target).
  // Position spheres use their own distance to the camera so they maintain a
  // constant *apparent* size regardless of where they are in the scene.
  var nodeRef   = threeNodeRadius || 1;
  var nodeScale = _NODE_PX * worldPerPx / nodeRef;
  var _posTmp   = new THREE.Vector3();   // reused each iteration, one alloc per frame
  ops.orbits.forEach(function(entry) {
    if (!entry.meshes) return;
    var nodes = [entry.meshes.penode, entry.meshes.apnode,
                 entry.meshes.anode,  entry.meshes.dnode];
    nodes.forEach(function(mesh) {
      if (mesh) mesh.scale.setScalar(nodeScale);
    });
    if (entry.meshes.position) {
      var pm = entry.meshes.position;
      pm.getWorldPosition(_posTmp);
      var d      = Math.max(threeCamera.position.distanceTo(_posTmp), 1);
      var posWPP = (2 * d * tanHalfFov) / viewH;
      pm.scale.setScalar(_POSITION_PX * posWPP / (nodeRef * 1.5));
    }
  });

  // Zoom-adaptive dash scaling: measure how large the central body actually appears on screen
  // (apparent pixel radius = physicalRadius / worldUnitsPerPixel). Once that grows past
  // _ATMO_DASH_PX_THRESHOLD the dashes shrink. Raise the threshold to start shrinking sooner.
  var centralBodyId = (ops.bodyCatalog.find(function(o) { return o.selected === true; }) || {}).Body;
  var centralEntry  = ops.orbits.find(function(o) { return o.type === 'body' && o.id === centralBodyId; });
  if (centralEntry && centralEntry.meshes && centralEntry.meshes.sphere) {
    var cPhysR      = centralEntry.meshes.sphere.userData.physicalRadius;
    var apparentPx  = cPhysR / worldPerPx;  // screen-pixel radius of the physical body
    var dashMult = (apparentPx > _ATMO_DASH_PX_THRESHOLD)
      ? Math.pow(_ATMO_DASH_PX_THRESHOLD / apparentPx, _ATMO_DASH_SCALE_DECAY)
      : 1.0;
    if (_ATMO_DASH_DEBUG) {
      var now = Date.now();
      if (!_updateBodySphereScales._lastLog || now - _updateBodySphereScales._lastLog >= 1000) {
        console.log('[AtmoDash] apparentPx=' + apparentPx.toFixed(1) + '  dashMult=' + dashMult.toFixed(3) + '  dashKm=' + (_ATMO_DASH_KM * dashMult).toFixed(1));
        _updateBodySphereScales._lastLog = now;
      }
    }
    ops.orbits.forEach(function(entry) {
      if (!entry.meshes || !entry.meshes.orbit || !entry.meshes.orbit.isGroup) return;
      var baseAtmoR = entry.meshes.orbit.userData.atmoR;
      if (!(baseAtmoR > 0)) return;
      var newDash = _ATMO_DASH_KM * dashMult;
      entry.meshes.orbit.children.forEach(function(child) {
        if (child.material && child.material.isLineDashedMaterial) {
          child.material.dashSize = newDash;
          child.material.gapSize  = newDash * 0.5;
        }
      });
    });
  }
}

// Return the direction unit vector FROM the current central body TOWARD Kerbol as a THREE.Vector3.
// Uses _sunOrbitalElements cached by buildBodyScene().
// Returns null when the central body is Kerbol (PointLight at origin needs no direction).
function _computeSunDirection(ut) {
  if (!_sunOrbitalElements) return null;
  var oe      = _sunOrbitalElements;
  var meanNow = computeMeanAnomalyAtUT(oe.mean0, oe.meanMotion, ut, oe.epoch, oe.ecc);
  var eccNow  = solveKeplerEquation(meanNow, oe.ecc);
  var pos     = positionOnOrbit(oe.sma, oe.ecc, oe.inc, oe.raan, oe.arg, eccNow);
  // pos is the planet's position relative to Kerbol (at origin).
  // From the body's frame, Kerbol is in the direction of -pos.
  return new THREE.Vector3(-pos.x, -pos.y, -pos.z).normalize();
}

// Build all Three.js objects (spheres, orbit lines, SOI shells, labels, nodes)
// for the currently-selected body system into threeScene.
// Called from onSceneReady() after the scene is initialised.
function buildBodyScene() {
  var centralBodyData = ops.bodyCatalog.find(o => o.selected === true);
  if (!centralBodyData || !threeScene) return;

  // Children: all catalog bodies whose Ref == the central body's ID.
  var childBodies = ops.bodyCatalog.filter(function(b) {
    return b.Ref !== null && b.Ref !== undefined &&
           parseInt(b.Ref) === parseInt(centralBodyData.ID) &&
           b.Body !== centralBodyData.Body;
  });

  // All catalog distances are in km; use km as scene units throughout.
  var maxSMA = 0;
  childBodies.forEach(function(b) {
    var s = parseFloat(b.SMA) || 0;
    if (s > maxSMA) maxSMA = s;
  });
  if (maxSMA === 0) maxSMA = Math.max(parseFloat(centralBodyData.Radius) * 10, 10000);

  // Store the planet-only maxSMA for ATN camera framing (must happen before asteroids are added).
  if (ops.pageType == "atn") _atnBodyMaxSMA = maxSMA;

  // Minimum radius for node markers (keeps them clickable at any zoom).
  var minSphereR = Math.max(maxSMA * 0.004, 1);
  var nodeR      = minSphereR * 0.35;
  threeNodeRadius = nodeR;

  // Determine the largest body radius for normalising zoom-adaptive sphere sizes.
  threeMaxBodyRadius = Math.max(parseFloat(centralBodyData.Radius) || 1, 1);
  childBodies.forEach(function(b) {
    var r = Math.max(parseFloat(b.Radius) || 1, 1);
    if (r > threeMaxBodyRadius) threeMaxBodyRadius = r;
  });

  // Cap the central body sphere so it can never overlap the innermost child orbit.
  // Use 40% of the closest orbit's SMA as the hard ceiling.
  if (childBodies.length) {
    var minChildSMA = Infinity;
    childBodies.forEach(function(b) {
      var s = parseFloat(b.SMA) || 0;
      if (s > 0 && s < minChildSMA) minChildSMA = s;
    });
    threeCentralBodyMaxR = (minChildSMA < Infinity) ? minChildSMA * _SPHERE_CENTRAL_CAP : Infinity;
  } else {
    threeCentralBodyMaxR = Infinity;
  }

  var ut = currUT();

  // Estimate world-units-per-pixel at the initial camera position that is set at
  // the end of this function: (0, maxSMA*0.25, maxSMA*2.5). Used to choose
  // adequate initial segment counts for SOI spheres before the first frame runs.
  var _initCamDist    = Math.sqrt(Math.pow(maxSMA * 0.25, 2) + Math.pow(maxSMA * 2.5, 2));
  var _initViewH      = (threeRenderer.domElement.clientHeight || 600);
  var _initWorldPerPx = (2 * _initCamDist * Math.tan(THREE.MathUtils.degToRad(45 / 2))) / _initViewH;

  // ── Central body (sits at origin, no orbit line) ────────────────────────
  var cColor  = centralBodyData.Color || 'ffffff';
  var cPhysR  = Math.max(parseFloat(centralBodyData.Radius) || 1, 1);

  var cSphere = new THREE.Mesh(
    new THREE.SphereGeometry(cPhysR, 32, 32),
    new THREE.MeshLambertMaterial({ color: parseInt(cColor, 16) })
  );
  cSphere.userData.orbitId = centralBodyData.Body;
  cSphere.userData.physicalRadius = cPhysR;
  cSphere.userData.segs = 32;
  threeScene.add(cSphere);

  // ── Sun lighting ─────────────────────────────────────────────────────────
  // Case A: central body IS Kerbol — MeshBasicMaterial (unlit) + PointLight at origin.
  // Case B: central body is a planet orbiting Kerbol — DirectionalLight from Kerbol's direction.
  // Case C: central body is a moon — use parent planet's orbit for the sun direction.
  {
    var kerbolData = ops.bodyCatalog.find(function(b) { return b.Body === "Kerbol"; });
    if (centralBodyData.Body === "Kerbol") {
      // Case A: Kerbol is its own star — render as fully-lit emissive sphere.
      // No sun light added; at system scale bodies are too small for accurate lighting to matter.
      cSphere.material = new THREE.MeshBasicMaterial({ color: parseInt(cColor, 16) });
      _sunOrbitalElements = null;
    } else {
      // Determine which body's orbital elements give us the sun direction.
      var sunOrbitBody = null;
      if (kerbolData && parseInt(centralBodyData.Ref) === parseInt(kerbolData.ID)) {
        // Case B: this body directly orbits Kerbol (it is a planet).
        sunOrbitBody = centralBodyData;
      } else if (kerbolData) {
        // Case C: this body orbits a planet (it is a moon) — use the parent planet.
        var parentPlanet = ops.bodyCatalog.find(function(b) {
          return parseInt(b.ID) === parseInt(centralBodyData.Ref);
        });
        if (parentPlanet && parseInt(parentPlanet.Ref) === parseInt(kerbolData.ID)) {
          sunOrbitBody = parentPlanet;
        }
      }
      if (sunOrbitBody) {
        var _slOe = {
          sma:       parseFloat(sunOrbitBody.SMA)        || 1,
          ecc:       parseFloat(sunOrbitBody.Ecc)        || 0,
          inc:       Math.radians(parseFloat(sunOrbitBody.Inc)  || 0),
          raan:      Math.radians(parseFloat(sunOrbitBody.RAAN) || 0),
          arg:       Math.radians(parseFloat(sunOrbitBody.Arg)  || 0),
          mean0:     Math.radians(parseFloat(sunOrbitBody.Mean) || 0),
          epoch:     parseFloat(sunOrbitBody.Eph)        || 0,
          period:    parseFloat(sunOrbitBody.ObtPeriod)  || 1
        };
        _slOe.meanMotion  = (2 * Math.PI) / _slOe.period;
        _sunOrbitalElements = _slOe;
        var sunDir = _computeSunDirection(ut);
        threeSunLight = new THREE.DirectionalLight(0xfff5e0, 0.8);
        threeSunLight.position.copy(sunDir);
        threeScene.add(threeSunLight);
      }
    }
  }

  var cLabel = _makeBodyLabel(centralBodyData.Body, cColor, 0, -13);
  cLabel.position.set(0, 0, 0);
  cSphere.add(cLabel);

  // Central body SOI
  var cSoi = null;
  var cSoiR = _soiRadiusKm(centralBodyData);
  if (cSoiR > 0) {
    cSoi = _makeSoiMesh(cSoiR, parseInt(cColor, 16), _segmentsForApparentPx(cSoiR / _initWorldPerPx));
    threeScene.add(cSoi);
  }

  // Central body atmosphere shell (fixed physical size, always visible)
  var cAtmo = null;
  var cAtmoR = _atmoRadiusKm(centralBodyData);
  if (cAtmoR > 0) {
    cAtmo = _makeAtmoMesh(cAtmoR, parseInt(cColor, 16));
    threeScene.add(cAtmo);
  }

  ops.orbits.push({
    type: 'body', id: centralBodyData.Body, db: centralBodyData.Body,
    showName: false, showNodes: false, isSelected: false, isHidden: false, obtLocked: false,
    meshes: { sphere: cSphere, orbit: null, soi: cSoi, atmo: cAtmo, label: cLabel,
              penode: null, apnode: null, anode: null, dnode: null }
  });
  _applyOrbitVisibility(ops.orbits[ops.orbits.length - 1]);

  // ── Child bodies ─────────────────────────────────────────────────────────
  childBodies.forEach(function(bodyData) {
    var color  = bodyData.Color || 'aaaaaa';
    var colorI = parseInt(color, 16);
    var physR  = Math.max(parseFloat(bodyData.Radius) || 1, 1);

    // Orbital elements — catalog stores angles in degrees, convert to radians.
    var sma    = parseFloat(bodyData.SMA)        || 1;    // km
    var ecc    = parseFloat(bodyData.Ecc)        || 0;
    var inc    = Math.radians(parseFloat(bodyData.Inc)  || 0);
    var raan   = Math.radians(parseFloat(bodyData.RAAN) || 0);
    var arg    = Math.radians(parseFloat(bodyData.Arg)  || 0);
    var mean0  = Math.radians(parseFloat(bodyData.Mean) || 0);
    var epoch  = parseFloat(bodyData.Eph)        || 0;
    var period = parseFloat(bodyData.ObtPeriod)  || 1;
    var meanMotion = (2 * Math.PI) / period;       // rad/s

    // Current world-space position (km).
    var meanNow = computeMeanAnomalyAtUT(mean0, meanMotion, ut, epoch, ecc);
    var eccNow  = solveKeplerEquation(meanNow, ecc);
    var pos     = positionOnOrbit(sma, ecc, inc, raan, arg, eccNow);

    // sphere — use flat material in Kerbol-system view so planets are visible from all angles
    var _sphereMat = (centralBodyData.Body === "Kerbol")
      ? new THREE.MeshBasicMaterial({ color: colorI })
      : new THREE.MeshLambertMaterial({ color: colorI });
    var sphere = new THREE.Mesh(new THREE.SphereGeometry(physR, 32, 32), _sphereMat);
    sphere.position.copy(pos);
    sphere.userData.orbitId = bodyData.Body;
    sphere.userData.physicalRadius = physR;
    sphere.userData.segs = 32;
    threeScene.add(sphere);

    // label — child of sphere so it moves with it each tick
    var label = _makeBodyLabel(bodyData.Body, color, 0, -13);
    label.position.set(0, 0, 0);
    sphere.add(label);

    // orbit line (dashed inside central body atmosphere if applicable)
    var pts = orbitalElementsToEllipsePoints(sma, ecc, inc, raan, arg, 128);
    var orbitLine = _buildOrbitGroup(pts, colorI, _atmoRadiusKm(centralBodyData), bodyData.Body);
    threeScene.add(orbitLine);

    // SOI translucent shell (moves with sphere each tick; culled from inside by FrontSide)
    var soiMesh = null;
    var soiR = _soiRadiusKm(bodyData);
    if (soiR > 0) {
      soiMesh = _makeSoiMesh(soiR, colorI, _segmentsForApparentPx(soiR / _initWorldPerPx));
      soiMesh.position.copy(pos);
      threeScene.add(soiMesh);
    }

    // Atmosphere shell (fixed physical size, always visible)
    var atmoMesh = null;
    var atmoR = _atmoRadiusKm(bodyData);
    if (atmoR > 0) {
      atmoMesh = _makeAtmoMesh(atmoR, colorI);
      atmoMesh.position.copy(pos);
      threeScene.add(atmoMesh);
    }

    // orbital node markers — Pe/Ap only for eccentric orbits (Ap skipped for hyperbolic),
    // AN/DN only for inclined orbits (skipped if outside the hyperbolic arc)
    var nodes  = computeNodePositions(sma, ecc, inc, raan, arg);
    var penode = null, apnode = null, anode = null, dnode = null;
    if (ecc) {
      penode = _makeNodeMarker(nodes.periapsis, '0099ff', nodeR);
      penode.add(_makeBodyLabel('Pe', '0099ff',  0,  14));
      threeScene.add(penode);
      if (nodes.apoapsis) {                              // null for hyperbolic
        apnode = _makeNodeMarker(nodes.apoapsis, '0099ff', nodeR);
        apnode.add(_makeBodyLabel('Ap', '0099ff',  0, -14));
        threeScene.add(apnode);
      }
    }
    if (inc) {
      if (nodes.ascendingNode) {                         // may be null for hyperbolic
        anode = _makeNodeMarker(nodes.ascendingNode,  '33ff00', nodeR);
        anode.add(_makeBodyLabel('AN', '33ff00', -14,   0));
        threeScene.add(anode);
      }
      if (nodes.descendingNode) {                        // may be null for hyperbolic
        dnode = _makeNodeMarker(nodes.descendingNode, '33ff00', nodeR);
        dnode.add(_makeBodyLabel('DN', '33ff00',  14,   0));
        threeScene.add(dnode);
      }
    }

    ops.orbits.push({
      type: 'body', id: bodyData.Body, db: bodyData.Body,
      showName: false, showNodes: false, isSelected: false, isHidden: false, obtLocked: false,
      orbitElements: { sma: sma, ecc: ecc, inc: inc, raan: raan, arg: arg,
                       mean0: mean0, meanMotion: meanMotion, epoch: epoch },
      meshes: { sphere: sphere, orbit: orbitLine, soi: soiMesh, atmo: atmoMesh, label: label,
                penode: penode, apnode: apnode, anode: anode, dnode: dnode }
    });
    _applyOrbitVisibility(ops.orbits[ops.orbits.length - 1]);
  });

  // Reference line along X-axis spanning the full scene width.
  var refLen = maxSMA * 1.3;
  threeRefLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-refLen, 0, 0),
      new THREE.Vector3( refLen, 0, 0)
    ]),
    new THREE.LineBasicMaterial({ color: 0x444444 })
  );
  threeScene.add(threeRefLine);

  // Set camera and depth range to fit the system comfortably.
  threeCamera.near = Math.max(1, maxSMA * 0.00005);
  threeCamera.far  = maxSMA * 500;
  // Nearly top-down: small Y offset (~5.7°) avoids the gimbal singularity at Z-pole.
  threeCamera.position.set(0, maxSMA * 0.25, maxSMA * 2.5);
  threeCamera.up.copy(_threeWorldUp);
  threeCamera.updateProjectionMatrix();
  threeControls.maxDistance = maxSMA * 20;
  threeControls.target.set(0, 0, 0);
  threeControls.update();
  threeCamera.up.copy(_threeWorldUp);
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Step 3: Resolve ATN index — finds the largest UT ≤ currUT() for each catalog.
// Calls onReady(indexUTs) where indexUTs = { main, encounters, moonlets }.
// Any catalog with no qualifying version gets null.
// ---------------------------------------------------------------------------
function loadATNIndex(onReady) {
  var indexURL = "database/atn/atn_index.json.txt";
  console.log('[loadATNIndex] Fetching', indexURL);
  KSA_DATA_SERVICE.fetchJson(indexURL).then(function(data) {
    var idx    = Array.isArray(data) ? data[0] : data;
    var ut     = currUT();
    var result = { main: null, encounters: null, moonlets: null };

    ['main', 'encounters', 'moonlets'].forEach(function(key) {
      var versions = idx[key];
      if (!Array.isArray(versions)) return;
      // Find the largest UT value that is ≤ current game time
      var best = null;
      versions.forEach(function(v) {
        if (v <= ut && (best === null || v > best)) best = v;
      });
      result[key] = best;
    });

    // Cache for the session so Steps 4b/5 can reference it without re-fetching
    KSA_CATALOGS.atnData.indexUTs = result;
    console.log('[loadATNIndex] Resolved indexUTs:', JSON.stringify(result));

    // Kick off encounter and moonlet catalog loads immediately (background, no UI feedback)
    if (result.encounters !== null) loadATNEncounters(result.encounters);
    if (result.moonlets   !== null) loadATNMoonlets(result.moonlets);

    if (onReady) onReady(result);
  })['catch'](function(err) {
    console.error('[loadATNIndex] Failed to load index:', err);
    if (onReady) onReady({ main: null, encounters: null, moonlets: null });
  });
}

// ---------------------------------------------------------------------------
// Step 15a: Load ATN encounters catalog
// Fetches atn_encounters_<ut>.json.txt, populates atnData.encounters[] and
// atnData.encMap{}, and seeds the atn:encounter update chain for future events.
// ---------------------------------------------------------------------------
function loadATNEncounters(indexUT) {
  var url = "database/atn/encounters/atn_encounters_" + indexUT + ".json.txt";
  var ut  = currUT();
  console.log('[loadATNEncounters] Fetching', url);
  KSA_DATA_SERVICE.fetchJson(url).then(function(records) {
    var atnData = KSA_CATALOGS.atnData;
    var arr = Array.isArray(records) ? records : (records ? [records] : []);

    // Collect future encounters (EncounterUT not null and > currUT), sorted ascending
    var future = [];
    arr.forEach(function(enc) {
      atnData.encMap[enc.UID] = enc;
      if (enc.EncounterUT !== null && enc.EncounterUT > ut) {
        future.push(enc.UID);
      }
    });

    // Sort by EncounterUT and store as the update queue
    future.sort(function(a, b) {
      var ua = atnData.encMap[a].EncounterUT;
      var ub = atnData.encMap[b].EncounterUT;
      return ua - ub;
    });
    ops.updateEncounters = future;
    var _encQueuedCount = future.length;

    // Seed the first encounter notification into the update chain
    if (future.length) {
      var firstUID = future.shift();
      var firstEnc = atnData.encMap[firstUID];
      ops.updatesList.push({ type: "atn:encounter", UT: firstEnc.EncounterUT, id: firstUID });
      ops.updatesList.sort(function(a, b) { return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0); });
    }

    console.log('[loadATNEncounters] Loaded', arr.length, 'records,', _encQueuedCount, 'queued');
  })['catch'](function(err) {
    console.error('[loadATNEncounters] Failed:', err);
  });
}

// ---------------------------------------------------------------------------
// Step 15b: Load ATN moonlets catalog
// Fetches atn_moonlets_<ut>.json.txt, populates atnData.moonlets[] and
// atnData.moonletMap{}, and seeds the atn:moonlet update chain for future events.
// ---------------------------------------------------------------------------
function loadATNMoonlets(indexUT) {
  var url = "database/atn/moonlets/atn_moonlets_" + indexUT + ".json.txt";
  var ut  = currUT();
  console.log('[loadATNMoonlets] Fetching', url);
  KSA_DATA_SERVICE.fetchJson(url).then(function(records) {
    var atnData = KSA_CATALOGS.atnData;
    var arr = Array.isArray(records) ? records : (records ? [records] : []);

    // Collect future moonlet discoveries (DiscoveryDate > currUT), sorted ascending
    var future = [];
    arr.forEach(function(m) {
      atnData.moonletMap[m.UID] = m;
      if (m.DiscoveryDate > ut) {
        future.push(m.UID);
      }
    });

    future.sort(function(a, b) {
      return atnData.moonletMap[a].DiscoveryDate - atnData.moonletMap[b].DiscoveryDate;
    });
    ops.updateMoonlets = future;
    var _moonQueuedCount = future.length;

    // Seed the first moonlet notification into the update chain
    if (future.length) {
      var firstUID = future.shift();
      var firstM   = atnData.moonletMap[firstUID];
      ops.updatesList.push({ type: "atn:moonlet", UT: firstM.DiscoveryDate, id: firstUID });
      ops.updatesList.sort(function(a, b) { return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0); });
    }

    console.log('[loadATNMoonlets] Loaded', arr.length, 'records,', _moonQueuedCount, 'queued');
  })['catch'](function(err) {
    console.error('[loadATNMoonlets] Failed:', err);
  });
}

// ---------------------------------------------------------------------------
// Step 4: ATN page entry point
// ---------------------------------------------------------------------------
function loadATN() {

  // ── Page title & UI chrome ────────────────────────────────────────────────
  $("#contentHeader").spin(false);
  $("#tags").fadeIn();
  $("#contentTitle").html("Asteroid Tracking Network");
  document.title = "KSA Operations Tracker - Asteroid Tracking Network";

  // ── Persist history so browser back/forward works ────────────────────────
  var strURL = "http://www.kerbalspace.agency/Tracker/tracker.html?body=atn";
  if (!history.state) {
    history.replaceState({type: "atn", id: "atn"}, document.title, strURL);
  } else if (history.state.type !== "atn") {
    history.pushState({type: "atn", id: "atn"}, document.title, strURL);
  }

  // ── Reset figure options to ATN starting state (only orbits checked) ──────
  $("#nodes").prop('checked', false).prop('disabled', true);
  $("#labels").prop('checked', false).prop('disabled', true);
  $("#orbits").prop('checked', true).prop('disabled', true);
  $("#ref").prop('checked', false).prop('disabled', true);
  $("#soi").prop('checked', false).prop('disabled', true);

  // ── Guard: index not yet resolved — defer until loadATNIndex() completes
  if (!KSA_CATALOGS.atnData.indexUTs) return setTimeout(loadATN, 100);

  // ── Step 4b: catalog already in memory — rebuild scene from cache ─────────
  if (KSA_CATALOGS.atnData.loaded) {
    loadBody();
    return;
  }

  // ── Fresh load: stream catalog with progress, render all at once when done ─────
  $("#vesselLoaderMsg").html("&nbsp;&nbsp;&nbsp;Fetching ATN catalog").css('left', '802px');
  $("#vesselLoaderMsg").spin({ scale: 0.35, position: 'relative', top: '8px', left: '0px' });
  $("#vesselLoaderMsg").fadeIn();
  loadBody();
}

// ---------------------------------------------------------------------------
// Step 13: ATN main update handler — called from updatePage() for type "atn:main"
// ---------------------------------------------------------------------------
function updateATNMain(updateEvent) {
  var uid     = updateEvent.id;
  var atnData = KSA_CATALOGS.atnData;
  var record  = atnData.roidMap[uid];
  if (!record) return;
  var f       = atnData.filters;

  // Snapshot current filter-array lengths so we can detect new values
  var prevCat    = (f.category || []).length;
  var prevSize   = (f.size     || []).length;
  var prevMakeup = (f.makeup   || []).length;
  var prevType   = (f.type     || []).length;
  var prevSOI    = (f.soicross || []).length;

  // Collect filter values from this record (idempotent; only pushes genuinely new ones)
  _collectATNFilters(record);

  // Append any newly-seen values to the live dropdowns without resetting checked state
  _appendNewFilterOptions('atnFilterCategory', f.category, prevCat);
  _appendNewFilterOptions('atnFilterSize',     f.size,     prevSize);
  _appendNewFilterOptions('atnFilterMakeup',   f.makeup,   prevMakeup);
  _appendNewFilterOptions('atnFilterType',     f.type,     prevType);
  _appendNewFilterOptions('atnFilterSOI',      f.soicross, prevSOI);

  // Render the asteroid into the live scene if still on the ATN page
  if (ops.pageType === "atn" && KSA_UI_STATE.is3JSLoaded) {
    KSA_CATALOGS.atnData.catalogCount++;
    _renderAsteroid(record);
    applyATNFilters();
  }

  // Advance the chain: shift the next UID and push it into updatesList so the clock fires it.
  if (ops.updateATN && ops.updateATN.length) {
    var nextUID = ops.updateATN.shift();
    var nextRec = atnData.roidMap[nextUID];
    if (nextRec) {
      ops.updatesList.push({ type: "atn:main", UT: nextRec.DiscoveryDate, id: nextUID });
      ops.updatesList.sort(function(a, b) { return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0); });
    }
  }
}

// ---------------------------------------------------------------------------
// Step 14 / Step 15: ATN encounter update handler
// Fires at EncounterUT. Shows a notification dialog and (optionally) renders
// the encounter orbit live if the user is already on the correct body page.
// ---------------------------------------------------------------------------
function updateATNEncounter(updateEvent) {
  var uid     = updateEvent.id;
  var atnData = KSA_CATALOGS.atnData;
  var enc     = atnData.encMap[uid];

  if (enc) {
    var currBodyData = ops.bodyCatalog.find(function(o) { return o.selected === true; });
    var currBodyName = currBodyData ? currBodyData.Body : null;

    if (ops.pageType === 'body' && currBodyName === enc.SOI) {
      // Already viewing the correct body system — render orbit and select it
      if (enc.Eph !== null) _renderEncounterOrbit(enc, currBodyData);
      var entry = ops.orbits.find(function(o) { return o.db === uid && o.type === 'asteroid'; });
      if (entry && entry.meshes && entry.meshes.position) {
        figureClick({ hitType: 'vessel', entry: entry, isPosition: true });
      }
    } else {
      // On a different page — show a notification dialog with navigation option
      var encDate = KSA_CONSTANTS.FOUNDING_MOMENT.plus({ seconds: enc.EncounterUT }).toFormat("M/d/yyyy");
      var strHTML = "<p>Asteroid <b>" + sanitizeHTML(uid) + "</b> (Class " + sanitizeHTML(enc.Class) + ") ";
      strHTML += "has entered the SOI of <b>" + sanitizeHTML(enc.SOI) + "</b>.</p>";
      strHTML += "<p>Entry date: " + sanitizeHTML(encDate) + "<br>";
      if (enc.ApproachDate !== null) {
        strHTML += "Closest approach: " + sanitizeHTML(KSA_CONSTANTS.FOUNDING_MOMENT.plus({ seconds: enc.ApproachDate }).toFormat("M/d/yyyy")) + "<br>";
      }
      if (enc.Periapsis !== null) {
        strHTML += "Periapsis: " + sanitizeHTML(numeral(enc.Periapsis).format('0,0')) + " m";
      }
      strHTML += "</p>";

      var buttons = [];
      if (enc.Eph !== null) {
        // "View Encounter" is only meaningful when orbital data is available for rendering
        buttons.push({
          text: "View Encounter",
          click: function() {
            $("#siteDialog").dialog("close");
            ops.pendingObjSelect = uid;
            loadBody(enc.SOI);
          }
        });
      }
      buttons.push({ text: "Close", click: function() { $("#siteDialog").dialog("close"); } });

      $("#siteDialog").html(strHTML);
      $("#siteDialog").dialog("option", {
        title: "ATN Encounter \u2014 " + sanitizeHTML(enc.SOI),
        buttons: buttons
      });
      $("#siteDialog").dialog("open");
    }
  }

  // Advance the chain
  if (!ops.updateEncounters) ops.updateEncounters = [];
  if (ops.updateEncounters.length) {
    var nextUID = ops.updateEncounters.shift();
    var nextEnc = atnData.encMap[nextUID];
    if (nextEnc && nextEnc.EncounterUT !== null) {
      ops.updatesList.push({ type: "atn:encounter", UT: nextEnc.EncounterUT, id: nextUID });
      ops.updatesList.sort(function(a, b) { return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0); });
    }
  }
}

// ---------------------------------------------------------------------------
// Step 16: ATN moonlet update handler
// Fires at DiscoveryDate. Shows a discovery notification and renders the
// moonlet orbit if the user is already on the correct body page.
// ---------------------------------------------------------------------------
function updateATNMoonlet(updateEvent) {
  var uid     = updateEvent.id;
  var atnData = KSA_CATALOGS.atnData;
  var m       = atnData.moonletMap[uid];

  if (m) {
    var currBodyData = ops.bodyCatalog.find(function(o) { return o.selected === true; });
    var currBodyName = currBodyData ? currBodyData.Body : null;

    if (ops.pageType === 'body' && currBodyName === m.SOI) {
      // Already viewing the correct body — render live
      if (m.Eph !== null) _renderMoonletOrbit(m, currBodyData);
    }

    // Always show a discovery notification
    var discDate = KSA_CONSTANTS.FOUNDING_MOMENT.plus({ seconds: m.DiscoveryDate }).toFormat("M/d/yyyy");
    var strHTML = "<p>A new natural moonlet has been detected orbiting <b>" + sanitizeHTML(m.SOI) + "</b>.</p>";
    strHTML += "<p><b>" + sanitizeHTML(uid) + "</b> &mdash; Class " + sanitizeHTML(m.Class) + ", " + sanitizeHTML(m.Makeup) + "<br>";
    strHTML += "Discovery date: " + sanitizeHTML(discDate) + "</p>";
    if (m.Apoapsis !== null && m.Periapsis !== null) {
      strHTML += "<p>Apoapsis: " + sanitizeHTML(numeral(m.Apoapsis).format('0,0')) + " m<br>";
      strHTML += "Periapsis: " + sanitizeHTML(numeral(m.Periapsis).format('0,0')) + " m</p>";
    }

    var buttons = [];
    if (m.Eph !== null && (ops.pageType !== 'body' || currBodyName !== m.SOI)) {
      buttons.push({
        text: "View System",
        click: function() {
          $("#siteDialog").dialog("close");
          ops.pendingObjSelect = uid;
          loadBody(m.SOI);
        }
      });
    }
    buttons.push({ text: "Close", click: function() { $("#siteDialog").dialog("close"); } });

    $("#siteDialog").html(strHTML);
    $("#siteDialog").dialog("option", {
      title: "ATN Moonlet Discovery \u2014 " + sanitizeHTML(m.SOI),
      buttons: buttons
    });
    $("#siteDialog").dialog("open");
  }

  // Advance the chain
  if (!ops.updateMoonlets) ops.updateMoonlets = [];
  if (ops.updateMoonlets.length) {
    var nextUID = ops.updateMoonlets.shift();
    var nextM   = atnData.moonletMap[nextUID];
    if (nextM) {
      ops.updatesList.push({ type: "atn:moonlet", UT: nextM.DiscoveryDate, id: nextUID });
      ops.updatesList.sort(function(a, b) { return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0); });
    }
  }
}

// Append only newly-added values (indices >= prevCount) to a filter <select>.
// Keeps existing checked state intact by not touching earlier options.
function _appendNewFilterOptions(selectId, values, prevCount) {
  if (!values || values.length <= prevCount) return;
  var $sel = $('#' + selectId);
  for (var i = prevCount; i < values.length; i++) {
    $sel.append($('<option>').val(values[i]).text(values[i]));
  }
}

// ---------------------------------------------------------------------------
// Internal helpers: filter collection & single-asteroid scene render
// ---------------------------------------------------------------------------

function _collectATNFilters(record) {
  var f = KSA_CATALOGS.atnData.filters;
  if (!f.category) f.category = [];
  if (!f.size)     f.size     = [];
  if (!f.makeup)   f.makeup   = [];
  if (!f.type)     f.type     = [];
  if (!f.soicross) f.soicross = [];
  if (record.Category && f.category.indexOf(record.Category) === -1) f.category.push(record.Category);
  if (record.Class    && f.size    .indexOf(record.Class)     === -1) f.size    .push(record.Class);
  if (record.Makeup   && f.makeup  .indexOf(record.Makeup)    === -1) f.makeup  .push(record.Makeup);
  if (record.Type     && f.type    .indexOf(record.Type)      === -1) f.type    .push(record.Type);
  if (Array.isArray(record.SOIcross)) {
    record.SOIcross.forEach(function(b) {
      if (f.soicross.indexOf(b) === -1) f.soicross.push(b);
    });
  }
  if (record.DiscoveryDate !== null && record.DiscoveryDate !== undefined) {
    var dd = parseFloat(record.DiscoveryDate);
    if (!isNaN(dd)) {
      if (f.discoveryDateMin === undefined || dd < f.discoveryDateMin) f.discoveryDateMin = dd;
      if (f.discoveryDateMax === undefined || (dd > f.discoveryDateMax && dd <= currUT())) f.discoveryDateMax = dd;
    }
  }2
}

// Populate all ATN filter dropdowns from KSA_CATALOGS.atnData.filters and wire up event handlers.
// Build a UID→record lookup map for fast applyATNFilters() access.
// Called once from declutterScene() when ops.pageType == "atn".
function populateATNFilters() {
  var f = KSA_CATALOGS.atnData.filters;

  // Build UID→record map for O(1) lookups in applyATNFilters()
  KSA_CATALOGS.atnData.roidMap = {};
  KSA_CATALOGS.atnData.roids.forEach(function(r) {
    KSA_CATALOGS.atnData.roidMap[r.UID] = r;
  });

  // Helper: populate a checkmark-style dropdown from a values array, then wire change handler
  function populateCheckSelect(id, values) {
    var $sel = $('#' + id);
    $sel.find('option:not(:first)').remove();
    values.slice().sort().forEach(function(v) {
      $sel.append($('<option>').val(v).text(v));
    });
    $sel.off('change.atnFilter').on('change.atnFilter', function() {
      var idx = this.selectedIndex;
      if (idx === 0) return;
      var $opt = $(this).find('option').eq(idx);
      var txt = $opt.text();
      $opt.text(txt.startsWith('\u2714 ') ? txt.substring(2) : '\u2714 ' + txt);
      this.selectedIndex = 0;
      applyATNFilters();
    });
    $sel.off('contextmenu.atnFilter').on('contextmenu.atnFilter', function(e) {
      var idx = this.selectedIndex;
      if (idx === 0) return;
      e.preventDefault();
      // Solo this item: remove all checkmarks, then check only the right-clicked one
      $(this).find('option:not(:first)').each(function() {
        var t = $(this).text();
        if (t.startsWith('\u2714 ')) $(this).text(t.substring(2));
      });
      var $opt = $(this).find('option').eq(idx);
      $opt.text('\u2714 ' + $opt.text());
      this.selectedIndex = 0;
      applyATNFilters();
    });
  }

  populateCheckSelect('atnFilterCategory', f.category || []);
  populateCheckSelect('atnFilterSize',     f.size     || []);
  populateCheckSelect('atnFilterMakeup',   f.makeup   || []);
  populateCheckSelect('atnFilterType',     f.type     || []);
  populateCheckSelect('atnFilterSOI',      f.soicross || []);

  // Date filters: intercept click to open date picker dialog instead of dropdown
  $('#atnFilterAfter, #atnFilterBefore').off('mousedown.atnFilter').on('mousedown.atnFilter', function(e) {
    e.preventDefault();
    $(this).blur();
    _openATNDatePicker(this.id === 'atnFilterAfter' ? 'after' : 'before');
  });

  // Encounters checkbox
  $('#atnFilterEncounters').off('change.atnFilter').on('change.atnFilter', applyATNFilters);

  // Show the filter bar and search controls
  $('#atnFilterControls').show();
  $('#atnSearchControls').show();

  // Re-enable the search button (all <button> elements are globally disabled on page init via jQuery UI)
  $('#atnSearchBtn').button('enable');

  // Initialise catalog count (all currently-discoverable asteroids); filter count hidden until a filter narrows it
  $('#atnCatalogCount').text('Total Catalog Count: ' + KSA_CATALOGS.atnData.catalogCount.toLocaleString());
  $('#atnFilterCount').hide();

  // Wire up search button, clear-on-focus, and Enter key (off first to avoid duplicate bindings on re-runs)
  $('#atnSearchBtn').off('click.atnSearch').on('click.atnSearch', searchATNAsteroid);
  $('#atnUIDSearch').off('focus.atnSearch keydown.atnSearch')
    .on('focus.atnSearch', function() { $(this).val(''); })
    .on('keydown.atnSearch', function(e) { if (e.key === 'Enter') searchATNAsteroid(); });
}

// Open a simple date-only picker dialog to set an ATN "Discovered After/Before" filter.
// which: 'after' | 'before'
function _openATNDatePicker(which) {
  var $select  = which === 'after' ? $('#atnFilterAfter') : $('#atnFilterBefore');
  var storedUT = parseFloat($select.find('option').eq(1).val());
  var f        = KSA_CATALOGS.atnData.filters;
  var minUT    = f.discoveryDateMin !== undefined ? f.discoveryDateMin : 0;
  var maxUT    = f.discoveryDateMax !== undefined ? f.discoveryDateMax : currUT();

  // Pre-fill from stored value, or from the earliest/latest boundary
  var d;
  if (!isNaN(storedUT)) {
    d = KSA_CONSTANTS.FOUNDING_MOMENT.plus({ seconds: storedUT });
  } else if (which === 'after') {
    d = KSA_CONSTANTS.FOUNDING_MOMENT.plus({ seconds: minUT });
  } else {
    d = KSA_CONSTANTS.FOUNDING_MOMENT.plus({ seconds: maxUT });
  }

  var html = "<div style='padding:10px;'>";
  html += "<label style='margin-right:5px;'>Date (UTC):</label>";
  html += "<input type='number' id='atnDateMonth' style='width:40px' min='1' max='12' value='" + d.month + "'> / ";
  html += "<input type='number' id='atnDateDay'   style='width:40px' min='1' max='31' value='" + d.day   + "'> / ";
  html += "<input type='number' id='atnDateYear'  style='width:60px'                  value='" + d.year  + "'>";
  html += "<p id='atnDateError' style='color:red;font-size:11px;margin-top:8px;display:none;'></p>";
  html += "</div>";

  $("#siteDialog").html(html);
  $("#siteDialog").dialog("option", {
    title: which === 'after' ? 'Discovered After' : 'Discovered Before',
    width: 340,
    buttons: [
      {
        text: "Apply",
        click: function() {
          var month = parseInt($("#atnDateMonth").val());
          var day   = parseInt($("#atnDateDay").val());
          var year  = parseInt($("#atnDateYear").val());
          if (isNaN(month) || isNaN(day) || isNaN(year) ||
              month < 1 || month > 12 || day < 1 || day > 31) {
            $("#atnDateError").text("Please enter a valid date.").show();
            return;
          }
          var dt = luxon.DateTime.utc(year, month, day);
          if (!dt.isValid) { $("#atnDateError").text("Invalid date.").show(); return; }
          var ut = dateToUT(dt);

          // Cross-filter constraints
          var afterUT  = parseFloat($('#atnFilterAfter') .find('option').eq(1).val());
          var beforeUT = parseFloat($('#atnFilterBefore').find('option').eq(1).val());
          if (which === 'after') {
            if (ut < minUT) {
              ut = minUT;
            }
            if (!isNaN(beforeUT) && ut > beforeUT) {
              ut = beforeUT;
            }
          } else {
            if (ut > maxUT) {
              ut = maxUT;
            }
            if (!isNaN(afterUT) && ut < afterUT) {
              ut = afterUT;
            }
          }

          $select.find('option').eq(1).val(ut).text(month + '/' + day + '/' + year);
          $("#siteDialog").dialog("close");
          applyATNFilters();
        }
      },
      {
        text: "Set Today",
        click: function() {
          var today = KSA_CONSTANTS.FOUNDING_MOMENT.plus({ seconds: currUT() });
          $("#atnDateMonth").val(today.month);
          $("#atnDateDay").val(today.day);
          $("#atnDateYear").val(today.year);
          $("#atnDateError").hide();
        }
      },
      {
        text: "Cancel",
        click: function() { $("#siteDialog").dialog("close"); }
      }
    ]
  });
  $("#siteDialog").dialog("open");
}

// Evaluate all ATN filter controls and show/hide asteroid orbital entries accordingly.
// Reads current state from the DOM; sets entry.isHidden and adjusts mesh visibility.
function applyATNFilters() {
  var roidMap  = KSA_CATALOGS.atnData.roidMap || {};
  var orbitsOn = $("#orbits").is(":checked");
  var labelsOn = $("#labels").is(":checked");
  var nodesOn  = orbitsOn && $("#nodes").is(":checked");
  var onlyEnc  = $("#atnFilterEncounters").is(":checked");

  // Date filter bounds (null = no constraint)
  var afterUT  = parseFloat($('#atnFilterAfter') .find('option').eq(1).val());
  var beforeUT = parseFloat($('#atnFilterBefore').find('option').eq(1).val());
  afterUT  = isNaN(afterUT)  ? null : afterUT;
  beforeUT = isNaN(beforeUT) ? null : beforeUT;

  // Active checkmark values for each multi-select dropdown
  function getChecked(id) {
    var vals = [];
    $('#' + id + ' option:not(:first)').each(function() {
      if ($(this).text().startsWith('\u2714 ')) vals.push($(this).val());
    });
    return vals;
  }
  var activeCategories = getChecked('atnFilterCategory');
  var activeSizes      = getChecked('atnFilterSize');
  var activeMakeups    = getChecked('atnFilterMakeup');
  var activeTypes      = getChecked('atnFilterType');
  var activeSOIs       = getChecked('atnFilterSOI');

  ops.orbits.forEach(function(item) {
    if (item.type !== 'asteroid' || !item.meshes) return;
    var record = roidMap[item.db];
    if (!record) return;

    var show = true;
    if (afterUT  !== null && record.DiscoveryDate < afterUT)  show = false;
    if (show && beforeUT !== null && record.DiscoveryDate > beforeUT) show = false;
    if (show && activeCategories.length && activeCategories.indexOf(record.Category) === -1) show = false;
    if (show && activeSizes     .length && activeSizes     .indexOf(record.Class)    === -1) show = false;
    if (show && activeMakeups   .length && activeMakeups   .indexOf(record.Makeup)   === -1) show = false;
    if (show && activeTypes     .length && activeTypes     .indexOf(record.Type)     === -1) show = false;
    if (show && activeSOIs.length) {
      var hasSOI = Array.isArray(record.SOIcross) &&
                   record.SOIcross.some(function(b) { return activeSOIs.indexOf(b) !== -1; });
      if (!hasSOI) show = false;
    }
    if (show && onlyEnc && record.Type !== 'Encounter') show = false;

    item.isHidden = !show;
    if (show) {
      _setVisible(item.meshes.position, true);
      _setVisible(item.meshes.orbit,    orbitsOn);
      _setVisible(item.meshes.label,    labelsOn);
      _setVisible(item.meshes.penode,   nodesOn);
      _setVisible(item.meshes.apnode,   nodesOn);
      _setVisible(item.meshes.anode,    nodesOn);
      _setVisible(item.meshes.dnode,    nodesOn);
    } else {
      _setVisible(item.meshes.position, false);
      _setVisible(item.meshes.orbit,    false);
      _setVisible(item.meshes.label,    false);
      _setVisible(item.meshes.penode,   false);
      _setVisible(item.meshes.apnode,   false);
      _setVisible(item.meshes.anode,    false);
      _setVisible(item.meshes.dnode,    false);
    }
  });

  // Update count spans
  var visibleCount = 0;
  ops.orbits.forEach(function(item) {
    if (item.type === 'asteroid' && item.meshes && !item.isHidden) visibleCount++;
  });
  if (visibleCount === KSA_CATALOGS.atnData.catalogCount) {
    $('#atnFilterCount').hide();
  } else {
    $('#atnFilterCount').text(' | Total Filter Count: ' + visibleCount.toLocaleString()).show();
  }
}

function _renderAsteroid(record) {
  var uid      = record.UID;
  var orbitID  = uid.replace(/-/g, '').replace(/\s/g, '');
  var colorKey = atnCategoryColorKey(record.Category);
  var colorHex = (KSA_COLORS.asteroidColors[colorKey] || '#888888').replace('#', '');
  var colorInt = parseInt(colorHex, 16);

  // Orbital elements — same conversions as addOrbitAJAX
  var ecc        = parseFloat(record.Ecc) || 0;
  var sma        = (ecc >= 1) ? Math.abs(parseFloat(record.SMA) || 1)
                              : (parseFloat(record.SMA) || 1);
  var inc        = Math.radians(parseFloat(record.inc)  || 0);
  var raan       = Math.radians(parseFloat(record.RAAN) || 0);
  var arg        = Math.radians(parseFloat(record.Arg)  || 0);
  var mean0      = toMeanAnomaly(Math.radians(parseFloat(record.TrueAnom) || 0), ecc);
  var epoch      = parseFloat(record.Eph);
  var period     = parseFloat(record.OrbitalPeriod);
  var meanMotion = (period && period > 0) ? (2 * Math.PI) / period : 0;

  // Current position
  var ut      = currUT();
  var meanNow = computeMeanAnomalyAtUT(mean0, meanMotion, ut, epoch, ecc);
  var eccNow  = solveKeplerEquation(meanNow, ecc);
  var posNow  = positionOnOrbit(sma, ecc, inc, raan, arg, eccNow);
  var nodeR   = threeNodeRadius;

  // Orbit line — no atmosphere clipping (atmoR = 0) for heliocentric Kerbol
  var orbitLine = _buildOrbitGroup(
    orbitalElementsToEllipsePoints(sma, ecc, inc, raan, arg, 128, 0),
    colorInt, 0, orbitID
  );
  threeScene.add(orbitLine);

  // Node markers (Pe/Ap for eccentric; AN/DN for inclined)
  var nodePositions = computeNodePositions(sma, ecc, inc, raan, arg);
  var penode = null, apnode = null, anode = null, dnode = null;
  if (ecc) {
    penode = _makeNodeMarker(nodePositions.periapsis, '0099ff', nodeR);
    penode.add(_makeBodyLabel("Pe", '0099ff',  0,  14));
    threeScene.add(penode);
    if (nodePositions.apoapsis) {
      apnode = _makeNodeMarker(nodePositions.apoapsis, '0099ff', nodeR);
      apnode.add(_makeBodyLabel("Ap", '0099ff',  0, -14));
      threeScene.add(apnode);
    }
  }
  if (inc) {
    if (nodePositions.ascendingNode) {
      anode = _makeNodeMarker(nodePositions.ascendingNode,  '33ff00', nodeR);
      anode.add(_makeBodyLabel("AN", '33ff00', -14,  0));
      threeScene.add(anode);
    }
    if (nodePositions.descendingNode) {
      dnode = _makeNodeMarker(nodePositions.descendingNode, '33ff00', nodeR);
      dnode.add(_makeBodyLabel("DN", '33ff00',  14,  0));
      threeScene.add(dnode);
    }
  }

  // Position sphere
  var posMesh = new THREE.Mesh(
    new THREE.SphereGeometry(nodeR * 1.5, 8, 8),
    new THREE.MeshBasicMaterial({ color: colorInt })
  );
  posMesh.position.copy(posNow);
  posMesh.userData.orbitId = orbitID;
  threeScene.add(posMesh);

  // Label: "[UID]([Class])" e.g. "KHI-002(C)"
  var label = _makeBodyLabel(uid + '(' + record.Class + ')', colorHex, 0, -13);
  label.position.set(0, 0, 0);
  posMesh.add(label);

  // Register/update entry in ops.orbits[]
  var entry = ops.orbits.find(function(o) { return o.id === orbitID; });
  if (!entry) {
    entry = { type: 'asteroid', id: orbitID, db: uid,
              showName: false, showNodes: false, isSelected: false,
              isHidden: false, obtLocked: false, meshes: null };
    ops.orbits.push(entry);
  } else if (entry.meshes) {
    // Duplicate orbitID (e.g. data entry error with the same UID appearing twice):
    // remove the previously-created scene objects so they don't become orphans.
    console.warn('[_renderAsteroid] Duplicate orbitID "' + orbitID + '" — removing stale meshes.');
    var _staleMeshes = [entry.meshes.orbit, entry.meshes.position,
                        entry.meshes.penode, entry.meshes.apnode,
                        entry.meshes.anode,  entry.meshes.dnode];
    _staleMeshes.forEach(function(m) {
      if (!m) return;
      threeScene.remove(m);
      m.traverse(function(obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    });
  }
  entry.orbitElements = { sma: sma, ecc: ecc, inc: inc, raan: raan, arg: arg,
                           mean0: mean0, meanMotion: meanMotion, epoch: epoch };
  entry.meshes = {
    sphere: null, orbit: orbitLine, soi: null, label: label,
    penode: penode, apnode: apnode, anode: anode, dnode: dnode, position: posMesh
  };
  _applyOrbitVisibility(entry);
}

// ---------------------------------------------------------------------------
// Step 4b: rebuild ATN scene from cached KSA_CATALOGS.atnData.roids[]
// Called by onSceneReady() when atnData.loaded == true
// ---------------------------------------------------------------------------
// Render asteroids from roids[] in chunks of BATCH_SIZE, yielding to the
// browser between each chunk (same pattern as orbitalCalc()). Calls onDone
// when the last chunk finishes.
function _populateATNScene(roids, index, onDone) {
  var BATCH_SIZE = 50;
  var end = Math.min(index + BATCH_SIZE, roids.length);
  for (var i = index; i < end; i++) {
    _renderAsteroid(roids[i]);
  }
  var pct = roids.length > 0 ? Math.round(end / roids.length * 100) : 100;
  $("#vesselLoaderMsg").html("Populating: " + pct + "%").css('left', '837px');
  if (end < roids.length) {
    if (ops.pageType !== "atn") return; // navigated away
    setTimeout(_populateATNScene, 1, roids, end, onDone);
  } else {
    if (ops.pageType !== "atn") return; // navigated away during final batch
    onDone();
  }
}

function rebuildATNScene() {
  var ut      = currUT();
  var atnData = KSA_CATALOGS.atnData;

  // Find the split point so we populate only the asteroids discovered by now.
  var splitIndex = atnData.roids.length;
  for (var i = 0; i < atnData.roids.length; i++) {
    if (atnData.roids[i].DiscoveryDate > ut) { splitIndex = i; break; }
  }
  atnData.catalogCount = splitIndex;

  $("#vesselLoaderMsg").spin(false);
  $("#vesselLoaderMsg").html("Populating: 0%").css('left', '837px');
  $("#vesselLoaderMsg").fadeIn();
  _populateATNScene(atnData.roids.slice(0, splitIndex), 0, function() {
    $("#vesselLoaderMsg").fadeOut();
    declutterScene();
  });
}

// ---------------------------------------------------------------------------
// Step 15c: Render a single encounter orbit in the current body scene.
// Skipped silently if any required orbital field is null or scene is absent.
// ---------------------------------------------------------------------------
function _renderEncounterOrbit(enc, bodyData) {
  if (!threeScene) return;
  if (enc.Eph === null || enc.SMA === null || enc.Ecc === null ||
      enc.inc === null || enc.RAAN === null || enc.Arg === null ||
      enc.TrueAnom === null) return;

  var uid      = enc.UID;
  var orbitID  = uid.replace(/-/g, '');
  var colorHex = KSA_COLORS.orbitColors["asteroid"].replace('#', '');
  var colorInt = parseInt(colorHex, 16);

  var ecc  = parseFloat(enc.Ecc);
  var sma  = (ecc >= 1) ? Math.abs(parseFloat(enc.SMA)) : parseFloat(enc.SMA);  // km
  var inc  = Math.radians(parseFloat(enc.inc)  || 0);
  var raan = Math.radians(parseFloat(enc.RAAN) || 0);
  var arg  = Math.radians(parseFloat(enc.Arg)  || 0);
  var mean0      = toMeanAnomaly(Math.radians(parseFloat(enc.TrueAnom) || 0), ecc);
  var mu_si      = (parseFloat(bodyData.Gm) || 0) * 1e9;  // km³/s² → m³/s²
  var sma_m      = sma * 1000;
  var period     = (mu_si > 0) ? 2 * Math.PI * Math.sqrt(sma_m * sma_m * sma_m / mu_si) : 1;
  var meanMotion = (2 * Math.PI) / period;

  var ut      = currUT();
  var meanNow = computeMeanAnomalyAtUT(mean0, meanMotion, ut, enc.Eph, ecc);
  var eccNow  = solveKeplerEquation(meanNow, ecc);
  var nodeR   = threeNodeRadius;
  var soiR    = _soiRadiusKm(bodyData);

  var showPositionSphere = true;
  if (ecc >= 1) {
    var FMax;
    if (soiR > 0) {
      var coshFMax = (soiR / sma + 1) / ecc;
      if (coshFMax >= 1) FMax = Math.acosh(coshFMax);
    }
    if (!FMax) {
      var thetaMax = Math.acos(-1 / ecc) * 0.99;
      FMax = 2 * Math.atanh(Math.sqrt((ecc - 1) / (ecc + 1)) * Math.tan(thetaMax / 2));
    }
    if (Math.abs(eccNow) > FMax) showPositionSphere = false;
  }

  var centralAtmoR = _atmoRadiusKm(bodyData);
  var orbitLine = _buildOrbitGroup(
    orbitalElementsToEllipsePoints(sma, ecc, inc, raan, arg, 128, soiR),
    colorInt, centralAtmoR, orbitID
  );
  threeScene.add(orbitLine);

  var nodePositions = computeNodePositions(sma, ecc, inc, raan, arg);
  var penode = null, apnode = null, anode = null, dnode = null;
  if (ecc) {
    penode = _makeNodeMarker(nodePositions.periapsis, '0099ff', nodeR);
    penode.add(_makeBodyLabel('Pe', '0099ff', 0, 14));
    threeScene.add(penode);
    if (nodePositions.apoapsis) {
      apnode = _makeNodeMarker(nodePositions.apoapsis, '0099ff', nodeR);
      apnode.add(_makeBodyLabel('Ap', '0099ff', 0, -14));
      threeScene.add(apnode);
    }
  }
  if (inc) {
    if (nodePositions.ascendingNode) {
      anode = _makeNodeMarker(nodePositions.ascendingNode, '33ff00', nodeR);
      anode.add(_makeBodyLabel('AN', '33ff00', -14, 0));
      threeScene.add(anode);
    }
    if (nodePositions.descendingNode) {
      dnode = _makeNodeMarker(nodePositions.descendingNode, '33ff00', nodeR);
      dnode.add(_makeBodyLabel('DN', '33ff00', 14, 0));
      threeScene.add(dnode);
    }
  }

  var labelText = 'ATN ' + uid + ' (' + enc.Class + ')';
  var posMesh = null, label = null;
  if (showPositionSphere) {
    var posNow = positionOnOrbit(sma, ecc, inc, raan, arg, eccNow);
    posMesh = new THREE.Mesh(
      new THREE.SphereGeometry(nodeR * 1.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: colorInt })
    );
    posMesh.position.copy(posNow);
    posMesh.userData.orbitId = orbitID;
    threeScene.add(posMesh);
    label = _makeBodyLabel(labelText, colorHex, 0, -13);
    label.position.set(0, 0, 0);
    posMesh.add(label);
  } else if (penode) {
    label = _makeBodyLabel(labelText, colorHex, 0, -13);
    label.position.set(0, 0, 0);
    penode.add(label);
  }

  $('#asteroid-filter').prop('disabled', false).prop('checked', true);
  $('#asteroid-label').css('color', '#' + colorHex);
  if ($('#figure').is(':visible') && ops.pageType === 'body' &&
      !window.location.href.includes('&map') && !KSA_UI_STATE.isMapShown) {
    $('#vesselOrbitTypes').fadeIn();
  }

  ops.orbits.push({
    type:        'asteroid',
    id:          orbitID,
    db:          uid,
    showName:    false,
    showNodes:   false,
    isSelected:  false,
    isHidden:    false,
    obtLocked:   false,
    isUrlOrbit:  false,
    exitUT:      enc.ExitUT,      // remove from scene once currUT passes ExitUT
    orbitElements: { sma: sma, ecc: ecc, inc: inc, raan: raan, arg: arg,
                     mean0: mean0, meanMotion: meanMotion, epoch: enc.Eph },
    meshes: {
      sphere:   null,
      orbit:    orbitLine,
      soi:      null,
      label:    label,
      penode:   penode,
      apnode:   apnode,
      anode:    anode,
      dnode:    dnode,
      position: posMesh
    }
  });
}

// Render all encounters currently active (EncounterUT ≤ ut ≤ ExitUT) for bodyName.
function _renderEncountersForBody(bodyName, ut) {
  var atnData = KSA_CATALOGS.atnData;
  if (!Object.keys(atnData.encMap).length) return;
  var bodyData = ops.bodyCatalog.find(function(o) { return o.Body === bodyName; });
  if (!bodyData) return;
  Object.values(atnData.encMap).forEach(function(enc) {
    if (enc.SOI !== bodyName) return;
    if (enc.Eph === null || enc.EncounterUT === null || enc.ExitUT === null) return;
    if (ut < enc.EncounterUT || ut > enc.ExitUT) return;
    _renderEncounterOrbit(enc, bodyData);
  });
}

// ---------------------------------------------------------------------------
// Step 16a: Render a single moonlet orbit in the current body scene.
// ---------------------------------------------------------------------------
function _renderMoonletOrbit(moonlet, bodyData) {
  if (!threeScene) return;
  if (moonlet.Eph === null || moonlet.SMA === null || moonlet.Ecc === null ||
      moonlet.inc === null || moonlet.RAAN === null || moonlet.Arg === null ||
      moonlet.TrueAnom === null) return;

  var uid      = moonlet.UID;
  var orbitID  = uid.replace(/-/g, '');
  var colorHex = KSA_COLORS.orbitColors["asteroid"].replace('#', '');
  var colorInt = parseInt(colorHex, 16);

  var ecc  = parseFloat(moonlet.Ecc);
  var sma  = parseFloat(moonlet.SMA);  // km, elliptic
  var inc  = Math.radians(parseFloat(moonlet.inc)  || 0);
  var raan = Math.radians(parseFloat(moonlet.RAAN) || 0);
  var arg  = Math.radians(parseFloat(moonlet.Arg)  || 0);
  var mean0      = toMeanAnomaly(Math.radians(parseFloat(moonlet.TrueAnom) || 0), ecc);
  var mu_si      = (parseFloat(bodyData.Gm) || 0) * 1e9;
  var sma_m      = sma * 1000;
  var period     = (mu_si > 0) ? 2 * Math.PI * Math.sqrt(sma_m * sma_m * sma_m / mu_si)
                               : (parseFloat(moonlet.OrbitalPeriod) || 1);
  var meanMotion = (2 * Math.PI) / period;

  var ut      = currUT();
  var meanNow = computeMeanAnomalyAtUT(mean0, meanMotion, ut, moonlet.Eph, ecc);
  var eccNow  = solveKeplerEquation(meanNow, ecc);
  var nodeR   = threeNodeRadius;
  var soiR    = _soiRadiusKm(bodyData);

  var centralAtmoR = _atmoRadiusKm(bodyData);
  var orbitLine = _buildOrbitGroup(
    orbitalElementsToEllipsePoints(sma, ecc, inc, raan, arg, 128, soiR),
    colorInt, centralAtmoR, orbitID
  );
  threeScene.add(orbitLine);

  var nodePositions = computeNodePositions(sma, ecc, inc, raan, arg);
  var penode = null, apnode = null, anode = null, dnode = null;
  if (ecc) {
    penode = _makeNodeMarker(nodePositions.periapsis, '0099ff', nodeR);
    penode.add(_makeBodyLabel('Pe', '0099ff', 0, 14));
    threeScene.add(penode);
    if (nodePositions.apoapsis) {
      apnode = _makeNodeMarker(nodePositions.apoapsis, '0099ff', nodeR);
      apnode.add(_makeBodyLabel('Ap', '0099ff', 0, -14));
      threeScene.add(apnode);
    }
  }
  if (inc) {
    if (nodePositions.ascendingNode) {
      anode = _makeNodeMarker(nodePositions.ascendingNode, '33ff00', nodeR);
      anode.add(_makeBodyLabel('AN', '33ff00', -14, 0));
      threeScene.add(anode);
    }
    if (nodePositions.descendingNode) {
      dnode = _makeNodeMarker(nodePositions.descendingNode, '33ff00', nodeR);
      dnode.add(_makeBodyLabel('DN', '33ff00', 14, 0));
      threeScene.add(dnode);
    }
  }

  var labelText = 'ATN ' + uid + ' (' + moonlet.Class + ')';
  var posNow = positionOnOrbit(sma, ecc, inc, raan, arg, eccNow);
  var posMesh = new THREE.Mesh(
    new THREE.SphereGeometry(nodeR * 1.5, 8, 8),
    new THREE.MeshBasicMaterial({ color: colorInt })
  );
  posMesh.position.copy(posNow);
  posMesh.userData.orbitId = orbitID;
  threeScene.add(posMesh);
  var label = _makeBodyLabel(labelText, colorHex, 0, -13);
  label.position.set(0, 0, 0);
  posMesh.add(label);

  $('#asteroid-filter').prop('disabled', false).prop('checked', true);
  $('#asteroid-label').css('color', '#' + colorHex);
  if ($('#figure').is(':visible') && ops.pageType === 'body' &&
      !window.location.href.includes('&map') && !KSA_UI_STATE.isMapShown) {
    $('#vesselOrbitTypes').fadeIn();
  }

  ops.orbits.push({
    type:        'asteroid',
    id:          orbitID,
    db:          uid,
    showName:    false,
    showNodes:   false,
    isSelected:  false,
    isHidden:    false,
    obtLocked:   false,
    isUrlOrbit:  false,
    orbitElements: { sma: sma, ecc: ecc, inc: inc, raan: raan, arg: arg,
                     mean0: mean0, meanMotion: meanMotion, epoch: moonlet.Eph },
    meshes: {
      sphere:   null,
      orbit:    orbitLine,
      soi:      null,
      label:    label,
      penode:   penode,
      apnode:   apnode,
      anode:    anode,
      dnode:    dnode,
      position: posMesh
    }
  });
}

// Render all moonlets discovered (DiscoveryDate ≤ ut) for bodyName.
function _renderMoonletsForBody(bodyName, ut) {
  var atnData = KSA_CATALOGS.atnData;
  if (!Object.keys(atnData.moonletMap).length) return;
  var bodyData = ops.bodyCatalog.find(function(o) { return o.Body === bodyName; });
  if (!bodyData) return;
  Object.values(atnData.moonletMap).forEach(function(m) {
    if (m.SOI !== bodyName) return;
    if (m.Eph === null || m.DiscoveryDate > ut) return;
    _renderMoonletOrbit(m, bodyData);
  });
}

// ---------------------------------------------------------------------------
// Step 5: stream ATN main catalog, report progress, then batch-render all at once
// Called by onSceneReady() when atnData.loaded == false
// ---------------------------------------------------------------------------
function loadATNCatalog() {
  var atnData = KSA_CATALOGS.atnData;
  var url = "database/atn/main/atn_main_" + atnData.indexUTs.main + ".json.txt";
  var ut  = currUT();

  loadJsonTxt(url,

    // Completion callback — fires when XHR is done; configure updates then batch-render
    function(err) {
      if (ops.pageType !== "atn") return;
      if (err) console.error('[loadATNCatalog] Failed to load:', err);

      // Find the split point: catalog is sorted by DiscoveryDate, so past records come first.
      // splitIndex is the exact count of asteroids that will be rendered at the current UT.
      var splitIndex = atnData.roids.length;
      for (var i = 0; i < atnData.roids.length; i++) {
        if (atnData.roids[i].DiscoveryDate > ut) { splitIndex = i; break; }
      }

      // Pre-set catalogCount before populating so applyATNFilters has the correct total immediately.
      atnData.catalogCount = splitIndex;

      // Build the future-discovery update queue from records beyond the split.
      ops.updateATN = splitIndex < atnData.roids.length
        ? atnData.roids.slice(splitIndex).map(function(r) { return r.UID; })
        : [];

      $("#vesselLoaderMsg").spin(false);
      $("#vesselLoaderMsg").html("Populating: 0%").css('left', '837px');

      // Populate only the past-records slice; percentage is now accurate.
      _populateATNScene(atnData.roids.slice(0, splitIndex), 0, function() {
        atnData.loaded = true;

        // Seed the ATN main update chain with the first future discovery.
        if (ops.updateATN && ops.updateATN.length) {
          var firstUID = ops.updateATN.shift();
          var firstRec = atnData.roidMap[firstUID];
          if (firstRec) {
            ops.updatesList.push({ type: "atn:main", UT: firstRec.DiscoveryDate, id: firstUID });
            ops.updatesList.sort(function(a, b) { return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0); });
          }
        }

        $("#vesselLoaderMsg").fadeOut();
        declutterScene();
      });
    },

    // Progress callback — update the loading percentage
    function(loaded, total, lengthComputable) {
      if (ops.pageType !== "atn") return;
      if (lengthComputable && total > 0) {
        var pct = Math.round(loaded / total * 100);
        $("#vesselLoaderMsg").html("Loading ATN catalog: " + pct + "%").css('left', '775px');
      }
    },

    // Item callback — collect all records; update queue is built in the completion callback
    function(record) {
      if (record.Eph === null || record.Category === "Moonlet") return;
      _collectATNFilters(record);
      atnData.roids.push(record);
      atnData.roidMap[record.UID] = record;
    }
  );
}

// ---------------------------------------------------------------------------
// load a new Three.js figure into the main content window
// ---------------------------------------------------------------------------
function loadBody(body = "Kerbol-System", flt) {
  if (!body) return;
  
  // an attempt was made to load orbital data for an inactive vessel. Can. Not. Compute.
  if (body == "inactive") return;

  // can't continue if body data hasn't loaded
  if (!ops.bodyCatalog.length) return setTimeout(loadBody, 50, body);

  // if there is already a body loading then try calling back later
  if (ops.bodyCatalog.find(o => o.selected === true) && !KSA_UI_STATE.is3JSLoaded) return setTimeout(loadBody, 50, body);

  // hide the map just in case it's open
  hideMap();

  // only do any of this if the current page is set to body or atn
  // if not, a vessel page is changing the figure because the current vessel body was not loaded
  if (ops.pageType == "body") {
    if (!body.includes("-") && (ops.bodyCatalog.find(o => o.Body === body).Moons || body == "Kerbol")) body += "-System";
    $("#contentHeader").spin(false);
    $("#tags").fadeIn();
    $("#contentTitle").html(sanitizeHTML(body.replace("-", " ")));
    document.title = "KSA Operations Tracker" + " - " + sanitizeHTML(body.replace("-", " "));
    
    // if this is the first page to load, replace the current history
    // don't create a new entry if this is the same page being reloaded
    if (!history.state) {
      if (window.location.href.includes("&")) var strURL = window.location.href;
      else var strURL = "http://www.kerbalspace.agency/Tracker/tracker.html?body=" + body;
      history.replaceState({type: "body", id: body}, document.title, strURL.replace("&live", "").replace("&reload", "")); 
    } else if (history.state.id != body) {
      var strURL = "http://www.kerbalspace.agency/Tracker/tracker.html?body=" + body;
      if (flt) strURL += "&flt=" + flt;
      history.pushState({type: "body", id: body}, document.title, strURL); 
    }

    // if body was already loaded & we are switching to it then just exit at this point
    // scene3JSContext must also be "body" — if it was built for ATN, a full rebuild is needed
    if (KSA_UI_STATE.is3JSLoaded && KSA_UI_STATE.scene3JSContext == "body" && ops.bodyCatalog.find(o => o.selected === true) && ops.bodyCatalog.find(o => o.selected === true).Body == body.split("-")[0]) { 

      // if it was loaded behind a vessel page, show all the details for a bit
      if (KSA_UI_STATE.isDirty) {
        // scene is intact; just ensure it is visible and up-to-date
        KSA_UI_STATE.isDirty = false;
      }
      return;
    }
  
  // if this is a vessel page calling the load then set a flag to let us know the figure will need to be reset next time it is shown
  } else if (ops.pageType == "vessel") KSA_UI_STATE.isDirty = true;

  // stop any ongoing orbit calculations
  // this should take effect by the time loadSurfaceTracks() is called
  KSA_UI_STATE.isSfcObtRenderTerminated = true;

  // reset body paths so they get properly reloaded for the new body
  // this will also prevent selectVesselOnBodyMap() from potentially calling itself far longer than it should before giving up
  KSA_CATALOGS.bodyPaths.paths.length = 0;
  KSA_CATALOGS.bodyPaths.layers.length = 0;

  // clean up any orbital layers for the vessel before nulling it out
  if (ops.currentVesselPlot) {
    for (var data in ops.currentVesselPlot.obtData) {
      var obtPlot = ops.currentVesselPlot.obtData[data];
      if (obtPlot && obtPlot.layer && ops.surface.map.hasLayer(obtPlot.layer)) {
        ops.surface.map.removeLayer(obtPlot.layer);
      }
    }
  }
  ops.currentVesselPlot = null;

  // update the current body & system
  if (ops.bodyCatalog.find(o => o.selected === true)) ops.bodyCatalog.find(o => o.selected === true).selected = false;
  ops.bodyCatalog.find(o => o.Body === body.split("-")[0]).selected = true;
  
  // hide and reset stuff
  $("#figureOptions").fadeOut();
  KSA_UI_STATE.scene3JSContext = ops.pageType;
  KSA_UI_STATE.is3JSLoaded = false;

  // tear down any existing Three.js scene before creating a new one
  disposeScene();

  // remove and add the figure container
  $("#figure").remove();
  $("#contentBox").append("<div id='figure'></div>");

  // add the reset view button — hidden at load, revealed by declutterScene()
  $("#figure").append('<div id="threeResetBtn" style="position:absolute;top:8px;right:8px;display:none;cursor:pointer;font-size:18px;color:white;z-index:10;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;" onclick="resetFigure()"><i class="fa-solid fa-rotate"></i></div>');

  // add the ATN export button — hidden at load, revealed by declutterScene() for ATN pages only
  $("#figure").append('<div id="atnExportBtn" style="position:absolute;bottom:8px;right:8px;display:none;cursor:pointer;font-size:18px;color:white;z-index:10;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;" onclick="exportATNData()"><i class="fa-solid fa-file-csv"></i></div>');

  // hide it if this isn't a body or atn page
  if (ops.pageType != "body" && ops.pageType != "atn") $("#figure").hide();

  var figWidth  = w2utils.getSize("#contentBox", 'width');
  var figHeight = 885;
  initScene(figWidth, figHeight);

  // scene is ready synchronously — proceed to onSceneReady
  // (spinner stays on until onSceneReady hides it once menu data is available)
  $("#contentBox").spin({ position: 'relative', top: '50%', left: '50%' });
  setTimeout(onSceneReady, 0);
}

// load the data for all the bodies in the Kerbol system
function loadBodyAJAX(bodies) {
  bodies.forEach(function(body) {
    body.selected = false;
  });
  ops.bodyCatalog = bodies;
}

// Inject the orbit described by ops.pendingOrbitParam (parsed from the ?orbit= URL parameter)
// into the current Three.js scene.  Called from onSceneReady() after buildBodyScene() so that
// threeNodeRadius and body catalog data are both ready.
// Format: Bodyname,VessName,Eph,SMA,Ecc,Inc,RAAN,Arg,TrueAnom,Type
//   Angles (Inc, RAAN, Arg, TrueAnom) are in degrees.  SMA is in km.
//   Type is the first half of the [type]-filter checkbox id (e.g. "probe", "ship").
function injectOrbitParam() {
  var p = ops.pendingOrbitParam;
  if (!p) return;
  ops.pendingOrbitParam = null;

  var bodyData = ops.bodyCatalog.find(function(o) { return o.selected === true; });
  if (!bodyData || !threeScene) return;

  // Derive the scene object key (mirrors the sanitisation in addOrbitAJAX)
  var vesselName = p.vesselName;
  var orbitID    = vesselName.replace("-", "").replace(" ", "");

  // Colour from vessel type (fall back to grey if unknown)
  var colorHex = (KSA_COLORS.orbitColors[p.type] || '#aaaaaa').replace('#', '');
  var colorInt  = parseInt(colorHex, 16);

  // Orbital elements — URL param angles are degrees; convert to radians.  SMA stays in km.
  // KSP stores hyperbolic SMA as a negative value; all rendering/math functions expect positive.
  var ecc  = p.ecc;
  var sma  = (ecc >= 1) ? Math.abs(p.sma) : p.sma;
  var inc  = Math.radians(p.inc);
  var raan = Math.radians(p.raan);
  var arg  = Math.radians(p.arg);

  // Convert the given TrueAnom (at epoch) to mean anomaly at epoch
  var mean0 = toMeanAnomaly(Math.radians(p.trueAnom), ecc);

  // Derive orbital period from the central body's gravitational parameter.
  // Gm is stored in km³/s²; convert to m³/s² for Kepler's third law.
  var mu_si    = (parseFloat(bodyData.Gm) || 0) * 1e9;      // km³/s² → m³/s²
  var sma_m    = sma * 1000;                                 // km → m
  var period   = (mu_si > 0) ? 2 * Math.PI * Math.sqrt(sma_m * sma_m * sma_m / mu_si) : 1;
  var meanMotion = (2 * Math.PI) / period;

  // Propagate to current UT
  var ut      = currUT();
  var meanNow = computeMeanAnomalyAtUT(mean0, meanMotion, ut, p.eph, ecc);
  var eccNow  = solveKeplerEquation(meanNow, ecc);

  // For hyperbolic orbits: check whether the propagated position is still on the rendered arc.
  // Compare |F_now| directly against FMax — the same arc limit used by orbitalElementsToEllipsePoints —
  // rather than converting to true anomaly, to avoid sign/precision discrepancies.
  var soiR = _soiRadiusKm(bodyData);

  var showPositionSphere = true;
  if (ecc >= 1) {
    // Use the same FMax as the arc builder so the position sphere is only hidden
    // when it would fall outside the drawn trajectory.
    var FMax;
    if (soiR > 0) {
      var coshFMax = (soiR / sma + 1) / ecc; // sma already abs'd above for hyperbolic
      if (coshFMax >= 1) FMax = Math.acosh(coshFMax);
    }
    if (!FMax) {
      var sqrtRatio = Math.sqrt((ecc - 1) / (ecc + 1));
      var thetaMax  = Math.acos(-1 / ecc) * 0.99;
      FMax = 2 * Math.atanh(sqrtRatio * Math.tan(thetaMax / 2));
    }
    if (Math.abs(eccNow) > FMax) showPositionSphere = false;
  }

  var nodeR = threeNodeRadius;

  // Orbit trajectory line (dashed inside central body atmosphere, if applicable)
  var centralAtmoR = _atmoRadiusKm(bodyData);
  var orbitLine = _buildOrbitGroup(
    orbitalElementsToEllipsePoints(sma, ecc, inc, raan, arg, 128, soiR),
    colorInt, centralAtmoR, orbitID
  );
  threeScene.add(orbitLine);

  // Node markers — Pe/Ap only for eccentric orbits, AN/DN only for inclined orbits
  var nodePositions = computeNodePositions(sma, ecc, inc, raan, arg);
  var penode = null, apnode = null, anode = null, dnode = null;
  if (ecc) {
    penode = _makeNodeMarker(nodePositions.periapsis, '0099ff', nodeR);
    penode.add(_makeBodyLabel('Pe', '0099ff',  0,  14));
    threeScene.add(penode);
    if (nodePositions.apoapsis) {
      apnode = _makeNodeMarker(nodePositions.apoapsis, '0099ff', nodeR);
      apnode.add(_makeBodyLabel('Ap', '0099ff',  0, -14));
      threeScene.add(apnode);
    }
  }
  if (inc) {
    if (nodePositions.ascendingNode) {
      anode = _makeNodeMarker(nodePositions.ascendingNode,  '33ff00', nodeR);
      anode.add(_makeBodyLabel('AN', '33ff00', -14,   0));
      threeScene.add(anode);
    }
    if (nodePositions.descendingNode) {
      dnode = _makeNodeMarker(nodePositions.descendingNode, '33ff00', nodeR);
      dnode.add(_makeBodyLabel('DN', '33ff00',  14,   0));
      threeScene.add(dnode);
    }
  }

  // Position sphere (with vessel name label) or fallback label on the Pe sphere
  var posMesh = null;
  var label   = null;
  if (showPositionSphere) {
    var posNow = positionOnOrbit(sma, ecc, inc, raan, arg, eccNow);
    posMesh = new THREE.Mesh(
      new THREE.SphereGeometry(nodeR * 1.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: colorInt })
    );
    posMesh.position.copy(posNow);
    posMesh.userData.orbitId = orbitID;
    threeScene.add(posMesh);
    label = _makeBodyLabel(vesselName, colorHex, 0, -13);
    label.position.set(0, 0, 0);
    posMesh.add(label);
  } else if (penode) {
    // Hyperbolic trajectory beyond the visible arc: attach name label above the Pe marker
    label = _makeBodyLabel(vesselName, colorHex, 0, -13);
    label.position.set(0, 0, 0);
    penode.add(label);
  }

  // Enable this vessel type's orbit filter
  $("#" + p.type + "-filter").prop('disabled', false);
  $("#" + p.type + "-filter").prop('checked', true);
  $("#" + p.type + "-label").css('color', KSA_COLORS.orbitColors[p.type]);

  // Show the orbit type controls panel if the figure is visible
  if ($("#figure").is(":visible") && ops.pageType == "body" &&
      !window.location.href.includes("&map") && !KSA_UI_STATE.isMapShown) {
    $("#vesselOrbitTypes").fadeIn();
  }

  // Register in ops.orbits so toggle/filter/click/declutter logic applies to this orbit
  ops.orbits.push({
    type:       p.type,
    id:         orbitID,
    db:         vesselName,
    showName:   false,
    showNodes:  false,
    isSelected: false,
    isHidden:   false,
    obtLocked:  false,
    isUrlOrbit: true,   // injected from ?orbit= URL param; clicking position sphere must not swap to a vessel page
    orbitElements: { sma: sma, ecc: ecc, inc: inc, raan: raan, arg: arg,
                     mean0: mean0, meanMotion: meanMotion, epoch: p.eph },
    meshes: {
      sphere:   null,
      orbit:    orbitLine,
      soi:      null,
      label:    label,
      penode:   penode,
      apnode:   apnode,
      anode:    anode,
      dnode:    dnode,
      position: posMesh
    }
  });
}

// called once the Three.js scene is ready and menu data is available
function onSceneReady() {
  KSA_UI_STATE.is3JSRefreshing = true;
  $("#figureDialog").dialog("close");

  // hide and disable vessel filters
  $("#vesselOrbitTypes").fadeOut();
  $("#asteroid-filter").prop("disabled", true);
  $("#debris-filter").prop("disabled", true);
  $("#probe-filter").prop("disabled", true);
  $("#ship-filter").prop("disabled", true);
  $("#station-filter").prop("disabled", true);

  // was nulled after initial orbit data load. Reset to array on load of new body
  ops.vesselsToLoad = [];

  // can't continue if menu data hasn't loaded. Try again in 50ms
  if (!KSA_UI_STATE.isMenuDataLoaded) return setTimeout(onSceneReady, 50);
  
  // disable controls and checkboxes until scene is decluttered
  if (threeControls) threeControls.enabled = false;
  if (ops.pageType == "atn") {
    // ATN: just disable — don't re-check, leave states from previous declutter intact
    $("#nodes").prop('disabled', true);
    $("#labels").prop('disabled', true);
    $("#orbits").prop('disabled', true);
    $("#ref").prop('disabled', true);
    $("#soi").prop('disabled', true);
  } else {
    $("#nodes").prop('checked', true).prop('disabled', true);
    $("#labels").prop('checked', true).prop('disabled', true);
    $("#orbits").prop('checked', true).prop('disabled', true);
    $("#ref").prop('checked', true).prop('disabled', true);
    $("#soi").prop('checked', true).prop('disabled', true);
  }

  // disable the spinner & show checkboxes if this is the first load and not a vessel page call
  if (!KSA_UI_STATE.is3JSLoaded && ops.pageType == "body") { 
    $("#contentBox").spin(false); 
    $("#figureOptions").fadeIn();
  }
  // ATN: hide the contentBox spinner (replaced by vesselLoaderMsg progress bar)
  if (ops.pageType == "atn") {
    $("#contentBox").spin(false);
    if (threeRenderer) threeRenderer.domElement.style.cursor = "wait";
  }

  // prepare to reload any orbiting objects
  ops.orbits.length = 0;
  ops.vesselsToLoad.length = 0;
  
  // build body spheres, orbit lines, SOI shells and node markers for the current system
  buildBodyScene();

  // inject any orbit provided via the ?orbit= URL parameter
  injectOrbitParam();

  // Render any encounters and moonlets that are currently active for this body (Step 15 / Step 16)
  if (ops.pageType === 'body') {
    var _curBodyName = (ops.bodyCatalog.find(function(o) { return o.selected === true; }) || {}).Body;
    if (_curBodyName) {
      var _curUT = currUT();
      _renderEncountersForBody(_curBodyName, _curUT);
      _renderMoonletsForBody(_curBodyName, _curUT);
    }
  }

  // bring figure body locations up to date
  // (click listener wired via raycaster; no manual registration needed with Three.js)
  if (!KSA_UI_STATE.is3JSLoaded) {
    threeRenderer.domElement.addEventListener('click', onSceneClick);
    threeRenderer.domElement.addEventListener('contextmenu', onSceneRightClick);
  }

  // select and show it in the menu if this is the proper page type because
  // the figure can load after a vessel was already selected
  var currBody = ops.bodyCatalog.find(o => o.selected === true);
  var strMenuID = currBody ? currBody.Body : null;
  if (strMenuID && (currBody.Moons || currBody.Body == "Kerbol")) strMenuID += "-System";
  if (strMenuID && ops.pageType == "body" && !window.location.href.includes("flt")) selectMenuItem(strMenuID);
    
  // load additional data
  KSA_UI_STATE.is3JSLoaded = true;
  loadMap(currBody.Body);

  if (ops.pageType == "atn") {
    // ATN: do not load vessel orbits; instead rebuild or stream the asteroid catalog.
    // declutterScene() is called by rebuildATNScene()/loadATNCatalog() when ready.
    // need to call declutterScene() early if the timer is still active tho
    if (KSA_TIMERS.timeoutHandle) {
      console.log("[onSceneReady] Clearing pending declutter timer before loading ATN catalog");
      clearTimeout(KSA_TIMERS.timeoutHandle);
      declutterScene(true);
    }
    KSA_UI_STATE.is3JSRefreshing = false;
    activateEventLinks();
    if (KSA_CATALOGS.atnData.loaded) rebuildATNScene();
    else loadATNCatalog();
  } else {
    // Normal body page: declutter after a short delay then load vessel orbits
    clearTimeout(KSA_TIMERS.timeoutHandle);
    KSA_TIMERS.timeoutHandle = setTimeout(declutterScene, 2500);
    if (!loadVesselOrbits()) { 
      KSA_UI_STATE.is3JSRefreshing = false;
      activateEventLinks();
    }
  }
}

// adds to the Three.js scene the orbits of any vessels around this body
function loadVesselOrbits() {

  // we need to stop all AJAX calls if the body is being switched before we finish
  if (!KSA_UI_STATE.is3JSLoaded) {
    ops.vesselsToLoad.length = 0;
    return;
  }

  // initialize if this is the first call
  if (!ops.vesselsToLoad.length) {

    // if the selected body has moons or is Kerbol then we need to append "-System" to get its menu nodes
    var strBodyName = ops.bodyCatalog.find(o => o.selected === true).Body;
    if (ops.bodyCatalog.find(o => o.selected === true).Moons || strBodyName == "Kerbol") strBodyName += "-System";

    // check if the body has any vessels in orbit around it
    var strVesselsToload = extractIDs(w2ui['menu'].get(strBodyName).nodes);
    if (strVesselsToload.length) {

      // stash the vessels in an array, show the loading spinner and make sure the scene doesn't declutter yet
      ops.vesselsToLoad = strVesselsToload.substr(0, strVesselsToload.length-1).split(";");
      $("#vesselLoaderMsg").html("&nbsp;&nbsp;&nbsp;Loading Vessel Data...").css('left', '795px');
      $("#vesselLoaderMsg").spin({ scale: 0.35, position: 'relative', top: '8px', left: '0px' });
      $("#vesselLoaderMsg").fadeIn();
      clearTimeout(KSA_TIMERS.timeoutHandle);
    } else {

      // no vessels to load
      return false;
    }
  }

  // load the vessel orbital data & discard the name to decrease the array size
  KSA_DATA_SERVICE.fetchVesselOrbitData(ops.vesselsToLoad.shift(), currUT(), addOrbitAJAX);
  return true;
}

// creates an orbit on the Three.js scene if it is loaded
function addOrbitAJAX(result) {
  if (!KSA_UI_STATE.is3JSLoaded) return;
  if (!KSA_UI_STATE.is3JSRefreshing) {
    threeRenderer.domElement.removeEventListener('click', onSceneClick);
    threeRenderer.domElement.removeEventListener('contextmenu', onSceneRightClick);
  }

  var vesselID = result.db;
  var orbitData = result.flightData;

  // check to ensure the vessel has an orbital record
  if (orbitData) {

    // sanitize the vessel id for use as a scene object key
    orbitID = vesselID.replace("-", "").replace(" ", "");

    // if this vessel is already drawn, does it need to be deleted?
    var vesselObj = ops.orbits.find(o => o.id === orbitID);

    // URL-injected orbits are authoritative for this page load — skip the DB version entirely
    if (vesselObj && vesselObj.isUrlOrbit) {
      // still need to chain to the next vessel load
      if (ops.vesselsToLoad && ops.vesselsToLoad.length) setTimeout(loadVesselOrbits, 1);
      else if (ops.vesselsToLoad && !ops.vesselsToLoad.length) {
        ops.vesselsToLoad = null;
        KSA_UI_STATE.is3JSRefreshing = false;
        activateEventLinks();
        $("#vesselLoaderMsg").spin(false);
        $("#vesselLoaderMsg").fadeOut();
        if ($("#figure").is(":visible") && ops.pageType == "body" && !window.location.href.includes("&map") && !KSA_UI_STATE.isMapShown) { 
          if (!$("#asteroid-filter").prop("disabled") || !$("#debris-filter").prop("disabled") || !$("#probe-filter").prop("disabled") || !$("#ship-filter").prop("disabled") || !$("#station-filter").prop("disabled")) $("#vesselOrbitTypes").fadeIn();
        }
        KSA_TIMERS.timeoutHandle = setTimeout(declutterScene, 2500);
        if (!KSA_UI_STATE.is3JSRefreshing) {
          threeRenderer.domElement.addEventListener('click', onSceneClick);
          threeRenderer.domElement.addEventListener('contextmenu', onSceneRightClick);
        }
      }
      return;
    }

    if (vesselObj && !orbitData.Eph) {

      // dispose Three.js meshes and remove from the scene
      _disposeVesselMeshes(vesselObj.meshes);

      // save the vessel type & remove from the array
      var strVesselType = vesselObj.type;
      for (idIndex=0; idIndex<ops.orbits.length; idIndex++){
        if (ops.orbits[idIndex].id == orbitID) {
          ops.orbits.splice(idIndex, 1);
          break;
        }
      }

      // if this vessel type is no longer in use, disable the filter selection
      if (!ops.orbits.find(o => o.type === strVesselType)) {
        $("#" + strVesselType + "-filter").prop("disabled", true);
        $("#" + strVesselType + "-label").css('color', "#C0C0C0");
        $("#" + strVesselType + "-filter").prop('checked', false);
      }

    // otherwise just add or edit the current orbit if orbit data exists
    } else if (orbitData.Eph) {

      // look up data in the body catalog of the body currently being orbited
      var bodyData = ops.bodyCatalog.find(o => o.selected === true);
      
      // type of vessel so we can color things appropriately
      var strVesselType = w2ui['menu'].get('activeVessels', vesselID).img.split("-")[1];
      
      // add this vessel type and id to the orbits array for filtering if it's not already there
      if (!vesselObj) ops.orbits.push({type: strVesselType,
                                       id: orbitID,
                                          db: vesselID,
                                          showName: false,
                                          showNodes: false,
                                          isSelected: false,
                                          isHidden: false,
                                          obtLocked: false,
                                          meshes: null});

      // enable this vessel type in the filters menu
      $("#" + strVesselType + "-filter").prop('disabled', false);
      $("#" + strVesselType + "-filter").prop('checked', true);
      $("#" + strVesselType + "-label").css('color', KSA_COLORS.orbitColors[strVesselType]);
      
      // ── Three.js orbit construction ──────────────────────────────────────
      var vesselName = w2ui['menu'].get('activeVessels', vesselID).text.split(">")[1].split("<")[0];
      var colorHex   = KSA_COLORS.orbitColors[strVesselType].replace('#', '');
      var colorInt   = parseInt(colorHex, 16);

      // Orbital elements — angles in degrees from DB, convert to radians; distances in km
      // KSP stores hyperbolic SMA as a negative value; take the magnitude.
      var ecc        = parseFloat(orbitData.Eccentricity) || 0;
      var sma        = (ecc >= 1) ? Math.abs(parseFloat(orbitData.SMA) || 1)
                                  : (parseFloat(orbitData.SMA) || 1);
      var inc        = Math.radians(parseFloat(orbitData.Inclination) || 0);
      var raan       = Math.radians(parseFloat(orbitData.RAAN) || 0);
      var arg        = Math.radians(parseFloat(orbitData.Arg) || 0);
      var mean0      = toMeanAnomaly(Math.radians(parseFloat(orbitData.TrueAnom) || 0), ecc);
      var epoch      = parseFloat(orbitData.Eph);
      var period     = parseFloat(orbitData.OrbitalPeriod) || 1;
      var meanMotion = (2 * Math.PI) / period;

      // Current vessel position on orbit
      var ut      = currUT();
      var meanNow = computeMeanAnomalyAtUT(mean0, meanMotion, ut, epoch, ecc);
      var eccNow  = solveKeplerEquation(meanNow, ecc);
      var posNow  = positionOnOrbit(sma, ecc, inc, raan, arg, eccNow);

      // Dispose existing meshes if this vessel's orbit is being rebuilt
      var entry = ops.orbits.find(function(o) { return o.id === orbitID; });
      if (entry && entry.meshes) {
        _disposeVesselMeshes(entry.meshes);
        entry.meshes = null;
      }

      var nodeR = threeNodeRadius;

      // Orbit line (dashed inside central body atmosphere if applicable)
      var centralAtmoR = _atmoRadiusKm(bodyData);
      var orbitLine = _buildOrbitGroup(
        orbitalElementsToEllipsePoints(sma, ecc, inc, raan, arg, 128, _soiRadiusKm(bodyData)),
        colorInt, centralAtmoR, orbitID
      );
      threeScene.add(orbitLine);

      // Node markers — Pe/Ap only for eccentric orbits (Ap skipped for hyperbolic),
      // AN/DN only for inclined orbits (skipped if outside the hyperbolic arc)
      var nodePositions = computeNodePositions(sma, ecc, inc, raan, arg);
      var penode = null, apnode = null, anode = null, dnode = null;
      if (ecc) {
        penode = _makeNodeMarker(nodePositions.periapsis, '0099ff', nodeR);
        penode.add(_makeBodyLabel("Pe", '0099ff',  0,  14));
        threeScene.add(penode);
        if (nodePositions.apoapsis) {                    // null for hyperbolic
          apnode = _makeNodeMarker(nodePositions.apoapsis, '0099ff', nodeR);
          apnode.add(_makeBodyLabel("Ap", '0099ff',  0, -14));
          threeScene.add(apnode);
        }
      }
      if (inc) {
        if (nodePositions.ascendingNode) {               // may be null for hyperbolic
          anode = _makeNodeMarker(nodePositions.ascendingNode,  '33ff00', nodeR);
          anode.add(_makeBodyLabel("AN", '33ff00', -14,   0));
          threeScene.add(anode);
        }
        if (nodePositions.descendingNode) {              // may be null for hyperbolic
          dnode = _makeNodeMarker(nodePositions.descendingNode, '33ff00', nodeR);
          dnode.add(_makeBodyLabel("DN", '33ff00',  14,   0));
          threeScene.add(dnode);
        }
      }

      // Position marker
      var posMesh = new THREE.Mesh(
        new THREE.SphereGeometry(nodeR * 1.5, 8, 8),
        new THREE.MeshBasicMaterial({ color: colorInt })
      );
      posMesh.position.copy(posNow);
      posMesh.userData.orbitId = orbitID;
      threeScene.add(posMesh);

      // Vessel name label — child of position marker so it moves with it each tick
      var label = _makeBodyLabel(vesselName, colorHex, 0, -13);
      label.position.set(0, 0, 0);
      posMesh.add(label);

      // Store orbital elements and mesh references in the ops.orbits entry
      entry.orbitElements = { sma: sma, ecc: ecc, inc: inc, raan: raan, arg: arg,
                               mean0: mean0, meanMotion: meanMotion, epoch: epoch };
      entry.meshes = {
        sphere:   null,
        orbit:    orbitLine,
        soi:      null,
        label:    label,
        penode:   penode,
        apnode:   apnode,
        anode:    anode,
        dnode:    dnode,
        position: posMesh
      };
      _applyOrbitVisibility(entry);
    }
  }

  // callback if there is still data to load
  if (ops.vesselsToLoad && ops.vesselsToLoad.length) setTimeout(loadVesselOrbits, 1);
  else if (ops.vesselsToLoad && !ops.vesselsToLoad.length) {

    // nullify so any orbit updates after initial loading or scene refresh don't repeat this code
    ops.vesselsToLoad = null;

    // finish cleaning up after body load
    KSA_UI_STATE.is3JSRefreshing = false;
    activateEventLinks();
    $("#vesselLoaderMsg").spin(false);
    $("#vesselLoaderMsg").fadeOut();
    if ($("#figure").is(":visible") && ops.pageType == "body" && !window.location.href.includes("&map") && !KSA_UI_STATE.isMapShown) { 
      if (!$("#asteroid-filter").prop("disabled") || !$("#debris-filter").prop("disabled") || !$("#probe-filter").prop("disabled") || !$("#ship-filter").prop("disabled") || !$("#station-filter").prop("disabled")) $("#vesselOrbitTypes").fadeIn();
    }
    KSA_TIMERS.timeoutHandle = setTimeout(declutterScene, 2500);
    if (!KSA_UI_STATE.is3JSRefreshing) {
      threeRenderer.domElement.addEventListener('click', onSceneClick);
      threeRenderer.domElement.addEventListener('contextmenu', onSceneRightClick);
    }
  }
}

// Click event on the Three.js canvas — raycasts scene and dispatches to figureClick().
function onSceneClick(event) {

  // ignore clicks while the scene is still loading (declutter timer pending)
  if (KSA_TIMERS.timeoutHandle !== null) return;

  // ignore drag-as-click: if the mouse moved more than ~5px between mousedown and mouseup, skip
  var dx = event.clientX - _mouseDownPos.x;
  var dy = event.clientY - _mouseDownPos.y;
  if (dx * dx + dy * dy > 25) return;

  // convert mouse position to normalised device coordinates (-1..+1)
  var rect = threeRenderer.domElement.getBoundingClientRect();
  var mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width)  *  2 - 1,
   -((event.clientY - rect.top)  / rect.height) *  2 + 1
  );

  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, threeCamera);

  // Pass 1: body spheres and vessel position markers (higher priority than orbit lines)
  var meshTargets = [];
  ops.orbits.forEach(function(item) {
    if (!item.meshes || item.isHidden) return;
    if (item.type === 'body' && item.meshes.sphere) meshTargets.push(item.meshes.sphere);
    else if (item.meshes.position)                  meshTargets.push(item.meshes.position);
  });

  var meshHits = raycaster.intersectObjects(meshTargets, false);
  if (meshHits.length) {
    var hit = meshHits[0].object;
    var entry = ops.orbits.find(function(o) { return o.id === hit.userData.orbitId; });
    if (!entry) return;
    if (entry.type === 'body') figureClick({ hitType: 'body',   entry: entry });
    else                       figureClick({ hitType: 'vessel', entry: entry, isPosition: true });
    return;
  }

  // Pass 2: orbit lines and the reference line (lower precision — widen line threshold)
  raycaster.params.Line = { threshold: threeNodeRadius * 4 };
  var lineTargets = [];
  ops.orbits.forEach(function(item) {
    if (item.meshes && item.meshes.orbit && item.meshes.orbit.visible) lineTargets.push(item.meshes.orbit);
  });
  if (threeRefLine) lineTargets.push(threeRefLine);

  var lineHits = raycaster.intersectObjects(lineTargets, true); // recursive=true to reach Group children
  if (!lineHits.length) { unselectBody(null); return; }

  var hitLine = lineHits[0].object;
  if (hitLine === threeRefLine) { figureClick({ hitType: 'refline' }); return; }

  // orbitId may be on the hit line itself or on its parent Group
  var orbitId = hitLine.userData.orbitId ||
                (hitLine.parent && hitLine.parent.userData.orbitId);
  var lineEntry = ops.orbits.find(function(o) { return o.id === orbitId; });
  if (!lineEntry) return;
  figureClick({ hitType: 'orbit', entry: lineEntry });
}

// Right-click event on the Three.js canvas — focuses camera on the right-clicked body/vessel/orbit.
function onSceneRightClick(event) {
  event.preventDefault();

  // ignore right-clicks while the scene is still loading (declutter timer pending)
  if (KSA_TIMERS.timeoutHandle !== null) return;

  // ignore drag-as-right-click: if the mouse moved more than ~5px between mousedown and mouseup, skip
  var dx = event.clientX - _mouseDownPos.x;
  var dy = event.clientY - _mouseDownPos.y;
  if (dx * dx + dy * dy > 25) return;

  var rect = threeRenderer.domElement.getBoundingClientRect();
  var mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width)  *  2 - 1,
   -((event.clientY - rect.top)  / rect.height) *  2 + 1
  );

  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, threeCamera);

  // Pass 1: body spheres and vessel position markers (higher priority than orbit lines)
  var meshTargets = [];
  ops.orbits.forEach(function(item) {
    if (!item.meshes || item.isHidden) return;
    if (item.type === 'body' && item.meshes.sphere) meshTargets.push(item.meshes.sphere);
    else if (item.meshes.position)                  meshTargets.push(item.meshes.position);
  });

  var meshHits = raycaster.intersectObjects(meshTargets, false);
  if (meshHits.length) {
    var hit = meshHits[0].object;
    var entry = ops.orbits.find(function(o) { return o.id === hit.userData.orbitId; });
    if (entry) centerBody(entry.id);
    return;
  }

  // Pass 2: orbit lines (lower precision — widen line threshold)
  raycaster.params.Line = { threshold: threeNodeRadius * 4 };
  var lineTargets = [];
  ops.orbits.forEach(function(item) {
    if (item.meshes && item.meshes.orbit && item.meshes.orbit.visible) lineTargets.push(item.meshes.orbit);
  });

  var lineHits = raycaster.intersectObjects(lineTargets, true);
  if (!lineHits.length) return;

  var hitLine = lineHits[0].object;
  var orbitId = hitLine.userData.orbitId ||
                (hitLine.parent && hitLine.parent.userData.orbitId);
  var lineEntry = ops.orbits.find(function(o) { return o.id === orbitId; });
  if (lineEntry) centerBody(lineEntry.id);
}

// just show only orbits after displaying everything possible to not leave people overwhelmed initially
function declutterScene(hideOnly = false) {
  
  // nullify to let anyone else know this has already happened
  KSA_TIMERS.timeoutHandle = null;

  // hide scene elements
  _setVisible(threeRefLine, false);
  ops.orbits.forEach(function(item) {
    if (!item.meshes) return;
    if (item.type == 'body') {
      _setVisible(item.meshes.penode, false);
      _setVisible(item.meshes.apnode, false);
      _setVisible(item.meshes.anode,  false);
      _setVisible(item.meshes.dnode,  false);
      _setVisible(item.meshes.soi,    false);
      _setVisible(item.meshes.label,  false);
    } else {
      // someone might have had a chance to select a vessel before now, so only affect unselected ones
      if (!item.isSelected) {
        _setVisible(item.meshes.penode, false);
        _setVisible(item.meshes.apnode, false);
        _setVisible(item.meshes.anode,  false);
        _setVisible(item.meshes.dnode,  false);
        _setVisible(item.meshes.label,  false);
      }
    }
  });

  // exit early if we're just hiding elements but not re-enabling controls and checkboxes yet
  if (hideOnly) return;

  // For body-only views (no "System" — the central body has no catalog children rendered around
  // it), re-fit the camera to encompass all loaded vessel/asteroid orbits now that they are
  // fully added to the scene.  Systems already have the camera set correctly by buildBodyScene().
  if (ops.pageType === 'body' && threeCamera && threeControls) {
    var _cbd2 = ops.bodyCatalog.find(function(o) { return o.selected === true; });
    var _hasChildren = _cbd2 && ops.bodyCatalog.some(function(b) {
      return b.Ref !== null && b.Ref !== undefined &&
             parseInt(b.Ref) === parseInt(_cbd2.ID) && b.Body !== _cbd2.Body;
    });
    if (!_hasChildren) {
      var _fitSMA = 0;
      ops.orbits.forEach(function(item) {
        if (item.orbitElements && item.orbitElements.sma) {
          var s = item.orbitElements.sma;
          if (s > _fitSMA) _fitSMA = s;
        }
      });
      if (_fitSMA > 0) {
        threeCamera.near = Math.max(1, _fitSMA * 0.00005);
        threeCamera.far  = _fitSMA * 500;
        threeCamera.position.set(0, _fitSMA * 0.25, _fitSMA * 2.5);
        threeCamera.up.copy(_threeWorldUp);
        threeCamera.updateProjectionMatrix();
        threeControls.target.set(0, 0, 0);
        threeControls.maxDistance = _fitSMA * 20;
        threeControls.update();
        threeCamera.up.copy(_threeWorldUp);
      }
    }
  }

  // ATN post-load: reveal figure controls, restore cursor
  if (ops.pageType == "atn") {
    if (threeRenderer) threeRenderer.domElement.style.cursor = "";
    if (!window.location.href.includes("&map")) $("#figureOptions").fadeIn();
    populateATNFilters();
  }

  // re-enable controls and uncheck/enable checkboxes now that scene is ready
  if (threeControls) threeControls.enabled = true;
  $("#nodes").prop('checked', false).prop('disabled', false);
  $("#labels").prop('checked', false).prop('disabled', false);
  $("#ref").prop('checked', false).prop('disabled', false);
  $("#soi").prop('checked', false).prop('disabled', false);

  // ATN: default to orbits hidden — too many to show usefully at first glance
  if (ops.pageType == "atn") {
    $("#orbits").prop('checked', false).prop('disabled', false);
    toggleOrbits(false);
  } else {
    $("#orbits").prop('disabled', false);
  }

  // reveal the reset button and register its tooltip
  if (ops.pageType == "atn") {
    Tipped.create('#threeResetBtn', 'Left-click: Reset view<br>Right-click: Reset all filters', { showOn: 'mouseenter', hideOnClickOutside: false, position: 'left' });
    $('#threeResetBtn').off('contextmenu.atn').on('contextmenu.atn', function(e) {
      e.preventDefault();
      _resetATNFilters();
    });
  } else {
    Tipped.create('#threeResetBtn', 'Reset figure', { showOn: 'mouseenter', hideOnClickOutside: false, position: 'left' });
    $('#threeResetBtn').off('contextmenu.atn');
  }
  $("#threeResetBtn").show();

  // reveal the export button only for ATN pages
  if (ops.pageType == "atn") {
    Tipped.create('#atnExportBtn', 'Export filtered asteroids to CSV', { showOn: 'mouseenter', hideOnClickOutside: false, position: 'left' });
    $("#atnExportBtn").show();
  }

  // If the user clicked "View Encounter" or "View System" from a notification dialog,
  // auto-select and open the info dialog for the pending asteroid.
  if (ops.pageType === 'body' && ops.pendingObjSelect) {
    var _pendUID = ops.pendingObjSelect;
    ops.pendingObjSelect = null;
    var _pendEntry = ops.orbits.find(function(o) { return o.db === _pendUID && o.type === 'asteroid'; });
    if (_pendEntry) {
      // Brief delay so the scene can finish settling before we apply selection
      setTimeout(function() {
        figureClick({ hitType: 'vessel', entry: _pendEntry, isPosition: true });
      }, 200);
    }
  }
}

// Reset the Three.js figure to the post-declutter state: camera at default top-down view,
// orbits visible, all other display options off.
function resetFigure() {
  if (!threeScene) return;

  // For ATN use the planet-only SMA stored by buildBodyScene() — iterating ops.orbits
  // would pull in ~6,700 asteroid SMAs and zoom the camera out past Eeloo.
  var maxSMA;
  if (ops.pageType == "atn" && _atnBodyMaxSMA > 0) {
    maxSMA = _atnBodyMaxSMA;
  } else {
    maxSMA = 0;
    ops.orbits.forEach(function(item) {
      if (item.orbitElements && item.orbitElements.sma) {
        var s = item.orbitElements.sma;
        if (s > maxSMA) maxSMA = s;
      }
    });
    if (maxSMA === 0) {
      var _cbd = ops.bodyCatalog.find(function(o) { return o.selected === true; });
      maxSMA = _cbd ? Math.max(parseFloat(_cbd.Radius) * 10, 10000) : 10000;
    }
  }

  // restore camera to the same top-down, full-system view used at initial load
  threeCamera.position.set(0, maxSMA * 0.25, maxSMA * 2.5);
  threeCamera.up.copy(_threeWorldUp);
  threeCamera.updateProjectionMatrix();
  threeControls.target.set(0, 0, 0);
  threeControls.maxDistance = maxSMA * 20;
  threeControls.update();
  threeCamera.up.copy(_threeWorldUp);

  // clear selection state from all entries
  ops.orbits.forEach(function(item) {
    if (!item.meshes) return;
    item.isSelected = false;
    item.showName   = false;
    item.showNodes  = false;
    item.obtLocked  = false;
    if (item.meshes.label) item.meshes.label.element.classList.remove('three-label-selected');
  });

  // reset checkboxes: orbits on for normal views, off for ATN (thousands of lines); everything else off
  $("#nodes").prop('checked', false);
  $("#labels").prop('checked', false);
  $("#orbits").prop('checked', ops.pageType !== "atn");
  $("#ref").prop('checked', false);
  $("#soi").prop('checked', false);

  // apply visual state to match
  toggleOrbits(ops.pageType !== "atn");
  toggleNodes(false);
  toggleLabels(false);
  toggleRefLine(false);
  toggleSOI(false);
}

// Reset all ATN filter dropdowns to their unchecked/cleared defaults and re-apply.
// Search the ATN figure for an asteroid by UID.
// Selects and centers the asteroid if found and visible; flashes the input red if not.
function searchATNAsteroid() {
  var searchTerm = $('#atnUIDSearch').val().trim().toLowerCase();
  if (!searchTerm) return;

  var entry = ops.orbits.find(function(o) {
    return o.type === 'asteroid' && !o.isHidden && o.db.toLowerCase() === searchTerm;
  });

  if (!entry) {
    $('#atnUIDSearch').val('');
    flashUpdate('#atnSearchBtn', '#ff4444', '#ffffff');
    return;
  }

  // Select the entry and center the view on it
  unselectBody(null);
  _selectEntry(entry);
  centerBody(entry.id);
}

function _resetATNFilters() {
  // Remove checkmarks from all multi-select dropdowns
  $('#atnFilterCategory, #atnFilterSize, #atnFilterMakeup, #atnFilterType, #atnFilterSOI')
    .find('option:not(:first)').each(function() {
      var txt = $(this).text();
      if (txt.startsWith('\u2714 ')) $(this).text(txt.substring(2));
    });

  // Clear date filters
  $('#atnFilterAfter' ).find('option').eq(1).val('').text('--/--/----');
  $('#atnFilterBefore').find('option').eq(1).val('').text('--/--/----');

  // Uncheck Encounters
  $('#atnFilterEncounters').prop('checked', false);

  applyATNFilters();
}

// Export currently visible (filtered) asteroids to a CSV download.
function exportATNData() {
  var roidMap = KSA_CATALOGS.atnData.roidMap || {};
  var rows = [];

  ops.orbits.forEach(function(item) {
    if (item.type !== 'asteroid' || item.isHidden) return;
    var r = roidMap[item.db];
    if (!r) return;
    rows.push(r);
  });

  if (rows.length === 0) {
    alert('No asteroids are currently visible to export.');
    return;
  }

  var headers = ['UID','Class','Category','Makeup','Type','SOIcross','DiscoveryDate','Apkelion','Perikelion','OrbitalPeriod','Mass','Eph','SMA','Ecc','Inc','RAAN','Arg','TrueAnom'];
  var csv = headers.join(',') + '\n';

  rows.forEach(function(r) {
    function field(v) {
      if (v === null || v === undefined) return '';
      if (Array.isArray(v)) return '"' + v.join(';') + '"';
      var s = String(v);
      if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    csv += [
      field(r.UID), field(r.Class), field(r.Category), field(r.Makeup), field(r.Type),
      field(r.SOIcross), field(r.DiscoveryDate), field(r.Apkelion), field(r.Perikelion),
      field(r.OrbitalPeriod), field(r.Mass), field(r.Eph), field(r.SMA), field(r.Ecc),
      field(r.inc), field(r.RAAN), field(r.Arg), field(r.TrueAnom)
    ].join(',') + '\n';
  });

  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  var url = URL.createObjectURL(blob);
  var now = UTtoDateTime(currUT()).split('@')[0].trim().replace(/\//g, '-');
  link.setAttribute('href', url);
  link.setAttribute('download', 'atn_export_' + now + '.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Mark an entry as selected: show orbit, label (with border), and nodes if Show Nodes is on.
// Does NOT call unselectBody — caller is responsible for deselecting the previous object first.
function _selectEntry(entry) {
  entry.isSelected = true;
  entry.showName   = true;
  _setVisible(entry.meshes.label, true);
  if (entry.meshes.label) entry.meshes.label.element.classList.add('three-label-selected');
  if (entry.meshes.orbit) _setVisible(entry.meshes.orbit, true);
  if ($("#nodes").is(":checked")) {
    entry.showNodes = true;
    _setVisible(entry.meshes.penode, true);
    _setVisible(entry.meshes.apnode, true);
    _setVisible(entry.meshes.anode,  true);
    _setVisible(entry.meshes.dnode,  true);
  }
}

// handle any objects that are clicked in the Three.js scene
// hit = { hitType: 'refline' }
//      | { hitType: 'vessel', entry: <ops.orbits item>, isPosition: bool }
//      | { hitType: 'body',   entry: <ops.orbits item> }
//      | { hitType: 'orbit',  entry: <ops.orbits item> }
// ---------------------------------------------------------------------------
// Step 10: Asteroid info dialog — opened when clicking an asteroid position sphere
// ---------------------------------------------------------------------------
function _openAsteroidDialog(entry) {
  var uid     = entry.db;
  var atnData = KSA_CATALOGS.atnData;

  // Look up in all three catalogs: main, encounters, moonlets
  var record   = (atnData.roidMap    && atnData.roidMap[uid])
              || (atnData.encMap     && atnData.encMap[uid])
              || (atnData.moonletMap && atnData.moonletMap[uid]);
  if (!record) return;

  // Detect record type by catalog membership
  var isEncounter = !!(atnData.encMap     && atnData.encMap[uid]);
  var isMoonlet   = !!(atnData.moonletMap && atnData.moonletMap[uid]);

  var CAT_DESCS = {
    'NKO':      "Near Kerbin Object: Crosses Kerbin's SOI",
    'Inner':    'Inner system asteroid: MBA asteroid flung into an eccentric orbit by the gas giants',
    'MBA':      'Main Belt Asteroid: A large group of asteroids residing between Duna and Jool',
    'Trojan':   'Asteroid in synchronous orbit with Jool, both in leading and trailing positions',
    'KBO':      'Kupier Belt Object: Asteroid with an orbit beyond Neidon',
    'Comet(S)': 'Short-period comet: comet that has fallen in-system from the Kupier Belt',
    'Comet(L)': 'Long-period comet: comet that has fallen in-system from the Oork Cloud',
    'Centaur':  'Family of asteroids that resides in the space between Jool and Neidon',
    'Ejected':  'Asteroid is leaving the Kerbol system due to gravitational slingshot from a gas giant planet'
  };

  var massKt = numeral(parseFloat(numeral(record.Mass).divide(1000).value().toPrecision(3))).format('0,0.[000]');
  var strHTML = "<p><b>Discovery:</b> " + sanitizeHTML(KSA_CONSTANTS.FOUNDING_MOMENT.plus({seconds: record.DiscoveryDate}).toFormat("M/d/yyyy")) + "<br>";
  strHTML += "<b>Mass:</b> " + sanitizeHTML(massKt) + " kt</p>";

  if (isMoonlet) {
    // ── Moonlet dialog ────────────────────────────────────────────────────────
    strHTML += "<p><i>Captured asteroid; now a natural moonlet of " + sanitizeHTML(record.SOI) + "</i></p>";
    if (record.Apoapsis !== null || record.Periapsis !== null || record.OrbitalPeriod !== null) {
      strHTML += "<p><b>Orbital Parameters</b><br>";
      if (record.Apoapsis     !== null) strHTML += "Apoapsis: "       + sanitizeHTML(numeral(record.Apoapsis).format('0,0'))     + " m<br>";
      if (record.Periapsis    !== null) strHTML += "Periapsis: "      + sanitizeHTML(numeral(record.Periapsis).format('0,0'))    + " m<br>";
      if (record.OrbitalPeriod !== null) strHTML += "Orbital period: " + formatTime(record.OrbitalPeriod, false)                 + "<br>";
      strHTML += "</p>";
    }
    strHTML += "<p><b>Makeup:</b> " + sanitizeHTML(record.Makeup) + "</p>";

  } else if (isEncounter) {
    // ── Encounter dialog ──────────────────────────────────────────────────────
    if (record.Makeup)   strHTML += "<p><b>Makeup:</b> "    + sanitizeHTML(record.Makeup) + "<br>";
    if (record.Category) strHTML += "<b>Category:</b> " + sanitizeHTML(CAT_DESCS[record.Category] || record.Category) + "</p>";

    // Encounter specifics
    strHTML += "<p><b>Encounter: " + sanitizeHTML(record.SOI) + "</b><br>";
    if (record.EncounterUT !== null) strHTML += "Enter SOI: " + sanitizeHTML(KSA_CONSTANTS.FOUNDING_MOMENT.plus({seconds: record.EncounterUT}).toFormat("M/d/yyyy")) + "<br>";
    if (record.ExitUT      !== null) strHTML += "Exit SOI: "  + sanitizeHTML(KSA_CONSTANTS.FOUNDING_MOMENT.plus({seconds: record.ExitUT     }).toFormat("M/d/yyyy")) + "<br>";
    if (record.ApproachDate !== null) strHTML += "Closest approach: " + sanitizeHTML(KSA_CONSTANTS.FOUNDING_MOMENT.plus({seconds: record.ApproachDate}).toFormat("M/d/yyyy")) + "<br>";
    strHTML += "Periapsis: " + (record.Periapsis !== null
      ? sanitizeHTML(numeral(record.Periapsis).format('0,0')) + " m"
      : "<i>Data pending</i>") + "</p>";

  } else {
    // ── Main catalog dialog (original logic) ──────────────────────────────────

    // Orbital parameters (all fields are nullable)
    if (record.Apkelion !== null || record.Perikelion !== null || record.OrbitalPeriod !== null) {
      strHTML += "<p><b>Orbital Parameters</b><br>";
      if (record.Apkelion      !== null) strHTML += "Apkelion: "       + sanitizeHTML(numeral(record.Apkelion).format('0,0'))      + " km<br>";
      if (record.Perikelion    !== null) strHTML += "Perikelion: "     + sanitizeHTML(numeral(record.Perikelion).format('0,0'))    + " km<br>";
      if (record.OrbitalPeriod !== null) strHTML += "Orbital period: " + formatTime(record.OrbitalPeriod, false)                  + "<br>";
      strHTML += "</p>";
    }

    // Sun grazer note: perikelion within 3,948.911 Mm (3,948,911 km) of Kerbol
    if (record.Perikelion !== null && record.Perikelion < 3948911) {
      strHTML += "<p><i>Sun Grazer: Perikelion within 3,948.911 Mm of Kerbol</i></p>";
    }

    // Makeup, Category, Type
    strHTML += "<p><b>Makeup:</b> " + sanitizeHTML(record.Makeup) + "<br>";
    strHTML += "<b>Category:</b> " + sanitizeHTML(CAT_DESCS[record.Category] || record.Category) + "<br>";
    strHTML += "<b>Orbit Type:</b> " + sanitizeHTML(record.Type) + " &mdash; ";

    if (record.Type === 'Encounter') {
      strHTML += "Entering the SOI of " + sanitizeHTML(record.SOIcross[0]);
      if (record.SOIcross.length > 1) {
        strHTML += " and crossing the SOI(s) of " + sanitizeHTML(record.SOIcross.slice(1).join(", "));
      }
    } else if (record.SOIcross && record.SOIcross.length > 0) {
      strHTML += "Crossing the SOI(s) of " + sanitizeHTML(record.SOIcross.join(", "));
    } else {
      strHTML += "crossing no SOI";
    }
    strHTML += "</p>";

    // Encounter info (shown when an encounter date is recorded)
    if (record.EncounterDate !== null && record.SOIcross && record.SOIcross.length > 0) {
      strHTML += "<p><b>Encounter: " + sanitizeHTML(record.SOIcross[0]) + "</b><br>";
      strHTML += "Enter SOI: " + sanitizeHTML(KSA_CONSTANTS.FOUNDING_MOMENT.plus({seconds: record.EncounterDate}).toFormat("M/d/yyyy")) + "<br>";
      if (record.ApproachDate !== null) strHTML += "Closest approach: " + sanitizeHTML(KSA_CONSTANTS.FOUNDING_MOMENT.plus({seconds: record.ApproachDate}).toFormat("M/d/yyyy")) + "<br>";
      strHTML += "Periapsis: " + (record.Periapsis !== null
        ? sanitizeHTML(numeral(record.Periapsis).format('0,0')) + " m"
        : "<i>Impact</i>") + "</p>";
    }

    // View Asteroid History link — case-insensitive match against vessel db names
    var vesselMatch = ops.craftsMenu.find(function(o) { return o.db.toLowerCase() === uid.toLowerCase(); });
    if (vesselMatch) {
      strHTML += "<p><span class='fauxLink' onclick='swapContent(\"vessel\", \"" + sanitizeHTML(vesselMatch.db) + "\")'>View Asteroid History</span></p>";
    }
  }

  $("#figureDialog").dialog("option", "title", sanitizeHTML(uid + " (Class " + record.Class + ")"));
  $("#figureDialog").html(strHTML);
  $("#figureDialog").dialog("open");
}

function figureClick(hit) {

  // ----- reference line → reset to top-down view -----
  if (hit.hitType === 'refline') {
    resetSceneView();
    return;
  }

  var clickedEntry = hit.entry;

  // ----- orbit line click (body or vessel) -----
  if (hit.hitType === 'orbit') {
    // If the object is not currently selected, clicking its orbit selects it without any further action
    if (!clickedEntry.isSelected) {
      unselectBody(clickedEntry);
      clickedEntry.isSelected = true;
      clickedEntry.showName = true;
      _setVisible(clickedEntry.meshes.label, true);
      if (clickedEntry.meshes.label) clickedEntry.meshes.label.element.classList.add('three-label-selected');
      if ($("#nodes").is(":checked") || clickedEntry.showNodes) {
        _setVisible(clickedEntry.meshes.penode, true);
        _setVisible(clickedEntry.meshes.apnode, true);
        _setVisible(clickedEntry.meshes.anode,  true);
        _setVisible(clickedEntry.meshes.dnode,  true);
      }
      return;
    }

    // Object is already selected — apply display-options interaction
    var nodesChecked = $("#nodes").is(":checked");
    var orbitsChecked = $("#orbits").is(":checked");
    var nodesVisible = (clickedEntry.meshes.penode && clickedEntry.meshes.penode.visible) ||
                       (clickedEntry.meshes.anode  && clickedEntry.meshes.anode.visible);

    if (orbitsChecked && nodesChecked) {
      // Both on: do nothing
    } else if (orbitsChecked && !nodesChecked) {
      // Show Orbits on, Show Nodes off: toggle nodes
      if (nodesVisible) {
        _setVisible(clickedEntry.meshes.penode, false);
        _setVisible(clickedEntry.meshes.apnode, false);
        _setVisible(clickedEntry.meshes.anode,  false);
        _setVisible(clickedEntry.meshes.dnode,  false);
        clickedEntry.showNodes = false;
      } else {
        _setVisible(clickedEntry.meshes.penode, true);
        _setVisible(clickedEntry.meshes.apnode, true);
        _setVisible(clickedEntry.meshes.anode,  true);
        _setVisible(clickedEntry.meshes.dnode,  true);
        clickedEntry.showNodes = true;
      }
    } else if (!orbitsChecked) {
      // Show Orbits off: 3-click cycle using obtLocked
      if (!nodesVisible && !clickedEntry.obtLocked) {
        // N off, O off, nodes hidden, unlocked: show nodes, lock orbit
        _setVisible(clickedEntry.meshes.penode, true);
        _setVisible(clickedEntry.meshes.apnode, true);
        _setVisible(clickedEntry.meshes.anode,  true);
        _setVisible(clickedEntry.meshes.dnode,  true);
        clickedEntry.showNodes = true;
        clickedEntry.obtLocked = true;
      } else if (nodesVisible && !clickedEntry.obtLocked) {
        // N on, O off, nodes visible, unlocked: lock orbit (nodes stay)
        clickedEntry.obtLocked = true;
      } else if (nodesVisible && clickedEntry.obtLocked) {
        // Click: nodes visible, locked → hide nodes
        _setVisible(clickedEntry.meshes.penode, false);
        _setVisible(clickedEntry.meshes.apnode, false);
        _setVisible(clickedEntry.meshes.anode,  false);
        _setVisible(clickedEntry.meshes.dnode,  false);
        clickedEntry.showNodes = false;
      } else if (!nodesVisible && clickedEntry.obtLocked) {
        // Click: nodes hidden, locked → hide orbit + nodes, unlock
        _setVisible(clickedEntry.meshes.orbit,  false);
        _setVisible(clickedEntry.meshes.penode, false);
        _setVisible(clickedEntry.meshes.apnode, false);
        _setVisible(clickedEntry.meshes.anode,  false);
        _setVisible(clickedEntry.meshes.dnode,  false);
        clickedEntry.showNodes = false;
        clickedEntry.obtLocked = false;
      }
    }
    return;
  }

  // ----- position sphere (body or vessel) -----
  if (hit.hitType === 'body' || hit.hitType === 'vessel') {

    // only close on actual vessel click, which means we have to check the crafts menu to distinguish betweeen
    // a named asteroid and an ATN one just passing through or captured as a moonlet
    if (hit.hitType === 'vessel' && ops.pageType !== 'atn' && ops.craftsMenu.find(function(o) { return o.db.toLowerCase() === clickedEntry.db.toLowerCase(); })) {
      $("#figureDialog").dialog("close");
    }

    // The central body has no orbit mesh — treat it as always visible so its dialog always opens.
    var orbitVisible = !clickedEntry.meshes.orbit || clickedEntry.meshes.orbit.visible;

    // Orbit hidden → show it and select; no type-specific action yet
    // Exception: if the dialog is already open, update it in place
    if (!orbitVisible) {
      if (!clickedEntry.isSelected) unselectBody(clickedEntry);
      _selectEntry(clickedEntry);
      if ($("#figureDialog").dialog("isOpen")) {
        if (clickedEntry.type === 'asteroid') {
          _openAsteroidDialog(clickedEntry);
        } else if (hit.hitType === 'body') {
          figureClick({ hitType: 'body', entry: clickedEntry });
        }
      }
      return;
    }

    // Orbit visible → select if not already, then perform the type-specific action
    var wasAlreadySelected = clickedEntry.isSelected;
    if (!wasAlreadySelected) {
      unselectBody(clickedEntry);
      _selectEntry(clickedEntry);
    }

    if (hit.hitType === 'vessel' && clickedEntry.type === 'asteroid' && ops.pageType === 'atn') {
      _openAsteroidDialog(clickedEntry);
      return;
    }

    if (hit.hitType === 'vessel' && clickedEntry.type === 'asteroid' && ops.pageType === 'body') {
      var _vesselMatch = ops.craftsMenu.find(function(o) { return o.db.toLowerCase() === clickedEntry.db.toLowerCase(); });
      if (_vesselMatch) { swapContent("vessel", _vesselMatch.db); return; }
      _openAsteroidDialog(clickedEntry);
      return;
    }

    if (hit.hitType === 'vessel' && !clickedEntry.isUrlOrbit) {
      swapContent("vessel", clickedEntry.db);
      return;
    }

    // body: open info dialog
    {
      var bodyData = ops.bodyCatalog.find(function(o) { return o.Body === clickedEntry.id; });

      var strHTML = "<table style='border: 0px; border-collapse: collapse;'><tr><td style='vertical-align: top; width: 256px;'>";
      if (bodyData.Image) {
        strHTML += "<img src='" + sanitizeHTML(bodyData.Image) + "' style='background-color:black; cursor:pointer;' class='body-image-clickable'>";
      } else {
        strHTML += "<img src='https://i.imgur.com/advRrs1.png' style='cursor:pointer;' class='body-image-clickable'>";
      }
      strHTML += "<i><p>&quot;" + bodyData.Desc + "&quot;</p></i><p><b>- Kerbal Astronomical Society</b></p></td>";
      strHTML += "<td style='vertical-align: top; padding: 0px; margin-top: 0px'><b>Orbital Data</b>";
      strHTML += "<p>Apoapsis: "         + sanitizeHTML(bodyData.Ap)      + " m<br>";
      strHTML += "Periapsis: "           + sanitizeHTML(bodyData.Pe)      + " m<br>";
      strHTML += "Eccentricity: "        + sanitizeHTML(bodyData.Ecc)     + "<br>";
      strHTML += "Inclination: "         + sanitizeHTML(bodyData.Inc)     + "&deg;<br>";
      strHTML += "Orbital period: "      + formatTime(bodyData.ObtPeriod, false) + "<br>";
      strHTML += "Orbital velocity: "    + sanitizeHTML(bodyData.ObtVel)  + " m/s</p><p><b>Physical Data</b></p>";

      if (isNaN(bodyData.Radius)) {
        strHTML += "<p>Equatorial radius: " + sanitizeHTML(bodyData.Radius) + " <br>";
      } else {
        strHTML += "<p>Equatorial radius: " + numeral(parseInt(bodyData.Radius)).multiply(1000).format('0,0') + " m<br>";
      }
      strHTML += "Mass: "             + sanitizeHTML(bodyData.Mass.replace("+", "e"))      + " kg<br>";
      strHTML += "Density: "          + sanitizeHTML(bodyData.Density)                     + " kg/m<sup>3</sup><br>";
      strHTML += "Surface gravity: "  + sanitizeHTML(bodyData.SurfaceG.value)              + " m/s<sup>2</sup> <i>(" + sanitizeHTML(bodyData.SurfaceG.kerbin) + " g)</i><br>";
      strHTML += "Escape velocity: "  + sanitizeHTML(bodyData.EscapeVel)                   + " m/s<br>";
      strHTML += "Rotational period: " + formatTime(bodyData.SolarDay, true)               + "<br>";
      strHTML += "Atmosphere: "       + sanitizeHTML(bodyData.Atmo)                        + "</p>";
      if (bodyData.Moons) strHTML += "<p><b>Moons</b></p><p>" + sanitizeHTML(bodyData.Moons) + "</p>";

      if (ops.pageType !== 'atn') {
        if (ops.surface.Data && ops.surface.Data.Name === clickedEntry.id) {
          strHTML += "<p><span onclick='showMap()' style='cursor: pointer; color: blue; text-decoration: none;'>View Surface</span></p>";
        } else if (bodyData.Moons && !$("#contentTitle").html().includes(clickedEntry.id)) {
          strHTML += "<p><span class='fauxLink' onclick='loadBody(&quot;" + clickedEntry.id + "-System&quot;)'>View System</span></p>";
        } else if (!bodyData.Moons && !$("#contentTitle").html().includes(clickedEntry.id)) {
          strHTML += "<p><span class='fauxLink' onclick='loadBody(&quot;" + clickedEntry.id + "&quot;)'>View Body Orbits</span></p>";
        }
      }
      strHTML += "</td></tr></table>";

      $("#figureDialog").dialog("option", "title", sanitizeHTML(clickedEntry.id));
      $("#figureDialog").html(strHTML);
    }
    $("#figureDialog").dialog("open");

    // image click handlers — open KSA website / Flickr searches
    $(".body-image-clickable").off('click mouseup contextmenu');
    $(".body-image-clickable").on('click', function(e) {
      openObjectTags("http://www.kerbalspace.agency/?tag=", ",");
    });
    $(".body-image-clickable").on('mouseup', function(e) {
      if (e.button === 1) {
        e.preventDefault();
        openObjectTags("http://www.kerbalspace.agency/?tag=", ",");
        openObjectTags("https://www.flickr.com/search/?user_id=kerbal_space_agency&view_all=1&tags=(", "+OR+", ")+-archive");
      }
    });
    $(".body-image-clickable").on('contextmenu', function(e) {
      e.preventDefault();
      openObjectTags("https://www.flickr.com/search/?user_id=kerbal_space_agency&view_all=1&tags=(", "+OR+", ")+-archive");
    });
    Tipped.create('.body-image-clickable', 'Left click: Open posts on KSA website<br>Right click: Open images on flickr<br>Middle click: Open both', { showOn: 'mouseenter', hideOnClickOutside: is_touch_device(), position: 'bottom' });
  }
}

// Deselect whatever object is currently selected, restoring visibility to match global checkbox state.
function unselectBody(clickedEntry) {
  var selectedObj = ops.orbits.find(function(o) { return o.isSelected === true; });
  if (selectedObj) {
    // When O off and obtLocked: orbit was explicitly shown by user — keep everything, only remove border
    if (!$("#orbits").is(":checked") && selectedObj.obtLocked) {
      // just remove selection state below
    } else {
      if (!$("#labels").is(":checked")) _setVisible(selectedObj.meshes.label, false);
      selectedObj.showName = false;
      // if Show Orbits is off, hide orbit and any nodes that were temporarily shown
      if (!$("#orbits").is(":checked") && selectedObj.meshes.orbit) {
        _setVisible(selectedObj.meshes.orbit,  false);
        _setVisible(selectedObj.meshes.penode, false);
        _setVisible(selectedObj.meshes.apnode, false);
        _setVisible(selectedObj.meshes.anode,  false);
        _setVisible(selectedObj.meshes.dnode,  false);
        selectedObj.showNodes = false;
      } else if (!$("#nodes").is(":checked")) {
        _setVisible(selectedObj.meshes.penode, false);
        _setVisible(selectedObj.meshes.apnode, false);
        _setVisible(selectedObj.meshes.anode,  false);
        _setVisible(selectedObj.meshes.dnode,  false);
        selectedObj.showNodes = false;
      }
    }
    selectedObj.isSelected = false;
    if (selectedObj.meshes && selectedObj.meshes.label) selectedObj.meshes.label.element.classList.remove('three-label-selected');
  }
  return selectedObj;
}

// change the view to center on the selected body or vessel
// bodyName is the body's catalog name (e.g. "Kerbin") or vessel orbit ID, stored as the ops.orbits entry id
function centerBody(bodyName) {
  var entry = ops.orbits.find(function(o) { return o.id === bodyName; });
  if (!entry || !entry.meshes) return;
  var pos = entry.meshes.sphere    ? entry.meshes.sphere.position    :
            entry.meshes.position  ? entry.meshes.position.position  :
            new THREE.Vector3();
  threeControls.target.copy(pos);
  threeControls.update();
}

// toggle orbital nodes for a specific body (called from the #figureDialog "Show/Hide Nodes" link)
// handle Three.js scene display options
function toggleNodes(isChecked) {

  // do nothing on toggle on if this is an ATN scene
  if (ops.pageType == "atn" && isChecked) return;

  var orbitsChecked = $("#orbits").is(":checked");
  ops.orbits.forEach(function(item) {
    if (!item.meshes) return;
    var orbitVis = item.meshes.orbit ? item.meshes.orbit.visible : false;

    if (orbitsChecked && !item.isHidden) {
      // Show Orbits on: show/hide nodes for all non-hidden items; skip selected when hiding
      if (isChecked || !item.isSelected) {
        _setVisible(item.meshes.penode, isChecked);
        _setVisible(item.meshes.apnode, isChecked);
        _setVisible(item.meshes.anode,  isChecked);
        _setVisible(item.meshes.dnode,  isChecked);
      }
    } else if (!orbitsChecked && orbitVis) {
      // Show Orbits off but orbit is temporarily visible (selected object):
      // checking: show nodes; unchecking: hide nodes only (orbit stays)
      _setVisible(item.meshes.penode, isChecked);
      _setVisible(item.meshes.apnode, isChecked);
      _setVisible(item.meshes.anode,  isChecked);
      _setVisible(item.meshes.dnode,  isChecked);
      item.showNodes = isChecked;
    }
  });
}

function toggleLabels(isChecked) {
  ops.orbits.forEach(function(item) {
    if (!item.meshes || item.isSelected) return;
    _setVisible(item.meshes.label, isChecked);
  });
}

function toggleOrbits(isChecked) {
  if (isChecked) {
    // Show all orbits; reset obtLocked for everything (including hidden)
    ops.orbits.forEach(function(item) {
      if (!item.meshes) return;
      item.obtLocked = false;
      if (item.type == 'body' || !item.isHidden) _setVisible(item.meshes.orbit, true);
    });

    // don't mess with nodes in an ATN scene
    if (ops.pageType == "atn") return;

    // if nodes are also on, show them for items with visible orbits
    if ($("#nodes").is(":checked")) {
      ops.orbits.forEach(function(item) {
        if (!item.meshes) return;
        if (item.type == 'body' || !item.isHidden) {
          _setVisible(item.meshes.penode, true);
          _setVisible(item.meshes.apnode, true);
          _setVisible(item.meshes.anode,  true);
          _setVisible(item.meshes.dnode,  true);
        }
      });
    } else {
      // show nodes only for items with showNodes flag (and visible orbit)
      ops.orbits.forEach(function(item) {
        if (!item.meshes || !item.showNodes) return;
        if (item.type == 'body' || !item.isHidden) {
          _setVisible(item.meshes.penode, true);
          _setVisible(item.meshes.apnode, true);
          _setVisible(item.meshes.anode,  true);
          _setVisible(item.meshes.dnode,  true);
        }
      });
    }
  } else {
    // Hide all orbits and nodes for everything including selected. Do NOT touch N checkbox.
    ops.orbits.forEach(function(item) {
      if (!item.meshes) return;
      _setVisible(item.meshes.orbit,  false);
      _setVisible(item.meshes.penode, false);
      _setVisible(item.meshes.apnode, false);
      _setVisible(item.meshes.anode,  false);
      _setVisible(item.meshes.dnode,  false);
    });
  }
}

function toggleRefLine(isChecked) {
  _setVisible(threeRefLine, isChecked);
}

function filterVesselOrbits(id, checked) {
  if (checked) {
    ops.orbits.forEach(function(item) {
      if (id != item.type || !item.meshes) return;
      _setVisible(item.meshes.position, true);
      var nodesVis = $("#nodes").is(':checked') && $("#orbits").is(':checked');
      _setVisible(item.meshes.penode,  nodesVis);
      _setVisible(item.meshes.apnode,  nodesVis);
      _setVisible(item.meshes.anode,   nodesVis);
      _setVisible(item.meshes.dnode,   nodesVis);
      _setVisible(item.meshes.label,   $("#labels").is(':checked'));
      item.isHidden = false;
      
      // only show orbit if orbits are checked
      if ($("#orbits").is(":checked")) _setVisible(item.meshes.orbit, true);
    });
  } else {
    ops.orbits.forEach(function(item) {
      if (id != item.type || !item.meshes) return;
      _setVisible(item.meshes.position, false);
      _setVisible(item.meshes.orbit,    false);
      _setVisible(item.meshes.penode,   false);
      _setVisible(item.meshes.apnode,   false);
      _setVisible(item.meshes.anode,    false);
      _setVisible(item.meshes.dnode,    false);
      _setVisible(item.meshes.label,    false);
      item.isHidden = true;
    });
  }
}

function toggleSOI(isChecked) {
  _soiEnabled = isChecked;
  // When SOI mode is on, shrink vessel/asteroid position markers to 1 px so they
  // don't visually compete with the true-scale body and SOI spheres.
  if (ops.pageType == "atn") _POSITION_PX = isChecked ? 1 : _POSITION_PX_DEFAULT;
  // When switching off, revert body spheres to scale 1 so _updateBodySphereScales
  // picks up cleanly from the physical radius next frame.
  if (!isChecked) {
    ops.orbits.forEach(function(item) {
      if (item.type === 'body' && item.meshes && item.meshes.sphere)
        item.meshes.sphere.scale.setScalar(1);
    });
  }
  ops.orbits.forEach(function(item) {
    if (item.type == 'body' && item.meshes) _setVisible(item.meshes.soi, isChecked);
  });
}

// ---------------------------------------------------------------------------
// Phase 5: tick-driven position propagation
// Called each second from tick() in ksaMainOps.js.
// Advances every tracked orbit (body + vessel) to the given universal time.
// ---------------------------------------------------------------------------
function updateOrbitalPositions(ut) {
  if (!KSA_UI_STATE.is3JSLoaded) return;

  // Remove expired encounter orbits (past their ExitUT window) before propagating positions.
  var expired = [];
  ops.orbits.forEach(function(item) {
    if (item.exitUT !== undefined && item.exitUT !== null && ut > item.exitUT) expired.push(item);
  });
  expired.forEach(function(item) {
    ops.orbits.splice(ops.orbits.indexOf(item), 1);
    _disposeVesselMeshes(item.meshes);
  });

  ops.orbits.forEach(function(item) {
    if (!item.orbitElements || !item.meshes) return;
    var oe      = item.orbitElements;
    var meanNow = computeMeanAnomalyAtUT(oe.mean0, oe.meanMotion, ut, oe.epoch, oe.ecc);
    var eccNow  = solveKeplerEquation(meanNow, oe.ecc);
    var posNow  = positionOnOrbit(oe.sma, oe.ecc, oe.inc, oe.raan, oe.arg, eccNow);
    if (item.type === 'body') {
      // Move the sphere (label is a child so it follows automatically).
      if (item.meshes.sphere) item.meshes.sphere.position.copy(posNow);
      // SOI wireframe is a separate scene object — move it too.
      if (item.meshes.soi)    item.meshes.soi.position.copy(posNow);
      // Atmosphere shell is also a separate scene object — move it too.
      if (item.meshes.atmo)   item.meshes.atmo.position.copy(posNow);
    } else {
      // Vessel: move the position marker (label is a child so it follows).
      if (item.meshes.position) {
        // For hyperbolic orbits, hide the position sphere once the vessel has escaped the
        // rendered arc (|F| > FMax), and re-show it if it re-enters (e.g. time reversal).
        if (oe.ecc >= 1) {
          var _sqrtRatio = Math.sqrt((oe.ecc - 1) / (oe.ecc + 1));
          var _thetaMax  = Math.acos(-1 / oe.ecc) * 0.99;
          var _FMax      = 2 * Math.atanh(_sqrtRatio * Math.tan(_thetaMax / 2));
          var _inArc     = Math.abs(eccNow) <= _FMax;
          item.meshes.position.visible = _inArc;
          if (item.meshes.label) item.meshes.label.visible = _inArc && $("#labels").is(':checked');
        }
        item.meshes.position.position.copy(posNow);
      }
    }
  });

  // Update the directional sun light so the terminator rotates as the body orbits Kerbol.
  if (threeSunLight && threeSunLight.isDirectionalLight && _sunOrbitalElements) {
    var sunDir = _computeSunDirection(ut);
    if (sunDir) threeSunLight.position.copy(sunDir);
  }
}