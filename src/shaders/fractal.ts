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
uniform vec2 u_c;
uniform int u_iterations;
uniform vec3 u_color_base;
uniform float u_audio_low;   // Overall Bass
uniform float u_audio_mid;   // Overall Mids
uniform float u_audio_high;  // Overall Highs

// Multi-Band & Beat Transient Uniforms
uniform float u_audio_sub;   // Sub-bass & Plosives
uniform float u_audio_snare; // Snare crack & Presence
uniform float u_beat_kick;   // Transient Kick Beat (0.0 - 1.0)
uniform float u_beat_snare;  // Transient Snare / Plosive Beat (0.0 - 1.0)

// Geometry & FX Uniforms
uniform int u_geometry_mode;        // 0: Classic 2D Liquid, 1: 3D Mandelbulb, 2: 3D Julia, 3: 3D Ink Flow, 4: Sri Yantra, 5: Metatron, 6: Torus Knot, 7: Pyramid, 8: Tunnel
uniform int u_fx_mode;              // 0: None, 1: Cyber Grid, 2: Chromatic Glitch, 3: Particle Dust
uniform float u_kaleidoscope_folds; // 0, 4, 6, 8, 12, 16
uniform float u_rot_speed;
uniform float u_glow_intensity;

// HSL to RGB conversion
vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

// 3D Rotation Matrices
mat3 rotateX(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
}

mat3 rotateY(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}

mat3 rotateZ(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);
}

// Polar Kaleidoscope UV Fold
vec2 applyKaleidoscope(vec2 p, float folds) {
    if (folds < 1.0) return p;
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float slice = 6.28318530718 / folds;
    angle = mod(angle, slice);
    angle = abs(angle - slice * 0.5);
    return vec2(cos(angle), sin(angle)) * radius;
}

// ----------------------------------------------------
// CLASSIC 2D LIQUID JULIA FRACTAL RENDERER
// ----------------------------------------------------
vec4 renderLiquidJulia2D(vec2 uv) {
    float angle = u_audio_mid * 0.3 + u_beat_snare * 0.4;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    
    float dynamicZoom = u_zoom * (1.0 - u_audio_low * 0.2 - u_beat_kick * 0.25);
    vec2 p = rot * uv * dynamicZoom + u_offset;
    
    vec2 c = u_c + vec2(
        sin(u_time * 0.5 + u_audio_sub) * 0.05 * u_audio_low + u_beat_kick * 0.06, 
        cos(u_time * 0.3 - u_audio_high) * 0.05 * u_audio_mid + u_beat_snare * 0.06
    );
    
    vec2 z = p;
    int iter = 0;
    float smooth_iter = 0.0;
    
    for (int i = 0; i < 1000; i++) {
        if (i >= u_iterations) break;
        
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
        float t = smooth_iter / float(u_iterations);
        float hue = u_color_base.x + t * 0.6 + u_time * 0.05 + u_audio_high * 0.4 + u_beat_kick * 0.2;
        float sat = clamp(u_color_base.y + u_audio_mid * 0.6 + u_beat_snare * 0.3, 0.0, 1.0);
        float light = clamp(u_color_base.z * (1.0 - t) + u_audio_low * 0.4 + u_beat_kick * 0.3, 0.0, 1.0);
        
        color = hsl2rgb(vec3(hue, sat, light));
        color += vec3(u_audio_high * 0.8 * t + u_beat_snare * 0.4);
    } else {
        float corePulse = u_audio_low * 0.25 + u_beat_kick * 0.3;
        color = vec3(corePulse * u_color_base.x, corePulse * 0.5, corePulse);
    }

    if (u_fx_mode == 2 || u_beat_snare > 0.6) {
        color.r += u_beat_snare * 0.3;
        color.b += u_beat_kick * 0.2;
    }

    return vec4(color, 1.0);
}

// ----------------------------------------------------
// 3D SDF PRIMITIVES & SACRED GEOMETRY OBJECTS
// ----------------------------------------------------

// 3D Quaternion Julia SDF
float mapJulia3D(vec3 p, out float trap) {
    vec4 z = vec4(p, 0.0);
    vec4 c = vec4(
        u_c.x + sin(u_time * 0.3) * 0.08 * u_audio_mid + u_beat_snare * 0.12, 
        u_c.y, 
        sin(u_audio_low) + u_beat_kick * 0.2, 
        cos(u_audio_high) * 0.2
    );
    float dr2 = 1.0;
    float r2 = 0.0;
    trap = 1.0;

    for (int i = 0; i < 10; i++) {
        r2 = dot(z, z);
        if (r2 > 4.0) break;
        
        trap = min(trap, length(z.xyz));
        dr2 *= 4.0 * r2;
        
        z = vec4(
            z.x*z.x - z.y*z.y - z.z*z.z - z.w*z.w,
            2.0*z.x*z.y,
            2.0*z.x*z.z,
            2.0*z.x*z.w
        ) + c;
    }
    return 0.5 * sqrt(r2 / dr2) * log(r2);
}

// 3D Mandelbulb SDF
float mapMandelbulb(vec3 p, out float trap) {
    vec3 w = p;
    float dr = 1.0;
    float r = 0.0;
    trap = 1.0;
    
    float power = 8.0 + u_audio_sub * 5.0 + u_beat_kick * 8.0;

    for (int i = 0; i < 8; i++) {
        r = length(w);
        if (r > 2.0) break;
        
        trap = min(trap, r);
        
        float theta = acos(w.z / r);
        float phi = atan(w.y, w.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;

        float zr = pow(r, power);
        theta = theta * power + u_time * 0.2 + u_audio_mid * 0.6 + u_beat_snare * 0.5;
        phi = phi * power + u_audio_high * 0.6;

        w = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        w += p;
    }
    return 0.5 * log(r) * r / dr;
}

// NEW: 3D Organic Ink Flow / Fluid Dispersion SDF (Replaces old Polyhedron)
float mapInkFlow(vec3 p, out float trap) {
    vec3 q = p;
    // Fluid Domain Warping
    float warp = sin(q.x * 2.5 + u_time * 0.8) * cos(q.y * 2.5 - u_audio_sub * 2.5) * sin(q.z * 2.5 + u_beat_kick * 3.5);
    q += vec3(warp * 0.45);

    // Core Fluid Ink Blob
    float dCore = length(q) - (0.65 + u_audio_sub * 0.4 + u_beat_kick * 0.45);
    
    // Tendril Fluid Waves
    float dTendrils = sin(q.x * 4.5 + u_time * 1.5) * cos(q.y * 4.5 + u_audio_mid) * sin(q.z * 4.5 + u_audio_high) * 0.18;
    
    trap = length(q);
    return (dCore + dTendrils) * 0.65;
}

// Sacred Sri Yantra Mandala SDF
float mapSriYantra(vec3 p, out float trap) {
    float r = length(p.xy);
    float a = atan(p.y, p.x);
    
    float ring1 = abs(r - (1.2 + sin(u_time * 0.5 + u_audio_sub) * 0.3 + u_beat_kick * 0.4)) - 0.05;
    float ring2 = abs(r - 0.8) - 0.03;
    float ring3 = abs(r - 0.4) - 0.02;
    
    vec3 q = rotateZ(floor(a * 4.5 + u_audio_mid * 2.5) / 4.5) * p;
    float tri = max(abs(q.x) * 0.866 + q.y * 0.5, -q.y) - (0.7 + u_beat_kick * 0.4);
    
    trap = r;
    return max(min(ring1, min(ring2, ring3)), abs(p.z) - 0.15);
}

// Metatron's Cube & Flower of Life SDF
float mapMetatronCube(vec3 p, out float trap) {
    vec3 pScaled = p * (1.2 + u_beat_kick * 0.4);
    float centerSphere = length(pScaled) - (0.4 + u_audio_sub * 0.2);
    
    vec3 absP = abs(pScaled);
    float outerSpheres = length(absP - vec3(0.8, 0.8, 0.8)) - (0.25 + u_beat_snare * 0.15);
    
    float beam = length(vec2(length(p.xy) - 0.8, p.z)) - (0.03 + u_audio_snare * 0.06);
    
    trap = length(p);
    return min(min(centerSphere, outerSpheres), beam);
}

// 3D Trefoil Torus Knot SDF
float mapTorusKnot(vec3 p, out float trap) {
    vec3 q = rotateZ(u_time * 0.4 + u_audio_mid * 1.5) * p;
    float r = length(q.xy);
    float a = atan(q.y, q.x);
    
    vec2 cl = vec2(r - (1.2 + u_beat_kick * 0.4), q.z);
    float angleKnot = a * 1.5;
    vec2 knotP = vec2(sin(angleKnot), cos(angleKnot)) * 0.35;
    
    float knotD = length(cl - knotP) - (0.12 + u_audio_snare * 0.1);
    trap = r;
    return knotD;
}

// Cybernetic Prism Pyramid SDF
float mapPrismPyramid(vec3 p, out float trap) {
    vec3 q = p;
    q.y += 0.5;
    
    float pyr = max(abs(q.x) + q.y, max(abs(q.z) + q.y, -q.y - 1.2));
    
    vec3 crystalP = p - vec3(0.0, 1.2 + sin(u_time * 2.0 + u_audio_sub) * 0.3 + u_beat_kick * 0.4, 0.0);
    crystalP = rotateY(u_time * 2.5 + u_audio_mid) * crystalP;
    float crystal = (abs(crystalP.x) + abs(crystalP.y) + abs(crystalP.z)) - (0.35 + u_audio_high * 0.3);
    
    trap = length(crystalP);
    return min(pyr, crystal);
}

// Infinite Cosmic Tunnel SDF
float mapCosmicTunnel(vec3 p, out float trap) {
    float r = length(p.xy);
    float tunnel = abs(r - (1.8 + u_beat_kick * 0.5)) - 0.1;
    float rib = abs(sin(p.z * 3.0 + u_time * 4.0 * u_rot_speed + u_audio_sub * 5.0)) - (0.1 + u_audio_snare * 0.15);
    
    trap = r;
    return max(tunnel, rib);
}

// Master Scene Distance Evaluator
float mapScene(vec3 p, out float trap) {
    if (u_geometry_mode == 1) return mapMandelbulb(p, trap);
    if (u_geometry_mode == 2) return mapJulia3D(p, trap);
    if (u_geometry_mode == 3) return mapInkFlow(p, trap); // NEW 3D ORGANIC INK FLOW
    if (u_geometry_mode == 4) return mapSriYantra(p, trap);
    if (u_geometry_mode == 5) return mapMetatronCube(p, trap);
    if (u_geometry_mode == 6) return mapTorusKnot(p, trap);
    if (u_geometry_mode == 7) return mapPrismPyramid(p, trap);
    if (u_geometry_mode == 8) return mapCosmicTunnel(p, trap);
    return mapJulia3D(p, trap);
}

// Surface Normal Estimation via Gradient
vec3 calcNormal(vec3 p) {
    float dummy;
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        mapScene(p + e.xyy, dummy) - mapScene(p - e.xyy, dummy),
        mapScene(p + e.yxy, dummy) - mapScene(p - e.yxy, dummy),
        mapScene(p + e.yyx, dummy) - mapScene(p - e.yyx, dummy)
    ));
}

// ----------------------------------------------------
// MAIN RAYMARCHING ENGINE & VOLUMETRIC SHADING
// ----------------------------------------------------
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    if (u_geometry_mode == 0) {
        if (u_kaleidoscope_folds > 0.0) {
            uv = applyKaleidoscope(uv, u_kaleidoscope_folds);
        }
        gl_FragColor = renderLiquidJulia2D(uv);
        return;
    }
    
    if (u_fx_mode == 2 || (u_beat_snare > 0.6 && u_fx_mode > 0)) {
        uv.x += sin(uv.y * 50.0 + u_time * 20.0) * 0.015 * u_beat_snare;
    }

    uv = applyKaleidoscope(uv, u_kaleidoscope_folds);

    float camDist = 2.5 * u_zoom * (1.0 - u_audio_sub * 0.15 - u_beat_kick * 0.25);
    float rotY = u_time * 0.2 * u_rot_speed + u_offset.x * 3.0 + u_audio_mid * 0.5;
    float rotX = u_offset.y * 3.0 + sin(u_time * 0.15) * 0.3;

    vec3 ro = vec3(0.0, 0.0, -camDist);
    mat3 rotM = rotateY(rotY) * rotateX(rotX);
    ro = rotM * ro;

    vec3 rd = rotM * normalize(vec3(uv, 1.5));

    float t = 0.0;
    float maxDist = 10.0;
    float trap = 0.0;
    float minStep = 0.001;
    bool hit = false;
    vec3 hitPos = vec3(0.0);

    for (int i = 0; i < 96; i++) {
        if (i >= u_iterations) break;
        vec3 p = ro + rd * t;
        float d = mapScene(p, trap);

        if (d < minStep) {
            hit = true;
            hitPos = p;
            break;
        }
        t += d * 0.7;
        if (t > maxDist) break;
    }

    vec3 finalColor = vec3(0.0);

    if (hit) {
        vec3 normal = calcNormal(hitPos);
        vec3 lightDir = normalize(vec3(1.0, 2.0, -1.5));
        
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 viewDir = normalize(ro - hitPos);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * (1.0 + u_audio_high * 2.5 + u_beat_snare * 4.5);
        
        float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0) * (1.0 + u_audio_high * 1.8 + u_beat_snare * 3.0);
        
        float hue = u_color_base.x + trap * 0.8 + u_time * 0.05 + u_audio_high * 0.35 + u_beat_kick * 0.2;
        float sat = clamp(u_color_base.y + u_audio_mid * 0.5 + u_beat_snare * 0.3, 0.0, 1.0);
        float light = clamp(0.2 + diff * 0.5 + spec * 0.4 + u_audio_sub * 0.25 + u_beat_kick * 0.35, 0.0, 1.0);

        vec3 baseRGB = hsl2rgb(vec3(hue, sat, light));
        
        finalColor = baseRGB * (diff + 0.3) + vec3(spec) + vec3(0.2, 0.9, 0.4) * rim * u_glow_intensity;
        
        float fog = exp(-t * 0.25);
        finalColor = mix(vec3(0.03, 0.04, 0.07), finalColor, fog);
    } else {
        float bgGlow = (1.0 - length(uv)) * (0.15 + u_audio_sub * 0.3 + u_beat_kick * 0.45);
        finalColor = hsl2rgb(vec3(u_color_base.x + 0.5, 0.8, 0.1)) * bgGlow * u_glow_intensity;
    }

    if (u_fx_mode == 1) {
        float floorY = -1.6;
        if (rd.y < 0.0) {
            float tFloor = (floorY - ro.y) / rd.y;
            if (tFloor > 0.0 && (!hit || tFloor < t)) {
                vec3 pFloor = ro + rd * tFloor;
                vec2 grid = abs(fract(pFloor.xz * 1.5 - vec2(0.0, u_time * 2.0 + u_audio_sub * 3.0)) - 0.5);
                float line = min(grid.x, grid.y);
                float gridGlow = smoothstep(0.06, 0.0, line) * exp(-tFloor * 0.2);
                finalColor += vec3(0.6, 0.1, 0.9) * gridGlow * (1.0 + u_beat_kick * 2.0);
            }
        }
    }

    if (u_fx_mode == 2 || u_audio_high > 0.3 || u_beat_snare > 0.2) {
        finalColor.r += (u_audio_high * 0.15 + u_beat_snare * 0.35);
        finalColor.b += (u_audio_mid * 0.1 + u_beat_kick * 0.25);
    }

    if (u_fx_mode == 3) {
        float particle = sin(uv.x * 80.0 + u_time * 5.0) * cos(uv.y * 80.0 - u_time * 3.0);
        if (particle > 0.92) {
            finalColor += vec3(0.9, 0.95, 1.0) * (particle - 0.92) * 12.0 * (1.0 + u_audio_high * 3.0);
        }
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
