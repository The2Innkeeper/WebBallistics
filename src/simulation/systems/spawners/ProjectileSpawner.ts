// ProjectileSpawner.ts
import * as THREE from "three";
import { Projectile } from "../../entities/implementations/Projectile";
import { eventBus } from "../../../communication/EventBus";
import { SpawnProjectileEvent } from "../../../communication/events/entities/spawning/SpawnProjectileEvent";
import { ProjectileSpawnedEvent } from "../../../communication/events/entities/spawning/ProjectileSpawnedEvent";
import { updateScaledDisplacementDerivatives } from "../../utils/MovementUtils";
import { scaledProjectileShooterDisplacementDerivatives, scaledShooterTargetDisplacementDerivatives } from "../../components/MovementComponents";
import { PhysicsSolver } from "../../utils/PhysicsSolver";
import { getProjectileSetting } from "../../components/projectileSettings";

// A functional approach to ProjectileSpawner
export function createProjectileSpawner(scene: THREE.Scene) {
    function spawnProjectile(event: SpawnProjectileEvent): Projectile | null {
        const { targetDerivatives, shooterDerivatives, projectileDerivatives, indexToMinimize, target, radius, expiryLifeTime, expiryDistance } = event;

        if (!target) {
            console.log("No unengaged target available. Skipping projectile spawn.");
            return null;
        }

        // Update the backend vectors
        updateScaledDisplacementDerivatives(targetDerivatives, shooterDerivatives, projectileDerivatives);

        // Spawn the projectile based on whether a minimum is possible
        const scaledProjectileDerivatives = [...scaledProjectileShooterDisplacementDerivatives];
        const updatedScaledVelocityVector = PhysicsSolver.calculateInitialDerivativeWithFallback(
                                                scaledShooterTargetDisplacementDerivatives,
                                                scaledProjectileShooterDisplacementDerivatives,
                                                indexToMinimize,
                                                getProjectileSetting('fallbackIntersectionTime'),
                                                expiryLifeTime
                                            );
        scaledProjectileDerivatives[indexToMinimize] = updatedScaledVelocityVector;
        console.log("New initial velocity:", scaledProjectileDerivatives[indexToMinimize]);

        console.log("Spawning projectile with parameters:", {
            scaledProjectileDerivatives,
            target,
            radius,
            expiryLifeTime,
            expiryDistance,
        });

        const projectile = new Projectile(
            scaledProjectileDerivatives,
            target,
            radius,
            expiryLifeTime,
            expiryDistance
        );

        projectile.addToScene(scene);
        eventBus.emit(ProjectileSpawnedEvent, new ProjectileSpawnedEvent(projectile));

        return projectile;
    }

    eventBus.subscribe(SpawnProjectileEvent, spawnProjectile);

    return {
        spawnProjectile: (event: SpawnProjectileEvent) => spawnProjectile(event)
    };
}