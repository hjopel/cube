import { vec3, vec4 } from "gl-matrix";
import React, { createContext, useEffect, useRef, useState } from "react";
import { Cube } from "../Cube/Cube";

const lightDataSize = (3 + 1) * 4; // vec3 in bytes

class Scene {
  public pointLightPosition = vec4.fromValues(0, 0, 0, 0);

  private objects: Cube[] = [];

  public add(object: Cube) {
    this.objects.push(object);
  }

  public getObjects(): Cube[] {
    return this.objects;
  }

  public getPointLightPosition(): Float32Array {
    return this.pointLightPosition as Float32Array;
  }
}
export { Scene, lightDataSize };
