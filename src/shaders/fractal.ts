export const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const fragmentShaderSource = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_zoom;
uniform vec2 u_offset;
uniform vec2 u_c; // Julia set constant
uniform int u_iterations;
uniform vec3 u_color_base;
uniform float u_audio_low;  // Bass
uniform float u_audio_mid;  // Mids
uniform float u_audio_high; // Highs

// HSL to RGB conversion
vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

void main() {
    // Correct aspect ratio handling for centering
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Audio-reactive rotation (subtle sway based on mids)
    float angle = u_audio_mid * 0.15;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    
    // Audio-reactive zoom pulse (bass makes it zoom in slightly)
    float dynamicZoom = u_zoom * (1.0 - u_audio_low * 0.1);
    
    // Apply rotation, zoom and offset
    uv = rot * uv * dynamicZoom + u_offset;
    
    // Audio reactivity
    // Modulate the constant with audio - more complex, chaotic modulation on highs
    vec2 c = u_c + vec2(
        sin(u_time * 0.5 + u_audio_low) * 0.02 * u_audio_low, 
        cos(u_time * 0.3 - u_audio_high) * 0.02 * u_audio_mid
    );
    
    vec2 z = uv;
    int iter = 0;
    float smooth_iter = 0.0;
    
    // Julia set iteration
    for (int i = 0; i < 1000; i++) {
        if (i >= u_iterations) break;
        
        // z = z^2 + c
        float x = (z.x * z.x - z.y * z.y) + c.x;
        float y = (2.0 * z.x * z.y) + c.y;
        
        if ((x * x + y * y) > 4.0) {
            smooth_iter = float(i) - log2(log2(dot(vec2(x, y), vec2(x, y)))) + 4.0;
            break;
        }
        
        z.x = x;
        z.y = y;
        iter++;
    }
    
    vec3 color = vec3(0.0);
    
    if (iter < u_iterations) {
        // Color mapping based on iterations and audio
        float t = smooth_iter / float(u_iterations);
        
        // Hue shift over time + audio - dynamic shifting
        float hue = u_color_base.x + t * 0.5 + u_time * 0.05 + u_audio_high * 0.4;
        
        // Saturation boosts on mids
        float sat = clamp(u_color_base.y + u_audio_mid * 0.6, 0.0, 1.0);
        
        // Lightness pulses with bass
        float light = clamp(u_color_base.z * (1.0 - t) + u_audio_low * 0.4, 0.0, 1.0);
        
        color = hsl2rgb(vec3(hue, sat, light));
        
        // Add high-frequency edge glow
        color += vec3(u_audio_high * 0.8 * t);
    } else {
        // Inside the set - add a subtle bass-reactive core pulse
        float corePulse = u_audio_low * 0.15;
        color = vec3(corePulse * u_color_base.x, corePulse * 0.5, corePulse);
    }
    
    gl_FragColor = vec4(color, 1.0);
}
`;
