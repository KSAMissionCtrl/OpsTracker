// Bridge module: imports ESM Three.js and exposes it as a global
// so existing classic <script> code continues to work unchanged.
//
// NOTE: `import * as THREE` produces a frozen Module Namespace Object whose
// properties are read-only. Addons must be merged into a plain wrapper object
// rather than assigned directly onto the namespace.
import * as THREE from 'three';
import { OrbitControls }              from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

window.THREE = { ...THREE, OrbitControls, CSS2DRenderer, CSS2DObject };
