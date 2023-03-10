/*
 * This shader receives the output of the vertex shader program
 * if texture is set, 
*/
struct LightData {
    lightPos: vec3<f32>,
};

struct FragmentInput { // output from vertex stage shader
    @builtin(position) coord_in: vec4<f32>,
    @location(0) fragColor: vec3<f32>,
    @location(1) fragNorm: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) fragPos: vec3<f32>,
};

// bind light data buffer
@group(0) @binding(3) var<uniform> lightData: LightData;

//constants for light
const ambientLightFactor: f32 = 0.25; // ambient light

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    let lightDirection: vec3<f32> = normalize(lightData.lightPos - input.fragPos);

    let lambertFactor: f32 = dot(lightDirection, input.fragNorm);

    var lightFactor: f32 = 0.0;
    lightFactor = lambertFactor;

    let lightingFactor: f32 = max(min(lightFactor, 1.0), ambientLightFactor);

    var border: f32 = 0.0;
    if((input.uv.x <= 0.05 || input.uv.y <= 0.05) || (input.uv.x >= 0.95 || input.uv.y >= 0.95)) {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
    return vec4<f32>(input.fragColor * lightingFactor, 1.0);
}

