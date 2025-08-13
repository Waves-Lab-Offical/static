#version 300 es
precision mediump float;

in vec3 vcolor;
out vec4 fragColor;

void main() {
    fragColor = vec4(vcolor, 1.0);
}