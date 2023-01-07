import { Camera } from "../Camera";
import { lightDataSize, Scene } from "../Scene";
type RendererInitProps = {
  canvas: HTMLCanvasElement;
  device: GPUDevice;
  context: GPUCanvasContext;
};

export class WebGPURenderer {
  private renderPassDescriptor: GPURenderPassDescriptor;
  private device: GPUDevice;
  private matrixSize = 4 * 16; // 4x4 matrix
  private context: GPUCanvasContext;

  public lightDataBuffer: GPUBuffer;
  public cameraUniformBuffer: GPUBuffer;
  constructor() {}

  public async init({ canvas, device, context }: RendererInitProps) {
    this.device = device;
    this.context = context;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: device,
      format: presentationFormat,
      alphaMode: "opaque",
    });

    this.renderPassDescriptor = {
      colorAttachments: [
        {
          // attachment is acquired and set in render loop.
          view: undefined,
          loadOp: "clear",
          clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
          storeOp: "store",
        } as unknown as GPURenderPassColorAttachment,
      ],
      // depthStencilAttachment: {
      //   view: this.depthTextureView(),

      //   depthLoadOp: "clear",
      //   depthClearValue: 1.0,
      //   depthStoreOp: "store",
      //   stencilLoadOp: "clear",
      //   stencilClearValue: 0,
      //   stencilStoreOp: "store",
      // } as GPURenderPassDepthStencilAttachment,
    };

    this.cameraUniformBuffer = device.createBuffer({
      label: "cameraUniformBuffer",
      size: this.matrixSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.lightDataBuffer = device.createBuffer({
      label: "lightDataBuffer",
      size: lightDataSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  public update() {
    this.updateRenderPassDescriptor();
  }

  private updateRenderPassDescriptor() {
    (
      this.renderPassDescriptor
        .depthStencilAttachment as GPURenderPassDepthStencilAttachment
    ).view = this.depthTextureView();
  }

  public frame(camera: Camera, scene: Scene) {
    // CAMERA BUFFER
    const cameraViewProjectionMatrix =
      camera.getCameraViewProjMatrix() as Float32Array;
    this.device.queue.writeBuffer(
      this.cameraUniformBuffer,
      0,
      cameraViewProjectionMatrix.buffer,
      cameraViewProjectionMatrix.byteOffset,
      cameraViewProjectionMatrix.byteLength
    );

    // // LIGHT BUFFER
    const lightPosition = scene.getPointLightPosition();
    this.device.queue.writeBuffer(
      this.lightDataBuffer,
      0,
      lightPosition.buffer,
      lightPosition.byteOffset,
      lightPosition.byteLength
    );

    (
      this.renderPassDescriptor.colorAttachments as [
        GPURenderPassColorAttachment
      ]
    )[0].view = this.context.getCurrentTexture().createView();

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(
      this.renderPassDescriptor
    );

    for (let object of scene.getObjects()) {
      object.draw(passEncoder, this.device);
    }

    passEncoder.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  private depthTextureView() {
    return this.device
      .createTexture({
        size: [
          window.innerWidth * devicePixelRatio,
          window.innerHeight * devicePixelRatio,
        ],
        format: "depth24plus-stencil8",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      })
      .createView();
  }
}
