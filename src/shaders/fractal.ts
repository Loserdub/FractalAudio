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
uniform float u_audio_low;   // Exponential Sub-bass / Bass (20-250Hz)
uniform float u_audio_mid;   // Mids (250Hz-4kHz)
uniform float u_audio_high;  // Highs / Treble (4kHz-20kHz)

// Multi-Band & Beat Transient Uniforms
uniform float u_audio_sub;   // Sub-bass pulse
uniform float u_audio_snare; // Snare presence
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
    // Smooth blending between deep curated palettes based on colorSelect and u_time
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

// ----------------------------------------------------
// CLASSIC 2D LIQUID JULIA FRACTAL RENDERER (Refactored for ~45% Scale Down)
// ----------------------------------------------------
vec4 renderLiquidJulia2D(vec2 uv) {
    float angle = u_audio_mid * 0.15 + u_beat_snare * 0.1;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    
    // Scaled down by ~45% for breathing room and dynamic depth
    float dynamicZoom = u_zoom * 2.2 * (1.0 - u_audio_low * 0.08 - u_beat_kick * 0.05);
    vec2 p = rot * uv * dynamicZoom + u_offset;
    
    vec2 c = u_c + vec2(
        sin(u_time * 0.15 + u_audio_sub * 0.5) * 0.02 * u_audio_mid + u_beat_kick * 0.02, 
        cos(u_time * 0.12 - u_audio_high * 0.5) * 0.02 * u_audio_mid + u_beat_snare * 0.02
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
        // Palette drift over time with treble shifting tone subtly
        float palettePos = t * 0.7 + u_time * 0.02 + u_audio_high * 0.15 + u_beat_kick * 0.08;
        vec3 basePal = getDynamicPalette(palettePos, u_color_base.x);
        
        // Controlled, non-blinding luminance
        float light = clamp(0.15 + u_color_base.z * 0.3 * (1.0 - t) + u_audio_low * 0.12, 0.0, 0.65);
        color = basePal * light * (1.2 + u_glow_intensity * 0.3);
        color += basePal * u_audio_high * 0.25 * t;
    } else {
        // Core dark obsidian pulse
        float corePulse = 0.04 + u_audio_low * 0.08 + u_beat_kick * 0.06;
        color = vec3(0.01, 0.015, 0.03) + getDynamicPalette(u_color_base.x, u_color_base.x) * corePulse;
    }

    if (u_fx_mode == 2 || u_beat_snare > 0.7) {
        color.r += u_beat_snare * 0.08;
        color.b += u_beat_kick * 0.06;
    }

    color = toneMapACES(color);
    return vec4(color, 1.0);
}

// ----------------------------------------------------
// 3D SDF PRIMITIVES & SACRED GEOMETRY OBJECTS (Scaled for dynamic breathing space)
// ----------------------------------------------------

// 3D Quaternion Julia SDF
float mapJulia3D(vec3 p, out float trap) {
    vec4 z = vec4(p * 1.5, 0.0); // Scaled down object space
    vec4 c = vec4(
        u_c.x + sin(u_time * 0.15) * 0.04 * u_audio_mid, 
        u_c.y, 
        sin(u_audio_low * 0.5) * 0.1, 
        cos(u_audio_high * 0.5) * 0.1
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
    return 0.5 * sqrt(r2 / dr2) * log(r2) / 1.5;
}

// 3D Mandelbulb SDF
float mapMandelbulb(vec3 p, out float trap) {
    vec3 w = p * 1.4; // Scaled down object space
    float dr = 1.0;
    float r = 0.0;
    trap = 1.0;
    
    // Mids drive power modulation smoothly
    float power = 8.0 + u_audio_mid * 2.5 + u_beat_kick * 1.5;

    for (int i = 0; i < 8; i++) {
        r = length(w);
        if (r > 2.0) break;
        
        trap = min(trap, r);
        
        float theta = acos(w.z / r);
        float phi = atan(w.y, w.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;

        float zr = pow(r, power);
        theta = theta * power + u_time * 0.1 + u_audio_mid * 0.2;
        phi = phi * power + u_audio_high * 0.2;

        w = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        w += p * 1.4;
    }
    return (0.5 * log(r) * r / dr) / 1.4;
}

// 3D Organic Ink Flow / Fluid Dispersion SDF
float mapInkFlow(vec3 p, out float trap) {
    vec3 q = p * 1.4;
    // Fluid Domain Warping driven by mids
    float warp = sin(q.x * 2.2 + u_time * 0.4) * cos(q.y * 2.2 - u_audio_mid * 1.2) * sin(q.z * 2.2 + u_audio_low * 0.8);
    q += vec3(warp * 0.25);

    // Core Fluid Ink Blob (Subtle bass pulse)
    float dCore = length(q) - (0.42 + u_audio_sub * 0.15 + u_beat_kick * 0.1);
    
    // Tendril Fluid Waves driven by treble/mids
    float dTendrils = sin(q.x * 3.5 + u_time * 0.8) * cos(q.y * 3.5 + u_audio_mid * 0.8) * sin(q.z * 3.5 + u_audio_high * 0.8) * 0.10;
    
    trap = length(q);
    return ((dCore + dTendrils) * 0.65) / 1.4;
}

// Sacred Sri Yantra Mandala SDF
float mapSriYantra(vec3 p, out float trap) {
    vec3 pScaled = p * 1.4;
    float r = length(pScaled.xy);
    float a = atan(pScaled.y, pScaled.x);
    
    float ring1 = abs(r - (0.8 + sin(u_time * 0.3 + u_audio_sub * 0.5) * 0.1 + u_beat_kick * 0.08)) - 0.03;
    float ring2 = abs(r - 0.52) - 0.02;
    float ring3 = abs(r - 0.28) - 0.015;
    
    vec3 q = rotateZ(floor(a * 4.5 + u_audio_mid * 1.0) / 4.5) * pScaled;
    float tri = max(abs(q.x) * 0.866 + q.y * 0.5, -q.y) - (0.45 + u_beat_kick * 0.1);
    
    trap = r;
    return max(min(ring1, min(ring2, ring3)), abs(pScaled.z) - 0.10) / 1.4;
}

// Metatron's Cube & Flower of Life SDF
float mapMetatronCube(vec3 p, out float trap) {
    vec3 pScaled = p * 1.8;
    float centerSphere = length(pScaled) - (0.30 + u_audio_sub * 0.08);
    
    vec3 absP = abs(pScaled);
    float outerSpheres = length(absP - vec3(0.55, 0.55, 0.55)) - (0.16 + u_beat_snare * 0.06);
    
    float beam = length(vec2(length(pScaled.xy) - 0.55, pScaled.z)) - (0.02 + u_audio_snare * 0.03);
    
    trap = length(pScaled);
    return min(min(centerSphere, outerSpheres), beam) / 1.8;
}

// 3D Trefoil Torus Knot SDF
float mapTorusKnot(vec3 p, out float trap) {
    vec3 q = rotateZ(u_time * 0.2 + u_audio_mid * 0.8) * (p * 1.5);
    float r = length(q.xy);
    float a = atan(q.y, q.x);
    
    vec2 cl = vec2(r - (0.75 + u_beat_kick * 0.15), q.z);
    float angleKnot = a * 1.5;
    vec2 knotP = vec2(sin(angleKnot), cos(angleKnot)) * 0.22;
    
    float knotD = length(cl - knotP) - (0.08 + u_audio_snare * 0.04);
    trap = r;
    return knotD / 1.5;
}

// Cybernetic Prism Pyramid SDF
float mapPrismPyramid(vec3 p, out float trap) {
    vec3 q = p * 1.5;
    q.y += 0.35;
    
    float pyr = max(abs(q.x) + q.y, max(abs(q.z) + q.y, -q.y - 0.8));
    
    vec3 crystalP = q - vec3(0.0, 0.8 + sin(u_time * 1.2 + u_audio_sub * 0.5) * 0.15 + u_beat_kick * 0.1, 0.0);
    crystalP = rotateY(u_time * 1.5 + u_audio_mid * 0.8) * crystalP;
    float crystal = (abs(crystalP.x) + abs(crystalP.y) + abs(crystalP.z)) - (0.22 + u_audio_high * 0.12);
    
    trap = length(crystalP);
    return min(pyr, crystal) / 1.5;
}

// Infinite Cosmic Tunnel SDF
float mapCosmicTunnel(vec3 p, out float trap) {
    float r = length(p.xy);
    float tunnel = abs(r - (1.2 + u_beat_kick * 0.2)) - 0.06;
    float rib = abs(sin(p.z * 2.5 + u_time * 2.0 * u_rot_speed + u_audio_sub * 2.0)) - (0.06 + u_audio_snare * 0.06);
    
    trap = r;
    return max(tunnel, rib);
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
    
    if (u_fx_mode == 2 || (u_beat_snare > 0.6 && u_fx_mode > 0)) {
        uv.x += sin(uv.y * 30.0 + u_time * 10.0) * 0.005 * u_beat_snare;
    }

    uv = applyKaleidoscope(uv, u_kaleidoscope_folds);

    // Camera distance increased to 4.4 * u_zoom for ~45% center object scaling and breathing room
    float camDist = 4.4 * u_zoom * (1.0 - u_audio_sub * 0.04 - u_beat_kick * 0.03);
    float rotY = u_time * 0.12 * u_rot_speed + u_offset.x * 3.0 + u_audio_mid * 0.2;
    float rotX = u_offset.y * 3.0 + sin(u_time * 0.10) * 0.2;

    vec3 ro = vec3(0.0, 0.0, -camDist);
    // Subtle camera position sway driven by sub-bass
    ro.xy += vec2(sin(u_time * 0.4), cos(u_time * 0.3)) * u_audio_sub * 0.05;

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
    vec3 bgBase = vec3(0.012, 0.016, 0.032);
    vec3 finalColor = bgBase;

    if (hit) {
        vec3 normal = calcNormal(hitPos);
        vec3 lightDir = normalize(vec3(1.0, 2.0, -1.5));
        
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 viewDir = normalize(ro - hitPos);
        vec3 halfDir = normalize(lightDir + viewDir);
        
        // Controlled, non-blinding specular highlights
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * (0.5 + u_audio_high * 0.8 + u_beat_snare * 0.6);
        // Soft edge rim lighting
        float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0) * (0.4 + u_audio_high * 0.6 + u_beat_snare * 0.5);
        
        // Dynamic procedural palette position with subtle hue drift
        float palettePos = trap * 0.6 + u_time * 0.02 + u_audio_high * 0.12 + u_beat_kick * 0.06;
        vec3 baseRGB = getDynamicPalette(palettePos, u_color_base.x);
        
        float lightIntensity = clamp(0.25 + diff * 0.45 + spec * 0.3 + u_audio_sub * 0.10, 0.0, 0.85);
        
        finalColor = baseRGB * lightIntensity + vec3(spec * 0.4) + baseRGB * rim * 0.4 * u_glow_intensity;
        
        float fog = exp(-t * 0.18);
        finalColor = mix(bgBase, finalColor, fog);
    } else {
        // Deep background glow with smooth subtle pulsing
        float bgGlow = (1.0 - length(uv)) * (0.08 + u_audio_sub * 0.12 + u_beat_kick * 0.08);
        vec3 palColor = getDynamicPalette(u_color_base.x, u_color_base.x);
        finalColor = bgBase + palColor * bgGlow * u_glow_intensity * 0.5;
    }

    // Cyber grid effect (FX Mode 1) - Toned down glare
    if (u_fx_mode == 1) {
        float floorY = -1.6;
        if (rd.y < 0.0) {
            float tFloor = (floorY - ro.y) / rd.y;
            if (tFloor > 0.0 && (!hit || tFloor < t)) {
                vec3 pFloor = ro + rd * tFloor;
                vec2 grid = abs(fract(pFloor.xz * 1.2 - vec2(0.0, u_time * 1.0 + u_audio_sub * 1.5)) - 0.5);
                float line = min(grid.x, grid.y);
                float gridGlow = smoothstep(0.05, 0.0, line) * exp(-tFloor * 0.18);
                vec3 gridCol = getDynamicPalette(u_time * 0.01 + 0.3, u_color_base.x);
                finalColor += gridCol * gridGlow * 0.35 * (1.0 + u_beat_kick * 0.5);
            }
        }
    }

    // Chromatic edge shift (FX Mode 2)
    if (u_fx_mode == 2 || u_audio_high > 0.4 || u_beat_snare > 0.5) {
        finalColor.r += (u_audio_high * 0.04 + u_beat_snare * 0.06);
        finalColor.b += (u_audio_mid * 0.03 + u_beat_kick * 0.04);
    }

    // Toned-down Particle Dust / Star Flares (FX Mode 3)
    if (u_fx_mode == 3) {
        float particle = sin(uv.x * 60.0 + u_time * 3.0) * cos(uv.y * 60.0 - u_time * 2.0);
        if (particle > 0.94) {
            vec3 starCol = getDynamicPalette(particle + u_time * 0.05, u_color_base.x);
            finalColor += starCol * (particle - 0.94) * 1.5 * (1.0 + u_audio_high * 0.8);
        }
    }

    // ACES Filmic Tone Mapping to prevent any blown-out bright whites
    finalColor = toneMapACES(finalColor);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
