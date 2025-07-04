let scene, camera, renderer; //Initializes Three.js essentials
let sun, planets = []; //Sun mesh and array of planet meshes
let stars; //Starfield object
let isAnimating = true; //Controls whether animation is playing
let animationId; //Stores the requestAnimationFrame ID

const raycaster = new THREE.Raycaster(); //Raycaster for detecting mouse hover on objects
const mouse = new THREE.Vector2(); //Mouse 2D coordinates

//Array of planet configurations
const planetData = [
    { name: 'mercury', size: 0.38, distance: 8, speed: 0.004, eccentricity: 0.21, texture: 'Images/mercury.jpg' },
    { name: 'venus', size: 0.95, distance: 12, speed: 0.003, eccentricity: 0.007, texture: 'Images/venus.jpg' },
    { name: 'earth', size: 1.0, distance: 16, speed: 0.002, eccentricity: 0.017, texture: 'Images/earth.jpg' },
    { name: 'mars', size: 0.53, distance: 20, speed: 0.0016, eccentricity: 0.093, texture: 'Images/mars.jpg' },
    { name: 'jupiter', size: 2.5, distance: 28, speed: 0.001, eccentricity: 0.049, texture: 'Images/jupiter.jpg' },
    { name: 'saturn', size: 2.1, distance: 36, speed: 0.0008, eccentricity: 0.056, texture: 'Images/saturn.jpg' },
    { name: 'uranus', size: 1.6, distance: 44, speed: 0.0006, eccentricity: 0.046, texture: 'Images/uranus.jpg' },
    { name: 'neptune', size: 1.55, distance: 52, speed: 0.0004, eccentricity: 0.009, texture: 'Images/neptune.jpg' }
];  

let targetX = 0, targetY = 0, isMouseDown = false, lastMouseX = 0, lastMouseY = 0;
let mouseX = 0, mouseY = 0;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const initialDistance = 30;
    targetX = 0.5;   // Horizontal rotation (radians) ~30 degrees
    targetY = 0.3;   // Vertical rotation (radians) ~40 degrees down look

    camera.position.x = initialDistance * Math.cos(targetY) * Math.cos(targetX);
    camera.position.y = initialDistance * Math.sin(targetY);
    camera.position.z = initialDistance * Math.cos(targetY) * Math.sin(targetX);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('container').appendChild(renderer.domElement);

    createStarfield();
    createSun();
    createPlanets();
    addLighting();
    setupControls();
    addMouseControls();

    window.addEventListener('resize', onWindowResize);

    animate();
}

//This creates the Sun
function createSun() {
    const textureLoader = new THREE.TextureLoader();
    const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
    const sunTexture = textureLoader.load('Images/sun.jpg');
    const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    const labelCanvas = document.createElement('canvas');
    const context = labelCanvas.getContext('2d');
    context.font = '24px Arial';
    const text = 'SUN';
    const textWidth = context.measureText(text).width;

    //LABEL FOR SUN
    labelCanvas.width = textWidth;
    labelCanvas.height = 30;
    context.font = '24px Arial';
    context.fillStyle = 'white';
    context.fillText(text, 0, 24);

    const texture = new THREE.CanvasTexture(labelCanvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);

    sprite.scale.set(4, 2, 1); 
    sun.add(sprite);
    sprite.position.set(0, 3 + 1.5, 0); // 3 is sun's radius

    sprite.material.opacity = 0;
    sun.userData.label = sprite;
}

function createPlanets() {
    const textureLoader = new THREE.TextureLoader();

    planetData.forEach((planetInfo) => {
        const geometry = new THREE.SphereGeometry(planetInfo.size, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            map: textureLoader.load(planetInfo.texture),
            shininess: 10,
            specular: 0x111111
        });
        const planet = new THREE.Mesh(geometry, material);
        planet.castShadow = true;
        planet.receiveShadow = true;
        planet.position.set(planetInfo.distance, 0, 0);

        planet.userData = {
            distance: planetInfo.distance,
            speed: planetInfo.speed,
            angle: Math.random() * Math.PI * 2,
            originalSpeed: planetInfo.speed,
            eccentricity: planetInfo.eccentricity
        };

        planets.push(planet);
        scene.add(planet);

        const ellipsePoints = [];
        const segments = 128;
        const eccentricity = planetInfo.eccentricity || 0;
        const semiMajor = planetInfo.distance * (1 + eccentricity);
        const semiMinor = planetInfo.distance;

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * semiMajor;
            const z = Math.sin(angle) * semiMinor;
            ellipsePoints.push(new THREE.Vector3(x, 0, z));
        }

        const ellipseGeometry = new THREE.BufferGeometry().setFromPoints(ellipsePoints);
        const ellipseMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const ellipseLine = new THREE.LineLoop(ellipseGeometry, ellipseMaterial);
        scene.add(ellipseLine);

        // Floating Name Label
        const labelCanvas = document.createElement('canvas');
        const context = labelCanvas.getContext('2d');
        context.font = '24px Arial';
        const text = planetInfo.name.toUpperCase();
        const textWidth = context.measureText(text).width;

        labelCanvas.width = textWidth;
        labelCanvas.height = 30;
        context.font = '24px Arial';
        context.fillStyle = 'white';
        context.fillText(text, 0, 24);

        const texture = new THREE.CanvasTexture(labelCanvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);

        sprite.scale.set(4, 2, 1); 
        planet.add(sprite);
        sprite.position.set(0, planetInfo.size + 1.5, 0);

        sprite.material.opacity = 0;
        planet.userData.label = sprite;

    });
}

function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
        starPositions[i] = (Math.random() - 0.5) * 500;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

function addLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 300, 0);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);
}

function setupControls() {
    document.getElementById('pauseBtn').addEventListener('click', pauseAnimation);
    document.getElementById('resumeBtn').addEventListener('click', resumeAnimation);
    document.getElementById('resetBtn').addEventListener('click', resetView);
    document.getElementById('toggleControls').addEventListener('click', () => {
    const panel = document.getElementById('controls');
    const btn = document.getElementById('toggleControls');
    if (panel.classList.contains('collapsed')) {
        panel.classList.remove('collapsed');
        btn.textContent = 'Hide Panel ▲';
    } else {
        panel.classList.add('collapsed');
        btn.textContent = 'Show Panel ▼';
    }
});


    planetData.forEach((planetInfo, index) => {
        const slider = document.getElementById(planetInfo.name + 'Speed');
        const valueDisplay = document.getElementById(planetInfo.name + 'Value');
        slider.addEventListener('input', function () {
            const speedMultiplier = parseFloat(this.value);
            planets[index].userData.speed = planetInfo.speed * speedMultiplier;
            valueDisplay.textContent = speedMultiplier.toFixed(1) + 'x';
        });
    });
}

function addMouseControls() {
    document.addEventListener('mousedown', (e) => {
        if (e.target.closest('#controls')) return;
        isMouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    document.addEventListener('mouseup', () => isMouseDown = false);

    document.addEventListener('wheel', (e) => {
        if (e.target.closest('#controls')) return;
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        camera.position.multiplyScalar(zoomFactor);
        const distance = camera.position.length();
        if (distance < 10) camera.position.normalize().multiplyScalar(10);
        if (distance > 200) camera.position.normalize().multiplyScalar(200);
    });

    document.addEventListener('mousemove', (e) => {
    if (e.target.closest('#controls')) return;

    if (isMouseDown) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        targetX += deltaX * 0.01;
        targetY += deltaY * 0.01;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

}

function updateCamera() {
    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;
    mouseY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseY));

    const distance = camera.position.length();
    camera.position.x = distance * Math.cos(mouseY) * Math.cos(mouseX);
    camera.position.y = distance * Math.sin(mouseY);
    camera.position.z = distance * Math.cos(mouseY) * Math.sin(mouseX);

    camera.lookAt(0, 0, 0);
}

function pauseAnimation() {
    isAnimating = false;
}

function resumeAnimation() {
    if (!isAnimating) {
        isAnimating = true;
        animate();
    }
}

function resetView() {
    const initialDistance = 30;
    targetX = 0.5;
    targetY = 0.3;

    camera.position.x = initialDistance * Math.cos(targetY) * Math.cos(targetX);
    camera.position.y = initialDistance * Math.sin(targetY);
    camera.position.z = initialDistance * Math.cos(targetY) * Math.sin(targetX);
    camera.lookAt(0, 0, 0);

    planets.forEach((planet, index) => {
        planet.userData.angle = Math.random() * Math.PI * 2;
        planet.userData.speed = planetData[index].speed;
        const slider = document.getElementById(planetData[index].name + 'Speed');
        slider.value = 1;
        document.getElementById(planetData[index].name + 'Value').textContent = '1.0x';
    });
}

function animate() {
    animationId = requestAnimationFrame(animate);

    updateCamera();

    if (isAnimating) {
        if (sun) sun.rotation.y += 0.01;

        planets.forEach((planet) => {
            planet.userData.angle += planet.userData.speed;
            const eccentricity = planet.userData.eccentricity || 0;
            const x = Math.cos(planet.userData.angle) * planet.userData.distance * (1 + eccentricity);
            const z = Math.sin(planet.userData.angle) * planet.userData.distance;
            planet.position.set(x, 0, z);
            planet.rotation.y += 0.02;
        });

        if (stars) stars.rotation.y += 0.0001;
    }

    renderer.render(scene, camera);

    raycaster.setFromCamera(mouse, camera);
    const intersectObjects = [...planets, sun];
    const intersects = raycaster.intersectObjects(intersectObjects);

    planets.forEach(planet => {
        if (planet.userData.label) {
            planet.userData.label.material.opacity = 0;
        }
    });
    if (sun.userData.label) {
        sun.userData.label.material.opacity = 0;
    }

    if (intersects.length > 0) {
        const hoveredPlanet = intersects[0].object;
        if (hoveredPlanet.userData.label) {
            hoveredPlanet.userData.label.material.opacity = 1;
        }
    }
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('load', init);


