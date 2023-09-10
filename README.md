### React Hook + Typescript + ThreeJS 3D开放世界交互
```shell
1. npm install  下载相关依赖
2. npm run start 启动项目
3. npm run build 打包项目，线上部署
```
##### 角色与场景碰撞检测
基于three-mesh-bvh包围体层次结构的碰撞检测
```javascript
//three-mesh-bvh绑定碰撞
const static_generator = new StaticGeometryGenerator(this.collision_scene);
static_generator.attributes = ["position"];
const generate_geometry = static_generator.generate() as BVHGeometry;
generate_geometry.boundsTree = new MeshBVH(generate_geometry, {lazyGeneration: false} as MeshBVHOptions);
this.collider = new Mesh(generate_geometry);
this.scene.add(this.collision_scene);

//创建角色胶囊体检测与场景的碰撞
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
```
##### 3D场景交互(射线交互)
```javascript
//Tip视角交互，相机不断发射线检测
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

//modal点击交互，鼠标点击后发射线检测
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
```
##### 角色控制
```javascript
//角色移动控制
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

//角色方向控制
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
```
##### React交互组件
```javascript
//交互按钮
const Stick: React.FC<StickProps> = ({ 
    children, 
    className, 
    onClick
}) => {
    return (
        <div 
            className={`${styles['stick-container']} ${className}`} 
            onTouchStart={onClick}
            onClick={onClick}
        >
            {children}
        </div>
    )
}

//交互弹窗
const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
    return (
        <div className={styles['modal-container']}>
            <div className={styles['modal-content']}>
                {children}
                <svg 
                    className={styles['close']} 
                    onClick={onClose}
                    viewBox="0 0 1024 1024" 
                    version="1.1" xmlns="http://www.w3.org/2000/svg" 
                    p-id="3056" data-spm-anchor-id="a313x.7781069.0.i4" 
                    width="32" 
                    height="32"
                >
                    <path d="M512 128C300.8 128 128 300.8 128 512s172.8 384 384 384 384-172.8 384-384S723.2 128 512 128zM512 832c-179.2 0-320-140.8-320-320s140.8-320 320-320 320 140.8 320 320S691.2 832 512 832z" p-id="3057" fill="#ffffff"></path><path d="M672 352c-12.8-12.8-32-12.8-44.8 0L512 467.2 396.8 352C384 339.2 364.8 339.2 352 352S339.2 384 352 396.8L467.2 512 352 627.2c-12.8 12.8-12.8 32 0 44.8s32 12.8 44.8 0L512 556.8l115.2 115.2c12.8 12.8 32 12.8 44.8 0s12.8-32 0-44.8L556.8 512l115.2-115.2C684.8 384 684.8 364.8 672 352z" p-id="3058" fill="#ffffff" />
                </svg>
            </div>
        </div>
    )
}
```


