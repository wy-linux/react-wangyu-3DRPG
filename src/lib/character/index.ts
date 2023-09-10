import {
    Scene, 
    PerspectiveCamera, 
    AnimationAction, 
    AnimationMixer, 
    Box3, 
    Line3, 
    Matrix4, 
    Mesh, 
    Group, 
    Object3D, 
    Quaternion, 
    Raycaster, 
    Vector3, 
} from "three";
import {
    CHARACTER_IDLE_ACTION_URL, 
    CHARACTER_JUMP_ACTION_URL, 
    CHARACTER_URL, 
    CHARACTER_WALK_ACTION_URL, 
    ON_KEY_DOWN
} from "../../lib/Constants";
import { isBVHGeometry, isMesh } from "../utils/typeAssert";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Control from "../control";
import Emitter from "../emitter";
import Loader from "../loader";

// 角色相关可选配置项
type OptionalParams = Partial<{
	is_first_person: boolean,
	reset_position: Vector3,
	reset_y: number,
	speed: number,
	jump_height: number,
	gravity: number
}>

type PlayerParams = {
	scene: Scene,
	camera: PerspectiveCamera,
	orbit_controls: OrbitControls,
	control: Control,
	loader: Loader,
	emitter: Emitter
} & OptionalParams

type Actions = "idle" | "walk" | "jump";

// 可选配置项默认值
const default_params: OptionalParams = {
	is_first_person: false,
	reset_position: new Vector3(0, 2, 0),
	reset_y: -25,
	speed: 4,
	jump_height: 12,
	gravity: -30
};

export default class Character {
	private scene: Scene;
	private camera: PerspectiveCamera;
	private orbit_controls: OrbitControls;
	private control: Control;
	private loader: Loader;
	private emitter: Emitter;
	private camera_raycaster: Raycaster = new Raycaster();
	private mixer: AnimationMixer | undefined;
	private cur_action: Actions = "idle";
	private actions: Record<Actions, AnimationAction | undefined> = {
		"idle": undefined,
		"walk": undefined,
		"jump": undefined
	};
	private character!: Group;
	character_shape!: Mesh;
	private capsule_info = {
		radius: 0.5,
		segment: new Line3(
			new Vector3(),
			new Vector3(0, -10, 0)
		)
	};
	private reset_position: Vector3; // 重生点
	private reset_y: number; // 重生掉落高度
	private is_first_person: boolean; // 是否第一人称
	private gravity: number; // 重力
	private jump_height: number; // 跳跃高度
	private speed: number; // 速度
	private player_is_on_ground = false; // 是否在地面
	private velocity = new Vector3();
	private rotate_quarternion = new Quaternion();
	private rotate_angle = new Vector3(0, 1, 0);
	private last_direction_angle: number | undefined;
	private up_vector = new Vector3(0, 1, 0);
	private temp_vector = new Vector3();
	private temp_vector2 = new Vector3();
	private temp_box = new Box3();
	private temp_mat = new Matrix4();
	private temp_segment = new Line3();

	constructor(params: PlayerParams) {
		params = {
			...default_params,
			...params
		};
		this.scene = params.scene;
		this.camera = params.camera;
		this.orbit_controls = params.orbit_controls;
		this.control = params.control;
		this.emitter = params.emitter;
		this.loader = params.loader;
		this.camera_raycaster.far = 5;
		this.is_first_person = params.is_first_person!;
		this.reset_position = params.reset_position!;
		this.reset_y = params.reset_y!;
		this.gravity = params.gravity!;
		this.jump_height = params.jump_height!;
		this.speed = params.speed!;
		this._createCharacter();
		this.emitter.$on(ON_KEY_DOWN, this._onKeyDown.bind(this));
	}

	update(delta_time: number, scene_collider: Mesh | null) {
		if (!scene_collider || !this.character) return;
		this._updateControls();
		this._updateCharacter(delta_time);
		this._checkCollision(delta_time, scene_collider);
		this.camera.position.sub(this.orbit_controls.target);
		this.orbit_controls.target.copy(this.character.position);
		this.camera.position.add(this.character.position);
		this._checkCameraCollision([scene_collider]);
		this._checkReset();
	}

	//添加角色模型与人物动画
	private async _createCharacter() {
		const model = (await this.loader.gltf_loader.loadAsync(CHARACTER_URL)).scene;
		const walk = (await this.loader.fbx_loader.loadAsync(CHARACTER_WALK_ACTION_URL)).animations[0];
		const idle = (await this.loader.fbx_loader.loadAsync(CHARACTER_IDLE_ACTION_URL)).animations[0];
		const jump = (await this.loader.fbx_loader.loadAsync(CHARACTER_JUMP_ACTION_URL)).animations[0];
		this.character = model;
		this.character.scale.set(0.2, 0.2, 0.2);
		this.character.animations = [walk, idle, jump];
		this.mixer = new AnimationMixer(this.character);
		this.actions["walk"] = this.mixer.clipAction(this.character.animations[0]);
		this.actions["idle"] = this.mixer.clipAction(this.character.animations[1]);
		this.actions["jump"] = this.mixer.clipAction(this.character.animations[2]);
		this.actions["idle"].play();
		this.cur_action = "idle";
		this.character.children[0].position.set(0, -12.5, 0);
		this.character.traverse(item => {
			if (isMesh(item)) {
				item.castShadow = true;
			}
		});
		this.scene.add(this.character);
		this.reset();
	}

	private _onKeyDown([key_code]: [keycode: string]) {
		if (key_code === "Space") {
			this._characterJump();
		}
		if (key_code === "KeyV") {
			this._switchPersonView();
		}
	}

	private _updateControls() {
		if (this.is_first_person) {
			this.orbit_controls.maxPolarAngle = Math.PI;
			this.orbit_controls.minDistance = 1e-4;
			this.orbit_controls.maxDistance = 1e-4;
		} else {
			this.orbit_controls.minDistance = 2;
			this.orbit_controls.maxDistance = 5;
		}
	}

    //更新角色移动、方位朝向、动作
	private _updateCharacter(delta_time: number) {
		if (this.player_is_on_ground) {
			this.velocity.y = delta_time * this.gravity;
		} else {
			this.velocity.y += delta_time * this.gravity;
		}
		this.character.position.addScaledVector(this.velocity, delta_time);
		this.updateDirection();
		this.updateAction(delta_time);
		// 控制角色模型移动
		const angle = this.orbit_controls.getAzimuthalAngle();
		if (this.control.key_status["KeyW"]) {
			this.temp_vector.set(0, 0, -1).applyAxisAngle(this.up_vector, angle);
			this.character.position.addScaledVector(this.temp_vector, this.speed * delta_time);
		}

		if (this.control.key_status["KeyS"]) {
			this.temp_vector.set(0, 0, 1).applyAxisAngle(this.up_vector, angle);
			this.character.position.addScaledVector(this.temp_vector, this.speed * delta_time);
		}

		if (this.control.key_status["KeyA"]) {
			this.temp_vector.set(-1, 0, 0).applyAxisAngle(this.up_vector, angle);
			this.character.position.addScaledVector(this.temp_vector, this.speed * delta_time);
		}

		if (this.control.key_status["KeyD"]) {
			this.temp_vector.set(1, 0, 0).applyAxisAngle(this.up_vector, angle);
			this.character.position.addScaledVector(this.temp_vector, this.speed * delta_time);
		}
       //虚拟摇杆控制，摇杆默认方向为X轴正方向
        if (this.control.degree) {
            const degree = (this.control.degree - 90) * (Math.PI / 180);
            this.temp_vector.set(0, 0, -1).applyAxisAngle(this.up_vector, angle + degree);
            this.character.position.addScaledVector(this.temp_vector, this.speed * delta_time);
        }
		this.character.updateMatrixWorld();
	}

    //控制角色模型旋转
	private updateDirection() {
		if (!this.control.key_status["KeyW"] && !this.control.key_status["KeyS"] && !this.control.key_status["KeyA"] && !this.control.key_status["KeyD"] && !this.control.key_status["Space"] && !this.control.degree) {
			return;
		}
		const quaternion_helper = this.character.quaternion.clone();
		let direction_offset = typeof this.last_direction_angle === "number" ? this.last_direction_angle : Math.PI; // w
		if (this.control.key_status["KeyS"]) {
			if (this.control.key_status["KeyA"] && this.control.key_status["KeyD"]) {
				direction_offset = -Math.PI / 4 + Math.PI / 4; // s+a+d
			} else if (this.control.key_status["KeyA"]) {
				direction_offset = -Math.PI / 4; // s+a
			} else if (this.control.key_status["KeyD"]) {
				direction_offset = Math.PI / 4; // s+d
			} else {
				direction_offset = -Math.PI / 4 + Math.PI / 4; // s
			}
		} else if (this.control.key_status["KeyW"]) {
			if (this.control.key_status["KeyA"] && this.control.key_status["KeyD"]) { // w+a+d
				direction_offset = Math.PI;
			} else if (this.control.key_status["KeyA"]) {
				direction_offset = -Math.PI / 4 - Math.PI / 2; // w+a
			} else if (this.control.key_status["KeyD"]) {
				direction_offset = Math.PI / 4 + Math.PI / 2; // w+d
			} else {
				direction_offset = Math.PI;
			}
		} else if (this.control.key_status["KeyA"]) {
			direction_offset = -Math.PI / 2; // a
		} else if (this.control.key_status["KeyD"]) {
			direction_offset = Math.PI / 2; // d
		}
        //虚拟摇杆控制，摇杆默认方向为X轴正方向
        if(this.control.degree) {
            direction_offset = this.control.degree * Math.PI / 180 + Math.PI / 2
        }
		this.last_direction_angle = direction_offset;
		//相机方向
		const angle_y_camera_direction = Math.atan2((this.camera.position.x - this.character.position.x), (this.camera.position.z - this.character.position.z));
		//旋转模型
		this.rotate_quarternion.setFromAxisAngle(this.rotate_angle, angle_y_camera_direction + direction_offset);
		quaternion_helper.rotateTowards(this.rotate_quarternion, 0.4);
		this.character.quaternion.slerp(quaternion_helper, 0.6);
	}

    //更新角色模型动画
	private updateAction(delta_time: number) {
		this.mixer?.update(delta_time);
		let next_action: Actions;
		if (this.player_is_on_ground && (this.control.key_status["KeyW"] || this.control.key_status["KeyS"] || this.control.key_status["KeyA"] || this.control.key_status["KeyD"] || this.control.degree)) {
			next_action = "walk";
		} else if (this.player_is_on_ground) {
			next_action = "idle";
		} else {
			next_action = "jump";
		}
		if (next_action !== this.cur_action) {
			this.actions[this.cur_action]?.fadeOut(0.1);
			this.actions[next_action]?.reset().play().fadeIn(0.1);
			this.cur_action = next_action;
		}
	}

    //角色与场景的碰撞检测
	private _checkCollision(delta_time: number, scene_collider: Mesh) {
		const capsule_info = this.capsule_info;
		this.temp_box.makeEmpty();
		this.temp_mat.copy(scene_collider.matrixWorld).invert();
		this.temp_segment.copy(capsule_info.segment);
		// 获取胶囊体在场景局部空间中的位置
		this.temp_segment.start.applyMatrix4(this.character.matrixWorld).applyMatrix4(this.temp_mat);
		this.temp_segment.end.applyMatrix4(this.character.matrixWorld).applyMatrix4(this.temp_mat);
		// 获取胶囊体的轴对齐边界框
		this.temp_box.expandByPoint(this.temp_segment.start);
		this.temp_box.expandByPoint(this.temp_segment.end);
		this.temp_box.min.addScalar(-capsule_info.radius);
		this.temp_box.max.addScalar(capsule_info.radius);
		if (isBVHGeometry(scene_collider.geometry)) {
			scene_collider.geometry.boundsTree.shapecast({
				intersectsBounds: box => box.intersectsBox(this.temp_box),
				intersectsTriangle: tri => {
					// 检查场景是否与胶囊相交，并调整
					const tri_point = this.temp_vector;
					const capsule_point = this.temp_vector2;
					const distance = tri.closestPointToSegment(this.temp_segment, tri_point, capsule_point);
					if (distance < capsule_info.radius) {
						const depth = capsule_info.radius - distance;
						const direction = capsule_point.sub(tri_point).normalize();
                        // 在场景局部坐标中调整胶囊位置
						this.temp_segment.start.addScaledVector(direction, depth);
						this.temp_segment.end.addScaledVector(direction, depth);
					}
				}
			});
		}
		const new_position = this.temp_vector;
        /**
        this.temp_segment.start角色模型的局部坐标
        applyMatrix4(scene_collider.matrixWorld)角色模型的世界坐标
         */
		new_position.copy(this.temp_segment.start).applyMatrix4(scene_collider.matrixWorld);
		const delta_vector = this.temp_vector2;
		delta_vector.subVectors(new_position, this.character.position);
		this.player_is_on_ground = delta_vector.y > Math.abs(delta_time * this.velocity.y * 0.25);
		const offset = Math.max(0.0, delta_vector.length() - 1e-5);
		delta_vector.normalize().multiplyScalar(offset);
		// 调整角色模型位置
		this.character.position.add(delta_vector);
		if (!this.player_is_on_ground) {
			delta_vector.normalize();
			this.velocity.addScaledVector(delta_vector, -delta_vector.dot(this.velocity));
		} else {
			this.velocity.set(0, 0, 0);
		}
	}

	//相机碰撞检测优化
	private _checkCameraCollision(colliders: Object3D[]) {
		if (!this.is_first_person) {
			const ray_direction = new Vector3();
			ray_direction.subVectors(this.camera.position, this.character.position).normalize();
			this.camera_raycaster.set(this.character.position, ray_direction);
			const intersects = this.camera_raycaster.intersectObjects(colliders);
			if (intersects.length) {
				// 找到碰撞点后还需要往前偏移一点，不然还是可能会看到穿模
				const offset = new Vector3(); // 定义一个向前移动的偏移量
				offset.copy(ray_direction).multiplyScalar(-0.5); // 计算偏移量，这里的distance是想要向前移动的距离
				const new_position = new Vector3().addVectors(intersects[0].point, offset); // 计算新的相机位置
				this.camera.position.copy(new_position);
				this.orbit_controls.minDistance = 0;
			} else {
				this.orbit_controls.minDistance = 2;
			}
		}
	}

    //掉落地图检测
	private _checkReset() {
		if (this.character.position.y < this.reset_y) {
			this.reset();
		}
	}

	reset() {
		this.velocity.set(0, 0, 0);
		this.character.position.copy(this.reset_position);
		this.camera.position.sub(this.orbit_controls.target);
		this.orbit_controls.target.copy(this.character.position);
		this.camera.position.add(this.character.position);
		this.orbit_controls.update();
	}

    //切换视角
	private _switchPersonView() {
		this.is_first_person = !this.is_first_person;
		if (!this.is_first_person) {
			this.character.visible = true;
			this.camera.position.sub(this.orbit_controls.target).normalize().multiplyScalar(5).add(this.orbit_controls.target);
		} else {
			this.character.visible = false;
		}
	}

    //角色跳跃
	private _characterJump() {
		if (this.player_is_on_ground) {
			this.velocity.y = this.jump_height;
			this.player_is_on_ground = false;
		}
	}
}
