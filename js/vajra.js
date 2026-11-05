// Upright, double-ended five-pronged vajra: one axial and four curved prongs
// at each end, lotus collars and a transparent spherical central hub.
// The mantra remains in its own coordinates; the entire vajra scales around it.
import * as THREE from 'three';

export const VAJRA_TIP = 5.65;
export function vajraLayout(extent) {
  const height = Math.max(extent.half, extent.seedTop, Math.abs(extent.seedBottom || 0));
  const scale = Math.hypot(extent.radius, height) * 1.28;
  return { scale, radius: 1.46 * scale, half: VAJRA_TIP * scale, hubRadius: scale };
}

export function createVajra(parent) {
  const group = new THREE.Group(); group.name = 'five-pronged-vajra'; parent.add(group);
  const shell = new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0.24 } }, transparent: true, depthWrite: false,
    vertexShader: `varying vec3 normalView; varying vec3 eye;
      void main() { vec4 p = modelViewMatrix * vec4(position, 1.0);
        normalView = normalize(normalMatrix * normal); eye = -p.xyz;
        gl_Position = projectionMatrix * p; }`,
    fragmentShader: `uniform float opacity; varying vec3 normalView; varying vec3 eye;
      void main() { float edge = 1.0 - abs(dot(normalize(normalView), normalize(eye)));
        gl_FragColor = vec4(vec3(0.70, 0.78, 0.85), opacity * (0.10 + 0.60 * pow(edge, 2.0))); }`,
  });
  const body = new THREE.MeshBasicMaterial({ vertexColors: true });
  const trim = new THREE.MeshBasicMaterial({ color: '#b5a179' });
  const geometries = [];
  function add(g, material = body, y = 0, name = '') {
    geometries.push(g);
    if (material === body) {
      g.computeVertexNormals();
      const n = g.attributes.normal, col = new Float32Array(n.count * 3);
      const light = new THREE.Vector3(-0.5, 0.6, 0.8).normalize(), v = new THREE.Vector3();
      for (let i = 0; i < n.count; i++) {
        v.fromBufferAttribute(n, i);
        const shade = 0.48 + 0.52 * Math.max(0, v.dot(light));
        const c = new THREE.Color('#e5ddd0').multiplyScalar(shade);
        c.toArray(col, i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    const mesh = new THREE.Mesh(g, material); mesh.position.y = y; mesh.name = name;
    mesh.renderOrder = -1; group.add(mesh); return mesh;
  }
  add(new THREE.SphereGeometry(1, 48, 32), shell, 0, 'central-hub');
  const ring = (radius, y, tube = 0.025, name = '') => {
    const g = new THREE.TorusGeometry(radius, tube, 8, 64); g.rotateX(Math.PI / 2); add(g, trim, y, name);
  };
  ring(1, 0, 0.005, 'hub-rim');
  for (const sign of [-1, 1]) {
    // Lotus neck and small ornamental bands on either side of the hub.
    const profile = [[0.58, 0.82], [0.48, 1.02], [0.40, 1.20], [0.47, 1.36], [0.74, 1.64], [0.83, 1.78], [0.64, 1.93]];
    const neck = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 64);
    if (sign < 0) neck.rotateX(Math.PI); add(neck);
    for (const [r, y] of [[0.56, 0.88], [0.43, 1.2], [0.76, 1.72], [0.65, 1.94]]) ring(r, sign * y);
    // Eight raised petal lobes encircle each collar.
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const petal = new THREE.SphereGeometry(1, 12, 10);
      petal.scale(0.18, 0.38, 0.09); petal.translate(0, 1.57, 0.59); petal.rotateY(a);
      if (sign < 0) petal.rotateX(Math.PI); add(petal);
    }
    // Central prong tapers to the common tip. The four side prongs join it.
    const axis = new THREE.LatheGeometry([
      new THREE.Vector2(0.17, 1.9), new THREE.Vector2(0.14, 2.5),
      new THREE.Vector2(0.11, 4.5), new THREE.Vector2(0.035, 5.48), new THREE.Vector2(0, VAJRA_TIP),
    ], 12);
    if (sign < 0) axis.rotateX(Math.PI); add(axis, body, 0, `axial-prong-${sign}`);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 8 + i * Math.PI / 2;
      const curve = new THREE.CatmullRomCurve3([
        [0.57, 1.96], [0.97, 2.30], [1.30, 3.10], [1.20, 3.90], [0.70, 4.70], [0.19, 5.25], [0.025, 5.50],
      ].map(([r, y]) => new THREE.Vector3(Math.sin(a) * r, sign * y, Math.cos(a) * r)));
      const tube = new THREE.TubeGeometry(curve, 40, 0.12, 8, false);
      // Taper each section toward the point rather than ending in a blunt tube.
      const p = tube.attributes.position, v = new THREE.Vector3();
      for (let j = 0; j <= 40; j++) {
        const u = j / 40, center = curve.getPointAt(u), taper = 1 - 0.85 * Math.pow(u, 1.8);
        for (let k = 0; k <= 8; k++) {
          const at = j * 9 + k;
          v.fromBufferAttribute(p, at).sub(center).multiplyScalar(taper).add(center);
          p.setXYZ(at, v.x, v.y, v.z);
        }
      }
      add(tube, body, 0, `curved-prong-${sign}-${i}`);
    }
  }
  return {
    group,
    update(settings, extent) {
      group.visible = settings['vajra.enabled'];
      const bounds = vajraLayout(extent); group.scale.setScalar(bounds.scale);
      // The two close views isolate the nexus; the full view restores both
      // ends. This keeps giant cropped collars out of the reading area.
      for (const child of group.children) child.visible = settings['vajra.view'] === 'whole'
        || child.name === 'central-hub' || child.name === 'hub-rim';
      // Only the hub is transparent; solid prongs retain their sculptural form.
      shell.uniforms.opacity.value = settings['vajra.opacity'];
      return bounds;
    },
    dispose() { group.removeFromParent(); geometries.forEach(g => g.dispose()); [shell, body, trim].forEach(m => m.dispose()); },
  };
}
