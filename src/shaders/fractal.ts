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
uniform float u_audio_time;   // Kinetic Audio Momentum / Phase Velocity Accumulator
uniform float u_zoom;
uniform vec2 u_offset;
uniform vec2 u_c;
uniform int u_iterations;
uniform vec3 u_color_base;
uniform float u_audio_low;   // Composite Low (Sub + Kick)
uniform float u_audio_mid;   // Low Mids (250Hz-800Hz)
uniform float u_audio_high;  // Composite High (Pres + Treb + Air)

// Full 7-Band Frequency Uniforms
uniform float u_audio_sub;   // Sub-bass (20-60Hz)
uniform float u_audio_kick;  // Kick punch (60-250Hz)
uniform float u_audio_snare; // Snare attack (800Hz-2.5kHz)
uniform float u_audio_pres;  // Presence (2.5kHz-6kHz)
uniform float u_audio_treb;  // Treble (6kHz-12kHz)
uniform float u_audio_air;   // Air / Brilliance (12kHz-20kHz)

// Beat Transient Uniforms
uniform float u_beat_kick;   // Smoothed kick transient (0.0 - 1.0)
uniform float u_beat_snare;  // Smoothed snare transient (0.0 - 1.0)

// Geometry & FX Uniforms
uniform int u_geometry_mode;        // 0: Classic 2D Liquid, 1: 3D Mandelbulb, 2: 3D Julia, 3: 3D Ink Flow, 4: Sri Yantra, 5: Metatron, 6: Torus Knot, 7: Pyramid, 8: Tunnel
uniform int u_fx_mode;              // 0: None, 1: Cyber Grid, 2: Chromatic Glitch, 3: Particle Dust
uniform float u_kaleidoscope_folds; // 0, 4, 6, 8, 12, 16
uniform float u_rot_speed;
uniform float u_glow_intensity;

// HSL to RGB conversion with luminance capping
vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

// Procedural Cosine Color Palette Generator for Deep Aesthetic Drift
vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.2831853 * (c * t + d));
}

// Rich Deep Dynamic Color Palettes (Oceanic Cyan-Purple, Gold-Emerald, Obsidian-Amethyst)
vec3 getDynamicPalette(float t, float colorSelect) {
    // Smooth blending between deep curated palettes based on colorSelect and u_audio_time
    vec3 col1 = cosPalette(t, vec3(0.08, 0.12, 0.22), vec3(0.35, 0.30, 0.40), vec3(1.0, 1.0, 1.0), vec3(0.00, 0.33, 0.67)); // Deep Oceanic Cyan-Purple
    vec3 col2 = cosPalette(t, vec3(0.12, 0.10, 0.05), vec3(0.40, 0.32, 0.20), vec3(1.0, 1.0, 1.0), vec3(0.15, 0.45, 0.05)); // Obsidian Gold-Emerald
    vec3 col3 = cosPalette(t, vec3(0.10, 0.06, 0.16), vec3(0.38, 0.28, 0.42), vec3(1.0, 1.0, 0.8), vec3(0.60, 0.80, 0.20)); // Dark Violet-Rose
    
    float pFactor = mod(colorSelect * 3.0, 3.0);
    if (pFactor < 1.0) return mix(col1, col2, pFactor);
    if (pFactor < 2.0) return mix(col2, col3, pFactor - 1.0);
    return mix(col3, col1, pFactor - 2.0);
}

// ACES Filmic Tone Mapping to prevent overexposure & blown-out whites
vec3 toneMapACES(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
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

// High-frequency tactile surface ripple displacement from Treble, Presence, & Air
float getMicroDisplacement(vec3 p) {
    float ripple = sin(p.x * 20.0 + u_audio_time * 3.5) * cos(p.y * 20.0 - u_audio_time * 2.8) * sin(p.z * 20.0);
    return ripple * (u_audio_treb * 0.022 + u_audio_air * 0.018 + u_audio_pres * 0.012);
}

// ----------------------------------------------------
// CLASSIC 2D LIQUID JULIA FRACTAL RENDERER (7-Band Responsive Engine)
// ----------------------------------------------------
vec4 renderLiquidJulia2D(vec2 uv) {
    // 1. Fluid 2D Rotation driven continuously by Mids, Snare, & Kinetic Audio Momentum
    float angle = u_audio_mid * 0.35 + u_audio_snare * 0.25 + u_beat_snare * 0.15 + u_audio_time * 0.08 * u_rot_speed;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    
    // 2. Dynamic Scale / Zoom centered on u_offset with Sub-bass & Kick expansion
    float zoomFactor = (1.6 / max(0.05, u_zoom)) * (1.0 - u_audio_sub * 0.14 - u_audio_kick * 0.18 - u_beat_kick * 0.10);
    vec2 p = rot * (uv * zoomFactor) + u_offset;
    
    // 3. Harmonic Audio Orbit on Julia Constant C (keeps fractal structurally connected & fluid)
    vec2 c_mod = vec2(
        cos(u_audio_time * 0.20 + u_audio_sub * 0.8) * (0.02 + u_audio_kick * 0.025 + u_beat_kick * 0.02),
        sin(u_audio_time * 0.18 + u_audio_treb * 0.8) * (0.02 + u_audio_snare * 0.025 + u_beat_snare * 0.02)
    );
    vec2 c = u_c + c_mod;
    
    vec2 z = p;
    int iter = 0;
    float smooth_iter = 0.0;
    
    // Adaptive iteration ceiling ensuring sharp filament details across all slider ranges
    int maxIter = int(clamp(float(u_iterations) * 2.0, 48.0, 200.0));
    
    for (int i = 0; i < 200; i++) {
        if (i >= maxIter) break;
        
        float x2 = z.x * z.x;
        float y2 = z.y * z.y;
        
        if ((x2 + y2) > 4.0) {
            smooth_iter = float(i) - log2(max(1.0, log2(x2 + y2))) + 4.0;
            break;
        }
        
        z = vec2(x2 - y2, 2.0 * z.x * z.y) + c;
        iter++;
    }
    
    vec3 color = vec3(0.0);
    if (iter < maxIter) {
        float t = smooth_iter / float(maxIter);
        // Palette position drifting with Treble, Air, Presence, & Beats
        float palettePos = t * 0.8 + u_audio_time * 0.03 + u_audio_treb * 0.5 + u_audio_air * 0.35 + u_audio_pres * 0.25;
        vec3 basePal = getDynamicPalette(palettePos, u_color_base.x);
        
        // Luminance driven directly by Sub-bass, Kick, and Base Lightness
        float light = clamp(0.12 + u_audio_sub * 0.40 + u_audio_kick * 0.45 + u_beat_kick * 0.30 + u_color_base.z * 0.35 * (1.0 - t), 0.05, 1.45);
        color = basePal * light * (1.0 + u_glow_intensity * 0.45);
        // High-frequency treble shimmer
        color += basePal * (u_audio_treb * 0.65 + u_audio_air * 0.55 + u_beat_snare * 0.35) * pow(t, 0.7);
    } else {
        // Core dark obsidian pulse driven by Sub-bass & Kick
        float corePulse = 0.03 + u_audio_sub * 0.35 + u_audio_kick * 0.30 + u_beat_kick * 0.30;
        vec3 coreColor = getDynamicPalette(u_color_base.x + u_audio_treb * 0.25, u_color_base.x);
        color = vec3(0.008, 0.012, 0.025) + coreColor * corePulse;
    }

    // FX Mode 1: Cyber Laser Grid (2D planar background overlay)
    if (u_fx_mode == 1) {
        vec2 grid = abs(fract(p * 2.0 - vec2(0.0, u_audio_time * 0.8 + u_audio_sub * 1.5)) - 0.5);
        float line = min(grid.x, grid.y);
        float gridGlow = smoothstep(0.06, 0.0, line);
        vec3 gridCol = getDynamicPalette(u_audio_time * 0.02 + 0.3 + u_audio_kick * 0.3, u_color_base.x);
        color += gridCol * gridGlow * 0.35 * (1.0 + u_audio_kick * 1.2 + u_audio_sub * 0.8);
    }

    // FX Mode 2: Chromatic edge glitch & Snare transient hit
    if (u_fx_mode == 2 || u_audio_snare > 0.35 || u_beat_snare > 0.35) {
        color.r += (u_audio_snare * 0.18 + u_audio_treb * 0.14 + u_beat_snare * 0.18);
        color.b += (u_audio_kick * 0.14 + u_audio_sub * 0.12 + u_beat_kick * 0.14);
    }

    // FX Mode 3: Particle Dust / Starlight Flares
    if (u_fx_mode == 3) {
        float particle = sin(uv.x * 60.0 + u_audio_time * 3.0) * cos(uv.y * 60.0 - u_audio_time * 2.0);
        if (particle > 0.90) {
            vec3 starCol = getDynamicPalette(particle + u_audio_time * 0.05 + u_audio_treb * 0.4, u_color_base.x);
            color += starCol * (particle - 0.90) * 3.0 * (1.0 + u_audio_treb * 2.0 + u_audio_air * 1.5);
        }
    }

    color = toneMapACES(color * (1.0 + u_audio_kick * 0.25 + u_beat_kick * 0.25));
    return vec4(color, 1.0);
}

// ----------------------------------------------------
// 3D SDF PRIMITIVES & SACRED GEOMETRY OBJECTS (7-Band Responsive Engine)
// ----------------------------------------------------

// 3D Quaternion Julia SDF (Smoothly bounded for continuous 3D stability)
float mapJulia3D(vec3 p, out float trap) {
    vec3 pScaled = p * 1.4;
    vec4 z = vec4(pScaled, 0.0);
    
    // Stable quaternion constant C with gentle harmonic audio orbit
    vec4 c = vec4(
        u_c.x + cos(u_audio_time * 0.15) * (0.02 + u_audio_mid * 0.03), 
        u_c.y + sin(u_audio_time * 0.12) * (0.02 + u_audio_pres * 0.03), 
        sin(u_audio_time * 0.20 + u_audio_sub * 0.8) * (0.08 + u_audio_kick * 0.06), 
        cos(u_audio_time * 0.16 + u_audio_treb * 0.8) * (0.08 + u_audio_air * 0.06)
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
    return (0.5 * sqrt(r2 / dr2) * log(r2) / 1.4) + getMicroDisplacement(p);
}

// 3D Mandelbulb SDF
float mapMandelbulb(vec3 p, out float trap) {
    vec3 w = p * 1.4;
    float dr = 1.0;
    float r = 0.0;
    trap = 1.0;
    
    // Mids, Kick, & Sub drive power modulation dynamically (6.0 to 16.0)
    float power = 6.0 + u_audio_mid * 5.5 + u_audio_kick * 3.5 + u_audio_sub * 2.0 + u_beat_kick * 2.0;

    for (int i = 0; i < 8; i++) {
        r = length(w);
        if (r > 2.0) break;
        
        trap = min(trap, r);
        
        float theta = acos(w.z / r);
        float phi = atan(w.y, w.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;

        float zr = pow(r, power);
        theta = theta * power + u_audio_time * 0.12 + u_audio_mid * 0.5 + u_audio_sub * 0.3;
        phi = phi * power + u_audio_treb * 0.5 + u_audio_air * 0.3;

        w = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        w += p * 1.4;
    }
    return ((0.5 * log(r) * r / dr) / 1.4) + getMicroDisplacement(p);
}

// 3D Organic Ink Flow / Fluid Dispersion SDF
float mapInkFlow(vec3 p, out float trap) {
    vec3 q = p * 1.4;
    // Fluid Domain Warping driven continuously by Audio Momentum & Mids/Sub
    float warp = sin(q.x * 2.2 + u_audio_time * 0.45) * cos(q.y * 2.2 - u_audio_mid * 2.5) * sin(q.z * 2.2 + u_audio_sub * 2.0);
    q += vec3(warp * 0.35);

    // Core Fluid Ink Blob expansion driven by Sub-bass, Kick, & Beats
    float dCore = length(q) - (0.38 + u_audio_sub * 0.35 + u_audio_kick * 0.28 + u_beat_kick * 0.20);
    
    // Tendril Fluid Waves driven continuously by Treble, Presence, & Snare
    float dTendrils = sin(q.x * 3.5 + u_audio_time * 0.9) * cos(q.y * 3.5 + u_audio_mid * 1.5) * sin(q.z * 3.5 + u_audio_pres * 1.5) * (0.15 + u_audio_treb * 0.12 + u_audio_snare * 0.10);
    
    trap = length(q);
    return (((dCore + dTendrils) * 0.65) / 1.4) + getMicroDisplacement(p);
}

// Sacred Sri Yantra Mandala SDF
float mapSriYantra(vec3 p, out float trap) {
    vec3 pScaled = p * 1.4;
    float r = length(pScaled.xy);
    float a = atan(pScaled.y, pScaled.x);
    
    float ring1 = abs(r - (0.75 + sin(u_audio_time * 0.35 + u_audio_sub * 0.8) * 0.20 + u_audio_kick * 0.25 + u_beat_kick * 0.15)) - 0.035;
    float ring2 = abs(r - (0.50 + u_audio_mid * 0.20)) - 0.025;
    float ring3 = abs(r - (0.28 + u_audio_pres * 0.10)) - 0.015;
    
    vec3 q = rotateZ(floor(a * 4.5 + u_audio_mid * 1.8) / 4.5) * pScaled;
    float tri = max(abs(q.x) * 0.866 + q.y * 0.5, -q.y) - (0.40 + u_audio_kick * 0.25 + u_audio_sub * 0.20);
    
    trap = r;
    return (max(min(ring1, min(ring2, ring3)), abs(pScaled.z) - 0.10) / 1.4) + getMicroDisplacement(p);
}

// Metatron's Cube & Flower of Life SDF
float mapMetatronCube(vec3 p, out float trap) {
    vec3 pScaled = p * 1.8;
    float centerSphere = length(pScaled) - (0.26 + u_audio_sub * 0.25 + u_audio_kick * 0.20);
    
    vec3 absP = abs(pScaled);
    float outerSpheres = length(absP - vec3(0.55, 0.55, 0.55)) - (0.14 + u_audio_snare * 0.18 + u_audio_pres * 0.12);
    
    float beam = length(vec2(length(pScaled.xy) - 0.55, pScaled.z)) - (0.02 + u_audio_mid * 0.08 + u_audio_treb * 0.06);
    
    trap = length(pScaled);
    return (min(min(centerSphere, outerSpheres), beam) / 1.8) + getMicroDisplacement(p);
}

// 3D Trefoil Torus Knot SDF
float mapTorusKnot(vec3 p, out float trap) {
    vec3 q = rotateZ(u_audio_time * 0.25 + u_audio_mid * 1.8 + u_audio_snare * 0.8) * (p * 1.5);
    float r = length(q.xy);
    float a = atan(q.y, q.x);
    
    vec2 cl = vec2(r - (0.70 + u_audio_kick * 0.35 + u_audio_sub * 0.25), q.z);
    float angleKnot = a * 1.5;
    vec2 knotP = vec2(sin(angleKnot), cos(angleKnot)) * 0.22;
    
    float knotD = length(cl - knotP) - (0.08 + u_audio_snare * 0.10 + u_audio_treb * 0.08);
    trap = r;
    return (knotD / 1.5) + getMicroDisplacement(p);
}

// Cybernetic Prism Pyramid SDF
float mapPrismPyramid(vec3 p, out float trap) {
    vec3 q = p * 1.5;
    q.y += 0.35;
    
    float pyr = max(abs(q.x) + q.y, max(abs(q.z) + q.y, -q.y - 0.8));
    
    vec3 crystalP = q - vec3(0.0, 0.8 + sin(u_audio_time * 1.3 + u_audio_sub * 0.8) * 0.35 + u_audio_kick * 0.35 + u_beat_kick * 0.25, 0.0);
    crystalP = rotateY(u_audio_time * 1.6 + u_audio_mid * 1.8 + u_audio_pres * 1.0) * crystalP;
    float crystal = (abs(crystalP.x) + abs(crystalP.y) + abs(crystalP.z)) - (0.18 + u_audio_treb * 0.30 + u_audio_air * 0.20);
    
    trap = length(crystalP);
    return (min(pyr, crystal) / 1.5) + getMicroDisplacement(p);
}

// Infinite Cosmic Tunnel SDF
float mapCosmicTunnel(vec3 p, out float trap) {
    float r = length(p.xy);
    float tunnel = abs(r - (1.1 + u_audio_kick * 0.45 + u_audio_sub * 0.30)) - 0.07;
    float rib = abs(sin(p.z * 2.5 + u_audio_time * 2.8 * u_rot_speed + u_audio_sub * 3.5)) - (0.05 + u_audio_snare * 0.15 + u_audio_pres * 0.10);
    
    trap = r;
    return max(tunnel, rib) + getMicroDisplacement(p);
}

// Master Scene Distance Evaluator
float mapScene(vec3 p, out float trap) {
    if (u_geometry_mode == 1) return mapMandelbulb(p, trap);
    if (u_geometry_mode == 2) return mapJulia3D(p, trap);
    if (u_geometry_mode == 3) return mapInkFlow(p, trap);
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
    
    if (u_fx_mode == 2 || u_audio_snare > 0.4 || u_beat_snare > 0.4) {
        uv.x += sin(uv.y * 30.0 + u_audio_time * 8.0) * 0.008 * (u_audio_snare + u_audio_treb * 0.5 + u_beat_snare * 0.5);
    }

    uv = applyKaleidoscope(uv, u_kaleidoscope_folds);

    // Camera distance pulsation driven continuously by Sub-bass & Kick punch
    float camDist = 4.4 * u_zoom * (1.0 - u_audio_sub * 0.18 - u_audio_kick * 0.12 - u_beat_kick * 0.08);
    float rotY = u_audio_time * 0.14 * u_rot_speed + u_offset.x * 3.0 + u_audio_mid * 0.6 + u_audio_snare * 0.25;
    float rotX = u_offset.y * 3.0 + sin(u_audio_time * 0.12) * 0.2 + u_audio_sub * 0.18;

    vec3 ro = vec3(0.0, 0.0, -camDist);
    // Dynamic camera sway driven by Sub-bass energy
    ro.xy += vec2(sin(u_audio_time * 0.5), cos(u_audio_time * 0.4)) * u_audio_sub * 0.25;

    mat3 rotM = rotateY(rotY) * rotateX(rotX);
    ro = rotM * ro;

    vec3 rd = rotM * normalize(vec3(uv, 1.5));

    float t = 0.0;
    float maxDist = 12.0;
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
        t += d * 0.75;
        if (t > maxDist) break;
    }

    // Rich, deep dark background base (Deep Obsidian / Dark Charcoal)
    vec3 bgBase = vec3(0.008, 0.012, 0.025);
    vec3 finalColor = bgBase;

    if (hit) {
        vec3 normal = calcNormal(hitPos);
        vec3 lightDir = normalize(vec3(1.0, 2.0, -1.5));
        
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 viewDir = normalize(ro - hitPos);
        vec3 halfDir = normalize(lightDir + viewDir);
        
        // High-contrast specular and rim highlights modulated by Treble, Air, Presence, & Snare
        float spec = pow(max(dot(normal, halfDir), 0.0), 24.0) * (0.3 + u_audio_treb * 2.0 + u_audio_air * 1.5 + u_audio_snare * 1.2);
        float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.5) * (0.3 + u_audio_pres * 1.5 + u_audio_treb * 1.2);
        
        // Palette position drift across all 7 bands with kinetic audio momentum
        float palettePos = trap * 0.6 + u_audio_time * 0.025 + u_audio_treb * 0.5 + u_audio_air * 0.3 + u_audio_kick * 0.2;
        vec3 baseRGB = getDynamicPalette(palettePos, u_color_base.x);
        
        // Wide dynamic light intensity range driven continuously by Sub-bass & Kick
        float lightIntensity = clamp(0.10 + diff * 0.55 * (1.0 + u_audio_sub * 0.7 + u_audio_kick * 0.7) + spec * 0.4 + u_audio_sub * 0.3, 0.05, 1.40);
        
        finalColor = baseRGB * lightIntensity + vec3(spec * 0.5) + baseRGB * rim * 0.5 * u_glow_intensity;
        
        float fog = exp(-t * 0.18);
        finalColor = mix(bgBase, finalColor, fog);
    } else {
        // Vibrant background illumination pulsing with Sub-bass & Kick energy
        float bgGlow = (1.0 - length(uv)) * (0.05 + u_audio_sub * 0.50 + u_audio_kick * 0.45);
        vec3 palColor = getDynamicPalette(u_color_base.x + u_audio_treb * 0.2, u_color_base.x);
        finalColor = bgBase + palColor * bgGlow * u_glow_intensity * 0.8;
    }

    // Cyber grid effect (FX Mode 1) - Beat reactive laser floor
    if (u_fx_mode == 1) {
        float floorY = -1.6;
        if (rd.y < 0.0) {
            float tFloor = (floorY - ro.y) / rd.y;
            if (tFloor > 0.0 && (!hit || tFloor < t)) {
                vec3 pFloor = ro + rd * tFloor;
                vec2 grid = abs(fract(pFloor.xz * 1.2 - vec2(0.0, u_audio_time * 1.2 + u_audio_sub * 2.5)) - 0.5);
                float line = min(grid.x, grid.y);
                float gridGlow = smoothstep(0.05, 0.0, line) * exp(-tFloor * 0.18);
                vec3 gridCol = getDynamicPalette(u_audio_time * 0.015 + 0.3 + u_audio_kick * 0.3, u_color_base.x);
                finalColor += gridCol * gridGlow * 0.55 * (1.0 + u_audio_kick * 1.5 + u_audio_sub * 1.0);
            }
        }
    }

    // Chromatic edge shift (FX Mode 2)
    if (u_fx_mode == 2 || u_audio_treb > 0.3 || u_audio_snare > 0.3) {
        finalColor.r += (u_audio_treb * 0.15 + u_audio_snare * 0.20);
        finalColor.b += (u_audio_mid * 0.10 + u_audio_kick * 0.15);
    }

    // Particle Dust / Star Flares (FX Mode 3)
    if (u_fx_mode == 3) {
        float particle = sin(uv.x * 60.0 + u_audio_time * 3.0) * cos(uv.y * 60.0 - u_audio_time * 2.0);
        if (particle > 0.92) {
            vec3 starCol = getDynamicPalette(particle + u_audio_time * 0.05 + u_audio_treb * 0.4, u_color_base.x);
            finalColor += starCol * (particle - 0.92) * 2.5 * (1.0 + u_audio_treb * 2.0 + u_audio_air * 1.5);
        }
    }

    // Refined ACES Filmic Tone Mapping with dynamic exposure kick
    finalColor = toneMapACES(finalColor * (1.0 + u_audio_kick * 0.20 + u_beat_kick * 0.20));

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
