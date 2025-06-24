import * as THREE from "https://cdn.skypack.dev/three@0.129.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm";
// Import bloom postprocessing
import { EffectComposer } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/UnrealBloomPass.js";

// Planet data
const PLANET_DATA = [
  {
    name: "mercury",
    texture: "../img/mercury_hd.jpg",
    radius: 2,
    orbitRadius: 50,
    speed: 2,
    meshType: "standard",
  },
  {
    name: "venus",
    texture: "../img/venus_hd.jpg",
    radius: 3,
    orbitRadius: 60,
    speed: 1.5,
    meshType: "standard",
  },
  {
    name: "earth",
    texture: "../img/earth_hd.jpg",
    radius: 4,
    orbitRadius: 70,
    speed: 1,
    meshType: "standard",
  },
  {
    name: "mars",
    texture: "../img/mars_hd.jpg",
    radius: 3.5,
    orbitRadius: 80,
    speed: 0.8,
    meshType: "standard",
  },
  {
    name: "jupiter",
    texture: "../img/jupiter_hd.jpg",
    radius: 10,
    orbitRadius: 100,
    speed: 0.7,
    meshType: "standard",
  },
  {
    name: "saturn",
    texture: "../img/saturn_hd.jpg",
    radius: 8,
    orbitRadius: 120,
    speed: 0.6,
    meshType: "standard",
  },
  {
    name: "uranus",
    texture: "../img/uranus_hd.jpg",
    radius: 6,
    orbitRadius: 140,
    speed: 0.5,
    meshType: "standard",
  },
  {
    name: "neptune",
    texture: "../img/neptune_hd.jpg",
    radius: 5,
    orbitRadius: 160,
    speed: 0.4,
    meshType: "standard",
  },
];

// Sun data
const SUN_DATA = {
  name: "sun",
  texture: "../img/sun_hd.jpg",
  radius: 20,
  meshType: "basic",
};

// Skybox (stars) images
const SKYBOX_IMAGES = [
  "../img/skybox/space_ft.png",
  "../img/skybox/space_bk.png",
  "../img/skybox/space_up.png",
  "../img/skybox/space_dn.png",
  "../img/skybox/space_rt.png",
  "../img/skybox/space_lf.png",
];

// Globals
let scene, camera, renderer, controls, skybox;
let planets = {};
let revolutionSpeeds = {};
let sun;

// Bloom globals
let composer, bloomPass;

// Helper to set GUI panel floating and draggable, but constrained to the container div
function makeGuiFloating(gui) {
  const guiDom = gui.domElement;
  guiDom.style.position = "fixed";
  guiDom.style.zIndex = 9999;
  guiDom.style.top = "80px";
  guiDom.style.left = "40px";
  guiDom.style.background = "rgba(30, 30, 30, 0.95)";
  guiDom.style.borderRadius = "8px";
  guiDom.style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
  guiDom.style.cursor = "move";
  guiDom.style.userSelect = "none";
  guiDom.style.minWidth = "260px";
  guiDom.style.maxWidth = "340px";
  guiDom.style.resize = "both";
  guiDom.style.overflow = "auto";

  // Find the container div
  const container = document.querySelector('.container');
  if (!container) return; // fallback: do nothing if not found

  // Get container's bounding rect
  function getContainerRect() {
    return container.getBoundingClientRect();
  }

  // Make draggable, but constrained to container
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  // Only drag from the top bar (if exists), else whole panel
  let dragTarget = guiDom.querySelector('.title') || guiDom;

  dragTarget.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragOffsetX = e.clientX - guiDom.getBoundingClientRect().left;
    dragOffsetY = e.clientY - guiDom.getBoundingClientRect().top;
    document.body.style.userSelect = "none";
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const containerRect = getContainerRect();
    const guiRect = guiDom.getBoundingClientRect();

    // Calculate new left/top relative to viewport
    let newLeft = e.clientX - dragOffsetX;
    let newTop = e.clientY - dragOffsetY;

    // Clamp left/top so the panel stays inside the container
    // (allow panel to be partially out, but not fully)
    const minLeft = containerRect.left;
    const maxLeft = containerRect.right - guiRect.width;
    const minTop = containerRect.top;
    const maxTop = containerRect.bottom - guiRect.height;

    // Clamp values
    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
    newTop = Math.max(minTop, Math.min(newTop, maxTop));

    guiDom.style.left = `${newLeft}px`;
    guiDom.style.top = `${newTop}px`;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = "";
  });

  // On window resize, make sure the panel is still inside the container
  window.addEventListener('resize', () => {
    const containerRect = getContainerRect();
    const guiRect = guiDom.getBoundingClientRect();
    let left = parseInt(guiDom.style.left, 10) || 0;
    let top = parseInt(guiDom.style.top, 10) || 0;
    const minLeft = containerRect.left;
    const maxLeft = containerRect.right - guiRect.width;
    const minTop = containerRect.top;
    const maxTop = containerRect.bottom - guiRect.height;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;
    if (top < minTop) top = minTop;
    if (top > maxTop) top = maxTop;
    guiDom.style.left = `${left}px`;
    guiDom.style.top = `${top}px`;
  });
}

// Defining the material array for the skybox
function createMaterialArray() {
  return SKYBOX_IMAGES.map((image) => {
    const texture = new THREE.TextureLoader().load(image);
    return new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
  });
}

// Setting the skybox
function setSkyBox() {
  const materialArray = createMaterialArray();
  const skyboxGeo = new THREE.BoxGeometry(1000, 1000, 1000);
  skybox = new THREE.Mesh(skyboxGeo, materialArray);
  scene.add(skybox);
}

// Loading the planet textures
function loadPlanetTexture(texture, radius, meshType) {
  const geometry = new THREE.SphereGeometry(radius, 100, 100);
  const planetTexture = new THREE.TextureLoader().load(texture);
  const material =
    meshType === "standard"
      ? new THREE.MeshStandardMaterial({ map: planetTexture })
      : new THREE.MeshBasicMaterial({ map: planetTexture });
  return new THREE.Mesh(geometry, material);
}

// Creating the orbit ring of the planets
function createRing(innerRadius) {
  const outerRadius = innerRadius - 0.1;
  const thetaSegments = 100;
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, thetaSegments);
  const material = new THREE.MeshBasicMaterial({ color: "#ffffff", side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  scene.add(mesh);
  return mesh;
}

// Initialization
let gui; // Make gui variable global to allow access in position change

function showGui() {
  if (gui && gui.domElement) {
    gui.domElement.style.display = "";
  }
}

function hideGui() {
  if (gui && gui.domElement) {
    gui.domElement.style.display = "none";
  }
}

function isElementInViewport(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
    rect.left < (window.innerWidth || document.documentElement.clientWidth)
  );
}

function handleGuiVisibility() {
  const container = document.querySelector('.container');
  if (!container) return;
  if (isElementInViewport(container)) {
    showGui();
  } else {
    hideGui();
  }
}

function init() {
  // Scene and Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    85,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 50, 140);

  // Skybox
  setSkyBox();

  // Sun
  sun = loadPlanetTexture(SUN_DATA.texture, SUN_DATA.radius, SUN_DATA.meshType);
  scene.add(sun);

  // Planets
  PLANET_DATA.forEach((data) => {
    const planet = loadPlanetTexture(data.texture, data.radius, data.meshType);
    planets[data.name] = planet;
    revolutionSpeeds[data.name] = data.speed;
    scene.add(planet);
    createRing(data.orbitRadius);
  });

  // Lighting
  const sunLight = new THREE.PointLight(0xffffff, 1, 0); // Creating a point light for the sun
  sunLight.position.copy(sun.position); // Positioning the sun light at the same position as the sun
  scene.add(sunLight);

  // Renderer
  const canvas = document.querySelector('#canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.id = "c";
  // document.body.appendChild(renderer.domElement);

  // Bloom composer setup
  const renderScene = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2, // strength
    0.8, // radius
    0.0  // threshold
  );
  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  // Orbit Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 30;
  controls.maxDistance = 200;
  controls.enableDamping = true;

  // GUI for revolution speeds
  gui = new GUI();
  makeGuiFloating(gui);

  const speedFolder = gui.addFolder("Planet Revolution Speeds");
  PLANET_DATA.forEach((data) => {
    speedFolder
      .add(revolutionSpeeds, data.name, 0, 5, 0.01)
      .name(data.name.charAt(0).toUpperCase() + data.name.slice(1));
  });
  speedFolder.close();

  // Optionally, add bloom controls to GUI
  const bloomFolder = gui.addFolder("Bloom");
  bloomFolder.add(bloomPass, "strength", 0, 3, 0.01).name("Strength");
  bloomFolder.add(bloomPass, "radius", 0, 2, 0.01).name("Radius");
  bloomFolder.add(bloomPass, "threshold", 0, 1, 0.01).name("Threshold");
  bloomFolder.close();

  // Initially set GUI visibility based on container
  handleGuiVisibility();
}

// Animation
function planetRevolver(time, speed, planet, orbitRadius) {
  const orbitSpeedMultiplier = 0.001;
  const planetAngle = time * orbitSpeedMultiplier * speed;
  planet.position.x = sun.position.x + orbitRadius * Math.cos(planetAngle);
  planet.position.z = sun.position.z + orbitRadius * Math.sin(planetAngle);
}

let playAnimation = true;

function animate(time) {
  if(playAnimation){
    requestAnimationFrame(animate);
  }
  else{
    return;
  }

  // Rotate Sun and Planets
  const rotationSpeed = 0.005;
  sun.rotation.y += rotationSpeed;
  Object.values(planets).forEach((planet) => {
    planet.rotation.y += rotationSpeed;
  });

  // Revolve Planets
  PLANET_DATA.forEach((data) => {
    planetRevolver(
      time,
      revolutionSpeeds[data.name],
      planets[data.name],
      data.orbitRadius
    );
  });

  controls.update();
  // Use composer for bloom
  composer.render();
}

// Responsive Resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
    if (bloomPass) {
      bloomPass.setSize(window.innerWidth, window.innerHeight);
    }
  }
  // Also update GUI visibility in case container moved/resized
  handleGuiVisibility();
}

window.addEventListener("resize", onWindowResize, false);

// Also hide/show GUI on scroll and on load
window.addEventListener("scroll", handleGuiVisibility, false);
window.addEventListener("DOMContentLoaded", handleGuiVisibility, false);

init();
animate(0);

// Smooth scroll to the about section
document.getElementById("about").addEventListener("click", function (e) {
  e.preventDefault();
  const aboutSection = document.getElementById("about-section");
  if (aboutSection) {
    playAnimation = false;
    aboutSection.scrollIntoView({ behavior: "smooth" });
  }
});
document.getElementById("home").addEventListener("click", function (e) {
  e.preventDefault();
  const homeSection = document.getElementById("home-section");
  if (homeSection) {
    homeSection.scrollIntoView({ behavior: "smooth" });
    playAnimation = true;
    animate(0);
  }
});
document.getElementById("planets").addEventListener("click", function (e) {
  e.preventDefault();
  const planetsSection = document.getElementById("planets-section");
  if (planetsSection) {
    playAnimation = false;
    planetsSection.scrollIntoView({ behavior: "smooth" });
  }
}); 
document.getElementById("contact").addEventListener("click", function (e) {
  e.preventDefault();
  const contactSection = document.getElementById("contact-section");
  if (contactSection) {
    playAnimation = false;
    contactSection.scrollIntoView({ behavior: "smooth" });
  }
});

// Event listeners for contact cards
document.getElementById("linkedin-card").addEventListener("click", function() {
  window.open("https://www.linkedin.com/in/harsh-tripathi-440b0a134/", "_blank");
});

document.getElementById("email-card").addEventListener("click", function() {
  window.open("mailto:harshtripathi56@yahoo.in", "_blank");
});

document.getElementById("github-card").addEventListener("click", function() {
  window.open("https://github.com/ImaginationGod", "_blank");
});
