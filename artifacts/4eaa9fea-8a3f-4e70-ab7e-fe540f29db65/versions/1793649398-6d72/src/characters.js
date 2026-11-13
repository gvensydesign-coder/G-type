// Богатырь и Леший из проекта на новых шейдерах. Модели, текстуры и анимации — без изменений,
// меняется только освещение: 3 тона, тёплый свет / холодная тень, контур пером, дымка.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { G, paintMat } from './materials.js';

const inkSkinned = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: { uW: { value: 0.0035 } },
  vertexShader: /* glsl */`
    #include <common>
    #include <skinning_pars_vertex>
    uniform float uW;
    void main(){
      vec3 transformed = position; vec3 objectNormal = normal;
      #ifdef USE_SKINNING
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <skinning_vertex>
      #endif
      vec4 w = modelMatrix * vec4(transformed, 1.0);
      vec3 n = normalize(mat3(modelMatrix) * objectNormal);
      float d = length(cameraPosition - w.xyz);
      float k = 0.6 + 0.8 * (0.5 + 0.5 * sin(w.x * 7.0 + w.y * 5.0 + w.z * 6.0));
      w.xyz += n * uW * d * k;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `void main(){ gl_FragColor = vec4(0.16,0.13,0.17,1.0);
    #include <colorspace_fragment>
  }`,
});

export const characterOutlines = [];

export function loadCharacters(scene, defs) {
  const loader = new GLTFLoader();
  const mixers = [];
  const ready = defs.map((d) => new Promise((resolve) => {
    // Окно-Artifact не раздаёт .glb, поэтому модели лежат рядом как base64-текст (.b64.txt); локально можно и .glb
    const onLoad = (gltf) => {
      const root = gltf.scene;
      root.scale.setScalar(d.height);
      root.position.set(...d.pos); root.rotation.y = d.rotY || 0;
      root.traverse((o) => {
        if (!o.isMesh) return;
        const map = o.material.map || null;
        if (map) map.colorSpace = THREE.SRGBColorSpace;
        o.material = paintMat({ base: '#ffffff', map, brush: 0.5, seam: 0, rim: 0.6, break: 0.16, strokeAmt: 0.06,
          litTint: d.litTint || [1.08, 1.0, 0.9], shadeTint: [1.0, 1.0, 1.06] });
        o.castShadow = true; o.receiveShadow = true;
        if (o.isSkinnedMesh) { // контур: тот же скелет, оболочка наружу
          const ol = new THREE.SkinnedMesh(o.geometry, inkSkinned);
          ol.bind(o.skeleton, o.bindMatrix);
          o.parent.add(ol); ol.position.copy(o.position); ol.quaternion.copy(o.quaternion); ol.scale.copy(o.scale);
          ol.frustumCulled = false; o.frustumCulled = false;
          characterOutlines.push(ol);
        }
      });
      const mixer = new THREE.AnimationMixer(root);
      const clip = gltf.animations.find((a) => a.name === (d.anim || 'Idle')) || gltf.animations[0];
      if (clip) { const a = mixer.clipAction(clip); a.play(); a.time = Math.random() * clip.duration; }
      mixers.push(mixer);
      scene.add(root);
      resolve(root);
    };
    const onErr = (e) => { console.warn('Модель не загрузилась:', d.url, e); resolve(null); };
    if (d.url.endsWith('.b64.txt')) {
      fetch(d.url).then((r) => r.text()).then((t) => {
        const bin = atob(t.trim()); const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        loader.parse(buf.buffer, '', onLoad, onErr);
      }).catch(onErr);
    } else loader.load(d.url, onLoad, undefined, onErr);
  }));
  return { mixers, ready: Promise.all(ready), update: (dt) => mixers.forEach((m) => m.update(dt)) };
}
