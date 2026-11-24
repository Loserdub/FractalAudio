export const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const fragmentShaderSource = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_motion_time;
uniform float u_zoom;
uniform vec2 u_offset;
uniform vec2 u_c;
uniform int u_iterations;
uniform vec3 u_color_base;
uniform float u_hat;
uniform float u_detail;
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
uniform vec4 u_kick_waves;   // Age and strength of the two most recent kick waves

// 2D Temporal Acoustic Spectrogram History Ring Buffer (256 bins x 64 history slices)
uniform sampler2D u_audio_history;
uniform float u_history_offset; // Circular ring buffer head offset (0.0 to 1.0)

// Geometry & FX Uniforms
uniform int u_geometry_mode;        // 0: Classic 2D Liquid, 1: 3D Mandelbulb, 2: 3D Julia, 3: 3D Ink Flow, 4: Sri Yantra, 5: Metatron, 6: Torus Knot, 7: Pyramid, 8: Tunnel
uniform float u_fx_mix;
uniform vec4 u_fx_waves;
uniform int u_fx_mode;              // 0: None, 1: Pulse Grid, 2: Spectral Echo, 3: Particle Field
uniform float u_kaleidoscope_folds; // 0, 4, 6, 8, 12, 16
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

// Dark Alternative Industrial & Deep Cool Color Palettes (Blood Crimson & Obsidian, Abyssal Midnight Blue, Monochrome Noir & Stark Silver, Cold Cryo Violet)
vec3 getDynamicPalette(float t, float colorSelect) {
    // Palette 1: Blood Crimson & Smoked Obsidian (Goth/Industrial - Deep blood red, coal black, bone white highlights)
    vec3 col1 = cosPalette(t, vec3(0.35, 0.07, 0.12), vec3(0.42, 0.08, 0.16), vec3(1.00, 0.85, 0.90), vec3(0.00, 0.15, 0.20));
    
    // Palette 2: Abyssal Midnight & Phantom Ice (Deep dark blue, cold indigo, stark icy cyan glints)
    vec3 col2 = cosPalette(t, vec3(0.08, 0.18, 0.45), vec3(0.12, 0.22, 0.38), vec3(0.90, 0.95, 1.05), vec3(0.55, 0.20, 0.60));
    
    // Palette 3: Monochrome Noir & Stark Silver (Pitch black, dark smoked graphite, stark silver/white glints)
    vec3 col3 = cosPalette(t, vec3(0.22, 0.23, 0.26), vec3(0.26, 0.26, 0.28), vec3(1.00, 1.00, 1.00), vec3(0.00, 0.33, 0.67));
    
    // Palette 4: Cold Cryo Violet & Smoked Teal (Dark plum violet, slate shadow, stark cryo teal highlights)
    vec3 col4 = cosPalette(t, vec3(0.24, 0.10, 0.42), vec3(0.20, 0.25, 0.35), vec3(0.85, 1.05, 0.95), vec3(0.40, 0.55, 0.30));
    
    float pFactor = mod(colorSelect * 4.0, 4.0);
    if (pFactor < 1.0) return mix(col1, col2, pFactor);
    if (pFactor < 2.0) return mix(col2, col3, pFactor - 1.0);
    if (pFactor < 3.0) return mix(col3, col4, pFactor - 2.0);
    return mix(col4, col1, pFactor - 3.0);
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

// Read the spectrum at a fixed age, with older audio farther from the center.
float readAudioHistory(float frequency, float age) {
    return texture2D(u_audio_history, vec2(frequency, fract(u_history_offset - age))).r;
}

float getTemporalAcousticWave(vec3 p, float freqOffset) {
    float age = clamp(0.035 + length(p) * 0.12, 0.035, 0.92);
    float frequency = clamp(freqOffset + u_spectral_centroid * 0.25, 0.02, 0.98);
    return readAudioHistory(frequency, age);
}

// Cymatic Chladni Standing Wave Resonance Generator
// Band 6 (Mid Low 410-580 Hz): Vibrational mode M order
float chladniResonance(vec3 p) {
    float n = 2.0 + u_spectral_centroid * 4.0;
    float m = 3.0 + u_bands[6] * 4.0;
    
    const float pi = 3.14159265359;
    float w1 = sin(n * pi * p.x) * sin(m * pi * p.y) - sin(m * pi * p.x) * sin(n * pi * p.y);
    float w2 = sin(m * pi * p.y) * sin(n * pi * p.z) - sin(n * pi * p.y) * sin(m * pi * p.z);
    float chladni = abs(w1 * 0.6 + w2 * 0.4);
    return pow(chladni, 1.6) * (0.04 + u_bands[12] * 0.04 + u_bands[13] * 0.03);
}

// Micro-displacement surface generator: Blends high-frequency acoustic details into 3D SDFs
// Band 3  (Kick 2, 130-195 Hz): Acoustic shockwave ripples
// Band 14 (Treb Low, 6.68-9.47 kHz): Surface ripple base amplitude
// Band 17 (Air High, 16.7-20 kHz): Cyber surface micro-ripple sparkle
float getMicroDisplacement(vec3 p) {
    // Band 17: Cyber surface micro-ripple — air sparkle control
    float ripple = sin(p.x * 18.0 + u_motion_time * 0.9) * cos(p.y * 18.0 - u_motion_time * 0.7) * sin(p.z * 18.0);
    float baseRipple = ripple * (0.010 + u_bands[14] * 0.022 + u_bands[17] * 0.020);
    
    float cymatic = chladniResonance(p);
    
    // Band 3: Acoustic shockwave traveling through spatial geometry
    float temporalWave = getTemporalAcousticWave(p, 0.12) * 0.045 * (1.0 + u_bands[3] * 1.2 + u_beat_kick * 0.5);
    
    return baseRipple + cymatic + temporalWave;
}

// ----------------------------------------------------
// CLASSIC 2D LIQUID JULIA FRACTAL RENDERER (18-Band Responsive Engine)
// ----------------------------------------------------
float ridge(float radius, vec2 hit) {
    return hit.y * (1.0 - smoothstep(0.0, 0.20, abs(radius - hit.x * 5.0)));
}

vec3 pulseGrid(vec2 pos, float frequency) {
    float r = length(pos);
    float crest = ridge(r, u_fx_waves.xy) + ridge(r, u_fx_waves.zw);
    vec2 bent = pos + pos / max(r, 0.01) * crest * 0.13;
    vec2 lines = abs(fract(bent * frequency + 0.5) - 0.5);
    float ink = 1.0 - smoothstep(0.01, 0.075, min(lines.x, lines.y));
    return getDynamicPalette(0.28 + crest * 0.22, u_color_base.x)
        * ink * (0.20 + crest * 1.6) * u_fx_mix;
}

// Each angular sector contains a seeded streak at a different depth.
float particleBurst(vec2 uv, vec2 hit, float seed) {
    float r = length(uv);
    float sector = (atan(uv.y, uv.x) / 6.283185 + 0.5) * 60.0;
    float id = mod(floor(sector), 60.0);
    float depth = fract(sin(id * 17.31 + seed) * 4375.13);
    float offset = 0.15 + 0.7 * fract(sin(id * 31.7 + seed) * 7153.1);
    float across = abs(fract(sector) - offset) * max(r, 0.02) * 0.105;
    float head = 0.09 + depth * 0.17 + hit.x * (0.36 + depth * 0.8 + u_audio_sub * 0.45);
    float trail = 0.018 + hit.x * 0.10 + depth * 0.018;
    float streak = (1.0 - smoothstep(0.0008, 0.0025 + depth * 0.002, across))
        * smoothstep(head - trail, head, r) * (1.0 - smoothstep(head, head + 0.005, r));
    return streak * hit.y * (0.55 + depth + u_hat * step(0.50, depth) * 2.0);
}

vec3 particleField(vec2 uv) {
    float sparks = particleBurst(uv, u_fx_waves.xy, 3.7)
                 + particleBurst(uv, u_fx_waves.zw, 3.7);
    return sparks * getDynamicPalette(0.58 + length(uv) * 0.35, u_color_base.x)
        * smoothstep(0.08, 0.17, length(uv)) * u_fx_mix;
}

float kickWave(float distanceFromOrigin, vec2 wave);
vec4 renderLiquidJulia2D(vec2 uv) {
    // Steady rotation with a small twist from the midrange
    float angle = u_motion_time * 0.32 + u_audio_mid * 0.38 + u_beat_snare * 0.06;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    
    // 2. Dynamic Scale / Zoom centered on u_offset safely bounded within screen limits
    float rUv = length(uv);
    float historyWave2D = readAudioHistory(0.15, min(0.92, 0.035 + rUv * 0.55));
    float zoomFactor = (1.75 / max(0.2, u_zoom)) * (1.0 - u_audio_sub * 0.24 - u_beat_kick * 0.17 - historyWave2D * 0.045);
    float crest = kickWave(rUv * 2.8, u_kick_waves.xy) + 0.65 * kickWave(rUv * 2.8, u_kick_waves.zw);
    vec2 p = rot * (uv * zoomFactor * (1.0 - 0.22 * min(crest, 1.0))) + u_offset;
    
    // 3. Harmonic Audio Orbit on Julia Constant C (lively, rhythmic breathing)
    vec2 c_mod = vec2(
        cos(u_motion_time * 0.36 + u_audio_mid * 0.9) * (0.028 + u_audio_sub * 0.052),
        sin(u_motion_time * 0.29 + u_audio_mid * 0.8) * (0.028 + u_audio_mid * 0.048)
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
        float palettePos = t * 0.8 + u_motion_time * 0.015 + u_beat_kick * 0.045
                         + u_spectral_centroid * 0.18 + u_bands[14] * 0.18 + u_bands[17] * 0.15;
        vec3 basePal = getDynamicPalette(palettePos, u_color_base.x);
        
        // Balanced luminance curve with anti-strobe clamping (Club EDM dark background contrast)
        float light = clamp(0.28 + (u_bands[1] + u_bands[3]) * 0.25 + u_audio_kick * 0.25 + u_beat_kick * 0.15 + u_color_base.z * 0.25 * (1.0 - t), 0.18, 0.95);
        color = basePal * light * (1.0 + u_glow_intensity * 0.35);
        // High-frequency treble shimmer with soft power response & Cymatic nodal shimmer
        float cymatic2D = abs(sin(rUv * 24.0 - u_motion_time * 0.8) * cos(atan(uv.y, uv.x) * 6.0));
        color += basePal * (u_bands[15] * 0.25 + u_bands[17] * 0.22 + u_beat_snare * 0.15) * pow(t, 0.7);
        color += basePal * (cymatic2D * 0.18 * (u_bands[14] + u_bands[16]));
    } else {
        // Deep pitch obsidian core base
        float corePulse = 0.02 + (u_bands[0] + u_bands[2]) * 0.12 + u_audio_kick * 0.10 + u_beat_kick * 0.08;
        vec3 coreColor = getDynamicPalette(u_color_base.x + u_spectral_centroid * 0.08, u_color_base.x);
        color = vec3(0.003, 0.005, 0.009) + coreColor * corePulse;
    }

    if (u_fx_mode == 1) color += pulseGrid(uv * 4.0, 1.45);
    if (u_fx_mode == 3) color += particleField(uv);

    color = toneMapACES(color * (1.0 + u_audio_kick * 0.06 + u_beat_kick * 0.05));
    return vec4(color, 1.0);
}

// ----------------------------------------------------
// 3D SDF PRIMITIVES & SACRED GEOMETRY OBJECTS (7-Band Responsive Engine)
// ----------------------------------------------------

// 3D Quaternion Julia SDF (Smoothly bounded for continuous 3D stability)
float mapJulia3D(vec3 p, out float trap) {
    vec4 z = vec4(p / (1.0 + vec3(0.18, 0.07, 0.10) * u_beat_kick), 0.0);
    
    // Stable quaternion constant C with responsive harmonic audio orbit
    vec4 c = vec4(
        u_c.x + u_beat_snare * 0.11 + cos(u_motion_time * 0.22) * (0.035 + u_audio_mid * 0.045),
        u_c.y + sin(u_motion_time * 0.18) * (0.035 + u_audio_pres * 0.045),
        sin(u_motion_time * 0.26 + u_audio_sub * 0.6) * (0.08 + u_audio_kick * 0.07),
        cos(u_motion_time * 0.22 + u_audio_treb * 0.6) * (0.08 + u_audio_air * 0.07)
    );
    
    // Rotate the 4D initial coordinate based on audio momentum to expose hidden intricate textures
    float rT = u_motion_time * 0.12 + u_bands[7] * 0.3;
    z.xw = mat2(cos(rT), -sin(rT), sin(rT), cos(rT)) * z.xw;
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
    return max(0.0001, dEst);
}

// 3D Mandelbulb SDF
// Band 1 (Sub 2): Core geometry volume & mass expansion
// Band 7 (Mid Warm): Rotational azimuth momentum
float mapMandelbulb(vec3 p, out float trap) {
    p /= 1.0 + 0.16 * u_beat_kick;
    vec3 w = p;
    float dr = 1.0;
    float r = 0.0;
    trap = 1.0;
    
    // Reserve changes to the fractal exponent for slower gestures.
    float power = 7.0 + u_beat_kick * 0.85 + u_audio_mid * 3.5 + u_audio_sub;

    for (int i = 0; i < 8; i++) {
        r = length(w);
        if (r > 2.0) break;
        
        trap = min(trap, r);
        
        float theta = acos(clamp(w.z / max(1e-5, r), -1.0, 1.0));
        float phi = atan(w.y, w.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;

        float zr = pow(r, power);
        // Band 7: rotational azimuth momentum
        theta = theta * power + u_motion_time * 0.14 + u_bands[7] * 0.38 + u_bands[1] * 0.25;
        phi = phi * power + u_motion_time * 0.10 + u_bands[14] * 0.28 + u_bands[16] * 0.15;

        w = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        w += p;
    }
    float dist = (r > 1.0) ? (0.5 * log(r) * r / max(1e-4, dr)) : 0.0;
    return max(0.0001, dist);
}

// A short-lived wave expands from the base of the shape across its surface.
float kickWave(float distanceFromOrigin, vec2 wave) {
    float front = 0.10 + wave.x * 7.3;
    return wave.y * (1.0 - smoothstep(0.08, 0.44, abs(distanceFromOrigin - front)));
}

float mapInkFlow(vec3 p, out float trap) {
    float bass = clamp(u_audio_sub * 0.75 + u_audio_low * 0.40, 0.0, 1.0);
    float mids = clamp(u_audio_mid * 0.85 + u_bands[5] * 0.32, 0.0, 1.0);
    float phase = u_motion_time * 1.8;

    // Independent folds along each axis keep the tendrils curling around the core.
    vec3 bend = vec3(
        sin(p.y * 2.75 + phase + p.z * 0.85),
        sin(p.z * 2.35 - phase * 0.76 + p.x * 0.80),
        cos(p.x * 2.65 + phase * 0.88 - p.y * 0.90)
    );
    vec3 q = (p + bend * (0.24 + mids * 0.57)) / (1.0 + bass * vec3(0.22, 0.43, 0.16));
    q.x += u_beat_snare * 0.40 * smoothstep(-0.65, 0.60, q.y);
    float distanceFromOrigin = length(p + vec3(0.0, 0.78, 0.0));
    float wave = kickWave(distanceFromOrigin, u_kick_waves.xy) + kickWave(distanceFromOrigin, u_kick_waves.zw) * 0.65;
    float radius = 0.83 + bass * 0.38 + u_beat_kick * 0.18 + wave * 0.36;
    float folds = sin(q.x * 2.8 - phase * 0.75) * cos(q.y * 3.0 + phase * 0.45) * sin(q.z * 2.9 + q.x);
    float ripple = sin(q.y * 10.0 + q.z * 7.0 - phase * 1.25) * (u_audio_high * 0.022 + u_beat_snare * 0.050);

    trap = length(q) + folds * 0.18 + wave * 0.15;
    return (length(q) - radius + folds * (0.20 + mids * 0.22) + ripple) * 0.60;
}

// Sacred Sri Yantra Mandala SDF
// Band 9 (Vocal Low): Middle mandala ring breathing
// Band 12 (Pres Low): Crystalline surface ridge sharpness
float mapSriYantra(vec3 p, out float trap) {
    vec3 pScaled = rotateZ(u_motion_time * 0.13 + u_bands[7] * 0.28) * (p * 1.4);
    float r = length(pScaled.xy);
    float a = atan(pScaled.y, pScaled.x);
    
    // Band 9: middle mandala ring — vocal low exclusive
    float ring1 = abs(r - (0.75 + sin(u_motion_time * 0.15 + u_bands[1] * 0.4) * 0.12 + u_bands[2] * 0.15 + u_beat_kick * 0.20)) - 0.035;
    float ring2 = abs(r - (0.50 + u_bands[9] * 0.14)) - 0.025;
    float ring3 = abs(r - (0.28 + u_bands[12] * 0.08)) - 0.015;
    
    vec3 q = rotateZ(floor(a * 4.5) / 4.5) * pScaled;
    float tri = max(abs(q.x) * 0.866 + q.y * 0.5, -q.y) - (0.40 + u_bands[2] * 0.15 + u_bands[1] * 0.12);
    
    trap = r;
    return (max(min(min(ring1, min(ring2, ring3)), tri), abs(pScaled.z) - 0.10) / 1.4);
}

// Metatron's Cube & Flower of Life SDF
// Band 1 (Sub 2): Core geometry volume & mass expansion
// Band 9 (Vocal Low): Outer sphere radii
float mapMetatronCube(vec3 p, out float trap) {
    vec3 pScaled = p * 1.8;
    // Band 1: center sphere volume
    float centerSphere = length(pScaled) - (0.26 + u_bands[1] * 0.18 + u_bands[2] * 0.12);
    
    vec3 absP = abs(pScaled);
    // Band 9: outer sphere radii — vocal low exclusive
    float outerSpheres = length(absP - vec3(0.55 + u_beat_kick * 0.24)) - (0.14 + u_bands[9] * 0.12 + u_bands[12] * 0.08);
    
    float beam = length(vec2(length(pScaled.xy) - 0.55, pScaled.z)) - (0.02 + u_bands[7] * 0.05 + u_bands[14] * 0.04);
    
    trap = length(pScaled);
    return (min(min(centerSphere, outerSpheres), beam) / 1.8);
}

// 3D Trefoil Torus Knot SDF
// Band 5 (Bass Mid): Torus knot braiding radius
// Band 7 (Mid Warm): Rotational azimuth momentum
float mapTorusKnot(vec3 p, out float trap) {
    float rotation = u_motion_time * 0.24 + u_audio_mid * 0.58 + u_beat_kick * 0.12;
    vec3 q = rotateZ(rotation) * (p * 1.5);
    float r = length(q.xy);
    float a = atan(q.y, q.x);
    
    // Band 5: torus knot & tendril braiding radius
    vec2 cl = vec2(r - (0.70 + u_bands[2] * 0.20 + u_bands[5] * 0.18), q.z);
    float angleKnot = a * 1.5 + u_beat_snare * 0.55;
    vec2 knotP = vec2(sin(angleKnot), cos(angleKnot)) * (0.18 + u_bands[5] * 0.12);
    
    float knotD = length(cl - knotP) - (0.08 + u_beat_kick * 0.10 + u_bands[11] * 0.06 + u_bands[14] * 0.05);
    trap = r;
    return (knotD / 1.5);
}

// Cybernetic Prism Pyramid SDF
// Band 12 (Pres Low): Crystal size sharpness
// Band 7 (Mid Warm): Rotational momentum
float mapPrismPyramid(vec3 p, out float trap) {
    vec3 q = p * 1.5;
    q.y += 0.35;
    
    float pyr = max(abs(q.x) + q.y, max(abs(q.z) + q.y, -q.y - 0.8)) * 0.7071;
    
    // Band 12: crystal size — pres low exclusive
    vec3 crystalP = q - vec3(0.0, 0.2 + sin(u_motion_time * 0.45 + u_bands[1] * 0.4) * 0.20 + u_bands[2] * 0.20 + u_beat_kick * 0.38, 0.0);
    crystalP = rotateY(u_motion_time * 0.45 + u_bands[7] * 0.9 + u_bands[9] * 0.5) * crystalP;
    float crystal = (abs(crystalP.x) + abs(crystalP.y) + abs(crystalP.z)) * 0.5773 - (0.16 + u_bands[12] * 0.20 + u_bands[16] * 0.12);
    
    trap = length(crystalP);
    return (min(pyr, crystal) / 1.5);
}

// Infinite Cosmic Tunnel SDF with Temporal Shockwaves
// Band 1 (Sub 2): Core volume & mass
// Band 8 (Snare Body): Aperture cavity breath & rib depth
float mapCosmicTunnel(vec3 p, out float trap) {
    float r = length(p.xy);
    float historyWave = getTemporalAcousticWave(p, 0.08) * 0.20;
    // Band 8: aperture cavity breath — snare body exclusive
    float haloRadius = 1.1 + u_bands[8] * 0.24 + u_audio_sub * 0.32 + historyWave;
    float front = kickWave(p.z + 2.0, u_kick_waves.xy) + 0.65 * kickWave(p.z + 2.0, u_kick_waves.zw);
    haloRadius += front * 0.38 + u_beat_kick * 0.19;
    float tunnel = abs(r - haloRadius) - 0.07;
    // Band 8: rib depth — snare body exclusive
    float rib = -0.08 * u_hat + abs(sin(p.z * 2.5 + u_motion_time * 1.2 + u_bands[1] * 1.8)) - (0.05 + u_bands[8] * 0.10 + u_bands[12] * 0.06);
    
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

    // Surface detail optimization: Smoothly blend expensive micro-displacements 
    // to prevent distance-field discontinuities which cause blown-out phantom boundaries
    float dispBlend = 1.0 - smoothstep(0.0, 0.15, abs(d));
    if (u_geometry_mode != 3 && u_detail > 0.5 && dispBlend > 0.0) {
        d += getMicroDisplacement(p) * dispBlend;
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

    // Band 0 (Sub 1): Lens shockwave & peripheral warp — exclusive
    float r2 = dot(uv, uv);
    float boundedR2 = min(r2, 0.85);
    float lensDisplacement = (u_audio_sub * 0.020 + u_beat_kick * 0.022) * boundedR2;
    uv *= (1.0 + lensDisplacement);

    if (u_geometry_mode == 0) {
        if (u_kaleidoscope_folds > 0.0) {
            uv = applyKaleidoscope(uv, u_kaleidoscope_folds);
        }
        gl_FragColor = renderLiquidJulia2D(uv);
        return;
    }
    
    uv = applyKaleidoscope(uv, u_kaleidoscope_folds);

    float cameraBreath = u_geometry_mode == 3 ? 0.0 : u_audio_sub * 0.035 + u_beat_kick * 0.025;
    float cameraBase = u_geometry_mode == 3 ? 5.2 : 3.6;
    float camDist = cameraBase * u_zoom * (1.0 - cameraBreath);
    float rotY = u_motion_time * 0.45 + u_offset.x * 2.5;
    float rotX = u_offset.y * 2.5 + sin(u_motion_time * 0.28) * 0.18;

    vec3 ro = vec3(0.0, 0.0, -camDist);
    ro.xy += vec2(sin(u_motion_time * 0.35), cos(u_motion_time * 0.28)) * 0.045;

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
        if (u_detail > 0.5 && density > 0.0) {
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
        vec3 mistCol = getDynamicPalette(avgTrap + u_motion_time * 0.015, u_color_base.x);
        volumetricMist = mistCol * accumMist * (0.03 + u_audio_sub * 0.04 + u_audio_mid * 0.025);
    }

    // Pitch obsidian background — near absolute black for dark alternative contrast
    vec3 bgBase = vec3(0.002, 0.003, 0.005);
    vec3 finalColor = bgBase;

    if (hit) {
        vec3 normal = calcNormal(hitPos);
        vec3 lightDir = normalize(vec3(1.0, 2.0, -1.5));
        
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 viewDir = normalize(ro - hitPos);
        vec3 halfDir = normalize(lightDir + viewDir);
        
        // Band 15 (Treb High): Specular micro-facet gloss spark — exclusive
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * (0.40 + u_bands[15] * 1.8 + u_bands[11] * 0.5);
        // Band 14 (Treb Low): Fresnel rim light & grazing angle sheen — exclusive
        float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.2) * (0.60 + u_bands[14] * 1.4 + u_bands[12] * 0.5);
        
        // Band 10 (Vocal Mid): Dynamic palette color wheel shift — exclusive
        float palettePos = trap * 0.5 + u_motion_time * 0.015 + u_beat_kick * 0.043
                         + u_bands[10] * 0.35 + u_bands[16] * 0.18 + u_bands[2] * 0.08;
        vec3 baseRGB = getDynamicPalette(palettePos, u_color_base.x);
        
        // Anti-strobe exposure limits (clamped strictly to 0.95)
        float lightIntensity = clamp(0.32 + diff * 0.65 * (1.0 + u_audio_sub * 0.30 + u_audio_kick * 0.30) + spec * 0.40 + u_audio_sub * 0.15, 0.20, 0.95);
        
        finalColor = baseRGB * lightIntensity + vec3(spec * 0.35) + baseRGB * rim * 0.60 * u_glow_intensity;
        
        float fog = exp(-t * 0.10);
        finalColor = mix(bgBase, finalColor, fog);
    } else {
        // Deep obsidian background glow — Band 0 (Sub1) & Band 2 (Kick1)
        float bgGlow = (1.0 - length(uv) * 0.5) * (0.05 + u_bands[0] * 0.28 + u_bands[2] * 0.22);
        vec3 palColor = getDynamicPalette(u_color_base.x + u_bands[14] * 0.08, u_color_base.x);
        finalColor = bgBase + palColor * bgGlow * u_glow_intensity * 0.8;
    }

    // Band 13 (Pres High): Volumetric Beer-Lambert mist emission intensity — exclusive
    volumetricMist *= (1.0 + u_bands[13] * 1.8);
    finalColor += volumetricMist * (1.0 + u_glow_intensity * 0.5);

    if (u_fx_mode == 1 && rd.y < -0.001) {
        float distanceToFloor = (-1.6 - ro.y) / rd.y;
        if (distanceToFloor > 0.0 && (!hit || distanceToFloor < t)) {
            vec2 floorPos = (ro + rd * distanceToFloor).xz;
            finalColor += pulseGrid(floorPos, 1.5) * exp(-distanceToFloor * 0.15);
        }
    }
    if (u_fx_mode == 3) finalColor += particleField(uv) * (hit ? 0.42 : 1.0);

    // Refined ACES Filmic Tone Mapping with gentle dynamic exposure kick
    finalColor = toneMapACES(finalColor * (1.0 + u_bands[2] * 0.06 + u_beat_kick * 0.05));

    // Beat-Reactive Vignette: edges crush to obsidian black on kick/sub hits
    // Band 0 (Sub1): darkens vignette intensity — heavier sub = darker borders
    // Band 2 (Kick1): contracts vignette radius — each kick squeezes light inward
    // u_beat_kick: transient snap for percussive physical feel
    float vigRadius = 0.88 - u_bands[2] * 0.16 - u_beat_kick * 0.12;
    float vignette = smoothstep(vigRadius, vigRadius + 0.42, length(uv * 0.88));
    finalColor *= (1.0 - vignette * (0.78 + u_bands[0] * 0.20));

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const echoFragmentSource = `
precision mediump float;
uniform sampler2D u_scene;
uniform vec2 u_pixel;
uniform float u_attack;
uniform float u_mix;
void main() {
    vec2 uv = gl_FragCoord.xy * u_pixel;
    vec2 shift = vec2(1.0, 0.35) * u_pixel.y * (1.0 + u_attack * 9.0);
    shift.x *= u_pixel.x / u_pixel.y;
    vec3 base = texture2D(u_scene, uv).rgb;
    vec3 left = texture2D(u_scene, uv - shift).rgb;
    vec3 right = texture2D(u_scene, uv + shift).rgb;
    vec3 cyan = vec3(0.08, 0.85, 1.0) * length(max(left - base, 0.0));
    vec3 magenta = vec3(1.0, 0.12, 0.7) * length(max(right - base, 0.0));
    gl_FragColor = vec4(base + (cyan + magenta) * u_attack * u_mix, 1.0);
}
`;
