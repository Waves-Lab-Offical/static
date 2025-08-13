#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec3 a_color;

out vec3 vcolor;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    vcolor = a_color;
}