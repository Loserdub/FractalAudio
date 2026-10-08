export const vertexShaderSource = `#version 300 es
in vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

// Audio reactive uniforms (Expected range: 0.0 to 1.0 smoothed via EMA)
uniform float u_lowFreq;   
uniform float u_midFreq;   
uniform float u_highFreq;  

out vec4 fragColor;

#define MAX_STEPS 70
#define MAX_DIST 10.0
#define SURF_DIST 0.002
#define ITERS 6

// 2D Rotation matrix for camera and space manipulation
mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// Mandelbulb Signed Distance Function (SDF)
float getMandelbulbDist(vec3 p) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    
    // LOWS: Drive geometric morphing. Base power is 8.0, kicks expand it up to 12.0+
    float power = 8.0 + (u_lowFreq * 6.0);

    for (int i = 0; i < ITERS; i++) {
        r = length(z);
        if (r > 2.0) break;
        
        // Cartesian to spherical coordinates
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        
        // Scale and rotate the fractal space
        float zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;
        
        // Convert back to cartesian
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        z += p;
    }
    return 0.5 * log(r) * r / dr;
}

// Raymarching loop
float rayMarch(vec3 ro, vec3 rd) {
    float dO = 0.0; // Distance Origin
    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * dO;
        float dS = getMandelbulbDist(p);
        dO += dS;
        
        // Stop marching if we hit the surface or pass the max render distance
        if(dO > MAX_DIST || abs(dS) < SURF_DIST) break;
    }
    return dO;
}

void main() {
    // Normalize pixel coordinates (from -1 to 1)
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // MIDS: Drive the camera orbit speed. Synths and vocals twist the perspective.
    float camOrbit = u_time * 0.2 + (u_midFreq * 1.5);
    
    // Camera setup
    vec3 ro = vec3(0.0, 0.0, -2.5); // Ray Origin
    ro.xz *= rot(camOrbit);         // Orbit around Y axis
    
    vec3 lookat = vec3(0.0, 0.0, 0.0);
    vec3 f = normalize(lookat - ro);
    vec3 r = cross(vec3(0.0, 1.0, 0.0), f);
    vec3 u = cross(f, r);
    
    // Ray Direction
    vec3 rd = normalize(uv.x * r + uv.y * u + f * 1.0); 
    
    // Calculate distance to fractal
    float d = rayMarch(ro, rd);
    
    vec3 col = vec3(0.0);
    
    if (d < MAX_DIST) {
        vec3 p = ro + rd * d;
        
        // Basic depth shading
        float depth = clamp(1.0 - (d / MAX_DIST), 0.0, 1.0);
        
        // Dynamic procedural color palette based on space and time
        vec3 baseColor = 0.5 + 0.5 * cos(u_time + p.xyx + vec3(0, 2, 4));
        
        // HIGHS: Drive surface emissive flash/bloom. Transients make the edges glow.
        float surfaceFlash = u_highFreq * 1.5;
        col = (baseColor * depth) + vec3(surfaceFlash * 0.8, surfaceFlash * 0.4, surfaceFlash);
        
    } else {
        // Deep background glow also reacting to high frequencies
        col = vec3(0.02, 0.0, 0.05) * (1.0 + u_highFreq * 2.0);
    }
    
    // Output final color with gamma correction
    fragColor = vec4(pow(col, vec3(0.4545)), 1.0);
}
`;
