import * as THREE from 'three';

// Camera offset tuned to match the reference shot: high angle, slightly behind.
const CAMERA_OFFSET = new THREE.Vector3(0, 16.5, 10.5);
const CAMERA_LERP = 4.5;

export class Engine {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050403);
    this.scene.fog = new THREE.FogExp2(0x050403, 0.028);

    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.5,
      120,
    );
    this.camera.position.copy(CAMERA_OFFSET);
    this.camera.lookAt(0, 0, 0);

    this.cameraTarget = new THREE.Vector3();
    this.shake = 0;
    this.timeScale = 1;

    this.setupLights();
    window.addEventListener('resize', () => this.onResize());
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0x2a2018, 0.55);
    this.scene.add(ambient);
    this.ambient = ambient;

    const hemi = new THREE.HemisphereLight(0x4a3a28, 0x0a0806, 0.35);
    this.scene.add(hemi);
    this.hemi = hemi;

    // One dim shadow-casting key light, angled like cold moonlight from a grate.
    const key = new THREE.DirectionalLight(0x8a7355, 0.5);
    key.position.set(12, 28, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -30;
    key.shadow.camera.right = 30;
    key.shadow.camera.top = 30;
    key.shadow.camera.bottom = -30;
    key.shadow.camera.far = 70;
    key.shadow.bias = -0.0015;
    this.scene.add(key);
    this.keyLight = key;
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Re-tint scene atmosphere for a biome theme.
  applyTheme(theme) {
    this.scene.background.setHex(theme.fog);
    this.scene.fog.color.setHex(theme.fog);
    this.scene.fog.density = theme.fogDensity;
    this.ambient.color.setHex(theme.ambient);
    this.hemi.color.setHex(theme.hemiSky);
    this.keyLight.color.setHex(theme.key);
  }

  // Keeps the shadow camera centered on the action as the player traverses rooms.
  followCamera(targetPos, dt) {
    this.cameraTarget.lerp(targetPos, Math.min(1, CAMERA_LERP * dt));
    const desired = this.cameraTarget.clone().add(CAMERA_OFFSET);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 3);
      desired.x += (Math.random() - 0.5) * this.shake;
      desired.z += (Math.random() - 0.5) * this.shake;
    }
    this.camera.position.copy(desired);
    this.camera.lookAt(this.cameraTarget);
    this.keyLight.position.set(this.cameraTarget.x + 12, 28, this.cameraTarget.z + 6);
    this.keyLight.target.position.copy(this.cameraTarget);
    this.keyLight.target.updateMatrixWorld();
  }

  addShake(amount) {
    this.shake = Math.min(0.6, this.shake + amount);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  worldToScreen(worldPos) {
    const v = worldPos.clone().project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
      visible: v.z < 1,
    };
  }
}
