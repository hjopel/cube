import React, { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { Camera } from "./components/Camera";
import { Cube, CubeParameters } from "./components/Cube/Cube";
import { WebGPURenderer } from "./components/Renderer";
import { Scene } from "./components/Scene";

function App() {
  const isGPUAvailable = "gpu" in navigator;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let renderer: WebGPURenderer;
  let scene: Scene;
  let camera: Camera;
  let isMouseDown: boolean = false;
  let lastX: number = -1;
  let lastY: number = -1;

  const cubes: Cube[] = [];
  const cubeLayout: CubeParameters[] = [
    {
      x: -2,
      y: -2,
    },
    {
      x: 0,
      y: -2,
    },
    { x: 2, y: -2 },
    {
      x: -2,
    },
    { x: 0 },
    { x: 2 },
    { x: -2, y: 2 },
    { y: 2 },
    { x: 2, y: 2 },
  ];
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

      cubeLayout.map((param) =>
        scene.add(
          new Cube({
            device: dvc,
            parameters: param,
            // color: { r: 0.01, g: 0.01, b: 0.9 },
            lightDataBuffer: renderer.lightDataBuffer,
            cameraUniformBuffer: renderer.cameraUniformBuffer,
          })
        )
      );

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

    window.onresize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        camera.aspect = window.innerWidth / window.innerHeight;
        renderer.update();
      }
    };

    if (canvasRef.current) {
      canvasRef.current.onpointerdown = (e: PointerEvent) => {
        isMouseDown = true;
        lastX = e.x;
        lastY = e.y;
      };
      canvasRef.current.onpointerup = (e: PointerEvent) => {
        isMouseDown = false;
      };
      canvasRef.current.onwheel = (e: WheelEvent) => {
        const delta = e.deltaY / 100;

        if (camera.z > -delta) {
          camera.z += delta;
        }
      };

      canvasRef.current.onpointermove = (e: PointerEvent) => {
        if (!isMouseDown) return;
        const { x, y } = e;

        if (lastX > 0 && lastY > 0) {
          const roty = x - lastX;
          const rotx = y - lastY;

          camera.rotY += roty / 100;
          camera.rotX += rotx / 100;
        }

        lastX = x;
        lastY = y;
      };
    }

    requestAnimationFrame(doFrame);
  };

  const doFrame = useCallback(() => {
    scene.pointLightPosition[2] = 2;
    cubes[cubes.length - 1].x = scene.pointLightPosition[0];
    cubes[cubes.length - 1].y = scene.pointLightPosition[1];
    cubes[cubes.length - 1].z = scene.pointLightPosition[2];
    renderer.frame(camera, scene);
    requestAnimationFrame(doFrame);
  }, [isMouseDown]);

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
