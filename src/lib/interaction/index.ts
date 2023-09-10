import { Object3D, Raycaster, Vector2, Scene, Camera } from "three";
import { ON_CLICK_RAY_CAST, ON_HIDE_TOOLTIP, ON_SHOW_TOOLTIP } from "../Constants";
import Emitter from "../emitter";

interface RayCasterParams {
    scene: Scene;
    emitter: Emitter;
    camera: Camera;
}

export default class RayCasterInteraction {
	private click_raycaster: Raycaster;
	private tooltip_raycaster: Raycaster;
	private hover_point: Vector2;
	private mouse_point: Vector2;
    private emitter: Emitter;
    private camera: Camera;
    private scene: Scene;

	constructor({
        scene,
        camera,
        emitter
    }: RayCasterParams) {
        this.emitter = emitter
        this.camera = camera
        this.scene = scene
		this.click_raycaster = new Raycaster();
		// 通过click点击检测距离为22
		this.click_raycaster.far = 22;
		this.tooltip_raycaster = new Raycaster();
		// tooltip显示检测距离为17
		this.tooltip_raycaster.far = 17;
		this.hover_point = new Vector2(0, 0);
		this.mouse_point = new Vector2();
	}

	updateRayCast(interactiveMesh: Object3D[] = []) {
		if (interactiveMesh.length) {
			this.tooltip_raycaster.setFromCamera(this.hover_point, this.camera);
			const intersects = this.tooltip_raycaster.intersectObjects(interactiveMesh);
			if (intersects.length && intersects[0].object.userData.title) {
				this.emitter.$emit(ON_SHOW_TOOLTIP, {msg: intersects[0].object.userData.title});
			} else {
				this.emitter.$emit(ON_HIDE_TOOLTIP);
			}
		}
	}

	bindClickRayCast(interactiveMesh: Object3D[] = []) {
		let down_x = 0;
		let down_y = 0;
		document.body.addEventListener("pointerdown", (event) => {
			down_x = event.screenX;
			down_y = event.screenY;
		});
		document.body.addEventListener("pointerup", (event) => {
			const offset_x = Math.abs(event.screenX - down_x)
			const offset_y = Math.abs(event.screenY - down_y)
			// 点击偏移量限制
			if (offset_x <= 1 && offset_y <= 1) {
				this.mouse_point.x = (event.clientX / window.innerWidth) * 2 - 1;
				this.mouse_point.y = -((event.clientY / window.innerHeight) * 2 - 1);
				this.click_raycaster.setFromCamera(this.mouse_point, this.camera);
				const intersects = this.click_raycaster.intersectObjects(interactiveMesh);
				if (intersects.length && intersects[0].object.userData) {
					this.emitter.$emit(ON_CLICK_RAY_CAST, intersects[0].object.userData);
				}
			}
		})
	}
}
