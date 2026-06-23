const WebGPU = {
  _adapter: null,
  _device: null,
  _supported: null,

  async isSupported() {
    if (this._supported !== null) return this._supported;
    if (!navigator.gpu) { this._supported = false; return false; }
    try {
      this._adapter = await navigator.gpu.requestAdapter();
      this._supported = !!this._adapter;
      if (this._adapter) {
        this._device = await this._adapter.requestDevice();
      }
      return this._supported;
    } catch {
      this._supported = false;
      return false;
    }
  },

  getDevice() { return this._device; },
  getAdapter() { return this._adapter; },

  async getAdapterInfo() {
    if (!(await this.isSupported())) return null;
    const info = this._adapter.info || {};
    return {
      vendor: info.vendor || 'unknown',
      architecture: info.architecture || 'unknown',
      device: info.device || 'unknown',
      description: info.description || '',
      backend: this._adapter.features?.has('shader-f16') ? 'WebGPU (FP16)' : 'WebGPU',
    };
  },

  async benchmarkCompute() {
    if (!(await this.isSupported())) return { supported: false };
    const device = this._device;
    const start = performance.now();

    const shader = device.createShaderModule({
      code: `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output: array<f32>;
        @compute @workgroup_size(256) fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let i = id.x;
          output[i] = input[i] * 2.0;
        }
      `,
    });

    const size = 1024 * 1024;
    const inputData = new Float32Array(size);
    for (let i = 0; i < size; i++) inputData[i] = Math.random();

    const inputBuf = device.createBuffer({
      size: inputData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const outputBuf = device.createBuffer({
      size: inputData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const stagingBuf = device.createBuffer({
      size: inputData.byteLength,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(inputBuf, 0, inputData);

    const pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: shader, entryPoint: 'main' },
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuf } },
        { binding: 1, resource: { buffer: outputBuf } },
      ],
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(size / 256));
    pass.end();
    encoder.copyBufferToBuffer(outputBuf, 0, stagingBuf, 0, outputBuf.size);

    device.queue.submit([encoder.finish()]);
    await stagingBuf.mapAsync(GPUMapMode.READ, 0, outputBuf.size);

    const elapsed = performance.now() - start;
    stagingBuf.unmap();
    return { supported: true, elapsed, opsPerSec: Math.round((size / elapsed) * 1000) };
  },

  async acceleratedColorAnalysis(pixels) {
    if (!(await this.isSupported()) || !pixels || pixels.length < 4) return null;
    const device = this._device;
    try {
      const numPixels = Math.floor(pixels.length / 4);
      const inputData = new Uint8Array(pixels);

      const shader = device.createShaderModule({
        code: `
          struct Pixel { r: u8, g: u8, b: u8, a: u8 }
          @group(0) @binding(0) var<storage, read> input: array<Pixel>;
          @group(0) @binding(1) var<storage, read_write> output: array<u32>;
          @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3<u32>) {
            let i = id.x;
            if (i >= arrayLength(&input)) { return; }
            let p = input[i];
            let quantized = (u32(p.r) & 0xF8) << 16 | (u32(p.g) & 0xF8) << 8 | (u32(p.b) & 0xF8);
            atomicAdd(&output[quantized % 1024u], 1u);
          }
        `,
      });

      const inputBuf = device.createBuffer({
        size: inputData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      const histBuf = device.createBuffer({
        size: 1024 * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
      const stagingBuf = device.createBuffer({
        size: 1024 * 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });

      device.queue.writeBuffer(inputBuf, 0, inputData);

      const pipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: shader, entryPoint: 'main' },
      });
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: inputBuf } },
          { binding: 1, resource: { buffer: histBuf } },
        ],
      });

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(Math.ceil(numPixels / 64));
      pass.end();
      encoder.copyBufferToBuffer(histBuf, 0, stagingBuf, 0, histBuf.size);
      device.queue.submit([encoder.finish()]);

      await stagingBuf.mapAsync(GPUMapMode.READ);
      const result = new Uint32Array(stagingBuf.getMappedRange());
      stagingBuf.unmap();

      return { supported: true, histogram: Array.from(result) };
    } catch {
      return { supported: false, error: 'GPU color analysis failed' };
    }
  },
};

self.WebGPU = WebGPU;
