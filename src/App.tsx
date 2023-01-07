import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import { Camera } from "./components/Camera";
import { Cube } from "./components/Cube/Cube";
import { WebGPURenderer } from "./components/Renderer";
import { Scene } from "./components/Scene";

function App() {
  const isGPUAvailable = "gpu" in navigator;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let renderer: WebGPURenderer;
  let scene: Scene;
  let camera: Camera;

  const cubes: Cube[] = [];
  const init = async () => {
    const adapter: GPUAdapter | null = await navigator.gpu.requestAdapter();
    const dvc: GPUDevice | undefined = await adapter?.requestDevice();
    const context = canvasRef.current!.getContext("webgpu") as GPUCanvasContext;
    if (!adapter || !dvc) {
      return;
    }

    camera = new Camera(window.innerWidth / window.innerHeight);
    camera.z = 10;
    // camera.y = 0;
    scene = new Scene();
    renderer = new WebGPURenderer();
    try {
      await renderer.init({ device: dvc, context, canvas: canvasRef.current! });

      // unscaled cubes
      const cube1 = new Cube({
        device: dvc,
        parameters: { x: -4 },
        // color: { r: 0.9, g: 0.01, b: 0.01 },
        lightDataBuffer: renderer.lightDataBuffer,
        cameraUniformBuffer: renderer.cameraUniformBuffer,
      });
      const cube2 = new Cube({
        device: dvc,
        // parameters: { y: 4 },
        // color: { r: 1.0, g: 1.0, b: 0.9 },
        lightDataBuffer: renderer.lightDataBuffer,
        cameraUniformBuffer: renderer.cameraUniformBuffer,
      });
      const cube3 = new Cube({
        device: dvc,
        parameters: { x: 4 },
        // color: { r: 0.01, g: 0.01, b: 0.9 },
        lightDataBuffer: renderer.lightDataBuffer,
        cameraUniformBuffer: renderer.cameraUniformBuffer,
      });

      scene.add(cube1);
      scene.add(cube2);
      scene.add(cube3);

      cubes.push(cube1, cube2, cube3);

      const lightDebugCube = new Cube({
        parameters: { scaleX: 0.1, scaleY: 0.1, scaleZ: 0.1 },
        color: { r: 1.0, g: 1.0, b: 0.0 },
        device: dvc,
        lightDataBuffer: renderer.lightDataBuffer,
        cameraUniformBuffer: renderer.cameraUniformBuffer,
      });
      lightDebugCube.rotX = Math.PI / 4;
      lightDebugCube.rotZ = Math.PI / 4;
      // scene.add(lightDebugCube);

      cubes.push(lightDebugCube);
    } catch (err) {
      console.error(err);
    }

    requestAnimationFrame(doFrame);
  };

  const doFrame = () => {
    const now = Date.now() / 1000;

    // cubes[0].rotX = Math.cos(now);
    // cubes[1].rotY = Math.cos(now);
    // cubes[1].rotX = Math.cos(now);
    // cubes[2].rotZ = Math.cos(now);

    // scene.pointLightPosition[0] = Math.cos(now) * 4;
    // scene.pointLightPosition[1] = Math.sin(now) * 4;
    scene.pointLightPosition[2] = 10;
    cubes[cubes.length - 1].x = scene.pointLightPosition[0];
    cubes[cubes.length - 1].y = scene.pointLightPosition[1];
    cubes[cubes.length - 1].z = scene.pointLightPosition[2];
    renderer.frame(camera, scene);
    requestAnimationFrame(doFrame);
  };

  useEffect(() => {
    if (!scene) {
      init();
    }
  }, []);

  return (
    <div className="App">
      {isGPUAvailable === false ? (
        <p>Please access this site with a WebGPU compatible browser</p>
      ) : (
        <canvas
          width={window.innerWidth}
          height={window.innerHeight}
          ref={canvasRef}
        />
      )}
    </div>
  );
}

export default App;
