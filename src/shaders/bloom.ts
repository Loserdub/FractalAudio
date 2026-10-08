export const bloomVertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
    v_texCoord = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const bloomFragmentShaderSource = `
precision highp float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_bloom_intensity;

void main() {
    vec4 texColor = texture2D(u_texture, v_texCoord);
    
    vec4 blur = vec4(0.0);
    vec2 tex_offset = 1.0 / u_resolution; 
    
    // 5x5 Gaussian blur approximation
    blur += texture2D(u_texture, v_texCoord + vec2(-2.0, -2.0) * tex_offset) * 0.02784;
    blur += texture2D(u_texture, v_texCoord + vec2(-1.0, -2.0) * tex_offset) * 0.06598;
    blur += texture2D(u_texture, v_texCoord + vec2(0.0, -2.0) * tex_offset) * 0.08905;
    blur += texture2D(u_texture, v_texCoord + vec2(1.0, -2.0) * tex_offset) * 0.06598;
    blur += texture2D(u_texture, v_texCoord + vec2(2.0, -2.0) * tex_offset) * 0.02784;

    blur += texture2D(u_texture, v_texCoord + vec2(-2.0, -1.0) * tex_offset) * 0.06598;
    blur += texture2D(u_texture, v_texCoord + vec2(-1.0, -1.0) * tex_offset) * 0.12197;
    blur += texture2D(u_texture, v_texCoord + vec2(0.0, -1.0) * tex_offset) * 0.15843;
    blur += texture2D(u_texture, v_texCoord + vec2(1.0, -1.0) * tex_offset) * 0.12197;
    blur += texture2D(u_texture, v_texCoord + vec2(2.0, -1.0) * tex_offset) * 0.06598;

    blur += texture2D(u_texture, v_texCoord) * 0.19859;

    blur += texture2D(u_texture, v_texCoord + vec2(-2.0, 1.0) * tex_offset) * 0.06598;
    blur += texture2D(u_texture, v_texCoord + vec2(-1.0, 1.0) * tex_offset) * 0.12197;
    blur += texture2D(u_texture, v_texCoord + vec2(0.0, 1.0) * tex_offset) * 0.15843;
    blur += texture2D(u_texture, v_texCoord + vec2(1.0, 1.0) * tex_offset) * 0.12197;
    blur += texture2D(u_texture, v_texCoord + vec2(2.0, 1.0) * tex_offset) * 0.06598;

    blur += texture2D(u_texture, v_texCoord + vec2(-2.0, 2.0) * tex_offset) * 0.02784;
    blur += texture2D(u_texture, v_texCoord + vec2(-1.0, 2.0) * tex_offset) * 0.06598;
    blur += texture2D(u_texture, v_texCoord + vec2(0.0, 2.0) * tex_offset) * 0.08905;
    blur += texture2D(u_texture, v_texCoord + vec2(1.0, 2.0) * tex_offset) * 0.06598;
    blur += texture2D(u_texture, v_texCoord + vec2(2.0, 2.0) * tex_offset) * 0.02784;
    
    vec4 finalColor = texColor + (blur * u_bloom_intensity);
    gl_FragColor = finalColor;
}
`;
