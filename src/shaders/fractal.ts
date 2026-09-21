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

// Full 7-Band Frequency Uniforms (Backwards Compatibility)
uniform float u_audio_sub;   // Sub-bass (20-60Hz)
uniform float u_audio_kick;  // Kick punch (60-250Hz)
uniform float u_audio_snare; // Snare attack (800Hz-2.5kHz)
uniform float u_audio_pres;  // Presence (2.5kHz-6kHz)
uniform float u_audio_treb;  // Treble (6kHz-12kHz)
uniform float u_audio_air;   // Air / Brilliance (12kHz-20kHz)

// Full 18-Band Mel-Spaced Psychoacoustic Array
uniform float u_bands[18];

// High-Level Acoustic Feature Descriptors
uniform float u_spectral_centroid;  // Timbre brightness & filter sweeps (0.0 to 1.0)
uniform float u_spectral_flatness;  // Tonal clarity vs noise wash (0.0 to 1.0)
uniform float u_energy_flux;        // Transient onset energy

// Beat Transient Uniforms
uniform float u_beat_kick;   // Smoothed kick transient (0.0 - 1.0)
uniform float u_beat_snare;  // Smoothed snare transient (0.0 - 1.0)
uniform float u_lens_shock;  // Viscoelastic subwoofer acoustic lens shock (0.0 - 1.0)

// 2D Temporal Acoustic Spectrogram History Ring Buffer (256 bins x 64 history slices)
uniform sampler2D u_audio_history;

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

// Rich Deep Club EDM Color Palettes (Cyber Cobalt & Ice Cyan, Dark Ultraviolet & Laser Violet, Obsidian Charcoal & Acid Mint)
vec3 getDynamicPalette(float t, float colorSelect) {
    // Palette 1: Cyber Cobalt & Electric Icy Cyan (Anyma / Eric Prydz HOLO vibe)
    vec3 col1 = cosPalette(t, vec3(0.16, 0.36, 0.65), vec3(0.18, 0.32, 0.38), vec3(0.85, 0.95, 1.15), vec3(0.05, 0.22, 0.55));
    
    // Palette 2: Dark Ultraviolet & Laser Violet (Afterlife / Dark Warehouse Techno vibe)
    vec3 col2 = cosPalette(t, vec3(0.36, 0.16, 0.65), vec3(0.30, 0.18, 0.36), vec3(0.90, 0.82, 1.10), vec3(0.50, 0.18, 0.70));
    
    // Palette 3: Obsidian Charcoal & Acid Cold Mint (Underground Berlin Minimal vibe)
    vec3 col3 = cosPalette(t, vec3(0.12, 0.50, 0.44), vec3(0.14, 0.40, 0.35), vec3(0.95, 1.00, 1.00), vec3(0.10, 0.44, 0.40));
    
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

// Temporal Acoustic Wave: Samples the 2D FFT history texture along spatial depth & temporal lag
float getTemporalAcousticWave(vec3 p, float freqOffset) {
    // Map spatial distance to historical time coordinate (0.0 = present, 1.0 = historical lag)
    float timeLag = fract(length(p) * 0.12 - u_audio_time * 0.10);
    float freqNorm = clamp(freqOffset + u_spectral_centroid * 0.25, 0.02, 0.98);
    float wave = texture2D(u_audio_history, vec2(freqNorm, timeLag)).r;
    return wave;
}

// Cymatic Chladni Standing Wave Resonance Generator
float chladniResonance(vec3 p) {
    // Modal vibrational numbers N and M driven by timbral centroid and mid harmonic ratios
    float n = 2.0 + floor(u_spectral_centroid * 4.0); // Mode N (2..6)
    float m = 3.0 + floor(u_bands[6] * 3.0);           // Mode M (3..6)
    
    const float pi = 3.14159265359;
    // Chladni 2D/3D nodal line equations for vibrating acoustic plates
    float w1 = sin(n * pi * p.x) * sin(m * pi * p.y) - sin(m * pi * p.x) * sin(n * pi * p.y);
    float w2 = sin(m * pi * p.y) * sin(n * pi * p.z) - sin(n * pi * p.y) * sin(m * pi * p.z);
    float chladni = abs(w1 * 0.6 + w2 * 0.4);
    
    // Sharpen into crystalline nodal ridge lines
    return pow(chladni, 1.6) * (0.04 + u_audio_mid * 0.035 + u_audio_pres * 0.035);
}

// Micro-displacement surface generator: Blends high-frequency acoustic details into 3D SDFs
float getMicroDisplacement(vec3 p) {
    // Audio-reactive high-frequency surface ripple
    float ripple = sin(p.x * 18.0 + u_audio_time * 0.9) * cos(p.y * 18.0 - u_audio_time * 0.7) * sin(p.z * 18.0);
    float baseRipple = ripple * (0.012 + u_audio_treb * 0.020 + u_audio_air * 0.018);
    
    // Physical cymatic nodal resonance ridges
    float cymatic = chladniResonance(p);
    
    // Historical audio shockwave ripple traveling through spatial geometry
    float temporalWave = getTemporalAcousticWave(p, 0.12) * 0.045 * (1.0 + u_audio_kick * 0.7 + u_beat_kick * 0.5);
    
    return baseRipple + cymatic + temporalWave;
}

// ----------------------------------------------------
// CLASSIC 2D LIQUID JULIA FRACTAL RENDERER (18-Band Responsive Engine)
// ----------------------------------------------------
vec4 renderLiquidJulia2D(vec2 uv) {
    // 1. Fluid 2D Rotation driven rhythmically by Mids, Snare, & Kinetic Audio Momentum
    float angle = (u_bands[7] + u_bands[9]) * 0.15 + u_audio_snare * 0.12 + u_beat_snare * 0.10 + u_audio_time * 0.25;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    
    // 2. Dynamic Scale / Zoom centered on u_offset safely bounded within screen limits
    float rUv = length(uv);
    float historyWave2D = texture2D(u_audio_history, vec2(0.15, fract(rUv * 1.5 - u_audio_time * 0.08))).r;
    float zoomFactor = (1.75 / max(0.2, u_zoom)) * (1.0 - (u_bands[0] + u_bands[1]) * 0.06 - u_audio_kick * 0.06 - u_beat_kick * 0.04 - historyWave2D * 0.035);
    vec2 p = rot * (uv * zoomFactor) + u_offset;
    
    // 3. Harmonic Audio Orbit on Julia Constant C (lively, rhythmic breathing)
    vec2 c_mod = vec2(
        cos(u_audio_time * 0.25 + (u_bands[0] + u_bands[1]) * 0.6) * (0.028 + u_audio_kick * 0.040 + u_beat_kick * 0.025),
        sin(u_audio_time * 0.20 + (u_bands[14] + u_bands[16]) * 0.6) * (0.028 + u_audio_snare * 0.040 + u_beat_snare * 0.025)
    );
    vec2 c = u_c + c_mod;
    
    vec2 z = p;
    int iter = 0;
    float smooth_iter = 0.0;
    
    // Adaptive iteration ceiling ensuring sharp filament details across all slider ranges
    int maxIter = int(clamp(float(u_iterations), 32.0, 128.0));
    
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
        // Palette position drifting with Spectral Centroid filter sweeps, Treble, & Air
        float palettePos = t * 0.8 + u_audio_time * 0.012 + u_spectral_centroid * 0.18 + u_bands[14] * 0.18 + u_bands[17] * 0.15;
        vec3 basePal = getDynamicPalette(palettePos, u_color_base.x);
        
        // Balanced luminance curve with anti-strobe clamping (Club EDM dark background contrast)
        float light = clamp(0.28 + (u_bands[1] + u_bands[3]) * 0.25 + u_audio_kick * 0.25 + u_beat_kick * 0.15 + u_color_base.z * 0.25 * (1.0 - t), 0.18, 0.95);
        color = basePal * light * (1.0 + u_glow_intensity * 0.35);
        // High-frequency treble shimmer with soft power response & Cymatic nodal shimmer
        float cymatic2D = abs(sin(rUv * 24.0 - u_audio_time * 0.8) * cos(atan(uv.y, uv.x) * 6.0));
        color += basePal * (u_bands[15] * 0.25 + u_bands[17] * 0.22 + u_beat_snare * 0.15) * pow(t, 0.7);
        color += basePal * (cymatic2D * 0.18 * (u_bands[14] + u_bands[16]));
    } else {
        // Deep pitch obsidian core base
        float corePulse = 0.02 + (u_bands[0] + u_bands[2]) * 0.12 + u_audio_kick * 0.10 + u_beat_kick * 0.08;
        vec3 coreColor = getDynamicPalette(u_color_base.x + u_spectral_centroid * 0.08, u_color_base.x);
        color = vec3(0.003, 0.005, 0.009) + coreColor * corePulse;
    }

    // FX Mode 1: Cyber Laser Grid (2D planar background overlay - Cool Blue/Cyan Laser)
    if (u_fx_mode == 1) {
        vec2 grid = abs(fract(p * 2.0 - vec2(0.0, u_audio_time * 0.25 + u_audio_sub * 0.6)) - 0.5);
        float line = min(grid.x, grid.y);
        float gridGlow = smoothstep(0.05, 0.0, line);
        vec3 gridCol = getDynamicPalette(u_audio_time * 0.008 + 0.3 + u_audio_kick * 0.1, u_color_base.x);
        color += gridCol * gridGlow * 0.25 * (1.0 + u_audio_kick * 0.5 + u_audio_sub * 0.4);
    }

    // FX Mode 2: Soft chromatic edge warp (non-strobing, tight cool shift)
    if (u_fx_mode == 2 || u_audio_snare > 0.55 || u_beat_snare > 0.55) {
        float snareWarp = (u_audio_snare * 0.04 + u_beat_snare * 0.04);
        color = mix(color, color.brg, clamp(snareWarp, 0.0, 0.12));
    }

    // FX Mode 3: Particle Dust / Anti-aliased Starlight Flares
    if (u_fx_mode == 3) {
        float particle = sin(uv.x * 50.0 + u_audio_time * 1.0) * cos(uv.y * 50.0 - u_audio_time * 0.8);
        float pGlow = smoothstep(0.94, 0.99, particle);
        if (pGlow > 0.0) {
            vec3 starCol = getDynamicPalette(particle + u_audio_time * 0.02 + u_audio_treb * 0.15, u_color_base.x);
            color += starCol * pGlow * 1.2 * (1.0 + u_audio_treb * 0.6 + u_audio_air * 0.5);
        }
    }

    color = toneMapACES(color * (1.0 + u_audio_kick * 0.06 + u_beat_kick * 0.05));
    return vec4(color, 1.0);
}

// ----------------------------------------------------
// 3D SDF PRIMITIVES & SACRED GEOMETRY OBJECTS (7-Band Responsive Engine)
// ----------------------------------------------------

// 3D Quaternion Julia SDF (Smoothly bounded for continuous 3D stability)
float mapJulia3D(vec3 p, out float trap) {
    vec4 z = vec4(p, 0.0);
    
    // Stable quaternion constant C with responsive harmonic audio orbit
    vec4 c = vec4(
        u_c.x * 0.45 + cos(u_audio_time * 0.22) * (0.035 + u_audio_mid * 0.045), 
        u_c.y * 0.45 + sin(u_audio_time * 0.18) * (0.035 + u_audio_pres * 0.045), 
        sin(u_audio_time * 0.26 + u_audio_sub * 0.6) * (0.08 + u_audio_kick * 0.07), 
        cos(u_audio_time * 0.22 + u_audio_treb * 0.6) * (0.08 + u_audio_air * 0.07)
    );
    float dr2 = 1.0;
    float r2 = 0.0;
    trap = 1.0;

    for (int i = 0; i < 11; i++) {
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
    float dEst = (r2 > 1.0) ? (0.5 * sqrt(r2 / max(1e-4, dr2)) * log(r2)) : 0.0;
    float dBound = length(p) - 1.4;
    float dist = (dBound > 0.0) ? max(dBound * 0.7, dEst) : dEst;
    return max(0.0001, dist);
}

// 3D Mandelbulb SDF
float mapMandelbulb(vec3 p, out float trap) {
    vec3 w = p;
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
        theta = theta * power + u_audio_time * 0.14 + u_audio_mid * 0.35 + u_audio_sub * 0.25;
        phi = phi * power + u_audio_time * 0.10 + u_audio_treb * 0.25 + u_audio_air * 0.15;

        w = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        w += p;
    }
    float dist = (r > 1.0) ? (0.5 * log(r) * r / max(1e-4, dr)) : 0.0;
    return max(0.0001, dist);
}

// 3D Organic Ink Flow / Fluid Dispersion SDF
float mapInkFlow(vec3 p, out float trap) {
    vec3 q = p;
    // Fluid Domain Warping driven smoothly by Audio Momentum & Mids/Sub
    float warp = sin(q.x * 2.0 + u_audio_time * 0.35) * cos(q.y * 2.0 - u_audio_mid * 1.2) * sin(q.z * 2.0 + u_audio_sub * 1.0);
    q += vec3(warp * 0.25);

    // Core Fluid Ink Blob expansion sized properly to fill screen center
    float dCore = length(q) - (0.85 + u_audio_sub * 0.25 + u_audio_kick * 0.20 + u_beat_kick * 0.12);
    
    // Tendril Fluid Waves driven continuously by Treble, Presence, & Snare
    float dTendrils = sin(q.x * 2.6 + u_audio_time * 0.50) * cos(q.y * 2.6 + u_audio_mid * 0.8) * sin(q.z * 2.6 + u_audio_pres * 0.8) * (0.20 + u_audio_treb * 0.14 + u_audio_snare * 0.12);
    
    trap = length(q);
    return max(0.0001, (dCore + dTendrils) * 0.65);
}

// Sacred Sri Yantra Mandala SDF
float mapSriYantra(vec3 p, out float trap) {
    vec3 pScaled = p * 1.4;
    float r = length(pScaled.xy);
    float a = atan(pScaled.y, pScaled.x);
    
    float ring1 = abs(r - (0.75 + sin(u_audio_time * 0.15 + u_audio_sub * 0.4) * 0.12 + u_audio_kick * 0.15 + u_beat_kick * 0.09)) - 0.035;
    float ring2 = abs(r - (0.50 + u_audio_mid * 0.12)) - 0.025;
    float ring3 = abs(r - (0.28 + u_audio_pres * 0.06)) - 0.015;
    
    vec3 q = rotateZ(floor(a * 4.5 + u_audio_mid * 1.0) / 4.5) * pScaled;
    float tri = max(abs(q.x) * 0.866 + q.y * 0.5, -q.y) - (0.40 + u_audio_kick * 0.15 + u_audio_sub * 0.12);
    
    trap = r;
    return (max(min(ring1, min(ring2, ring3)), abs(pScaled.z) - 0.10) / 1.4);
}

// Metatron's Cube & Flower of Life SDF
float mapMetatronCube(vec3 p, out float trap) {
    vec3 pScaled = p * 1.8;
    float centerSphere = length(pScaled) - (0.26 + u_audio_sub * 0.15 + u_audio_kick * 0.12);
    
    vec3 absP = abs(pScaled);
    float outerSpheres = length(absP - vec3(0.55, 0.55, 0.55)) - (0.14 + u_audio_snare * 0.10 + u_audio_pres * 0.08);
    
    float beam = length(vec2(length(pScaled.xy) - 0.55, pScaled.z)) - (0.02 + u_audio_mid * 0.05 + u_audio_treb * 0.04);
    
    trap = length(pScaled);
    return (min(min(centerSphere, outerSpheres), beam) / 1.8);
}

// 3D Trefoil Torus Knot SDF
float mapTorusKnot(vec3 p, out float trap) {
    vec3 q = rotateZ(u_audio_time * 0.10 + u_audio_mid * 0.9 + u_audio_snare * 0.4) * (p * 1.5);
    float r = length(q.xy);
    float a = atan(q.y, q.x);
    
    vec2 cl = vec2(r - (0.70 + u_audio_kick * 0.20 + u_audio_sub * 0.15), q.z);
    float angleKnot = a * 1.5;
    vec2 knotP = vec2(sin(angleKnot), cos(angleKnot)) * 0.22;
    
    float knotD = length(cl - knotP) - (0.08 + u_audio_snare * 0.06 + u_audio_treb * 0.05);
    trap = r;
    return (knotD / 1.5);
}

// Cybernetic Prism Pyramid SDF
float mapPrismPyramid(vec3 p, out float trap) {
    vec3 q = p * 1.5;
    q.y += 0.35;
    
    float pyr = max(abs(q.x) + q.y, max(abs(q.z) + q.y, -q.y - 0.8));
    
    vec3 crystalP = q - vec3(0.0, 0.8 + sin(u_audio_time * 0.45 + u_audio_sub * 0.4) * 0.20 + u_audio_kick * 0.20 + u_beat_kick * 0.14, 0.0);
    crystalP = rotateY(u_audio_time * 0.45 + u_audio_mid * 0.9 + u_audio_pres * 0.5) * crystalP;
    float crystal = (abs(crystalP.x) + abs(crystalP.y) + abs(crystalP.z)) - (0.18 + u_audio_treb * 0.18 + u_audio_air * 0.12);
    
    trap = length(crystalP);
    return (min(pyr, crystal) / 1.5);
}

// Infinite Cosmic Tunnel SDF with Temporal Shockwaves
float mapCosmicTunnel(vec3 p, out float trap) {
    float r = length(p.xy);
    // Historical audio shockwave traveling backwards through the tunnel
    float historyWave = getTemporalAcousticWave(p, 0.08) * 0.20;
    float tunnel = abs(r - (1.1 + u_audio_kick * 0.25 + u_audio_sub * 0.18 + historyWave)) - 0.07;
    float rib = abs(sin(p.z * 2.5 + u_audio_time * 1.2 + u_audio_sub * 1.8)) - (0.05 + u_audio_snare * 0.09 + u_audio_pres * 0.06);
    
    trap = r;
    return max(tunnel, rib);
}

// Master Scene Distance Evaluator
float mapScene(vec3 p, out float trap) {
    float d = 0.0;
    if (u_geometry_mode == 1) d = mapMandelbulb(p, trap);
    else if (u_geometry_mode == 2) d = mapJulia3D(p, trap);
    else if (u_geometry_mode == 3) d = mapInkFlow(p, trap);
    else if (u_geometry_mode == 4) d = mapSriYantra(p, trap);
    else if (u_geometry_mode == 5) d = mapMetatronCube(p, trap);
    else if (u_geometry_mode == 6) d = mapTorusKnot(p, trap);
    else if (u_geometry_mode == 7) d = mapPrismPyramid(p, trap);
    else if (u_geometry_mode == 8) d = mapCosmicTunnel(p, trap);
    else d = mapJulia3D(p, trap);

    // Surface-only detail optimization:
    // Only calculate expensive trigonometric micro-displacements and acoustic history
    // texture2D lookups when approaching surface boundaries (d < 0.05).
    // In empty space (d >= 0.05), skip it entirely!
    if (d < 0.05) {
        d += getMicroDisplacement(p);
    }
    return d;
}

// Surface Normal Estimation via Tetrahedral Gradient (4 SDF evaluations instead of 6)
vec3 calcNormal(vec3 p) {
    float dummy;
    const vec2 e = vec2(1.0, -1.0) * 0.001;
    return normalize(
        e.xyy * mapScene(p + e.xyy, dummy) +
        e.yyx * mapScene(p + e.yyx, dummy) +
        e.yxy * mapScene(p + e.yxy, dummy) +
        e.xxx * mapScene(p + e.xxx, dummy)
    );
}

// ----------------------------------------------------
// MAIN RAYMARCHING ENGINE & VOLUMETRIC SHADING
// ----------------------------------------------------
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    // Subwoofer Acoustic Lens Shock (Gently bounded to prevent pushing geometry off-screen)
    float r2 = dot(uv, uv);
    float boundedR2 = min(r2, 0.85);
    float lensDisplacement = (u_audio_sub * 0.025 + u_beat_kick * 0.035 + u_lens_shock * 0.04) * boundedR2;
    uv *= (1.0 + lensDisplacement);

    if (u_geometry_mode == 0) {
        if (u_kaleidoscope_folds > 0.0) {
            uv = applyKaleidoscope(uv, u_kaleidoscope_folds);
        }
        gl_FragColor = renderLiquidJulia2D(uv);
        return;
    }
    
    if (u_fx_mode == 2 || u_audio_snare > 0.55 || u_beat_snare > 0.55) {
        uv.x += sin(uv.y * 22.0 + u_audio_time * 1.5) * 0.003 * (u_audio_snare + u_audio_treb * 0.3 + u_beat_snare * 0.3);
    }

    uv = applyKaleidoscope(uv, u_kaleidoscope_folds);

    // Camera distance with responsive rhythmic breathing, firmly keeping object framed within screen borders
    float camDist = 3.6 * u_zoom * (1.0 - u_audio_sub * 0.06 - u_audio_kick * 0.05 - u_beat_kick * 0.04);
    float rotY = u_audio_time * 0.45 + u_offset.x * 2.5 + u_audio_mid * 0.25 + u_audio_snare * 0.15;
    float rotX = u_offset.y * 2.5 + sin(u_audio_time * 0.28) * 0.18 + u_audio_sub * 0.10;

    vec3 ro = vec3(0.0, 0.0, -camDist);
    // Controlled, rhythmic sway centered on screen
    ro.xy += vec2(sin(u_audio_time * 0.35), cos(u_audio_time * 0.28)) * (0.04 + u_audio_sub * 0.10);

    mat3 rotM = rotateY(rotY) * rotateX(rotX);
    ro = rotM * ro;

    vec3 rd = rotM * normalize(vec3(uv, 1.5));

    float t = 0.0;
    float maxDist = 12.0;
    float trap = 0.0;
    float minStep = 0.0015;
    bool hit = false;
    vec3 hitPos = vec3(0.0);
    vec3 volumetricMist = vec3(0.0);
    float accumMist = 0.0;
    float mistTrapSum = 0.0;

    // Direct, robust raymarching loop with adaptive stepping
    for (int i = 0; i < 96; i++) {
        if (i >= u_iterations) break;
        vec3 p = ro + rd * t;
        float d = mapScene(p, trap);

        // Beer-Lambert Volumetric Absorption Mist inside cavernous apertures
        float haloRadius = 0.32 + u_audio_kick * 0.10;
        float density = clamp((haloRadius - d) / haloRadius, 0.0, 1.0);
        if (density > 0.0) {
            float extinction = exp(-t * 0.14);
            float weight = (density * density) * extinction;
            accumMist += weight;
            mistTrapSum += (trap * 0.4 + float(i) * 0.005) * weight;
        }

        if (d < minStep) {
            hit = true;
            hitPos = p;
            break;
        }
        // Adaptive step relaxation: faster traversal in open space, precision near surfaces
        float stepFactor = (d > 0.08) ? 0.85 : 0.60;
        t += max(d * stepFactor, 0.002);
        if (t > maxDist) break;
    }

    // Consolidated Volumetric Mist calculation: evaluate expensive palette once after raymarching
    if (accumMist > 0.0) {
        float avgTrap = mistTrapSum / max(1e-4, accumMist);
        vec3 mistCol = getDynamicPalette(avgTrap + u_audio_time * 0.015, u_color_base.x);
        volumetricMist = mistCol * accumMist * (0.03 + u_audio_sub * 0.04 + u_audio_mid * 0.025);
    }

    // Deep pitch obsidian background base for Club EDM aesthetic
    vec3 bgBase = vec3(0.003, 0.005, 0.009);
    vec3 finalColor = bgBase;

    if (hit) {
        vec3 normal = calcNormal(hitPos);
        vec3 lightDir = normalize(vec3(1.0, 2.0, -1.5));
        
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 viewDir = normalize(ro - hitPos);
        vec3 halfDir = normalize(lightDir + viewDir);
        
        // Controlled specular and rim highlights without blinding glare
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * (0.45 + u_audio_treb * 0.9 + u_audio_air * 0.7 + u_audio_snare * 0.6);
        float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.2) * (0.65 + u_audio_pres * 0.9 + u_audio_treb * 0.7);
        
        // Palette position drift across bands with gentle kinetic audio momentum
        float palettePos = trap * 0.5 + u_audio_time * 0.012 + u_audio_treb * 0.20 + u_audio_air * 0.15 + u_audio_kick * 0.08;
        vec3 baseRGB = getDynamicPalette(palettePos, u_color_base.x);
        
        // Anti-strobe exposure limits (clamped strictly to 0.95)
        float lightIntensity = clamp(0.32 + diff * 0.65 * (1.0 + u_audio_sub * 0.30 + u_audio_kick * 0.30) + spec * 0.40 + u_audio_sub * 0.15, 0.20, 0.95);
        
        finalColor = baseRGB * lightIntensity + vec3(spec * 0.35) + baseRGB * rim * 0.60 * u_glow_intensity;
        
        float fog = exp(-t * 0.10);
        finalColor = mix(bgBase, finalColor, fog);
    } else {
        // Deep club background illumination pulsing softly with Sub-bass & Kick
        float bgGlow = (1.0 - length(uv) * 0.5) * (0.06 + u_audio_sub * 0.25 + u_audio_kick * 0.20);
        vec3 palColor = getDynamicPalette(u_color_base.x + u_audio_treb * 0.08, u_color_base.x);
        finalColor = bgBase + palColor * bgGlow * u_glow_intensity * 0.8;
    }

    // Blend in Beer-Lambert volumetric absorption mist
    finalColor += volumetricMist * (1.0 + u_glow_intensity * 0.5);

    // Cyber grid effect (FX Mode 1) - Beat reactive laser floor
    if (u_fx_mode == 1) {
        float floorY = -1.6;
        if (rd.y < 0.0) {
            float tFloor = (floorY - ro.y) / rd.y;
            if (tFloor > 0.0 && (!hit || tFloor < t)) {
                vec3 pFloor = ro + rd * tFloor;
                vec2 grid = abs(fract(pFloor.xz * 1.2 - vec2(0.0, u_audio_time * 0.45 + u_audio_sub * 1.0)) - 0.5);
                float line = min(grid.x, grid.y);
                float gridGlow = smoothstep(0.05, 0.0, line) * exp(-tFloor * 0.20);
                vec3 gridCol = getDynamicPalette(u_audio_time * 0.008 + 0.3 + u_audio_kick * 0.1, u_color_base.x);
                finalColor += gridCol * gridGlow * 0.35 * (1.0 + u_audio_kick * 0.5 + u_audio_sub * 0.4);
            }
        }
    }

    // Chromatic subtle edge shift (FX Mode 2 or transient flare)
    float chromaticSpread = (u_audio_snare * 0.04 + u_beat_snare * 0.05 + u_energy_flux * 0.03 + u_lens_shock * 0.04);
    if (u_fx_mode == 2 || chromaticSpread > 0.08) {
        finalColor = mix(finalColor, vec3(finalColor.r, finalColor.b, finalColor.g), clamp(chromaticSpread * 0.3, 0.0, 0.14));
    }

    // Particle Dust / Anti-aliased Star Flares (FX Mode 3)
    if (u_fx_mode == 3) {
        float particle = sin(uv.x * 50.0 + u_audio_time * 1.0) * cos(uv.y * 50.0 - u_audio_time * 0.8);
        float pGlow = smoothstep(0.94, 0.99, particle);
        if (pGlow > 0.0) {
            vec3 starCol = getDynamicPalette(particle + u_audio_time * 0.02 + u_audio_treb * 0.15, u_color_base.x);
            finalColor += starCol * pGlow * 1.2 * (1.0 + u_audio_treb * 0.6 + u_audio_air * 0.5);
        }
    }

    // Refined ACES Filmic Tone Mapping with gentle dynamic exposure kick
    finalColor = toneMapACES(finalColor * (1.0 + u_audio_kick * 0.06 + u_beat_kick * 0.05));

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
