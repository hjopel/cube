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
  const init = async () => {
    const adapter: GPUAdapter | null = await navigator.gpu.requestAdapter();
    const dvc: GPUDevice | undefined = await adapter?.requestDevice();
    const context = canvasRef.current!.getContext("webgpu") as GPUCanvasContext;
    if (!adapter || !dvc) {
      return;
    }

    camera = new Camera(600 / 600);
    camera.z = 10;
    camera.y = 10;
    scene = new Scene();
    renderer = new WebGPURenderer();
    try {
      await renderer.init({ device: dvc, context, canvas: canvasRef.current! });

      // unscaled cubes
      const cube1 = new Cube({
        device: dvc,
        parameters: { x: -4, y: 4 },
        color: { r: 0.9, g: 0.01, b: 0.01 },
        lightDataBuffer: renderer.lightDataBuffer,
        cameraUniformBuffer: renderer.cameraUniformBuffer,
      });
      const cube2 = new Cube({
        device: dvc,
        parameters: { y: 4 },
        color: { r: 0.01, g: 0.9, b: 0.01 },
        lightDataBuffer: renderer.lightDataBuffer,
        cameraUniformBuffer: renderer.cameraUniformBuffer,
      });
      const cube3 = new Cube({
        device: dvc,
        parameters: { x: 4, y: 4 },
        color: { r: 0.01, g: 0.01, b: 0.9 },
        lightDataBuffer: renderer.lightDataBuffer,
        cameraUniformBuffer: renderer.cameraUniformBuffer,
      });

      scene.add(cube1);
      scene.add(cube2);
      scene.add(cube3);

      // scaled cubes
      const cube4 = new Cube({
        device: dvc,
        parameters: { x: -4, y: 4 },
        color: { r: 1.0, g: 1.0, b: 0.2 },
        lightDataBuffer: renderer.lightDataBuffer,
        cameraUniformBuffer: renderer.cameraUniformBuffer,
      });
      const cube5 = new Cube({
        device: dvc,
        parameters: { y: -4, scaleY: 0.8 },
        color: { r: 0.2, g: 1.0, b: 1.0 },
        lightDataBuffer: renderer.lightDataBuffer,
        cameraUniformBuffer: renderer.cameraUniformBuffer,
      });
      const cube6 = new Cube({
        device: dvc,
        parameters: { x: 4, y: -4, scaleZ: 0.8 },
        color: { r: 1.0, g: 0.2, b: 1.0 },
        lightDataBuffer: renderer.lightDataBuffer,
        cameraUniformBuffer: renderer.cameraUniformBuffer,
      });

      scene.add(cube4);
      scene.add(cube5);
      scene.add(cube6);

      const lightDebugCube = new Cube({
        parameters: { scaleX: 0.1, scaleY: 0.1, scaleZ: 0.1 },
        color: { r: 1.0, g: 1.0, b: 0.0 },
        device: dvc,
        lightDataBuffer: renderer.lightDataBuffer,
        cameraUniformBuffer: renderer.cameraUniformBuffer,
      });
      lightDebugCube.rotX = Math.PI / 4;
      lightDebugCube.rotZ = Math.PI / 4;
      scene.add(lightDebugCube);
    } catch (err) {
      console.error(err);
    }

    requestAnimationFrame(doFrame);
  };

  const doFrame = () => {
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
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
      </div>
      <h1>Rubik's Cube Solver</h1>
      {isGPUAvailable === false ? (
        <p>Please access this site with a WebGPU compatible browser</p>
      ) : (
        <canvas width={600} height={600} ref={canvasRef} />
      )}
    </div>
  );
}

export default App;
