// WebGL 3D SIG Logo Animation with advanced stylized CRT effects and modern monospace font

const canvas = document.getElementById('gl-canvas');
const gl = canvas.getContext('webgl');

// Resize canvas to fit container
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * dpr;
    const height = canvas.clientHeight * dpr;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Use IBM Plex Mono for the text, high resolution for smoothness
function createTextTexture(text, fontSize, fontFamily) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1024;
    tempCanvas.height = 512;
    const ctx = tempCanvas.getContext('2d');
    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.font = `bold ${fontSize}px '${fontFamily}', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);
    return tempCanvas;
}

const textCanvas = createTextTexture('SIG', 320, 'IBM Plex Mono');

// Create WebGL texture from 2D canvas with LINEAR filtering for smooth, unpixelated text
function createGLTexture(gl, canvas) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
}

const textTexture = createGLTexture(gl, textCanvas);

// Vertex shader for 3D plane
const vertShaderSrc = `
attribute vec3 a_position;
attribute vec2 a_uv;
uniform mat4 u_modelViewProj;
varying vec2 v_uv;
void main() {
    v_uv = a_uv;
    gl_Position = u_modelViewProj * vec4(a_position, 1.0);
}`;

// Advanced stylized CRT fragment shader
const fragShaderSrc = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_time;

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}

// CRT barrel distortion
vec2 crtCurve(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    float r2 = uv.x * uv.x + uv.y * uv.y;
    uv *= 1.0 + 0.18 * r2;
    return uv * 0.5 + 0.5;
}

// Simple blur (horizontal)
vec3 blurH(sampler2D tex, vec2 uv, float amount) {
    vec3 sum = vec3(0.0);
    float total = 0.0;
    for (int i = -4; i <= 4; i++) {
        float w = exp(-float(i*i) / (2.0 * amount * amount));
        sum += w * texture2D(tex, uv + vec2(float(i) * 0.008, 0.0)).rgb;
        total += w;
    }
    return sum / total;
}

void main() {
    // CRT curvature
    vec2 uv = crtCurve(v_uv);
    // Color aberration
    float aberr = 0.006 + 0.003 * sin(u_time * 0.7 + uv.y * 4.0);
    vec4 texColorR = texture2D(u_tex, uv + vec2(aberr, 0.0));
    vec4 texColorG = texture2D(u_tex, uv);
    vec4 texColorB = texture2D(u_tex, uv - vec2(aberr, 0.0));
    float alpha = texColorG.a;
    vec3 color = vec3(texColorR.r, texColorG.g, texColorB.b);

    if (alpha > 0.0) {
        // 1. Flicker (toned down)
        float flicker = 0.97 + 0.03 * sin(u_time * 60.0 + uv.x * 10.0) + 0.01 * rand(vec2(u_time, uv.y));
        // 3. Ghosting/trailing (horizontal offset, faded)
        float ghostOffset = 0.025 + 0.01 * sin(u_time * 0.7);
        vec3 ghost = vec3(
            texture2D(u_tex, uv - vec2(ghostOffset, 0.0)).r,
            texture2D(u_tex, uv - vec2(ghostOffset, 0.0)).g,
            texture2D(u_tex, uv - vec2(ghostOffset, 0.0)).b
        );
        color = mix(color, ghost, 0.22);
        // 4. Dynamic focus blur (in and out)
        float blurAmount = 0.7 + 0.6 * (0.5 + 0.5 * sin(u_time * 1.2));
        vec3 blurred = blurH(u_tex, uv, blurAmount);
        color = mix(color, blurred, 0.22);
        // 5. Rainbow edges (color cycling at edges)
        float edge = smoothstep(0.01, 0.08, abs(texColorG.a - 0.5));
        float rainbow = 0.5 + 0.5 * sin(u_time * 2.0 + uv.x * 12.0 + uv.y * 8.0);
        color += edge * vec3(0.5 * rainbow, 0.3 * (1.0 - rainbow), 0.7 * (1.0 - rainbow));
        // Horizontal bloom (soft glow)
        vec3 bloom = vec3(0.0);
        float total = 0.0;
        for (int i = -8; i <= 8; i++) {
            float w = 0.08 * exp(-float(i*i)/18.0);
            bloom += w * texture2D(u_tex, uv + vec2(float(i) * 0.008, 0.0)).rgb;
            total += w;
        }
        bloom /= total;
        color = mix(color, bloom, 0.55);
        // Animated color drift (hue shift)
        float hue = 0.08 * sin(u_time * 0.3) + 0.08 * cos(u_time * 0.13);
        float angle = hue * 6.2831;
        float s = sin(angle), c = cos(angle);
        mat3 hueRotate = mat3(
            0.299 + 0.701 * c + 0.168 * s, 0.587 - 0.587 * c + 0.330 * s, 0.114 - 0.114 * c - 0.497 * s,
            0.299 - 0.299 * c - 0.328 * s, 0.587 + 0.413 * c + 0.035 * s, 0.114 - 0.114 * c + 0.292 * s,
            0.299 - 0.300 * c + 1.250 * s, 0.587 - 0.588 * c - 1.050 * s, 0.114 + 0.886 * c - 0.203 * s
        );
        color = hueRotate * color;
        // Grain
        float grain = rand(uv * u_time * 120.0 + u_time * 10.0) * 0.18 - 0.09;
        color += grain;
        // Flicker (applied last)
        color *= flicker;
        // Contrast and brightness
        color = (color - 0.5) * 1.45 + 0.5;
        color *= 0.82;
        // Vignette
        float dist = distance(uv, vec2(0.5));
        float vignette = smoothstep(0.7, 0.98, dist);
        color *= 1.0 - 0.55 * vignette;
        color = clamp(color, 0.0, 1.0);
        gl_FragColor = vec4(color, alpha);
    } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}
`;

function createShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

function createProgram(gl, vertSrc, fragSrc) {
    const vertShader = createShader(gl, gl.VERTEX_SHADER, vertSrc);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
}

const program = createProgram(gl, vertShaderSrc, fragShaderSrc);

gl.useProgram(program);

// Plane geometry (two triangles)
const positions = new Float32Array([
    -1, -0.5, 0,
     1, -0.5, 0,
    -1,  0.5, 0,
    -1,  0.5, 0,
     1, -0.5, 0,
     1,  0.5, 0
]);
const uvs = new Float32Array([
    0, 1,
    1, 1,
    0, 0,
    0, 0,
    1, 1,
    1, 0
]);

const posBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

const uvBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
const aUV = gl.getAttribLocation(program, 'a_uv');
gl.enableVertexAttribArray(aUV);
gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, textTexture);
const uTex = gl.getUniformLocation(program, 'u_tex');
gl.uniform1i(uTex, 0);

const uModelViewProj = gl.getUniformLocation(program, 'u_modelViewProj');
const uTime = gl.getUniformLocation(program, 'u_time');

// Simple perspective and model-view matrix math
function getMVPMatrix(angle, aspect) {
    // No rotation, just static plane
    const fov = Math.PI / 3;
    const near = 0.1;
    const far = 10.0;
    const f = 1.0 / Math.tan(fov / 2);
    const rangeInv = 1 / (near - far);
    const proj = [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeInv, -1,
        0, 0, near * far * rangeInv * 2, 0
    ];
    // Model-view (no rotation)
    const modelView = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, -2.5,
        0, 0, 0, 1
    ];
    // Multiply proj * modelView
    const mvp = new Float32Array(16);
    for (let row = 0; row < 4; ++row) {
        for (let col = 0; col < 4; ++col) {
            mvp[row * 4 + col] = 0;
            for (let k = 0; k < 4; ++k) {
                mvp[row * 4 + col] += proj[row * 4 + k] * modelView[k * 4 + col];
            }
        }
    }
    return mvp;
}

// Animation loop
function render(now) {
    now *= 0.001; // ms to seconds
    resizeCanvas();
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Animate rotation
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const angle = 0.0;
    const mvp = getMVPMatrix(angle, aspect);
    gl.uniformMatrix4fv(uModelViewProj, false, mvp);
    gl.uniform1f(uTime, now);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
}

requestAnimationFrame(render); 