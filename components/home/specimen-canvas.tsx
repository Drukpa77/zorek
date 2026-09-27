"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { POINT_COUNT, buildClouds } from "@/components/home/specimen-geometry";

const ACCENT = 0x6b3df5;

export function SpecimenCanvas({ mode }: { mode: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clouds = buildClouds();
    const positions = clouds.sphere.p.map((point) => [point[0] * 0.2, point[1] * 0.2, point[2] * 0.2, 0]);
    const state = { scale: 1, targetScale: 1, alpha: 1, targetAlpha: 1, threshold: 0.2, core: 0.5, burst: 0, progress: 0 };
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.z = 4.4;
    const group = new THREE.Group();
    scene.add(group);

    const pointPositions = new Float32Array(POINT_COUNT * 3);
    const pointColors = new Float32Array(POINT_COUNT * 3);
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
    pointGeometry.setAttribute("color", new THREE.BufferAttribute(pointColors, 3));
    const points = new THREE.Points(
      pointGeometry,
      new THREE.PointsMaterial({ size: 0.032, vertexColors: true, transparent: true, depthWrite: false }),
    );

    const maxLines = 5000;
    const linePositions = new Float32Array(maxLines * 6);
    const lineColors = new Float32Array(maxLines * 6);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
    lineGeometry.setDrawRange(0, 0);
    const lines = new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }),
    );

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.5, 0),
      new THREE.MeshPhysicalMaterial({
        color: 0xc9cad0,
        metalness: 1,
        roughness: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        flatShading: true,
        transparent: true,
        envMapIntensity: 1.3,
      }),
    );
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.64, 1)),
      new THREE.LineBasicMaterial({ color: ACCENT, transparent: true }),
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.004, 6, 200),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4, transparent: true }),
    );
    ring.rotation.x = 1.25;
    group.add(points, lines, core, edges, ring);
    const light = new THREE.PointLight(ACCENT, 10, 12);
    light.position.set(2, 1, 3);
    scene.add(light, new THREE.AmbientLight(0xffffff, 0.4));

    const resize = () => {
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();

    const onPointer = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("resize", resize);

    const accent = [((ACCENT >> 16) & 255) / 255, ((ACCENT >> 8) & 255) / 255, (ACCENT & 255) / 255];
    const paper = [0.933, 0.929, 0.91];
    const ink = [0.07, 0.07, 0.065];
    const mix = (color: number[], amount: number, channel: number) =>
      paper[channel] + (color[channel] - paper[channel]) * amount;
    const drawn = new Float32Array(POINT_COUNT * 3);
    let frame = 0;
    const started = performance.now();

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      const time = (now - started) / 1000;
      const modeName = modeRef.current;
      const visible = modeName !== "none";
      state.targetAlpha = visible ? 1 : 0;
      state.targetScale = 1;
      pointer.sx += (pointer.x - pointer.sx) * 0.05;
      pointer.sy += (pointer.y - pointer.sy) * 0.05;
      state.scale += (state.targetScale - state.scale) * 0.04;
      state.alpha += (state.targetAlpha - state.alpha) * 0.06;
      state.burst *= 0.955;
      if (state.alpha < 0.01) {
        renderer.clear();
        return;
      }

      const processing = modeName === "process";
      const cloud = processing ? null : clouds[modeName] ?? clouds.fragment;
      const eased = Math.min(1, state.progress * 1.15);
      const smooth = eased * eased * (3 - 2 * eased);
      state.threshold += ((cloud ? cloud.th : 0.2 + 0.07 * smooth) - state.threshold) * 0.06;
      state.core += ((cloud ? cloud.core : 0.55 - smooth * 0.25) - state.core) * 0.05;
      const follow = reduced ? 1 : 0.05;

      for (let index = 0; index < POINT_COUNT; index += 1) {
        let targetX: number;
        let targetY: number;
        let targetZ: number;
        let targetVisible: number;
        if (processing) {
          const from = clouds.fragment.p[index];
          const to = clouds.cube.p[index];
          targetX = from[0] + (to[0] - from[0]) * smooth;
          targetY = from[1] + (to[1] - from[1]) * smooth;
          targetZ = from[2] + (to[2] - from[2]) * smooth;
          targetVisible = 1;
        } else {
          const point = cloud!.p[index];
          targetX = point[0];
          targetY = point[1];
          targetZ = point[2];
          targetVisible = point[3];
        }
        const current = positions[index];
        if (targetVisible > 0) {
          current[0] += (targetX - current[0]) * follow;
          current[1] += (targetY - current[1]) * follow;
          current[2] += (targetZ - current[2]) * follow;
        }
        current[3] += ((index / POINT_COUNT < 1 ? 1 : 0) * targetVisible - current[3]) * 0.06;
        let x = current[0];
        let y = current[1];
        let z = current[2];
        if (!processing && cloud?.amp?.[index]) {
          const pulse = Math.max(0, Math.sin(time * 1.1 + index * 0.7));
          z += pulse * 0.35;
          x += pulse * 0.06;
        }
        if (processing && !reduced) {
          const jitter = (1 - smooth) * 0.04;
          x += Math.sin(time * 1.3 + index) * jitter;
          y += Math.cos(time * 1.1 + index * 1.7) * jitter;
        }
        drawn[index * 3] = pointPositions[index * 3] = x;
        drawn[index * 3 + 1] = pointPositions[index * 3 + 1] = y;
        drawn[index * 3 + 2] = pointPositions[index * 3 + 2] = z;
        const color = index % 23 === 0 ? accent : ink;
        pointColors[index * 3] = mix(color, current[3], 0);
        pointColors[index * 3 + 1] = mix(color, current[3], 1);
        pointColors[index * 3 + 2] = mix(color, current[3], 2);
      }

      let segments = 0;
      const thresholdSquared = state.threshold * state.threshold;
      for (let i = 0; i < POINT_COUNT && segments < maxLines; i += 1) {
        if (positions[i][3] < 0.05) continue;
        const xi = drawn[i * 3];
        const yi = drawn[i * 3 + 1];
        const zi = drawn[i * 3 + 2];
        for (let j = i + 1; j < POINT_COUNT; j += 1) {
          if (positions[j][3] < 0.05) continue;
          const dx = drawn[j * 3] - xi;
          const dy = drawn[j * 3 + 1] - yi;
          const dz = drawn[j * 3 + 2] - zi;
          const distance = dx * dx + dy * dy + dz * dz;
          if (distance < thresholdSquared) {
            const amount = (1 - Math.sqrt(distance) / state.threshold) * 0.5 * Math.min(positions[i][3], positions[j][3]);
            const offset = segments * 6;
            linePositions[offset] = xi;
            linePositions[offset + 1] = yi;
            linePositions[offset + 2] = zi;
            linePositions[offset + 3] = drawn[j * 3];
            linePositions[offset + 4] = drawn[j * 3 + 1];
            linePositions[offset + 5] = drawn[j * 3 + 2];
            for (let channel = 0; channel < 3; channel += 1) {
              lineColors[offset + channel] = lineColors[offset + 3 + channel] = mix(ink, amount, channel);
            }
            segments += 1;
            if (segments >= maxLines) break;
          }
        }
      }
      cloud?.links?.forEach(([a, b]) => {
        if (segments >= maxLines) return;
        const amount = Math.min(positions[a][3], positions[b][3]);
        if (amount < 0.05) return;
        const offset = segments * 6;
        for (let channel = 0; channel < 3; channel += 1) {
          linePositions[offset + channel] = drawn[a * 3 + channel];
          linePositions[offset + 3 + channel] = drawn[b * 3 + channel];
          lineColors[offset + channel] = lineColors[offset + 3 + channel] = mix(accent, amount, channel);
        }
        segments += 1;
      });

      lineGeometry.setDrawRange(0, segments * 2);
      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.color.needsUpdate = true;
      pointGeometry.attributes.position.needsUpdate = true;
      pointGeometry.attributes.color.needsUpdate = true;
      group.scale.setScalar(state.scale * Math.min(1, camera.aspect * 1.1));
      group.rotation.y = (reduced ? 0 : time * 0.1) + pointer.sx * 0.6;
      group.rotation.x = -0.18 + pointer.sy * 0.3;
      const coreScale = Math.max(0.001, state.core);
      core.scale.setScalar(coreScale);
      edges.scale.setScalar(coreScale);
      core.rotation.y = reduced ? 0 : time * 0.25;
      core.rotation.x = reduced ? 0 : time * 0.12;
      edges.rotation.copy(core.rotation);
      ring.rotation.z = reduced ? 0 : time * 0.08;
      ring.material.opacity = state.alpha * 0.5 * Math.min(1, state.core * 2);
      light.position.set(pointer.sx * 3.5, -pointer.sy * 2.5, 2.6);
      points.material.opacity = state.alpha;
      lines.material.opacity = state.alpha;
      core.material.opacity = state.alpha;
      edges.material.opacity = state.alpha;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", resize);
      pointGeometry.dispose();
      lineGeometry.dispose();
      points.material.dispose();
      lines.material.dispose();
      core.geometry.dispose();
      core.material.dispose();
      edges.geometry.dispose();
      edges.material.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="specimen-canvas" />;
}
