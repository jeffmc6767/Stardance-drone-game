import * as THREE from "three";

/* =========================
   SCENE
========================= */

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 120, 450);


/* =========================
   CAMERA
========================= */

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);


/* =========================
   RENDERER
========================= */

const renderer = new THREE.WebGLRenderer({
    antialias:true
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);


/* =========================
   LIGHTING
========================= */

scene.add(
    new THREE.AmbientLight(
        0xffffff,
        2
    )
);


const sun = new THREE.DirectionalLight(
    0xffffff,
    3
);

sun.position.set(
    40,
    60,
    20
);

sun.castShadow=true;

sun.shadow.mapSize.width=2048;
sun.shadow.mapSize.height=2048;

scene.add(sun);


/* =========================
   GROUND
========================= */

const ground = new THREE.Mesh(

    new THREE.PlaneGeometry(
        1200,
        1200
    ),

    new THREE.MeshStandardMaterial({
        color:0x4fa84f
    })

);

ground.rotation.x=-Math.PI/2;
ground.receiveShadow=true;

scene.add(ground);


/* =========================
   DRONE
========================= */

const drone = new THREE.Group();

scene.add(drone);


const body = new THREE.Mesh(

    new THREE.BoxGeometry(
        2.5,
        .5,
        2.5
    ),

    new THREE.MeshStandardMaterial({

        color:0x333333,
        metalness:.8,
        roughness:.2

    })

);

body.castShadow=true;

drone.add(body);



const armMaterial =
new THREE.MeshStandardMaterial({
    color:0x222222
});


const arm1 =
new THREE.Mesh(
    new THREE.BoxGeometry(
        4,
        .15,
        .15
    ),
    armMaterial
);

drone.add(arm1);



const arm2=arm1.clone();

arm2.rotation.y=Math.PI/2;

drone.add(arm2);



const propellers=[];


[
[2,0,2],
[-2,0,2],
[2,0,-2],
[-2,0,-2]

].forEach(position=>{


const holder=new THREE.Group();

holder.position.set(
    ...position
);


const propeller=new THREE.Mesh(

new THREE.CylinderGeometry(
    .55,
    .55,
    .05,
    24
),

new THREE.MeshStandardMaterial({
    color:0x111111
})

);


propeller.rotation.x=Math.PI/2;


holder.add(propeller);

drone.add(holder);


propellers.push(holder);


});



drone.position.set(
    0,
    8,
    0
);


/* =========================
   CITY
========================= */

const buildingMaterial =
new THREE.MeshStandardMaterial({
    color:0xc9c9c9
});


for(let i=0;i<250;i++){

const w=4+Math.random()*8;
const h=5+Math.random()*35;
const d=4+Math.random()*8;


const building=new THREE.Mesh(

new THREE.BoxGeometry(
    w,
    h,
    d
),

buildingMaterial

);


building.position.x=
(Math.random()-.5)*700;

building.position.z=
(Math.random()-.5)*700;

building.position.y=
h/2;


building.castShadow=true;

scene.add(building);

}



/* =========================
   CONTROLS
========================= */

const keys={};


window.addEventListener(
"keydown",
(e)=>{
    keys[e.code]=true;
});


window.addEventListener(
"keyup",
(e)=>{
    keys[e.code]=false;
});



let velocity =
new THREE.Vector3();



let battery=100;



/* =========================
   MOUSE CAMERA
========================= */

let mouseX=0;
let mouseY=0;


window.addEventListener(
"mousemove",
(e)=>{

mouseX =
(e.clientX/window.innerWidth-.5)
*2;

mouseY =
(e.clientY/window.innerHeight-.5)
*2;

});



let cameraDistance=22;


/* =========================
   HUD
========================= */

const speedText =
document.getElementById("speed");

const altitudeText =
document.getElementById("altitude");

const batteryText =
document.getElementById("battery");



/* =========================
   MOVEMENT
========================= */


function updateDrone(){

const acceleration=.025;

const maxSpeed=.45;


let direction =
new THREE.Vector3();


if(keys["KeyW"])
direction.z-=1;

if(keys["KeyS"])
direction.z+=1;

if(keys["KeyA"])
direction.x-=1;

if(keys["KeyD"])
direction.x+=1;


if(keys["Space"])
direction.y+=1;

if(keys["ShiftLeft"])
direction.y-=1;



if(direction.length()>0){

direction.normalize();

velocity.add(
direction.multiplyScalar(acceleration)
);

}


velocity.multiplyScalar(.96);



if(velocity.length()>maxSpeed){

velocity.setLength(maxSpeed);

}



drone.position.add(velocity);



drone.rotation.z =
-velocity.x*.5;

drone.rotation.x =
velocity.z*.5;



if(drone.position.y<2)
drone.position.y=2;



battery-=velocity.length()*0.002;

if(battery<0)
battery=0;



speedText.textContent =
Math.round(
velocity.length()*300
)
+" km/h";


altitudeText.textContent =
Math.round(
drone.position.y
)
+"m";


batteryText.textContent =
Math.round(battery)
+"%";


}


/* =========================
   CAMERA FOLLOW
========================= */

function updateCamera(){


const offset =
new THREE.Vector3(
    mouseX*12,
    8-mouseY*5,
    cameraDistance
);


offset.applyQuaternion(
drone.quaternion
);


const target =
drone.position.clone()
.add(offset);



camera.position.lerp(
target,
0.08
);



camera.lookAt(
drone.position
);


}



/* =========================
   ANIMATION
========================= */


function animate(){


requestAnimationFrame(
animate
);



updateDrone();

updateCamera();



propellers.forEach(
p=>{
p.rotation.y+=0.7;
}
);



renderer.render(
scene,
camera
);


}


animate();



/* =========================
   RESIZE
========================= */


window.addEventListener(
"resize",
()=>{

camera.aspect =
window.innerWidth/
window.innerHeight;


camera.updateProjectionMatrix();


renderer.setSize(
window.innerWidth,
window.innerHeight
);

});


document.getElementById("loading").style.display="none";