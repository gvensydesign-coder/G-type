// Отражения в болоте: сцена рисуется второй раз зеркальной камерой (плоскость воды) в маленькую текстуру,
// вода берёт из неё дуб, избы, огни и небо. Через кадр и в четверть размера: отражение и так размыто рябью и кистью.
import * as THREE from 'three';
import { U } from './toon.js';

export class Reflection {
  constructor(renderer, h = 0.0) {
    this.r = renderer; this.h = h; this.on = true; this.frame = 0;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    this.cam = new THREE.PerspectiveCamera();
    this.bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.hide = [];
    U.uRefl.value = this.rt.texture;
  }
  setSize(w, h) { this.rt.setSize(Math.max(4, w >> 2), Math.max(4, h >> 2)); }
  render(scene, camera, force = false) {
    U.uReflOn.value = this.on ? 1 : 0;
    if (!this.on || (!force && (this.frame++ & 1))) return;
    const c = this.cam, h = this.h;
    c.copy(camera);
    const p = camera.position, dir = camera.getWorldDirection(new THREE.Vector3());
    const tgt = p.clone().add(dir);
    c.position.set(p.x, 2 * h - p.y, p.z);
    c.up.set(0, -1, 0);
    c.lookAt(tgt.x, 2 * h - tgt.y, tgt.z);
    // наклонная отсекающая плоскость: всё, что ниже воды, в отражение не попадает
    c.updateMatrixWorld(); c.updateProjectionMatrix();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -h).applyMatrix4(c.matrixWorldInverse);
    const cp = new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const pm = c.projectionMatrix, q = new THREE.Vector4();
    q.x = (Math.sign(cp.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(cp.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1.0; q.w = (1.0 + pm.elements[10]) / pm.elements[14];
    cp.multiplyScalar(2.0 / cp.dot(q));
    pm.elements[2] = cp.x; pm.elements[6] = cp.y; pm.elements[10] = cp.z + 1.0; pm.elements[14] = cp.w;
    U.uReflMat.value.copy(this.bias).multiply(c.projectionMatrix).multiply(c.matrixWorldInverse);
    const keep = this.hide.map((o) => o.visible); this.hide.forEach((o) => (o.visible = false));
    const au = this.r.shadowMap.autoUpdate; this.r.shadowMap.autoUpdate = false;  // тени берём с прошлого кадра
    this.r.setRenderTarget(this.rt); this.r.clear(); this.r.render(scene, c); this.r.setRenderTarget(null);
    this.r.shadowMap.autoUpdate = au;
    this.hide.forEach((o, i) => (o.visible = keep[i]));
  }
}
