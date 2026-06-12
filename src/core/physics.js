import RAPIER from '@dimforge/rapier3d-compat';

// Thin wrapper around Rapier: static level geometry + kinematic actors moved
// through a character controller (walls/props block, actors slide).
export class Physics {
  static async create() {
    await RAPIER.init();
    return new Physics();
  }

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 }); // top-down: no gravity needed
    this.controller = this.world.createCharacterController(0.02);
    this.controller.setSlideEnabled(true);
    this.RAPIER = RAPIER;
  }

  addStaticBox(cx, cy, cz, hx, hy, hz) {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz),
    );
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), body);
    return body;
  }

  removeBody(body) {
    this.world.removeRigidBody(body);
  }

  addActor(x, z, radius, halfHeight) {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, halfHeight + radius, z),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(halfHeight, radius),
      body,
    );
    return { body, collider };
  }

  // Returns the actual translation applied after collision resolution.
  moveActor(actor, dx, dz) {
    this.controller.computeColliderMovement(actor.collider, { x: dx, y: 0, z: dz });
    const movement = this.controller.computedMovement();
    const pos = actor.body.translation();
    const next = { x: pos.x + movement.x, y: pos.y, z: pos.z + movement.z };
    actor.body.setNextKinematicTranslation(next);
    return next;
  }

  step() {
    this.world.step();
  }
}
