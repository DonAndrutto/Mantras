// Upright five-pronged vajra. Proportions follow the supplied ritual-object
// photographs: broad bowed blades, lotus cups, beaded collars and a low hub.
// All surfaces share the same translucency control, including the ornaments.
import * as THREE from 'three';

export const VAJRA_TIP = 5.9;
export const VAJRA_RADIUS = 2.28;
export const HUB_HEIGHT = 0.70;
export function vajraLayout(extent) {
  const height = Math.max(extent.half, extent.seedTop, Math.abs(extent.seedBottom || 0));
  // Enclose all letters inside the oblate hub, including tall seed syllables.
  const scale = Math.hypot(extent.radius, height / HUB_HEIGHT) * 1.28;
  return { scale, radius: VAJRA_RADIUS * scale, half: VAJRA_TIP * scale,
    hubRadius: scale, hubHeight: HUB_HEIGHT * scale };
}

// A small studio-light shader gives the carved form moving highlights without
// adding lights or an environment map to the rest of the mantra scene.
function surface(tint, polish = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0.55 }, tint: { value: new THREE.Vector3(...tint) }, polish: { value: polish } },
    transparent: true, depthWrite: false,
    vertexShader: `varying vec3 normalView; varying vec3 eye;
      void main() { vec4 p = modelViewMatrix * vec4(position, 1.0);
        normalView = normalize(normalMatrix * normal); eye = -p.xyz;
        gl_Position = projectionMatrix * p; }`,
    fragmentShader: `uniform float opacity, polish; uniform vec3 tint;
      varying vec3 normalView; varying vec3 eye;
      void main() {
        vec3 n = normalize(normalView), v = normalize(eye);
        vec3 key = normalize(vec3(-0.65, 0.8, 1.0));
        vec3 fill = normalize(vec3(0.85, -0.25, 0.6));
        float facing = max(0.0, dot(n, v));
        float edge = pow(1.0 - facing, 2.5);
        float diffuse = 0.30 + 0.46 * max(0.0, dot(n, key)) + 0.18 * max(0.0, dot(n, fill));
        float spec = pow(max(0.0, dot(n, normalize(key + v))), 70.0);
        float soft = pow(max(0.0, dot(n, normalize(fill + v))), 20.0);
        vec3 color = tint * diffuse + vec3(0.94, 0.98, 1.0) * (0.7 * spec + 0.22 * soft + 0.35 * edge) * polish;
        // The edges catch more light, but no surface becomes opaque independently.
        float alpha = opacity * mix(0.48 + 0.52 * max(edge, spec), 1.0, opacity);
        gl_FragColor = vec4(color, alpha);
      }`,
  });
}

// Combine small carvings by material, so ornamentation adds vertices rather
// than hundreds of draw calls. Input geometries are no longer needed afterwards.
function combine(parts) {
  const positions = [], normals = [], indices = [];
  for (const g of parts) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const offset = positions.length / 3;
    positions.push(...g.attributes.position.array); normals.push(...g.attributes.normal.array);
    const index = g.index?.array || Array.from({ length: g.attributes.position.count }, (_, i) => i);
    for (const i of index) indices.push(offset + i);
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setIndex(indices); return g;
}

// A swept, bevelled blade: wide in its radial plane and thin across it.
// Unlike a round tube this has a central ridge and tapered cutting edges.
function blade(curve) {
  const sections = 64, cross = [[1, 0], [.9, .25], [0, 1], [-.9, .25], [-1, 0], [-.9, -.25], [0, -1], [.9, -.25]];
  const positions = [], indices = [];
  for (let j = 0; j <= sections; j++) {
    const u = j / sections, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    const width = (0.15 + 0.18 * Math.sin(Math.PI * u)) * (1 - 0.96 * Math.pow(u, 4));
    const depth = (0.105 + 0.025 * Math.sin(Math.PI * u)) * (1 - 0.92 * Math.pow(u, 3));
    for (const [a, b] of cross) positions.push(p.x + t.y * a * width, p.y - t.x * a * width, b * depth);
  }
  for (let j = 0; j < sections; j++) for (let k = 0; k < 8; k++) {
    const a = j * 8 + k, b = j * 8 + (k + 1) % 8, c = a + 8, d = b + 8;
    indices.push(a, c, b, b, c, d);
  }
  // Close the base and the very small tip.
  for (let k = 1; k < 7; k++) { indices.push(0, k, k + 1); const o = sections * 8; indices.push(o, o + k + 1, o + k); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); return g;
}

export function createVajra(parent) {
  const group = new THREE.Group(); group.name = 'five-pronged-vajra'; parent.add(group);
  const body = surface([0.80, 0.85, 0.88]), trim = surface([0.94, 0.86, 0.67], 1.1), recess = surface([0.35, 0.43, 0.49], 0.5);
  const materials = [body, trim, recess], geometries = [];
  const batches = new Map(materials.map(m => [m, []]));
  function add(g, material = body, name = '') {
    if (!name) { batches.get(material).push(g); return; }
    geometries.push(g);
    const mesh = new THREE.Mesh(g, material); mesh.name = name;
    mesh.renderOrder = -1; group.add(mesh);
  }
  const place = (g, angle, sign) => { if (sign < 0) g.rotateZ(Math.PI); g.rotateY(angle); return g; };
  const ring = (radius, y, tube, sign) => {
    const g = new THREE.TorusGeometry(radius, tube, 8, 64); g.rotateX(Math.PI / 2); g.translate(0, y, 0); add(place(g, 0, sign), trim);
  };
  const beadRing = (r, y, count, sign) => {
    for (let i = 0; i < count; i++) {
      const a = i * Math.PI * 2 / count, g = new THREE.SphereGeometry(0.038, 8, 6);
      g.scale(1, 0.85, 1); g.translate(r * Math.cos(a), y, r * Math.sin(a)); add(place(g, 0, sign), trim);
    }
  };
  const carving = (points, radius, angle, sign, material = trim) => {
    const c = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    add(place(new THREE.TubeGeometry(c, 24, radius, 6, false), angle, sign), material);
  };
  const hub = new THREE.SphereGeometry(1, 64, 40); hub.scale(1, HUB_HEIGHT, 1); add(hub, body, 'central-hub');
  for (const sign of [-1, 1]) {
    const profile = [[.52,.57],[.60,.65],[.62,.75],[.54,.84],[.65,.92],[.88,1.04],
      [1.08,1.22],[1.19,1.52],[1.23,1.78],[1.19,1.88],[1.25,1.94],[1.25,2.08],[.72,2.12]];
    const cupCurve = new THREE.CatmullRomCurve3(profile.map(([r,y]) => new THREE.Vector3(r,y,0)));
    const cupProfile = Array.from({ length: 65 }, (_, i) => cupCurve.getPoint(i / 64));
    const cup = new THREE.LatheGeometry(cupProfile.map(p => new THREE.Vector2(p.x,p.y)), 96);
    const cp = cup.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i), a = Math.atan2(x,z), r = Math.hypot(x,z);
      const relief = .06 * Math.sin(Math.PI * THREE.MathUtils.clamp((y-.92)/.94,0,1)) * Math.pow(.5+.5*Math.cos(8*a),2);
      cp.setXYZ(i, x*(1+relief/r), y, z*(1+relief/r));
    }
    cup.computeVertexNormals(); add(place(cup,0,sign));
    const onCup = (phi,y,lift=.025) => {
      let j = 1; while (j < cupProfile.length-1 && cupProfile[j].y < y) j++;
      const lo = cupProfile[j-1], hi = cupProfile[j], t = (y-lo.y)/(hi.y-lo.y);
      const r = THREE.MathUtils.lerp(lo.x,hi.x,t) + lift
        + .06 * Math.sin(Math.PI * THREE.MathUtils.clamp((y-.92)/.94,0,1)) * Math.pow(.5+.5*Math.cos(8*phi),2);
      return [Math.sin(phi)*r,y,Math.cos(phi)*r];
    };
    for (const [r,y,w] of [[.59,.68,.045],[.59,.80,.04],[1.23,1.90,.045],[1.25,2.09,.045]]) ring(r,y,w,sign);
    beadRing(.61,.74,32,sign); beadRing(1.26,2.0,48,sign);
    // Petal relief follows the continuous cup surface; no intersecting shells.
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      carving([[0,.94],[-.21,1.10],[-.30,1.44],[-.20,1.68],[0,1.84],
        [.20,1.68],[.30,1.44],[.21,1.10],[0,.94]].map(([phi,y])=>onCup(phi,y)),.018,a,sign);
      carving([[0,1.06],[-.11,1.24],[0,1.64],[.11,1.24],[0,1.06]].map(([phi,y])=>onCup(phi,y,.018)),.014,a,sign,recess);
    }
    // The axial spear has a diamond swelling and a terminal point beyond
    // the junction of the four bowed outer blades.
    const axis = new THREE.LatheGeometry([[.24,2.10],[.20,2.45],[.13,3.20],[.29,3.64],
      [.13,4.02],[.12,4.90],[.18,5.52],[0,VAJRA_TIP]].map(([r,y]) => new THREE.Vector2(r,y)), 8);
    add(place(axis,Math.PI/8,sign),body,`axial-prong-${sign}`);
    const curve = new THREE.CatmullRomCurve3([[.77,2.10],[1.14,2.48],[1.73,2.98],[1.94,3.65],
      [1.74,4.43],[1.12,5.10],[.0,5.53]].map(([r,y]) => new THREE.Vector3(r,y,0)));
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 8 + i * Math.PI / 2;
      add(place(blade(curve),a,sign),body,`curved-prong-${sign}-${i}`);
      // Makara-inspired roots: a raised brow, paired eyes and a curled lip.
      const root = new THREE.SphereGeometry(1,16,12); root.scale(.36,.29,.22); root.rotateZ(-.55); root.translate(1.02,2.32,0); add(place(root,a,sign));
      for (const side of [-1,1]) {
        carving([[.73,2.13,side*.19],[1.05,2.17,side*.23],[1.34,2.47,side*.14],
          [1.12,2.66,side*.14],[.92,2.53,side*.23],[1.03,2.40,side*.26]],.028,a,sign);
        const eye = new THREE.SphereGeometry(.065,10,8); eye.scale(1,.8,.5); eye.translate(1.03,2.49,side*.24); add(place(eye,a,sign),recess);
        carving([[.82,2.52,side*.17],[1.0,2.60,side*.24],[1.20,2.56,side*.19]],.025,a,sign);
      }
    }
  }
  for (const [material, parts] of batches) if (parts.length) add(combine(parts), material, `carvings-${materials.indexOf(material)}`);
  return {
    group,
    update(settings, extent) {
      const opacity = settings['vajra.opacity'];
      group.visible = settings['vajra.enabled'] && opacity > 0;
      const bounds = vajraLayout(extent); group.scale.setScalar(bounds.scale);
      for (const child of group.children) child.visible = settings['vajra.view'] === 'whole' || child.name === 'central-hub';
      for (const material of materials) {
        material.uniforms.opacity.value = opacity;
        const transparent = opacity < 1;
        if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
        material.depthWrite = !transparent;
      }
      return bounds;
    },
    dispose() { group.removeFromParent(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
