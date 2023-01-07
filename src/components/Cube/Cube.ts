import { mat4, vec3 } from "gl-matrix";
import vertexShader from "./vertex.wgsl";
import fragShader from "./frag.wgsl";
import { vertices } from "./objects";
import { lightDataSize } from "../Scene";
export type Color = {
  r: number;
  g: number;
  b: number;
};

export type CubeParameters = {
  x?: number;
  y?: number;
  z?: number;

  rotX?: number;
  rotY?: number;
  rotZ?: number;

  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
};

export type CubeProps = {
  device: GPUDevice;
  parameters?: CubeParameters;
  color?: Color;
  imageBitmap?: ImageBitmap;
  cameraUniformBuffer: GPUBuffer;
  lightDataBuffer: GPUBuffer;
};

export class Cube {
  public x: number = 0;
  public y: number = 0;
  public z: number = 0;

  public rotX: number = 0;
  public rotY: number = 0;
  public rotZ: number = 0;

  private transformMatrix = mat4.create() as Float32Array;
  private rotateMatrix = mat4.create() as Float32Array;

  public scaleX: number = 0;
  public scaleY: number = 0;
  public scaleZ: number = 0;

  private defaultColor: Color = {
    r: 0.9,
    g: 0.6,
    b: 0.1,
  };

  private sizePerVertex = 3 + 3 + 2; // 3 (position), 3 (normal), 2 (uv)
  private stride = this.sizePerVertex * 4; // stride = byte length of vertex data array
  private offset = 256; // transformationBindGroup offset must be 256-byte aligned
  private uniformBufferSize = this.offset;
  private matrixSize = 4 * 16; // 4x4 matrix

  private renderPipeline: GPURenderPipeline;
  private verticesBuffer: GPUBuffer;
  private transformationBuffer: GPUBuffer;
  private transformationBindGroup: GPUBindGroup;
  private colorBuffer: GPUBuffer;

  constructor({
    device,
    parameters,
    color,
    cameraUniformBuffer,
    lightDataBuffer,
  }: CubeProps) {
    this.setTransformation(parameters);

    const bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor = {
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ] as Iterable<GPUBindGroupLayoutEntry>,
    };

    const bindGroupLayout = device.createBindGroupLayout(
      bindGroupLayoutDescriptor
    );

    this.renderPipeline = device.createRenderPipeline({
      vertex: {
        module: device.createShaderModule({ code: vertexShader }),
        entryPoint: "main",
        buffers: [
          {
            arrayStride: this.stride, // ( 3 (pos) + 3 (norm) + 2 (uv) ) * 4 bytes
            attributes: [
              {
                // position
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
              },
              {
                // norm
                shaderLocation: 1,
                offset: 3 * 4,
                format: "float32x3",
              },
              {
                // uv
                shaderLocation: 2,
                offset: (3 + 3) * 4,
                format: "float32x2",
              },
            ],
          } as GPUVertexBufferLayout,
        ],
      },
      fragment: {
        module: device.createShaderModule({
          code: fragShader,
        }),
        entryPoint: "main",
        targets: [
          {
            format: "bgra8unorm" as GPUTextureFormat,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "back",
      },
      // Enable depth testing so that the fragment closest to the camera
      // is rendered in front.
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus-stencil8",
      },
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
    });

    this.verticesBuffer = device.createBuffer({
      label: "Vertices Buffer",
      size: vertices.length * this.stride,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });

    const mapping = new Float32Array(this.verticesBuffer.getMappedRange());
    for (let i = 0; i < vertices.length; i++) {
      // (3 * 4) + (3 * 4) + (2 * 4)
      mapping.set(
        [
          vertices[i].pos[0] * this.scaleX,
          vertices[i].pos[1] * this.scaleY,
          vertices[i].pos[2] * this.scaleZ,
        ],
        this.sizePerVertex * i + 0
      );
      mapping.set(vertices[i].norm, this.sizePerVertex * i + 3);
      mapping.set(vertices[i].uv, this.sizePerVertex * i + 6);
    }
    this.verticesBuffer.unmap();

    this.transformationBuffer = device.createBuffer({
      label: "transformationBuffer",
      size: this.uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.colorBuffer = device.createBuffer({
      label: "Colorbuffer",
      size: 16,
      usage: GPUBufferUsage.STORAGE,
      mappedAtCreation: true,
    });
    const colorMapping = new Float32Array(this.colorBuffer.getMappedRange());
    colorMapping.set(
      color
        ? [color.r, color.g, color.b, 1.0]
        : [this.defaultColor.r, this.defaultColor.g, this.defaultColor.b, 1.0]
    );
    this.colorBuffer.unmap();

    const entries: Iterable<GPUBindGroupEntry> = [
      {
        binding: 0,
        resource: {
          buffer: this.transformationBuffer,
          offset: 0,
          size: this.matrixSize * 2,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: this.colorBuffer,
          offset: 0,
          size: 16,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: cameraUniformBuffer,
          offset: 0,
          size: this.matrixSize,
        },
      },
      {
        binding: 3,
        resource: {
          buffer: lightDataBuffer,
          offset: 0,
          size: lightDataSize,
        },
      },
    ];

    this.transformationBindGroup = device.createBindGroup({
      label: "transformationBindGroup",
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: entries as Iterable<GPUBindGroupEntry>,
    });
  }

  public draw(passEncoder: GPURenderPassEncoder, device: GPUDevice) {
    this.updateTransformationMatrix();

    passEncoder.setPipeline(this.renderPipeline);
    device.queue.writeBuffer(
      this.transformationBuffer,
      0,
      this.transformMatrix.buffer,
      this.transformMatrix.byteOffset,
      this.transformMatrix.byteLength
    );
    device.queue.writeBuffer(
      this.transformationBuffer,
      64,
      this.rotateMatrix.buffer,
      this.rotateMatrix.byteOffset,
      this.rotateMatrix.byteLength
    );
    passEncoder.setVertexBuffer(0, this.verticesBuffer);
    passEncoder.setBindGroup(0, this.transformationBindGroup);
    passEncoder.draw(vertices.length, 1, 0, 0);
  }

  private setTransformation(parameters?: CubeParameters) {
    if (!parameters) parameters = {};
    this.x = parameters.x ?? 0;
    this.y = parameters.y ?? 0;
    this.z = parameters.z ?? 0;

    this.rotX = parameters.rotX ?? 0;
    this.rotY = parameters.rotY ?? 0;
    this.rotZ = parameters.rotZ ?? 0;

    this.scaleX = parameters.scaleX ?? 1;
    this.scaleY = parameters.scaleY ?? 1;
    this.scaleZ = parameters.scaleZ ?? 1;
  }

  private updateTransformationMatrix() {
    const transform = mat4.create();
    const rotate = mat4.create();

    mat4.translate(
      transform,
      transform,
      vec3.fromValues(this.x, this.y, this.z)
    );
    mat4.rotateX(transform, transform, this.rotX);
    mat4.rotateY(transform, transform, this.rotY);
    mat4.rotateZ(transform, transform, this.rotZ);

    mat4.rotateX(rotate, rotate, this.rotX);
    mat4.rotateY(rotate, rotate, this.rotY);
    mat4.rotateZ(rotate, rotate, this.rotZ);

    mat4.copy(this.transformMatrix, transform);
    mat4.copy(this.rotateMatrix, rotate);
  }
}
