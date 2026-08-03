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

uniform int u_geometry_mode;        // 0: 3D Julia, 1: 3D Mandelbulb, 2: Wireframe Polyhedron, 3: Sacred Mandala
uniform float u_kaleidoscope_folds; // 0, 4, 6, 8, 12
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
// 3D SDF PRIMITIVES & FRACTAL DISTANCE ESTIMATORS
// ----------------------------------------------------

// 1. 3D Mandelbulb SDF
float mapMandelbulb(vec3 p, out float trap) {
    vec3 w = p;
    float dr = 1.0;
    float r = 0.0;
    trap = 1.0;
    
    // Audio-reactive power exponent + instant Kick Beat shockwave expansion
    float power = 8.0 + u_audio_sub * 4.0 + u_beat_kick * 7.0;

    for (int i = 0; i < 8; i++) {
        r = length(w);
        if (r > 2.0) break;
        
        trap = min(trap, r);
        
        // Convert to polar coordinates
        float theta = acos(w.z / r);
        float phi = atan(w.y, w.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;

        // Scale and rotate
        float zr = pow(r, power);
        theta = theta * power + u_time * 0.2 + u_audio_mid * 0.5 + u_beat_snare * 0.4;
        phi = phi * power + u_audio_high * 0.5;

        // Convert back to cartesian coordinates
        w = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        w += p;
    }
    return 0.5 * log(r) * r / dr;
}

// 2. 3D Quaternion Julia SDF
float mapJulia3D(vec3 p, out float trap) {
    vec4 z = vec4(p, 0.0);
    vec4 c = vec4(
        u_c.x + sin(u_time * 0.3) * 0.05 * u_audio_mid + u_beat_snare * 0.08, 
        u_c.y, 
        sin(u_audio_low) + u_beat_kick * 0.15, 
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
        
        // Quaternion square: z = z^2 + c
        z = vec4(
            z.x*z.x - z.y*z.y - z.z*z.z - z.w*z.w,
            2.0*z.x*z.y,
            2.0*z.x*z.z,
            2.0*z.x*z.w
        ) + c;
    }
    return 0.5 * sqrt(r2 / dr2) * log(r2);
}

// 3. 3D Wireframe Octahedron / Polyhedron SDF
float mapPolyhedron(vec3 p, out float trap) {
    vec3 q = abs(p) - vec3(1.2 + u_audio_sub * 0.4 + u_beat_kick * 0.3);
    float box = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    
    // Wireframe edges
    float thickness = 0.05 + u_audio_snare * 0.06 + u_beat_snare * 0.08;
    float frame = length(vec2(length(p.xy) - 1.0, p.z)) - thickness;
    
    trap = length(p);
    return max(box, -frame);
}

// 4. Sacred Geometry Mandala SDF
float mapMandala(vec3 p, out float trap) {
    float r = length(p.xy);
    float a = atan(p.y, p.x);
    
    // Torus Rings
    vec2 t = vec2(1.2 + sin(u_time * 0.5 + u_audio_sub) * 0.3 + u_beat_kick * 0.4, 0.15 + u_audio_high * 0.1);
    vec2 d = vec2(length(p.xy) - t.x, p.z);
    float ring1 = length(d) - t.y;
    
    // Inner Geometric Star Lattice
    vec3 q = rotateZ(a * 4.0 + u_audio_mid * 2.0 + u_beat_snare * 1.5) * p;
    float star = length(cross(q, vec3(0.577))) - 0.1;
    
    trap = r;
    return min(ring1, star);
}

// Master Scene Distance Evaluator
float mapScene(vec3 p, out float trap) {
    if (u_geometry_mode == 1) return mapMandelbulb(p, trap);
    if (u_geometry_mode == 2) return mapPolyhedron(p, trap);
    if (u_geometry_mode == 3) return mapMandala(p, trap);
    return mapJulia3D(p, trap); // Default 0
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
    // Screen coordinates
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Apply Polar Kaleidoscope Symmetry Fold
    uv = applyKaleidoscope(uv, u_kaleidoscope_folds);

    // Audio-reactive Camera Setup + Kick Beat Punch
    float camDist = 2.5 * u_zoom * (1.0 - u_audio_sub * 0.12 - u_beat_kick * 0.22);
    float rotY = u_time * 0.2 * u_rot_speed + u_offset.x * 3.0 + u_audio_mid * 0.4;
    float rotX = u_offset.y * 3.0 + sin(u_time * 0.15) * 0.3;

    vec3 ro = vec3(0.0, 0.0, -camDist); // Camera Origin
    mat3 rotM = rotateY(rotY) * rotateX(rotX);
    ro = rotM * ro;

    vec3 rd = rotM * normalize(vec3(uv, 1.5)); // Ray Direction

    // Raymarching Loop
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
        t += d * 0.7; // Step scaling for smooth fractal sampling
        if (t > maxDist) break;
    }

    vec3 finalColor = vec3(0.0);

    if (hit) {
        // Surface Lighting
        vec3 normal = calcNormal(hitPos);
        vec3 lightDir = normalize(vec3(1.0, 2.0, -1.5));
        
        // Diffuse & Specular Highlights + Snare Burst Specular
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 viewDir = normalize(ro - hitPos);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * (1.0 + u_audio_high * 2.0 + u_beat_snare * 4.0);
        
        // Rim / Edge Glow
        float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0) * (1.0 + u_audio_high * 1.5 + u_beat_snare * 2.5);
        
        // HSL Color Shift based on fractal orbit trap + audio
        float hue = u_color_base.x + trap * 0.8 + u_time * 0.05 + u_audio_high * 0.3 + u_beat_kick * 0.15;
        float sat = clamp(u_color_base.y + u_audio_mid * 0.4 + u_beat_snare * 0.3, 0.0, 1.0);
        float light = clamp(0.2 + diff * 0.5 + spec * 0.4 + u_audio_sub * 0.2 + u_beat_kick * 0.3, 0.0, 1.0);

        vec3 baseRGB = hsl2rgb(vec3(hue, sat, light));
        
        // Combine Shading
        finalColor = baseRGB * (diff + 0.3) + vec3(spec) + vec3(0.2, 0.9, 0.4) * rim * u_glow_intensity;
        
        // Distance Fog
        float fog = exp(-t * 0.25);
        finalColor = mix(vec3(0.03, 0.04, 0.07), finalColor, fog);
    } else {
        // Background Space & Core Audio Pulse Glow
        float bgGlow = (1.0 - length(uv)) * (0.15 + u_audio_sub * 0.25 + u_beat_kick * 0.4);
        finalColor = hsl2rgb(vec3(u_color_base.x + 0.5, 0.8, 0.1)) * bgGlow * u_glow_intensity;
    }

    // High frequency & Snare Plosive Chromatic Aberration fringe
    if (u_audio_high > 0.3 || u_beat_snare > 0.2) {
        finalColor.r += (u_audio_high * 0.15 + u_beat_snare * 0.35);
        finalColor.b += (u_audio_mid * 0.1 + u_beat_kick * 0.25);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
