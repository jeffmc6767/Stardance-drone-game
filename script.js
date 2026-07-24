import * as THREE from "three";


const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 120, 450);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);


scene.add(new THREE.AmbientLight(0xffffff, 1.5));

const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(40, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
scene.add(sun);


const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshStandardMaterial({ color: 0x4fa84f })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);



const drone = new THREE.Group();
const droneMeshGroup = new THREE.Group();
drone.add(droneMeshGroup);
scene.add(drone);

const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.5, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 })
);
body.castShadow = true;
droneMeshGroup.add(body);

const armMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
const arm1 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 0.15), armMaterial);
droneMeshGroup.add(arm1);

const arm2 = arm1.clone();
arm2.rotation.y = Math.PI / 2;
droneMeshGroup.add(arm2);

const propellers = [];
[[2, 0, 2], [-2, 0, 2], [2, 0, -2], [-2, 0, -2]].forEach(position => {
    const holder = new THREE.Group();
    holder.position.set(...position);

    const propeller = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.05, 24),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    propeller.rotation.x = Math.PI / 2;
    holder.add(propeller);
    droneMeshGroup.add(holder);
    propellers.push(holder);
});

const cargoMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xd2b48c })
);
cargoMesh.position.y = -0.8;
cargoMesh.visible = false;
droneMeshGroup.add(cargoMesh);

drone.position.set(0, 8, 0);

const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0xc9c9c9 });
const buildings = [];

for (let i = 0; i < 200; i++) {
    const w = 6 + Math.random() * 10;
    const h = 10 + Math.random() * 45;
    const d = 6 + Math.random() * 10;

    const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        buildingMaterial
    );

    let x = (Math.random() - 0.5) * 600;
    let z = (Math.random() - 0.5) * 600;

    if (Math.abs(x) < 30 && Math.abs(z) < 30) {
        x += 50;
        z += 50;
    }

    building.position.set(x, h / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);

    const box = new THREE.Box3().setFromObject(building);
    buildings.push({ mesh: building, box: box });
}


let packagesDelivered = 0;
let money = 0;
let hasPackage = false;
let battery = 100;

const zoneGeo = new THREE.RingGeometry(2, 4, 32);
zoneGeo.rotateX(-Math.PI / 2);

const zoneMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
zoneMesh.position.y = 0.1;
scene.add(zoneMesh);

let activeTargetPos = new THREE.Vector3();

function getRandomPosition() {
    return new THREE.Vector3(
        (Math.random() - 0.5) * 500,
        0.1,
        (Math.random() - 0.5) * 500
    );
}

function spawnNextObjective() {
    activeTargetPos.copy(getRandomPosition());
    zoneMesh.position.copy(activeTargetPos);

    if (hasPackage) {
        zoneMat.color.setHex(0xffaa00);
        document.getElementById("target").textContent = "Dropoff Point";
    } else {
        zoneMat.color.setHex(0x00ff00);
        document.getElementById("target").textContent = "Pickup Point";
    }
}
spawnNextObjective();


const keys = {};
window.addEventListener("keydown", (e) => { keys[e.code] = true; });
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

let velocity = new THREE.Vector3();
let mouseX = 0, mouseY = 0;
let cameraDistance = 22;

window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});


const speedText = document.getElementById("speed");
const altitudeText = document.getElementById("altitude");
const batteryText = document.getElementById("battery");
const packagesText = document.getElementById("packages");
const moneyText = document.getElementById("money");
const distanceText = document.getElementById("distance");

const minimapCanvas = document.getElementById("minimapCanvas");
const minimapCtx = minimapCanvas.getContext("2d");

function updateMinimap() {
    minimapCtx.clearRect(0, 0, 150, 150);

    const center = 75;
    const radarRadius = 65;

    minimapCtx.fillStyle = "#00ffff";
    minimapCtx.beginPath();
    minimapCtx.arc(center, center, 4, 0, Math.PI * 2);
    minimapCtx.fill();

    minimapCtx.strokeStyle = "rgba(0, 255, 255, 0.5)";
    minimapCtx.lineWidth = 2;
    minimapCtx.beginPath();
    minimapCtx.moveTo(center, center);
    
    const forwardX = -Math.sin(drone.rotation.y) * 15;
    const forwardY = -Math.cos(drone.rotation.y) * 15;
    minimapCtx.lineTo(center + forwardX, center + forwardY);
    minimapCtx.stroke();

    const dx = activeTargetPos.x - drone.position.x;
    const dz = activeTargetPos.z - drone.position.z;
    const dist2D = Math.sqrt(dx * dx + dz * dz);

    const scale = 0.3;
    let targetX = dx * scale;
    let targetY = dz * scale;
    const targetDistFromCenter = Math.sqrt(targetX * targetX + targetY * targetY);

    const targetColor = hasPackage ? "#ffaa00" : "#00ff00";

    if (targetDistFromCenter > radarRadius) {
        const angle = Math.atan2(dz, dx);
        const edgeX = center + Math.cos(angle) * radarRadius;
        const edgeY = center + Math.sin(angle) * radarRadius;

        minimapCtx.fillStyle = targetColor;
        minimapCtx.beginPath();
        minimapCtx.arc(edgeX, edgeY, 6, 0, Math.PI * 2);
        minimapCtx.fill();

        minimapCtx.save();
        minimapCtx.translate(edgeX, edgeY);
        minimapCtx.rotate(angle);
        minimapCtx.fillStyle = targetColor;
        minimapCtx.beginPath();
        minimapCtx.moveTo(8, 0);
        minimapCtx.lineTo(-6, -5);
        minimapCtx.lineTo(-6, 5);
        minimapCtx.closePath();
        minimapCtx.fill();
        minimapCtx.restore();
    } else {
        minimapCtx.fillStyle = targetColor;
        minimapCtx.beginPath();
        minimapCtx.arc(center + targetX, center + targetY, 5, 0, Math.PI * 2);
        minimapCtx.fill();
    }
}


function updateDrone() {
    const acceleration = 0.025;
    const maxSpeed = 0.5;
    const turnSpeed = 0.035;

    if (keys["KeyA"] || keys["ArrowLeft"]) {
        drone.rotation.y += turnSpeed;
    }
    if (keys["KeyD"] || keys["ArrowRight"]) {
        drone.rotation.y -= turnSpeed;
    }

    let moveDir = new THREE.Vector3();

    if (keys["KeyW"] || keys["ArrowUp"]) moveDir.z -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) moveDir.z += 1;
    if (keys["Space"]) moveDir.y += 1;
    if (keys["ShiftLeft"]) moveDir.y -= 1;

    if (moveDir.length() > 0) {
        moveDir.normalize();
        
        const worldMoveDir = moveDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), drone.rotation.y);
        velocity.add(worldMoveDir.multiplyScalar(acceleration));
    }

    velocity.multiplyScalar(0.96);

    if (velocity.length() > maxSpeed) {
        velocity.setLength(maxSpeed);
    }

    drone.position.add(velocity);

    const localVel = velocity.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -drone.rotation.y);
    droneMeshGroup.rotation.z = -localVel.x * 0.8;
    droneMeshGroup.rotation.x = localVel.z * 0.8;

    if (drone.position.y < 1.5) {
        drone.position.y = 1.5;
        velocity.y = 0;
    }

    const droneBox = new THREE.Box3().setFromObject(body);
    buildings.forEach(b => {
        if (droneBox.intersectsBox(b.box)) {
            velocity.negate().multiplyScalar(0.5);
            battery -= 2;
        }
    });

    const targetDist = drone.position.distanceTo(activeTargetPos);
    distanceText.textContent = Math.round(targetDist) + "m";

    if (targetDist < 5 && drone.position.y < 5) {
        if (!hasPackage) {
            hasPackage = true;
            cargoMesh.visible = true;
            spawnNextObjective();
        } else {
            hasPackage = false;
            cargoMesh.visible = false;
            packagesDelivered++;
            money += 50;
            battery = Math.min(100, battery + 20);
            packagesText.textContent = packagesDelivered;
            moneyText.textContent = "$" + money;
            spawnNextObjective();
        }
    }

    battery -= (velocity.length() * 0.003 + 0.001);
    if (battery < 0) battery = 0;

    // HUD Sync
    speedText.textContent = Math.round(velocity.length() * 300) + " km/h";
    altitudeText.textContent = Math.round(drone.position.y) + "m";
    batteryText.textContent = Math.round(battery) + "%";

    updateMinimap();
}


function updateCamera() {
    const offset = new THREE.Vector3(
        mouseX * 10,
        8 - mouseY * 5,
        cameraDistance
    );

    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), drone.rotation.y);
    const target = drone.position.clone().add(offset);

    camera.position.lerp(target, 0.08);
    camera.lookAt(drone.position);
}

function animate() {
    requestAnimationFrame(animate);

    updateDrone();
    updateCamera();

    propellers.forEach(p => {
        p.rotation.y += 0.7;
    });

    const scale = 1 + Math.sin(Date.now() * 0.005) * 0.15;
    zoneMesh.scale.set(scale, scale, scale);

    renderer.render(scene, camera);
}

animate();


window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById("loading").style.display = "none";