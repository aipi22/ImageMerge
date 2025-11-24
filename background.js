const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('bg-canvas'),
    alpha: true,
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Particles
const geometry = new THREE.BufferGeometry();
const count = 2000;
const posArray = new Float32Array(count * 3);

for (let i = 0; i < count * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 15; // Spread
}

geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const material = new THREE.PointsMaterial({
    size: 0.02,
    color: 0x00f2ff,
    transparent: true,
    opacity: 0.8,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

camera.position.z = 3;

// Mouse interaction
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX / window.innerWidth - 0.5;
    mouseY = event.clientY / window.innerHeight - 0.5;
});

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    const elapsedTime = clock.getElapsedTime();

    particles.rotation.y = elapsedTime * 0.05;
    particles.rotation.x = mouseY * 0.5;
    particles.rotation.y += mouseX * 0.5;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
